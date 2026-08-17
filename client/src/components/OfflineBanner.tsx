import { useEffect, useState } from "react";

/**
 * Deliberately not a service-worker navigateFallback page: the app's
 * index.html must always come from the network when online (Caddy's
 * no-cache rule on the SPA shell exists specifically so a deploy shows up
 * without a stale precached copy — see client/Caddyfile). This is a plain
 * connectivity banner instead, safe to add without touching caching.
 */
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[9998] flex items-center justify-center gap-2 bg-[#2E3192] px-4 py-2 text-sm font-medium text-white"
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      <span className="h-2 w-2 rounded-full bg-amber-300" />
      You're offline — some features won't be available until your connection is back.
    </div>
  );
}
