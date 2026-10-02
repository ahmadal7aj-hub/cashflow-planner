import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  deriveForecastInput,
  type Employment,
  type ExpenseItem,
  type IncomeItem,
  type Plan,
  type SavingsGoal,
} from '../domain/budgetModel';
import type { Fils } from '../domain/money';
import { computeForecast, type ForecastResult } from '../domain/prototypeForecast';
import { SAMPLE_PLAN, SCENARIO_PRESET } from '../domain/sampleData';

interface PrototypeState {
  plan: Plan;
  setNumbers: (n: { balance: Fils; safetyBuffer: Fils }) => void;
  /** Add (unknown id) or replace (known id) an item. Nothing is persisted: prototype memory only. */
  upsertExpense: (item: ExpenseItem) => void;
  removeExpense: (id: string) => void;
  upsertIncome: (item: IncomeItem) => void;
  removeIncome: (id: string) => void;
  upsertGoal: (goal: SavingsGoal) => void;
  removeGoal: (id: string) => void;
  setEmployment: (e: Employment) => void;
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

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan>(SAMPLE_PLAN);
  const [scenarioOn, setScenarioOn] = useState(false);

  const value = useMemo<PrototypeState>(() => {
    const input = deriveForecastInput(plan);
    const baseline = computeForecast(input);
    const scenario = scenarioOn
      ? computeForecast({
          ...input,
          plannedExpenses: input.plannedExpenses + SCENARIO_PRESET.amount,
        })
      : baseline;
    return {
      plan,
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
      resetToSample: () => setPlan(SAMPLE_PLAN),
      scenarioOn,
      setScenarioOn,
      baseline,
      scenario,
    };
  }, [plan, scenarioOn]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrototype(): PrototypeState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePrototype must be used inside PrototypeProvider');
  return ctx;
}
