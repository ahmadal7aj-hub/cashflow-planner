import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';

import {
  deriveForecastInput,
  emptyPlan,
  resolvePlan,
  type Employment,
  type ExpenseItem,
  type IncomeItem,
  type Investment,
  type Plan,
  type SavingsGoal,
  type Transaction,
} from '../domain/budgetModel';
import { todayISO, type ISODate } from '../domain/dates';
import type { Fils } from '../domain/money';
import { monthEnd, monthOf, monthStart } from '../domain/months';
import { loadPlan, savePlan, type KeyValueStore } from '../domain/persistence';
import {
  addSavings,
  addTransaction,
  markBillPaid,
  removeExpenseItem,
  removeIncomeItem,
  removeSavingsMovement,
  removeTransaction,
  setOpeningSavings,
  setSavingsTarget,
  updateTransaction,
  upsertExpenseItem,
  upsertIncomeItem,
  withdrawSavings,
} from '../domain/planOps';
import { computeForecast, type ForecastResult } from '../domain/prototypeForecast';
import { remindersFor, type Reminder } from '../domain/reminders';
import { demoPlan, SCENARIO_PRESET } from '../domain/sampleData';
import { maintainSavings } from '../domain/savingsEngine';
import { transactionsBetween } from '../domain/spending';
import { useTheme } from '../theme/ThemeProvider';
import { getTestSeed } from './testSeed';

/** Sharing preview state: one device, a made-up partner, nothing stored or sent. */
export interface SharingState {
  linked: boolean;
  /** The username the user typed when linking (shown back to them). */
  partnerUsername: string;
  /** Keys of the items the user chose to share (see domain/sharedDashboard). */
  sharedKeys: readonly string[];
}

export type SavingsOutcome = 'ok' | 'amount' | 'no-opening' | 'before-opening' | 'insufficient';

interface PrototypeState {
  /** Today's date (device clock, the user's own time zone). */
  today: ISODate;
  /** The saved plan with real dates resolved to relative days for `today`. Edit through the actions below. */
  plan: Plan;
  /** Bill reminders, soonest due first (in-app only). */
  reminders: Reminder[];
  setNumbers: (n: { balance: Fils; safetyBuffer: Fils }) => void;
  /** First-run questions: existing savings balance (zero allowed), its date, and the monthly target. */
  completeSetup: (s: { opening: Fils; openingDate: ISODate; target: Fils }) => void;
  setOpening: (amount: Fils, date: ISODate) => void;
  setTarget: (amount: Fils) => void;
  /** Add (unknown id) or replace (known id) an item. History is kept; see domain/planOps. */
  upsertExpense: (item: ExpenseItem) => void;
  removeExpense: (id: string) => void;
  upsertIncome: (item: IncomeItem) => void;
  removeIncome: (id: string) => void;
  addSpending: (t: Omit<Transaction, 'id'>) => void;
  updateSpending: (t: Transaction) => void;
  removeSpending: (id: string) => void;
  payBill: (billId: string, due: ISODate, paidOn: ISODate) => void;
  upsertGoal: (goal: SavingsGoal) => void;
  removeGoal: (id: string) => void;
  sharing: SharingState;
  linkPartner: (username: string) => void;
  unlinkPartner: () => void;
  setShared: (key: string, shared: boolean) => void;
  setEmployment: (e: Employment) => void;
  upsertInvestment: (inv: Investment) => void;
  removeInvestment: (id: string) => void;
  /** Adds to savings. When `share` is true the new deposit is also shared on the Shared dashboard. */
  addToSavings: (amount: Fils, note: string, date: ISODate, share?: boolean) => SavingsOutcome;
  takeFromSavings: (amount: Fils, note: string, date: ISODate) => SavingsOutcome;
  removeSavingsEntry: (id: string) => void;
  /** True only the first time it is called, so onboarding_completed is recorded once per session. */
  claimOnboardingCompletion: () => boolean;
  /** Replaces the plan with the demo sample data. For demos and interviews only. */
  loadSampleData: () => void;
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

/** Spent this month per variable budget, so the safe-to-spend forecast subtracts what is already spent. */
function withSpentFromTransactions(plan: Plan, today: ISODate): Plan {
  const month = monthOf(today);
  const spent = new Map<string, Fils>();
  for (const t of transactionsBetween(plan, monthStart(month), monthEnd(month))) {
    spent.set(t.categoryId, (spent.get(t.categoryId) ?? 0) + t.amount);
  }
  const used = new Set<string>();
  return {
    ...plan,
    expenses: plan.expenses.map((e) => {
      if (e.kind !== 'variable' || used.has(e.categoryId)) return { ...e, spentSoFar: 0 };
      used.add(e.categoryId);
      return { ...e, spentSoFar: spent.get(e.categoryId) ?? 0 };
    }),
  };
}

const deviceStore: KeyValueStore = AsyncStorage;

function LoadingCover() {
  const { colors } = useTheme();
  return (
    <View
      testID="loading-cover"
      accessibilityLabel="Loading your saved data"
      style={{ ...StyleSheet.absoluteFill, backgroundColor: colors.background }}
    />
  );
}

export function PrototypeProvider({
  children,
  today: todayOverride,
  initialPlan,
  storage,
}: {
  children: ReactNode;
  today?: ISODate;
  /** Start from this plan and skip reading the device storage (tests). */
  initialPlan?: Plan;
  /** Where the plan is saved. Defaults to the device storage. */
  storage?: KeyValueStore;
}) {
  // The device clock is read once per session; tests pass a fixed date.
  const [today] = useState<ISODate>(todayOverride ?? todayISO);
  const seeded = initialPlan ?? getTestSeed();
  const store = storage ?? deviceStore;
  const [rawPlan, setRawPlan] = useState<Plan>(() =>
    seeded ? maintainSavings(seeded, today) : emptyPlan(),
  );
  const [ready, setReady] = useState<boolean>(seeded !== undefined);
  // Data written by a newer app version is never overwritten.
  const canSave = useRef(true);
  const loaded = useRef(seeded !== undefined);
  const [scenarioOn, setScenarioOn] = useState(false);
  const [sharing, setSharing] = useState<SharingState>({
    linked: false,
    partnerUsername: '',
    sharedKeys: [],
  });
  const onboardingTracked = useRef(false);

  useEffect(() => {
    if (seeded !== undefined) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await loadPlan(store, new Date().toISOString().replace(/[:.]/g, '-'));
        if (cancelled) return;
        if (r.status === 'ok') setRawPlan(maintainSavings(r.plan, today));
        else if (r.status === 'newer-version') canSave.current = false;
      } catch {
        // Storage unavailable: carry on in memory rather than blocking the app.
      }
      if (!cancelled) {
        loaded.current = true;
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seeded, store, today]);

  useEffect(() => {
    if (!ready || !loaded.current || !canSave.current) return;
    savePlan(store, rawPlan).catch(() => undefined);
  }, [rawPlan, ready, store]);

  const value = useMemo<PrototypeState>(() => {
    const edit = (fn: (p: Plan) => Plan) => setRawPlan((p) => fn(p));
    const plan = resolvePlan(withSpentFromTransactions(rawPlan, today), today);
    const input = deriveForecastInput(plan);
    const baseline = computeForecast(input);
    const scenario = scenarioOn
      ? computeForecast({
          ...input,
          plannedExpenses: input.plannedExpenses + SCENARIO_PRESET.amount,
        })
      : baseline;

    const savingsAction = (
      run: (p: Plan) => ReturnType<typeof addSavings>,
      onOk?: (next: Plan) => void,
    ): SavingsOutcome => {
      const r = run(rawPlan);
      if (!r.ok) return r.reason as SavingsOutcome;
      setRawPlan(r.plan);
      onOk?.(r.plan);
      return 'ok';
    };

    return {
      today,
      plan,
      reminders: remindersFor(plan, today),
      setNumbers: (n) =>
        edit((p) => ({ ...p, availableCash: n.balance, safetyBuffer: n.safetyBuffer })),
      completeSetup: (s) =>
        edit((p) =>
          setSavingsTarget(
            { ...setOpeningSavings(p, s.opening, s.openingDate, today), setupDone: true },
            s.target,
            today,
          ),
        ),
      setOpening: (amount, date) => edit((p) => setOpeningSavings(p, amount, date, today)),
      setTarget: (amount) => edit((p) => setSavingsTarget(p, amount, today)),
      upsertExpense: (item) => edit((p) => upsertExpenseItem(p, item, today)),
      removeExpense: (id) => edit((p) => removeExpenseItem(p, id, today)),
      upsertIncome: (item) => edit((p) => upsertIncomeItem(p, item, today)),
      removeIncome: (id) => edit((p) => removeIncomeItem(p, id, today)),
      addSpending: (t) => edit((p) => addTransaction(p, t, today)),
      updateSpending: (t) => edit((p) => updateTransaction(p, t, today)),
      removeSpending: (id) => edit((p) => removeTransaction(p, id, today)),
      payBill: (billId, due, paidOn) => edit((p) => markBillPaid(p, billId, due, paidOn, today)),
      upsertGoal: (goal) => edit((p) => ({ ...p, goals: upsert(p.goals, goal) })),
      removeGoal: (id) => edit((p) => ({ ...p, goals: p.goals.filter((g) => g.id !== id) })),
      setEmployment: (e) => edit((p) => ({ ...p, employment: e })),
      upsertInvestment: (inv) => edit((p) => ({ ...p, investments: upsert(p.investments, inv) })),
      removeInvestment: (id) =>
        edit((p) => ({ ...p, investments: p.investments.filter((v) => v.id !== id) })),
      addToSavings: (amount, note, date, share = false) =>
        savingsAction(
          (p) => addSavings(p, amount, date, note, today),
          (next) => {
            const entry = next.savings.movements.find(
              (m) => m.kind === 'deposit' && !rawPlan.savings.movements.some((o) => o.id === m.id),
            );
            if (share && entry && sharing.linked)
              setSharing((x) => ({ ...x, sharedKeys: [...x.sharedKeys, `sav:${entry.id}`] }));
          },
        ),
      takeFromSavings: (amount, note, date) =>
        savingsAction((p) => withdrawSavings(p, amount, date, note, today)),
      removeSavingsEntry: (id) => edit((p) => removeSavingsMovement(p, id, today)),
      sharing,
      linkPartner: (username) =>
        setSharing({ linked: true, partnerUsername: username.trim(), sharedKeys: [] }),
      unlinkPartner: () => setSharing({ linked: false, partnerUsername: '', sharedKeys: [] }),
      setShared: (key, shared) =>
        setSharing((x) => ({
          ...x,
          sharedKeys: shared
            ? x.sharedKeys.includes(key)
              ? x.sharedKeys
              : [...x.sharedKeys, key]
            : x.sharedKeys.filter((k) => k !== key),
        })),
      claimOnboardingCompletion: () => {
        if (onboardingTracked.current) return false;
        onboardingTracked.current = true;
        return true;
      },
      loadSampleData: () => setRawPlan(maintainSavings(demoPlan(today), today)),
      scenarioOn,
      setScenarioOn,
      baseline,
      scenario,
    };
  }, [rawPlan, today, scenarioOn, sharing]);

  // The screens stay mounted while the saved data loads; an opaque cover hides them and blocks touches, so
  // the navigator is never created late and nothing can be edited before the saved plan is in place.
  return (
    <Ctx.Provider value={value}>
      {children}
      {ready ? null : <LoadingCover />}
    </Ctx.Provider>
  );
}

export function usePrototype(): PrototypeState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePrototype must be used inside PrototypeProvider');
  return ctx;
}
