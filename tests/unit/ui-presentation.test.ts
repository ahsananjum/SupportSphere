import { describe, it, expect } from 'vitest';
import { statusLabel, timestampLabel } from '../../lib/ui/presentation';
import { fieldDescription } from '../../components/shared/form-feedback';

describe('UP-U1-02 shared field associations', () => {
  it('keeps help and error associated, scoped to the control ID', () => {
    expect(fieldDescription('customer-email', 'Invalid', 'Optional')).toBe(
      'customer-email-help customer-email-error',
    );
    expect(fieldDescription('email')).toBeUndefined();
  });
});
describe('UP-U1-03 shared readable state and explicit time', () => {
  it('labels existing states and never exposes an unknown stored value', () => {
    expect(statusLabel('in_progress')).toBe('In progress');
    expect(statusLabel('auto_sent')).toBe('Reply sent');
    expect(statusLabel('high')).toBe('High');
    expect(statusLabel('untrusted_internal_state')).toBe('Status unavailable');
    expect(statusLabel(null)).toBe('Status unavailable');
  });
  it('formats a stable timezone and handles invalid/missing time honestly', () => {
    expect(timestampLabel('2026-10-18T00:00:00Z', 'Asia/Karachi')).toBe(
      'Oct 18, 2026, 5:00 AM',
    );
    expect(timestampLabel('invalid')).toBeNull();
    expect(timestampLabel('2026-10-18T00:00:00Z', 'Not/AZone')).toBeNull();
  });
});
