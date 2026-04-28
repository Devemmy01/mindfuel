"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 72,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // dummy ref kept for API compatibility — no longer used for scroll
  const containerRef = useRef<HTMLDivElement>(null);

  const startY = useRef(0);
  const pulling = useRef(false);
  const isRefreshingRef = useRef(false);

  const triggerRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setPullDistance(0);
    try {
      await onRefresh();
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Only activate when the page is scrolled to the very top
      if (window.scrollY === 0 || document.documentElement.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || isRefreshingRef.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && (window.scrollY === 0 || document.documentElement.scrollTop === 0)) {
        const damped = Math.min(delta * 0.45, threshold * 1.4);
        setPullDistance(damped);
      } else if (delta <= 0) {
        pulling.current = false;
        setPullDistance(0);
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      setPullDistance((current) => {
        if (current >= threshold) {
          triggerRefresh();
        }
        return 0;
      });
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [threshold, triggerRefresh]);

  return { containerRef, pullDistance, isRefreshing, triggerRefresh };
}
