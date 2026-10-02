import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  deriveForecastInput,
  resolvePlan,
  type Employment,
  type ExpenseItem,
  type IncomeItem,
  type Plan,
  type SavingsGoal,
} from '../domain/budgetModel';
import { todayISO, type ISODate } from '../domain/dates';
import type { Fils } from '../domain/money';
import {
  canCloseCycle,
  closeCycle,
  cycleResult,
  deposit,
  withdraw,
  type CycleResult,
} from '../domain/savingsBalance';
import { computeForecast, type ForecastResult } from '../domain/prototypeForecast';
import { remindersFor, type Reminder } from '../domain/reminders';
import { SAMPLE_PLAN, SCENARIO_PRESET } from '../domain/sampleData';

interface PrototypeState {
  /** Today's date (device clock), used to turn real dates into days. */
  today: ISODate;
  /** The plan with real dates resolved to relative days for `today`. Edit through the actions below. */
  plan: Plan;
  /** Bill reminders, soonest due first (in-app only). */
  reminders: Reminder[];
  setNumbers: (n: { balance: Fils; safetyBuffer: Fils }) => void;
  /** Add (unknown id) or replace (known id) an item. Nothing is persisted: prototype memory only. */
  upsertExpense: (item: ExpenseItem) => void;
  removeExpense: (id: string) => void;
  upsertIncome: (item: IncomeItem) => void;
  removeIncome: (id: string) => void;
  upsertGoal: (goal: SavingsGoal) => void;
  removeGoal: (id: string) => void;
  setEmployment: (e: Employment) => void;
  /** Add money to current savings. */
  addToSavings: (amount: Fils, note: string) => void;
  /** Take money out of current savings. Refuses more than is saved. */
  takeFromSavings: (amount: Fils, note: string) => 'ok' | 'insufficient' | 'invalid';
  /** Add this pay cycle's result (income minus spending) to savings. False if already added. */
  closePayCycle: () => boolean;
  /** The estimated result of the current pay cycle, and whether it can still be added. */
  cycle: CycleResult & { canClose: boolean };
  /** True only the first time it is called, so onboarding_completed is recorded once per session. */
  claimOnboardingCompletion: () => boolean;
  resetToSample: () => void;
  scenarioOn: boolean;
  setScenarioOn: (on: boolean) => void;
  /** Real plan. A what-if never mutates this. */
  baseline: ForecastResult;
  /** Baseline plus the what-if purchase; equals baseline numbers when the scenario is off. */
  scenario: ForecastResult;
}

const Ctx = createContext<PrototypeState | null>(null);

function upsert<T extends { id: string }>(list: readonly T[], item: T): T[] {
  return list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? item : x))
    : [...list, item];
}

export function PrototypeProvider({
  children,
  today: todayOverride,
}: {
  children: ReactNode;
  today?: ISODate;
}) {
  const [rawPlan, setPlan] = useState<Plan>(SAMPLE_PLAN);
  // The device clock is read once per session; tests pass a fixed date.
  const [today] = useState<ISODate>(todayOverride ?? todayISO);
  const [scenarioOn, setScenarioOn] = useState(false);
  const onboardingTracked = useRef(false);

  const value = useMemo<PrototypeState>(() => {
    const plan = resolvePlan(rawPlan, today);
    const input = deriveForecastInput(plan);
    const baseline = computeForecast(input);
    const scenario = scenarioOn
      ? computeForecast({
          ...input,
          plannedExpenses: input.plannedExpenses + SCENARIO_PRESET.amount,
        })
      : baseline;
    return {
      today,
      plan,
      reminders: remindersFor(plan, today),
      setNumbers: (n) =>
        setPlan((p) => ({ ...p, availableCash: n.balance, safetyBuffer: n.safetyBuffer })),
      upsertExpense: (item) => setPlan((p) => ({ ...p, expenses: upsert(p.expenses, item) })),
      removeExpense: (id) =>
        setPlan((p) => ({ ...p, expenses: p.expenses.filter((e) => e.id !== id) })),
      upsertIncome: (item) => setPlan((p) => ({ ...p, income: upsert(p.income, item) })),
      removeIncome: (id) => setPlan((p) => ({ ...p, income: p.income.filter((i) => i.id !== id) })),
      upsertGoal: (goal) => setPlan((p) => ({ ...p, goals: upsert(p.goals, goal) })),
      removeGoal: (id) => setPlan((p) => ({ ...p, goals: p.goals.filter((g) => g.id !== id) })),
      setEmployment: (e) => setPlan((p) => ({ ...p, employment: e })),
      addToSavings: (amount, note) =>
        setPlan((p) => ({ ...p, savings: deposit(p.savings, amount, today, note) })),
      takeFromSavings: (amount, note) => {
        const r = withdraw(rawPlan.savings, amount, today, note);
        if (!r.ok) return r.reason;
        setPlan((p) => ({ ...p, savings: r.account }));
        return 'ok';
      },
      closePayCycle: () => {
        const next = closeCycle(plan, today);
        if (!next) return false;
        setPlan((p) => ({ ...p, savings: next }));
        return true;
      },
      cycle: { ...cycleResult(plan), canClose: canCloseCycle(plan, today) },
      claimOnboardingCompletion: () => {
        if (onboardingTracked.current) return false;
        onboardingTracked.current = true;
        return true;
      },
      resetToSample: () => setPlan(SAMPLE_PLAN),
      scenarioOn,
      setScenarioOn,
      baseline,
      scenario,
    };
  }, [rawPlan, today, scenarioOn]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrototype(): PrototypeState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePrototype must be used inside PrototypeProvider');
  return ctx;
}
