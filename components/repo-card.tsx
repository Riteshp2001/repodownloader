"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Repository } from "@/app/page";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

interface RepoCardProps {
  repository: Repository;
}

export function RepoCard({ repository }: RepoCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [indeterminate, setIndeterminate] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [branchesLoading, setBranchesLoading] = useState(false);
  const progressRef = useRef<HTMLButtonElement>(null);

  // Fetch branches when card mounts
  useEffect(() => {
    let ignore = false;
    async function fetchAllBranches(
      url: string,
      acc: string[] = []
    ): Promise<string[]> {
      const res = await fetch(url);
      if (!res.ok) return acc.length ? acc : ["main"];
      const data: { name: string }[] = await res.json();
      const link = res.headers.get("link");
      let nextUrl = null;
      if (link) {
        // Parse GitHub API pagination link header
        const match = link.match(/<([^>]+)>; rel="next"/);
        if (match) nextUrl = match[1];
      } else if (data.length === 100) {
        // If no link header but 100 branches, try to fetch more using 'since' param
        const last = data[data.length - 1]?.name;
        if (last) {
          const u = new URL(url);
          u.searchParams.set("since", last);
          nextUrl = u.toString();
        }
      }
      const names = acc.concat(data.map((b) => b.name));
      if (nextUrl) {
        return fetchAllBranches(nextUrl, names);
      }
      return names;
    }
    async function fetchBranches() {
      setBranchesLoading(true);
      try {
        const repoUrl = repository.html_url.replace(/\.git$/, "");
        let apiUrl =
          repoUrl.replace(
            "https://github.com/",
            "https://api.github.com/repos/"
          ) + "/branches?per_page=100";
        let allBranches = await fetchAllBranches(apiUrl);
        // fallback: try without per_page param if only main is returned
        if (allBranches.length <= 1) {
          apiUrl =
            repoUrl.replace(
              "https://github.com/",
              "https://api.github.com/repos/"
            ) + "/branches";
          allBranches = await fetchAllBranches(apiUrl);
        }
        if (!ignore && allBranches.length > 0) {
          setBranches(allBranches);
          setSelectedBranch(allBranches[0]);
        } else if (!ignore) {
          setBranches(["main"]);
          setSelectedBranch("main");
        }
      } catch {
        if (!ignore) {
          setBranches(["main"]);
          setSelectedBranch("main");
        }
      } finally {
        if (!ignore) setBranchesLoading(false);
      }
    }
    fetchBranches();
    return () => {
      ignore = true;
    };
  }, [repository.html_url]);

  const handleDownload = async () => {
    toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="relative w-[340px] rounded-2xl backdrop-blur-xl border border-white/20 shadow-xl p-4 flex gap-3 items-start overflow-hidden cursor-default"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(16,185,129,0.18))",
        }}
      >
        {/* Emerald glow */}
        <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-emerald-400/40 blur-3xl opacity-70 pointer-events-none" />

        {/* Left accent bar */}
        <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-l-2xl" />

        {/* Icon */}
        <div className="flex-shrink-0 relative z-10">
          <div className="w-11 h-11 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 shadow-inner">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 10v4h10v-4m-5-6v10m-7 4h14a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col flex-1 relative z-10">
          <h4 className="text-sm font-semibold text-white tracking-tight drop-shadow-md">
            Downloading {repository.name}
          </h4>
          <p className="text-xs text-gray-200 mt-0.5 leading-snug">
            Fetching{" "}
            <span className="font-bold text-emerald-400">{selectedBranch}</span>{" "}
            branch for you. Sit tight 🚀
          </p>
        </div>

        {/* Close button (Lucide) */}
        <button
          onClick={() => toast.dismiss(t.id)} // ✅ FIXED
          className="absolute top-3 right-3 text-gray-300 hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-white/10"
        >
          <X className="w-4 h-4" strokeWidth={2.2} />
        </button>
      </motion.div>
    ));

    try {
      setDownloading(true);
      setProgress(0);
      setIndeterminate(false);

      const apiUrl = `/api/github/download?repoUrl=${encodeURIComponent(
        repository.html_url.replace(/\.git$/, "")
      )}&repoName=${encodeURIComponent(
        repository.name
      )}&branch=${encodeURIComponent(selectedBranch || "main")}`;

      const res = await fetch(apiUrl, { method: "GET" });
      if (!res.ok) {
        throw new Error(`Download failed with status ${res.status}`);
      }

      const contentLength = res.headers.get("Content-Length");
      if (res.body && contentLength && parseInt(contentLength, 10) > 0) {
        setIndeterminate(false);
        const total = parseInt(contentLength, 10);
        let loaded = 0;
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            loaded += value.length;
            setProgress(Math.min(100, Math.round((loaded / total) * 100)));

            // allow React to paint between chunks
            await new Promise(requestAnimationFrame);
          }
        }

        setProgress(100);

        // Convert all Uint8Array chunks to ArrayBuffer for Blob constructor, filter out SharedArrayBuffer
        const buffers = chunks
          .map((chunk) =>
            chunk.buffer.slice(
              chunk.byteOffset,
              chunk.byteOffset + chunk.byteLength
            )
          )
          .filter((buf): buf is ArrayBuffer => buf instanceof ArrayBuffer);
        const blob = new Blob(buffers);
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `${repository.name}.zip`;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
      } else {
        // fallback if no content-length
        setIndeterminate(true);
        const blob = await res.blob();
        setProgress(100);
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `${repository.name}.zip`;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
      }
    } catch (error) {
      const repoUrl = repository.html_url.replace(/\.git$/, "");
      const fallback = `${repoUrl}/archive/refs/heads/main.zip`;
      window.open(fallback, "_blank", "noopener,noreferrer");
    } finally {
      setTimeout(() => {
        setDownloading(false);
        setProgress(0);
        setIndeterminate(false);
      }, 1500); // delay reset so user sees 100%
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getLanguageColor = (language: string | null) => {
    const colors: Record<string, string> = {
      JavaScript: "bg-yellow-500",
      TypeScript: "bg-blue-500",
      Python: "bg-green-500",
      Java: "bg-red-500",
      "C++": "bg-purple-500",
      Go: "bg-cyan-500",
      Rust: "bg-orange-500",
      PHP: "bg-indigo-500",
    };
    return colors[language || ""] || "bg-gray-500";
  };

  return (
    <motion.div
      whileHover={{
        y: -8,
        scale: 1.02,
        rotateX: 5,
        rotateY: 5,
      }}
      whileTap={{ scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
      style={{ transformStyle: "preserve-3d" }}
    >
      <Card className="h-full min-h-72 bg-gradient-to-br from-surface-1/90 to-surface-2/80 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group rounded-3xl hover:ring-2 hover:ring-primary/30 flex flex-col justify-between relative">
        <motion.div
          className="h-full flex flex-col justify-between"
          style={{ borderRadius: 24 }}
          whileHover={{ borderRadius: 32 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
        >
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:gap-3 h-full justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="w-12 h-12 ring-2 ring-primary/20 shadow-md flex-shrink-0">
                  <AvatarImage
                    src={repository.owner.avatar_url || "/placeholder.svg"}
                    alt={repository.owner.login}
                  />
                  <AvatarFallback className="bg-surface-2">
                    {repository.owner.login.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <motion.h3
                    className="text-lg font-bold truncate group-hover:text-primary transition-colors tracking-tight"
                    initial={{ opacity: 0.8 }}
                    whileHover={{ opacity: 1 }}
                  >
                    {repository.name}
                  </motion.h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground font-medium">
                      by {repository.owner.login}
                    </span>
                    {repository.language && (
                      <Badge
                        variant="secondary"
                        className="shrink-0 ml-1 px-2 py-0.5 flex items-center gap-1 text-xs"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${getLanguageColor(
                            repository.language
                          )}`}
                        ></span>
                        {repository.language}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                <span className="text-[11px] text-muted-foreground font-semibold bg-surface-2/70 px-2 py-0.5 rounded-full">
                  Updated {formatDate(repository.updated_at)}
                </span>
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 px-2 py-0.5 text-xs bg-surface-2/60"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {repository.stargazers_count.toLocaleString()}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 px-2 py-0.5 text-xs bg-surface-2/60"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                      />
                    </svg>
                    {repository.forks_count.toLocaleString()}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 flex flex-col flex-1 justify-between">
            {repository.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                {repository.description}
              </p>
            )}

            {/* Topics */}
            {repository.topics && repository.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {repository.topics.slice(0, 3).map((topic) => (
                  <Badge
                    key={topic}
                    variant="outline"
                    className="text-xs px-2 py-0.5 bg-primary/10 border-primary/30 text-primary font-semibold tracking-tight"
                  >
                    #{topic}
                  </Badge>
                ))}
                {repository.topics.length > 3 && (
                  <Badge
                    variant="outline"
                    className="text-xs px-2 py-0.5 bg-surface-2/60"
                  >
                    +{repository.topics.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Branch selection */}
            <div className="flex flex-col gap-2 pt-2 mt-auto">
              <div className="mb-1 flex items-center gap-2 w-full">
                <label
                  htmlFor={`branch-select-${repository.id}`}
                  className="text-xs text-muted-foreground font-medium whitespace-nowrap"
                >
                  Branch:
                </label>
                <div className="relative w-full max-w-[180px]">
                  <select
                    id={`branch-select-${repository.id}`}
                    className="block w-full rounded px-2 py-1 text-xs border border-border bg-surface-2 dark:bg-surface-1 dark:border-border/60 focus:outline-primary/70 transition-colors text-foreground dark:text-foreground shadow-sm appearance-none pr-6"
                    style={
                      {
                        backgroundColor: "var(--color-surface-2, #18181b)",
                        color: "var(--color-foreground, #fff)",
                        "--tw-bg-opacity": "1",
                        "--tw-text-opacity": "1",
                      } as React.CSSProperties
                    }
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    disabled={branchesLoading || branches.length === 0}
                    aria-label="Select branch to download"
                  >
                    {branchesLoading ? (
                      <option>Loading...</option>
                    ) : (
                      branches.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))
                    )}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    ▼
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <motion.div
                  className="flex-1"
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    ref={progressRef}
                    onClick={handleDownload}
                    disabled={downloading}
                    aria-label="Download repository as ZIP"
                    className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground relative overflow-hidden group"
                    size="sm"
                    tabIndex={0}
                  >
                    {/* Progress overlay */}
                    {downloading && (
                      <span
                        className={`absolute left-0 top-0 h-full ${
                          indeterminate
                            ? "animate-pulse bg-primary-foreground/40"
                            : "bg-primary-foreground/40"
                        } z-10 pointer-events-none transition-all duration-300 rounded-full`}
                        style={{
                          width: indeterminate ? "100%" : `${progress}%`,
                          minWidth:
                            progress > 0 && progress < 8 ? "8%" : undefined,
                        }}
                        aria-hidden="true"
                      />
                    )}

                    {/* Text/Spinner */}
                    <span className="relative z-20 flex items-center justify-center w-full h-full select-none">
                      {downloading ? (
                        <>
                          <span className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          <span className="ml-2 font-semibold tabular-nums text-primary-foreground drop-shadow-sm">
                            {indeterminate
                              ? "Downloading..."
                              : progress > 0
                                ? `${progress}%`
                                : "Preparing..."}
                          </span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <span className="font-semibold">Download</span>
                        </>
                      )}
                    </span>
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="border-border/50 bg-transparent rounded-full hover:bg-surface-2"
                  >
                    <a
                      href={repository.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open on GitHub"
                      className="flex items-center"
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        role="img"
                        aria-hidden="true"
                        focusable="false"
                        fill="currentColor"
                      >
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.1.8-.26.8-.58v-2.23c-3.34.73-4.04-1.41-4.04-1.41-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.48.99.11-.78.42-1.31.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.41 3-.41s2.04.14 3 .41c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.6-2.81 5.63-5.49 5.93.44.38.82 1.1.82 2.22v3.29c0 .32.2.69.8.58C20.56 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z" />
                      </svg>
                    </a>
                  </Button>
                </motion.div>
              </div>
            </div>
          </CardContent>
        </motion.div>
      </Card>
    </motion.div>
  );
}
