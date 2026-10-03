import { aedToFils } from './money';
import { SAMPLE_PLAN } from './sampleData';
import { buildSharedView, mySharedLines, SAMPLE_PARTNER, sharedKey } from './sharedDashboard';
import { addSavings, setOpeningSavings } from './planOps';

describe('shared dashboard preview', () => {
  it('shows only the partner sample items when nothing of mine is shared', () => {
    const v = buildSharedView(SAMPLE_PLAN, []);
    expect(v.empty).toBe(true);
    expect(v.sections.savings.mine).toBe(0);
    expect(v.sections.savings.combined).toBe(aedToFils(8000));
    expect(v.sections.upcoming.combined).toBe(aedToFils(4500));
  });

  it('shares a 5,000 savings deposit and combines it with the partner', () => {
    const base = setOpeningSavings(SAMPLE_PLAN, 0, '2026-10-01', '2026-10-03');
    const added = addSavings(base, aedToFils(5000), '2026-10-03', 'Payday saving', '2026-10-03');
    if (!added.ok) throw new Error('setup');
    const plan = added.plan;
    const id = plan.savings.movements.find((m) => m.kind === 'deposit')!.id;
    const v = buildSharedView(plan, [sharedKey('sav', id)]);
    expect(v.sections.savings.mine).toBe(aedToFils(5000));
    expect(v.sections.savings.combined).toBe(aedToFils(13000));
    expect(v.sections.savings.lines.map((l) => l.label)).toContain('Payday saving');
  });

  it('puts a shared bill under upcoming, soonest first, and a budget under spending', () => {
    const v = buildSharedView(SAMPLE_PLAN, [
      sharedKey('exp', 'rent'),
      sharedKey('exp', 'groceries'),
    ]);
    const up = v.sections.upcoming.lines;
    expect(up[0]!.label).toBe('Rent'); // due in 4 days, before the partner's school fees in 12
    expect(up[0]!.dueInDays).toBe(4);
    expect(up.some((l) => l.owner === 'partner')).toBe(true);
    expect(v.sections.upcoming.mine).toBe(aedToFils(3500));
  });

  it('uses a goal as a savings line and skips keys for deleted items', () => {
    const lines = mySharedLines(SAMPLE_PLAN, ['goal:gold', 'exp:does-not-exist', 'sav:nope']);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.section).toBe('savings');
  });

  it('never mixes the two people: totals add up from each side', () => {
    const v = buildSharedView(SAMPLE_PLAN, [sharedKey('goal', 'gold')]);
    const s = v.sections.savings;
    expect(s.combined).toBe(s.mine + s.partner);
    expect(s.partner).toBe(
      SAMPLE_PARTNER.lines.filter((l) => l.section === 'savings').reduce((a, l) => a + l.amount, 0),
    );
  });
});
