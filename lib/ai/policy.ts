export const aiModes = [
  {
    value: 'off',
    label: 'Off',
    help: 'New customer messages do not trigger generation. Pending work is rechecked before execution; saved drafts and sent replies remain.',
  },
  {
    value: 'draft_only',
    label: 'Draft only',
    help: 'Prepare suggestions for a teammate to review. Adopting a draft and sending it are separate deliberate actions. No automatic reply is permitted.',
  },
  {
    value: 'assisted',
    label: 'Assisted auto reply',
    help: 'Only eligible how-to or product answers may send after evidence, confidence, quality and current conversation checks. Assigned, closed or handed-off conversations cannot auto-send.',
  },
];
export function aiModeLabel(mode: string) {
  return aiModes.find((m) => m.value === mode)?.label ?? 'Mode unavailable';
}
