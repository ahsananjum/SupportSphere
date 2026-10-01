'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';

const noticeKey = 'supportsphere-cookie-notice-v1';
const noticeEvent = 'supportsphere-cookie-notice-change';
let dismissedInMemory = false;

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(noticeEvent, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(noticeEvent, onChange);
  };
}

function getSnapshot() {
  try {
    return (
      !dismissedInMemory &&
      window.localStorage.getItem(noticeKey) !== 'dismissed'
    );
  } catch {
    return !dismissedInMemory;
  }
}

export function CookieNotice({ stickyCta }: { stickyCta: boolean }) {
  const visible = useSyncExternalStore(subscribe, getSnapshot, () => false);

  if (!visible) return null;

  const dismiss = () => {
    dismissedInMemory = true;
    try {
      window.localStorage.setItem(noticeKey, 'dismissed');
    } catch {
      // In-memory dismissal still works when storage is unavailable.
    }
    window.dispatchEvent(new Event(noticeEvent));
  };

  return (
    <aside
      className={`cookie-notice${stickyCta ? ' cookie-notice-above-cta' : ''}`}
      aria-label="Cookie notice"
    >
      <div>
        <strong>Essential cookies only.</strong>
        <p>
          Sign-in needs essential cookies. We do not run optional analytics
          right now. <Link href="/cookies">Read the cookie policy</Link>.
        </p>
      </div>
      <button type="button" onClick={dismiss}>
        Got it
      </button>
    </aside>
  );
}
