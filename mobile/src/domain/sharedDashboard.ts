import type { Plan } from './budgetModel';
import { aedToFils, type Fils } from './money';

/**
 * Shared dashboard (PREVIEW). Pure functions. Sharing here is a mock-up on one device: the "partner" is a made-up
 * person and nothing is stored or sent. The real feature needs accounts and a server (Phase 2).
 *
 * A shared item is identified by a key: `sav:<entryId>` (a savings deposit), `goal:<id>` (a savings goal) or
 * `exp:<id>` (a bill or everyday budget).
 */
export type SharedSection = 'savings' | 'spending' | 'upcoming';
export type SharedOwner = 'me' | 'partner';

export interface SharedLine {
  key: string;
  owner: SharedOwner;
  section: SharedSection;
  label: string;
  amount: Fils;
  /** Upcoming spending only: days from today until it is due. */
  dueInDays?: number;
}

export interface SamplePartner {
  name: string;
  lines: readonly Omit<SharedLine, 'owner'>[];
}

/** Made-up partner used by the preview. Not a real person. */
export const SAMPLE_PARTNER: SamplePartner = {
  name: 'Sara (sample)',
  lines: [
    { key: 'p:holiday', section: 'savings', label: 'Holiday fund', amount: aedToFils(8000) },
    { key: 'p:groceries', section: 'spending', label: 'Groceries budget', amount: aedToFils(2500) },
    {
      key: 'p:school',
      section: 'upcoming',
      label: 'School fees',
      amount: aedToFils(4500),
      dueInDays: 12,
    },
  ],
};

export function sharedKey(kind: 'sav' | 'goal' | 'exp', id: string): string {
  return `${kind}:${id}`;
}

/** The user's own shared lines, resolved from the plan. Keys for deleted items are skipped. */
export function mySharedLines(plan: Plan, keys: readonly string[]): SharedLine[] {
  const out: SharedLine[] = [];
  for (const key of keys) {
    const [kind, ...rest] = key.split(':');
    const id = rest.join(':');
    if (kind === 'sav') {
      const e = plan.savings.entries.find((x) => x.id === id);
      if (e && e.change > 0)
        out.push({
          key,
          owner: 'me',
          section: 'savings',
          label: e.note || 'Added to savings',
          amount: e.change,
        });
    } else if (kind === 'goal') {
      const g = plan.goals.find((x) => x.id === id);
      if (g) out.push({ key, owner: 'me', section: 'savings', label: g.name, amount: g.saved });
    } else if (kind === 'exp') {
      const x = plan.expenses.find((e) => e.id === id);
      if (!x) continue;
      out.push(
        x.kind === 'fixed'
          ? {
              key,
              owner: 'me',
              section: 'upcoming',
              label: x.name,
              amount: x.amount,
              dueInDays: x.nextDueInDays,
            }
          : { key, owner: 'me', section: 'spending', label: x.name, amount: x.amount },
      );
    }
  }
  return out;
}

export interface SectionView {
  section: SharedSection;
  lines: SharedLine[];
  mine: Fils;
  partner: Fils;
  combined: Fils;
}

export interface SharedView {
  sections: Record<SharedSection, SectionView>;
  /** True when nobody has shared anything yet. */
  empty: boolean;
}

export function buildSharedView(
  plan: Plan,
  keys: readonly string[],
  partner: SamplePartner = SAMPLE_PARTNER,
): SharedView {
  const all: SharedLine[] = [
    ...mySharedLines(plan, keys),
    ...partner.lines.map((l) => ({ ...l, owner: 'partner' as const })),
  ];
  const make = (section: SharedSection): SectionView => {
    const lines = all
      .filter((l) => l.section === section)
      .sort(
        (a, b) =>
          (a.dueInDays ?? Number.MAX_SAFE_INTEGER) - (b.dueInDays ?? Number.MAX_SAFE_INTEGER) ||
          b.amount - a.amount,
      );
    const mine = lines.filter((l) => l.owner === 'me').reduce((s, l) => s + l.amount, 0);
    const theirs = lines.filter((l) => l.owner === 'partner').reduce((s, l) => s + l.amount, 0);
    return { section, lines, mine, partner: theirs, combined: mine + theirs };
  };
  return {
    sections: { savings: make('savings'), spending: make('spending'), upcoming: make('upcoming') },
    empty: keys.length === 0,
  };
}
