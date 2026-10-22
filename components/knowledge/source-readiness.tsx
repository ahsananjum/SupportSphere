import { sourceReadiness } from '../../lib/knowledge/readiness';

export function SourceReadiness({
  source,
}: {
  source: Parameters<typeof sourceReadiness>[0];
}) {
  const state = sourceReadiness(source);
  return (
    <div>
      <strong className="knowledge-status">{state.label}</strong>
      <p className="field-help">{state.detail}</p>
    </div>
  );
}
