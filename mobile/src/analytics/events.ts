/**
 * Privacy-minimized prototype analytics (PRD section 13, P1-02).
 * Only allow-listed event names and property keys are ever recorded; everything else is dropped,
 * so a financial value cannot reach the sink by accident. Events stay in memory (no network).
 */
const ALLOWED = {
  onboarding_started: ['platform'],
  onboarding_completed: ['steps_completed', 'duration_bucket'],
  dashboard_viewed: ['has_warning', 'horizon_type'],
  scenario_created: ['scenario_type'],
  warning_opened: ['warning_type'],
  export_requested: ['format'],
} as const satisfies Record<string, readonly string[]>;

export type EventName = keyof typeof ALLOWED;
type PropValue = string | boolean | number;
export interface RecordedEvent {
  name: EventName;
  props: Record<string, PropValue>;
}

const events: RecordedEvent[] = [];

export function track(name: EventName, props: Record<string, unknown> = {}): void {
  const allowedKeys: readonly string[] = ALLOWED[name];
  const clean: Record<string, PropValue> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!allowedKeys.includes(key)) continue;
    if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
      clean[key] = value;
    }
  }
  events.push({ name, props: clean });
}

export function getRecordedEvents(): readonly RecordedEvent[] {
  return events;
}

export function clearRecordedEvents(): void {
  events.length = 0;
}
