"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

interface GitHubRepoSearchProps {
  onSearch: (query: string) => void
  isLoading: boolean
}

export function GitHubRepoSearch({ onSearch, isLoading }: GitHubRepoSearchProps) {
  const [query, setQuery] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  const popularSearches = ["react", "nextjs", "typescript", "tailwindcss", "framer-motion", "nodejs"]

  return (
    <motion.div
      className="w-full max-w-4xl mx-auto"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-8 bg-surface-1 border-border/50 shadow-lg rounded-3xl group transition-all duration-300 hover:ring-1 hover:ring-primary/20">
        <motion.div
          style={{ borderRadius: 24 }}
          whileHover={{ borderRadius: 32 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <motion.div className="relative" whileFocus={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <Input
                  id="repo-search-input"
                  type="text"
                  placeholder="Search repositories... (e.g., 'react', 'user:facebook', 'language:typescript')"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-14 pl-12 pr-4 text-lg bg-surface-2 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 rounded-full"
                  disabled={isLoading}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </motion.div>
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                size="lg"
                disabled={isLoading || !query.trim()}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-full ripple-effect"
              >
                {isLoading ? (
                  <motion.div className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <motion.div
                      className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    />
                    Searching...
                  </motion.div>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    Search Repositories
                  </span>
                )}
              </Button>
            </motion.div>
          </form>

          {/* Popular Searches */}
          <div className="mt-6 pt-6 border-t border-border/30">
            <p className="label-medium text-muted-foreground mb-3">Popular searches:</p>
            <div className="flex flex-wrap gap-2">
              {popularSearches.map((search, index) => (
                <motion.button
                  key={search}
                  onClick={() => {
                    setQuery(search)
                    onSearch(search)
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-surface-2 hover:bg-surface-3 text-foreground rounded-full border border-border/30 transition-colors"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {search}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </Card>
    </motion.div>
  )
}
