import { type NextRequest, NextResponse } from "next/server";

async function downloadRepoZip(
  owner: string,
  repo: string,
  repoName: string,
  branch?: string
) {
  const token = process.env.GITHUB_TOKEN;
  const commonHeaders: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "GitHub-Repo-Downloader",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const repoMetaRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: commonHeaders,
    }
  );

  if (!repoMetaRes.ok) {
    const text = await repoMetaRes.text().catch(() => "");
    return NextResponse.json(
      { error: `Failed to fetch repo metadata: ${repoMetaRes.status} ${text}` },
      { status: 502 }
    );
  }

  const repoMeta = (await repoMetaRes.json()) as { default_branch?: string };
  let defaultBranch = branch;
  if (!defaultBranch) {
    defaultBranch = repoMeta.default_branch || "main";
  }

  async function fetchWithRedirects(url: string, headers: HeadersInit) {
    let currentUrl = url;
    for (let i = 0; i < 5; i++) {
      const res = await fetch(currentUrl, {
        method: "GET",
        headers,
        redirect: "manual",
      });
      if (res.status === 200) return res;
      if (res.status >= 300 && res.status < 400) {
        const location =
          res.headers.get("location") || res.headers.get("Location");
        if (!location) throw new Error("Redirect without Location header");
        currentUrl = location;
        continue;
      }
      const t = await res.text().catch(() => "");
      throw new Error(`Failed to download repository: ${res.status} ${t}`);
    }
    throw new Error("Too many redirects");
  }

  const downloadHeaders: HeadersInit = {
    "User-Agent": "GitHub-Repo-Downloader",
    Accept: "application/octet-stream",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const archiveUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${defaultBranch}.zip`;

  let response: Response;
  try {
    response = await fetchWithRedirects(archiveUrl, downloadHeaders);
  } catch (e: Error | unknown) {
    const codeloadUrl = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${defaultBranch}`;
    response = await fetchWithRedirects(codeloadUrl, downloadHeaders);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${repoName}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { repoUrl, repoName, branch } = await request.json();

    if (!repoUrl || !repoName) {
      return NextResponse.json(
        { error: "Repository URL and name are required" },
        { status: 400 }
      );
    }

    let owner = "";
    let repo = "";
    try {
      const parsed = new URL(repoUrl);
      const parts = parsed.pathname.replace(/^\/+|\.git$/g, "").split("/");
      if (parts.length >= 2) {
        owner = parts[0];
        repo = parts[1];
      }
    } catch {
      const parts = repoUrl
        .replace("https://github.com/", "")
        .replace(/\.git$/, "")
        .split("/");
      if (parts.length >= 2) {
        owner = parts[0];
        repo = parts[1];
      }
    }

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Unable to parse repository owner/name from URL" },
        { status: 400 }
      );
    }

    return await downloadRepoZip(owner, repo, repoName, branch);
  } catch (error) {
    console.error("[v0] Download error:", (error as Error)?.message || error);
    return NextResponse.json(
      { error: "Failed to download repository" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const repoUrl = url.searchParams.get("repoUrl") || "";
    const repoName = url.searchParams.get("repoName") || "repository";
    const branch = url.searchParams.get("branch") || undefined;

    if (!repoUrl) {
      return NextResponse.json(
        { error: "repoUrl is required" },
        { status: 400 }
      );
    }

    let owner = "";
    let repo = "";
    try {
      const parsed = new URL(repoUrl);
      const parts = parsed.pathname.replace(/^\/+|\.git$/g, "").split("/");
      if (parts.length >= 2) {
        owner = parts[0];
        repo = parts[1];
      }
    } catch {
      const parts = repoUrl
        .replace("https://github.com/", "")
        .replace(/\.git$/, "")
        .split("/");
      if (parts.length >= 2) {
        owner = parts[0];
        repo = parts[1];
      }
    }

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Unable to parse repository owner/name from URL" },
        { status: 400 }
      );
    }

    return await downloadRepoZip(owner, repo, repoName, branch);
  } catch (error) {
    console.error(
      "[v0] GET download error:",
      (error as Error)?.message || error
    );
    return NextResponse.json(
      { error: "Failed to download repository" },
      { status: 500 }
    );
  }
}
