"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

export function Sonner({
  t,
  repoName,
  branch,
  duration = 10,
}: {
  t: any;
  repoName: string;
  branch: string;
  duration?: number;
}) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-150, 0, 150], [0, 1, 0]);

  useEffect(() => {
    if (timeLeft <= 0) {
      toast.dismiss(t?.id);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, t?.id]);

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      style={{
        x,
        opacity,
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(16,185,129,0.18))",
      }}
      dragElastic={0.5}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 100) toast.dismiss(t?.id);
      }}
      className="relative w-[340px] rounded-2xl backdrop-blur-xl border border-white/20 shadow-xl p-4 flex gap-3 items-start overflow-hidden cursor-default transition-colors duration-200 hover:bg-white/5 pointer-events-auto"
    >
      {/* Left icon */}
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

      {/* Content */}
      <div className="flex flex-col flex-1 relative z-10">
        <h4 className="text-sm font-semibold text-white tracking-tight drop-shadow-md">
          Downloading {repoName}
        </h4>
        <p className="text-xs text-gray-200 mt-0.5 leading-snug">
          Fetching <span className="font-bold text-emerald-400">{branch}</span>{" "}
          branch. Sit tight 🚀
        </p>
        <div className="mt-2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-400"
            initial={{ width: "100%" }}
            animate={{ width: `${(timeLeft / duration) * 100}%` }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </div>
        <span className="text-[10px] text-gray-300 mt-1">
          Closing in {timeLeft}s
        </span>
      </div>

      {/* Close button */}
      <button
        onClick={() => toast.dismiss(t?.id)}
        className="absolute top-3 right-3 z-50 text-gray-300 hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-white/10"
      >
        <X className="w-4 h-4" strokeWidth={5} />
      </button>
    </motion.div>
  );
}
