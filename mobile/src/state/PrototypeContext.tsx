import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Fils } from '../domain/money';
import { computeForecast, type ForecastResult } from '../domain/prototypeForecast';
import { SAMPLE_INPUT, SCENARIO_PRESET } from '../domain/sampleData';

interface PrototypeState {
  balance: Fils;
  savingsReserve: Fils;
  safetyBuffer: Fils;
  setNumbers: (n: { balance: Fils; savingsReserve: Fils; safetyBuffer: Fils }) => void;
  scenarioOn: boolean;
  setScenarioOn: (on: boolean) => void;
  /** Real plan. A what-if never mutates this. */
  baseline: ForecastResult;
  /** Baseline plus the what-if purchase; equals baseline numbers when the scenario is off. */
  scenario: ForecastResult;
}

const Ctx = createContext<PrototypeState | null>(null);

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState<Fils>(SAMPLE_INPUT.availableCash);
  const [savingsReserve, setSavings] = useState<Fils>(SAMPLE_INPUT.savingsReserve);
  const [safetyBuffer, setBuffer] = useState<Fils>(SAMPLE_INPUT.safetyBuffer);
  const [scenarioOn, setScenarioOn] = useState(false);

  const value = useMemo<PrototypeState>(() => {
    const input = { ...SAMPLE_INPUT, availableCash: balance, savingsReserve, safetyBuffer };
    const baseline = computeForecast(input);
    const scenario = scenarioOn
      ? computeForecast({
          ...input,
          plannedExpenses: input.plannedExpenses + SCENARIO_PRESET.amount,
        })
      : baseline;
    return {
      balance,
      savingsReserve,
      safetyBuffer,
      setNumbers: (n) => {
        setBalance(n.balance);
        setSavings(n.savingsReserve);
        setBuffer(n.safetyBuffer);
      },
      scenarioOn,
      setScenarioOn,
      baseline,
      scenario,
    };
  }, [balance, savingsReserve, safetyBuffer, scenarioOn]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrototype(): PrototypeState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePrototype must be used inside PrototypeProvider');
  return ctx;
}
