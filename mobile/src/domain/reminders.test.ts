import { resolvePlan, type ExpenseItem, type Plan } from './budgetModel';
import { aedToFils } from './money';
import { activeReminders, remindersFor } from './reminders';
import { SAMPLE_PLAN } from './sampleData';

const TODAY = '2026-10-03';

const bill = (over: Partial<ExpenseItem>): ExpenseItem => ({
  id: 'rent',
  name: 'Rent',
  categoryId: 'rent',
  amount: aedToFils(3500),
  frequency: 'monthly',
  nextDueInDays: 0,
  kind: 'fixed',
  essential: true,
  spentSoFar: 0,
  ...over,
});

const planWith = (expenses: ExpenseItem[]): Plan => ({ ...SAMPLE_PLAN, expenses });

describe('resolvePlan', () => {
  it('turns a due date into days from today', () => {
    const plan = planWith([bill({ dueDate: '2026-12-15', frequency: 'once' })]);
    const e = resolvePlan(plan, TODAY).expenses[0]!;
    expect(e.nextDueInDays).toBe(73);
  });

  it('rolls a recurring bill forward to its next occurrence', () => {
    const plan = planWith([bill({ dueDate: '2026-06-15', frequency: 'monthly' })]);
    expect(resolvePlan(plan, TODAY).expenses[0]!.nextDueInDays).toBe(12); // 15 Oct
  });

  it('leaves a past one-off bill in the past so it is not reserved again', () => {
    const plan = planWith([bill({ dueDate: '2026-09-20', frequency: 'once' })]);
    expect(resolvePlan(plan, TODAY).expenses[0]!.nextDueInDays).toBe(-13);
  });

  it('resolves income dates and goal deadlines', () => {
    const plan: Plan = {
      ...SAMPLE_PLAN,
      income: SAMPLE_PLAN.income.map((i) =>
        i.id === 'salary' ? { ...i, nextDate: '2026-10-28' } : i,
      ),
      goals: SAMPLE_PLAN.goals.map((g) =>
        g.id === 'travel' ? { ...g, targetDate: '2027-03-03' } : g,
      ),
    };
    const r = resolvePlan(plan, TODAY);
    expect(r.income.find((i) => i.id === 'salary')!.nextInDays).toBe(25);
    expect(r.goals.find((g) => g.id === 'travel')!.targetInDays).toBe(151);
  });

  it('never gives a goal a negative deadline', () => {
    const plan: Plan = {
      ...SAMPLE_PLAN,
      goals: SAMPLE_PLAN.goals.map((g) =>
        g.id === 'travel' ? { ...g, targetDate: '2026-01-01' } : g,
      ),
    };
    expect(resolvePlan(plan, TODAY).goals.find((g) => g.id === 'travel')!.targetInDays).toBe(0);
  });

  it('leaves undated items exactly as they were', () => {
    expect(resolvePlan(SAMPLE_PLAN, TODAY)).toEqual(SAMPLE_PLAN);
  });

  it('does not mutate its input', () => {
    const before = JSON.stringify(SAMPLE_PLAN);
    resolvePlan(SAMPLE_PLAN, TODAY);
    expect(JSON.stringify(SAMPLE_PLAN)).toBe(before);
  });
});

describe('reminders', () => {
  it('shows a reminder from its reminder date up to the due date', () => {
    // Rent due 15 Dec 2026, remind 1 week before = from 8 Dec.
    const plan = planWith([
      bill({ dueDate: '2026-12-15', frequency: 'once', reminderDaysBefore: 7 }),
    ]);
    const r = (today: string) => remindersFor(plan, today)[0];
    expect(r('2026-12-07')?.active).toBe(false);
    expect(r('2026-12-08')?.active).toBe(true);
    expect(r('2026-12-15')?.active).toBe(true);
    expect(r('2026-12-15')?.reminderDate).toBe('2026-12-08');
    expect(r('2026-12-16')).toBeUndefined(); // a past one-off bill disappears
  });

  it('reports the date the reminder starts and the days left', () => {
    const plan = planWith([
      bill({ dueDate: '2026-12-15', frequency: 'once', reminderDaysBefore: 3 }),
    ]);
    expect(remindersFor(plan, TODAY)[0]).toMatchObject({
      dueDate: '2026-12-15',
      reminderDate: '2026-12-12',
      daysUntilDue: 73,
      daysBefore: 3,
      active: false,
    });
  });

  it('a reminder on the day itself becomes active on the due date only', () => {
    const plan = planWith([
      bill({ dueDate: '2026-10-10', frequency: 'once', reminderDaysBefore: 0 }),
    ]);
    expect(remindersFor(plan, '2026-10-09')[0]?.active).toBe(false);
    expect(remindersFor(plan, '2026-10-10')[0]?.active).toBe(true);
  });

  it('keeps reminding for the next occurrence of a monthly bill', () => {
    const plan = planWith([
      bill({ dueDate: '2026-06-15', frequency: 'monthly', reminderDaysBefore: 5 }),
    ]);
    expect(remindersFor(plan, '2026-10-12')[0]).toMatchObject({
      dueDate: '2026-10-15',
      reminderDate: '2026-10-10',
      active: true,
    });
    expect(remindersFor(plan, '2026-10-16')[0]).toMatchObject({
      dueDate: '2026-11-15',
      active: false,
    });
  });

  it('ignores bills with no reminder and everyday budgets', () => {
    const plan = planWith([bill({}), bill({ id: 'g', kind: 'variable', reminderDaysBefore: 3 })]);
    expect(remindersFor(plan, TODAY)).toEqual([]);
  });

  it('falls back to the relative due day when there is no real date', () => {
    const plan = planWith([bill({ nextDueInDays: 4, reminderDaysBefore: 7 })]);
    expect(remindersFor(plan, TODAY)[0]).toMatchObject({ dueDate: '2026-10-07', active: true });
  });

  it('sorts soonest first and filters active ones', () => {
    const plan = planWith([
      bill({
        id: 'a',
        name: 'Later',
        dueDate: '2026-10-20',
        frequency: 'once',
        reminderDaysBefore: 30,
      }),
      bill({
        id: 'b',
        name: 'Sooner',
        dueDate: '2026-10-08',
        frequency: 'once',
        reminderDaysBefore: 10,
      }),
      bill({
        id: 'c',
        name: 'Far',
        dueDate: '2026-12-01',
        frequency: 'once',
        reminderDaysBefore: 1,
      }),
    ]);
    expect(remindersFor(plan, TODAY).map((r) => r.name)).toEqual(['Sooner', 'Later', 'Far']);
    expect(activeReminders(plan, TODAY).map((r) => r.name)).toEqual(['Sooner', 'Later']);
  });
});
