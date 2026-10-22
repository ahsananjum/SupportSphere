'use client';

import { StatePanel } from '../../components/shared/record-state';

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <StatePanel
      kind="error"
      title="Workspace unavailable"
      level={1}
      actions={
        <button type="button" className="primary-button" onClick={reset}>
          Try again
        </button>
      }
    >
      <p>
        We could not load your workspace. Check your connection and try again.
      </p>
    </StatePanel>
  );
}
