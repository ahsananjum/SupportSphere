import {
  automatedActionPresentation,
  type ActionKind,
  type AutomatedAction,
} from '../../lib/ui/automated-action';
import { StatusChip } from './record-state';
import styles from './automated-action-state.module.css';

export function AutomatedActionState({
  kind,
  run,
  heading = false,
  announce = false,
}: {
  kind: ActionKind;
  run: AutomatedAction;
  heading?: boolean;
  announce?: boolean;
}) {
  const result = automatedActionPresentation(kind, run);
  return (
    <div
      className={styles.feedback}
      aria-live={announce ? 'polite' : undefined}
    >
      <div className={styles.title}>
        {heading ? <h2>{result.title}</h2> : <strong>{result.title}</strong>}
        <StatusChip value={result.state} />
      </div>
      <p>{result.detail}</p>
      {result.reason && <p className={styles.reason}>{result.reason}</p>}
    </div>
  );
}
