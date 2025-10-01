"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitHubRepoSearch } from "@/components/github-repo-search";
import { RepoCard } from "@/components/repo-card";
import { Header } from "@/components/header";
// import { FloatingActionButton } from "@/components/floating-action-button";
import { ThemeToggle } from "@/components/theme-toggle";

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  topics: string[];
}

export default function HomePage() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [sortBy, setSortBy] = useState<"name" | "stars">("stars");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const perPage = 30;
  const [retrying, setRetrying] = useState(false);
  const sentinelId = "repo-results-sentinel";

  useEffect(() => {
    const handleRefresh = () => {
      setRefreshKey((prev) => prev + 1);
      setRepositories([]);
      setSearchQuery("");
      setIsLoading(false);
      setPage(1);
      setTotalCount(null);
      setHasMore(false);
    };

    window.addEventListener("beforeunload", handleRefresh);

    return () => {
      window.removeEventListener("beforeunload", handleRefresh);
    };
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsLoading(true);
    setSearchQuery(query);
    setPage(1);
    setTotalCount(null);
    setRepositories([]);
    setHasMore(false);

    try {
      const first = await fetch(
        `/api/github/search?q=${encodeURIComponent(
          query
        )}&page=1&per_page=${perPage}`
      );
      const data = await first.json();

      if (data.items) {
        setRepositories(data.items);
        setTotalCount(
          typeof data.total_count === "number" ? data.total_count : null
        );
        const more =
          data.items.length === perPage &&
          (data.total_count ?? data.items.length) > perPage;
        setHasMore(more);
      }

      if ((!data.items || data.items.length === 0) && !retrying) {
        const corrected = autoCorrectQuery(query);
        if (corrected && corrected !== query) {
          setRetrying(true);
          const second = await fetch(
            `/api/github/search?q=${encodeURIComponent(
              corrected
            )}&page=1&per_page=${perPage}`
          );
          const data2 = await second.json();
          if (data2.items && data2.items.length > 0) {
            setRepositories(data2.items);
            setTotalCount(
              typeof data2.total_count === "number" ? data2.total_count : null
            );
            const more2 =
              data2.items.length === perPage &&
              (data2.total_count ?? data2.items.length) > perPage;
            setHasMore(more2);
          }
          setRetrying(false);
        }
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const autoCorrectQuery = (q: string) => {
    const map: Record<string, string> = {
      "next js": "nextjs",
      "tail wind": "tailwindcss",
      "type script": "typescript",
      "node js": "nodejs",
      "react js": "react",
    };
    const trimmed = q.trim();
    const lower = trimmed.toLowerCase();
    if (map[lower]) return map[lower];
    const compact = lower.replace(/[^\p{L}\p{N}]+/gu, "");
    return compact.length >= 2 ? compact : null;
  };

  const loadNextPage = useCallback(async () => {
    if (isLoading || !hasMore || !searchQuery) return;
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(
        `/api/github/search?q=${encodeURIComponent(
          searchQuery
        )}&page=${nextPage}&per_page=${perPage}`
      );
      const data = await res.json();
      if (data.items) {
        setRepositories((prev) => [...prev, ...data.items]);
        setPage(nextPage);
        const loaded = nextPage * perPage;
        const total =
          typeof data.total_count === "number"
            ? data.total_count
            : totalCount ?? loaded;
        setHasMore(loaded < total && data.items.length === perPage);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error("Pagination failed:", e);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, searchQuery, page, perPage, totalCount]);

  useEffect(() => {
    const sentinel = document.getElementById(sentinelId);
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) loadNextPage();
        });
      },
      { root: null, rootMargin: "0px", threshold: 1.0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelId, page, isLoading, hasMore, searchQuery, loadNextPage]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

  // Sort repositories based on sortBy
  const sortedRepositories = [...repositories].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "name") {
      cmp = a.name.localeCompare(b.name);
    } else {
      cmp = a.stargazers_count - b.stargazers_count;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <motion.div
      key={refreshKey}
      className="min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.h1
            className="display-large font-bold text-balance mb-4"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            GitHub Repository Downloader
          </motion.h1>
          <motion.p
            className="headline-small text-muted-foreground max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Discover, explore, and download GitHub repositories with a clean,
            accessible UI
          </motion.p>
          <motion.button
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="mt-4 px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-full text-primary transition-colors duration-200"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg
              className="w-4 h-4 inline mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh Page
          </motion.button>

          {/* Made by Me~Section */}
          <motion.div
            className="flex items-center gap-2 justify-center my-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
          >
            <span className="body-small text-muted-foreground">Made with</span>
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            >
              ❤️
            </motion.div>
            <span className="body-small text-muted-foreground">by</span>
            <motion.a
              className="font-bold italic text-primary cursor-pointer"
              whileHover={{
                scale: 1.05,
                textShadow: "0 0 8px rgba(139, 92, 246, 0.3)",
              }}
              transition={{ duration: 0.2 }}
              href="https://riteshdpandit.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ritesh Pandit
            </motion.a>
          </motion.div>
        </motion.div>

        {/* Search Section */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <GitHubRepoSearch onSearch={handleSearch} isLoading={isLoading} />
        </motion.div>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {repositories.length > 0 && (
            <motion.div
              key="results"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="space-y-8"
            >
              <motion.div
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                variants={itemVariants}
              >
                <h2 className="headline-medium">
                  Search Results for{" "}
                  <span className="font-bold italic underline underline-offset-2">
                    &quot;{searchQuery}&quot;
                  </span>
                </h2>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-muted-foreground body-medium">
                    {repositories.length} repositories found
                  </span>
                  <div
                    className="flex gap-2"
                    role="group"
                    aria-label="Sort repositories"
                  >
                    {/* Sort by Stars Chip */}
                    <button
                      type="button"
                      className={`focus-visible:outline-primary/70 focus-visible:outline-2 rounded-full px-4 py-2 text-sm font-medium flex items-center gap-1 transition-colors border border-border bg-background hover:bg-primary/10 aria-pressed:bg-primary/20 aria-pressed:text-primary aria-pressed:font-bold ${
                        sortBy === "stars"
                          ? "ring-2 ring-primary/40 bg-primary/10 text-primary font-bold"
                          : ""
                      }`}
                      aria-pressed={sortBy === "stars"}
                      aria-label={`Sort by stars, currently ${
                        sortDir === "asc" ? "ascending" : "descending"
                      }`}
                      tabIndex={0}
                      onClick={() => {
                        if (sortBy === "stars") {
                          setSortDir((prev) =>
                            prev === "asc" ? "desc" : "asc"
                          );
                        } else {
                          setSortBy("stars");
                          setSortDir("desc"); // Always default to desc for stars
                        }
                      }}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                      Stars
                      {sortBy === "stars" && (
                        <span aria-hidden="true">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                    {/* Sort by Name Chip */}
                    <button
                      type="button"
                      className={`focus-visible:outline-primary/70 focus-visible:outline-2 rounded-full px-4 py-2 text-sm font-medium flex items-center gap-1 transition-colors border border-border bg-background hover:bg-primary/10 aria-pressed:bg-primary/20 aria-pressed:text-primary aria-pressed:font-bold ${
                        sortBy === "name"
                          ? "ring-2 ring-primary/40 bg-primary/10 text-primary font-bold"
                          : ""
                      }`}
                      aria-pressed={sortBy === "name"}
                      aria-label={`Sort by name, currently ${
                        sortDir === "asc" ? "ascending" : "descending"
                      }`}
                      tabIndex={0}
                      onClick={() => {
                        if (sortBy === "name") {
                          setSortDir((prev) =>
                            prev === "asc" ? "desc" : "asc"
                          );
                        } else {
                          setSortBy("name");
                          setSortDir("asc"); // Always default to asc for name
                        }
                      }}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M3 6h18M3 12h18M3 18h18" />
                      </svg>
                      Name
                      {sortBy === "name" && (
                        <span aria-hidden="true">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={containerVariants}
              >
                {sortedRepositories.map((repo) => (
                  <motion.div key={repo.id} variants={itemVariants}>
                    <RepoCard repository={repo} />
                  </motion.div>
                ))}
              </motion.div>

              {!hasMore && repositories.length > 0 && (
                <motion.div
                  className="flex items-center justify-center py-8 text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 12H4"
                      />
                    </svg>
                    <span className="body-medium">
                      You’ve reached the end of results
                    </span>
                  </div>
                </motion.div>
              )}

              <div id={sentinelId} className="h-10" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!isLoading && repositories.length === 0 && searchQuery && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-surface-variant flex items-center justify-center">
              <svg
                className="w-12 h-12 text-on-surface-variant"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h3 className="headline-small mb-2">No repositories found</h3>
            <p className="body-large text-muted-foreground">
              Try searching with different keywords
            </p>
          </motion.div>
        )}

        {/* Welcome State */}
        {!searchQuery && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <motion.div
              className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"
              animate={{
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 4,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            >
              <svg
                className="w-16 h-16 text-primary"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </motion.div>
            <h3 className="headline-medium mb-4">
              Start exploring GitHub repositories
            </h3>
            <p className="body-large text-muted-foreground max-w-md mx-auto">
              Search for any repository by name, topic, or programming language
              to get started
            </p>
          </motion.div>
        )}
      </main>

      {/* <Footer /> */}
      {/* <FloatingActionButton /> */}
      <ThemeToggle />
    </motion.div>
  );
}
