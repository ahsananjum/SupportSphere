'use client';

import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
function subscribe(onChange: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
function snapshot() {
  return window.matchMedia(query).matches;
}
function serverSnapshot() {
  return false;
}

// The server and hydration render share one snapshot. The preference updates immediately after hydration.
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
