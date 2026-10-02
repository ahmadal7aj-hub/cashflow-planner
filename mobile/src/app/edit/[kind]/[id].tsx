import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { ChipGroup, Field } from '../../../components/forms';
import { Body, Button, Heading, Screen } from '../../../components/ui';
import {
  FREQUENCIES,
  FREQUENCY_LABELS,
  nextId,
  type Employment,
  type ExpenseItem,
  type Frequency,
  type IncomeItem,
  type SavingsGoal,
} from '../../../domain/budgetModel';
import { formatAed, parseAmountToFils, type Fils } from '../../../domain/money';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getExpenseCategory,
  getIncomeCategory,
  type IncomeKind,
} from '../../../domain/uaeCategories';
import { t } from '../../../i18n/strings';
import { usePrototype } from '../../../state/PrototypeContext';

type Kind = 'income' | 'fixed' | 'variable' | 'goal' | 'employment';

function isKind(v: string | undefined): v is Kind {
  return v === 'income' || v === 'fixed' || v === 'variable' || v === 'goal' || v === 'employment';
}

const toInput = (fils: Fils) => formatAed(fils).replace('AED ', '').replace(/,/g, '');

/** Whole days 0..365. Returns undefined when invalid. */
function parseDays(s: string): number | undefined {
  if (!/^\d+$/.test(s.trim())) return undefined;
  const n = Number(s.trim());
  return n >= 0 && n <= 365 ? n : undefined;
}

const FREQUENCY_OPTIONS = FREQUENCIES.map((f) => ({ value: f, label: FREQUENCY_LABELS[f] }));

export default function EditItem() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  const navigation = useNavigation();
  const store = usePrototype();
  const isNew = id === 'new';

  useEffect(() => {
    navigation.setOptions({ title: isNew ? t.edit.titleNew : t.edit.titleEdit });
  }, [navigation, isNew]);

  if (!isKind(kind)) return <NotFound />;
  if (kind === 'employment') return <EmploymentForm existing={store.plan.employment} />;

  const existing =
    kind === 'income'
      ? store.plan.income.find((i) => i.id === id)
      : kind === 'goal'
        ? store.plan.goals.find((g) => g.id === id)
        : store.plan.expenses.find((e) => e.id === id);
  if (!isNew && !existing) return <NotFound />;

  if (kind === 'income') return <IncomeForm existing={existing as IncomeItem | undefined} />;
  if (kind === 'goal') return <GoalForm existing={existing as SavingsGoal | undefined} />;
  return <ExpenseForm kind={kind} existing={existing as ExpenseItem | undefined} />;
}

function NotFound() {
  return (
    <Screen testID="edit-screen">
      <Body>{t.edit.notFound}</Body>
    </Screen>
  );
}

function ExpenseForm({ kind, existing }: { kind: 'fixed' | 'variable'; existing?: ExpenseItem }) {
  const router = useRouter();
  const { plan, upsertExpense, removeExpense } = usePrototype();
  const categories = EXPENSE_CATEGORIES.filter((c) => c.kind === kind);
  const first = categories[0]!;
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? first.id);
  const [name, setName] = useState(existing?.name ?? first.label);
  const [amount, setAmount] = useState(existing ? toInput(existing.amount) : '');
  const [frequency, setFrequency] = useState<Frequency>(existing?.frequency ?? first.frequency);
  const [nextDue, setNextDue] = useState(String(existing?.nextDueInDays ?? 7));
  const [spent, setSpent] = useState(existing ? toInput(existing.spentSoFar) : '0');
  const [essential, setEssential] = useState<'yes' | 'no'>(
    (existing?.essential ?? first.essential) ? 'yes' : 'no',
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const pickCategory = (cid: string) => {
    setCategoryId(cid);
    if (!existing) {
      const c = getExpenseCategory(cid);
      setName(c.label);
      setFrequency(c.frequency);
      setEssential(c.essential ? 'yes' : 'no');
    }
  };

  const save = () => {
    const a = parseAmountToFils(amount);
    const s = parseAmountToFils(spent);
    const d = parseDays(nextDue);
    const next: Record<string, string | undefined> = {};
    if (name.trim() === '') next.name = t.edit.errorName;
    if (!a.ok || a.fils <= 0) next.amount = t.edit.errorAmount;
    if (kind === 'variable' && !s.ok) next.spent = t.edit.errorAmount;
    if (kind === 'fixed' && d === undefined) next.days = t.edit.errorDays;
    setErrors(next);
    if (Object.keys(next).length > 0 || !a.ok) return;

    upsertExpense({
      id: existing?.id ?? nextId('exp', plan.expenses),
      name: name.trim(),
      categoryId,
      amount: a.fils,
      frequency: kind === 'variable' ? 'monthly' : frequency,
      nextDueInDays: kind === 'fixed' ? (d ?? 0) : 0,
      kind,
      essential: essential === 'yes',
      spentSoFar: kind === 'variable' && s.ok ? s.fils : 0,
    });
    router.back();
  };

  return (
    <Screen testID="edit-screen">
      <Heading>
        {kind === 'fixed' ? t.commitments.sectionFixed : t.commitments.sectionVariable}
      </Heading>
      <ChipGroup
        label={t.edit.category}
        testID="category"
        value={categoryId}
        onChange={pickCategory}
        options={categories.map((c) => ({ value: c.id, label: c.label }))}
      />
      {getExpenseCategory(categoryId).hint ? (
        <Body muted>{getExpenseCategory(categoryId).hint}</Body>
      ) : null}
      <Field
        label={t.edit.name}
        testID="name"
        value={name}
        onChangeText={setName}
        error={errors.name}
      />
      <Field
        label={kind === 'variable' ? t.edit.budgetAmount : t.edit.amount}
        testID="amount"
        value={amount}
        onChangeText={setAmount}
        error={errors.amount}
        keyboardType="decimal-pad"
      />
      {kind === 'fixed' && (
        <>
          <ChipGroup
            label={t.edit.frequency}
            testID="frequency"
            value={frequency}
            onChange={setFrequency}
            options={FREQUENCY_OPTIONS}
          />
          <Field
            label={t.edit.nextDue}
            testID="days"
            value={nextDue}
            onChangeText={setNextDue}
            error={errors.days}
            keyboardType="number-pad"
          />
        </>
      )}
      {kind === 'variable' && (
        <Field
          label={t.edit.spentSoFar}
          testID="spent"
          value={spent}
          onChangeText={setSpent}
          error={errors.spent}
          keyboardType="decimal-pad"
        />
      )}
      <ChipGroup
        label={t.edit.essentialLabel}
        testID="essential"
        value={essential}
        onChange={setEssential}
        options={[
          { value: 'yes', label: t.edit.essentialYes },
          { value: 'no', label: t.edit.essentialNo },
        ]}
      />
      <Button label={t.edit.save} onPress={save} testID="edit-save" />
      {existing && (
        <Button
          label={t.edit.delete}
          variant="secondary"
          testID="edit-delete"
          onPress={() => {
            removeExpense(existing.id);
            router.back();
          }}
        />
      )}
    </Screen>
  );
}

function IncomeForm({ existing }: { existing?: IncomeItem }) {
  const router = useRouter();
  const { plan, upsertIncome, removeIncome } = usePrototype();
  const first = INCOME_CATEGORIES[0]!;
  const [kind, setKind] = useState<IncomeKind>(existing?.kind ?? first.id);
  const [name, setName] = useState(existing?.name ?? first.label);
  const [amount, setAmount] = useState(existing ? toInput(existing.amount) : '');
  const [frequency, setFrequency] = useState<Frequency>(existing?.frequency ?? first.frequency);
  const [nextIn, setNextIn] = useState(String(existing?.nextInDays ?? 30));
  const [stable, setStable] = useState<'yes' | 'no'>(
    (existing?.stable ?? first.stable) ? 'yes' : 'no',
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const pickKind = (k: IncomeKind) => {
    setKind(k);
    if (!existing) {
      const c = getIncomeCategory(k);
      setName(c.label);
      setFrequency(c.frequency);
      setStable(c.stable ? 'yes' : 'no');
    }
  };

  const save = () => {
    const a = parseAmountToFils(amount);
    const d = parseDays(nextIn);
    const next: Record<string, string | undefined> = {};
    if (name.trim() === '') next.name = t.edit.errorName;
    if (!a.ok || a.fils <= 0) next.amount = t.edit.errorAmount;
    if (d === undefined) next.days = t.edit.errorDays;
    setErrors(next);
    if (Object.keys(next).length > 0 || !a.ok || d === undefined) return;

    upsertIncome({
      id: existing?.id ?? nextId('inc', plan.income),
      name: name.trim(),
      kind,
      amount: a.fils,
      frequency,
      nextInDays: d,
      stable: stable === 'yes',
    });
    router.back();
  };

  return (
    <Screen testID="edit-screen">
      <Heading>{t.commitments.sectionIncome}</Heading>
      <ChipGroup
        label={t.edit.category}
        testID="category"
        value={kind}
        onChange={pickKind}
        options={INCOME_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
      />
      <Field
        label={t.edit.name}
        testID="name"
        value={name}
        onChangeText={setName}
        error={errors.name}
      />
      <Field
        label={t.edit.amount}
        testID="amount"
        value={amount}
        onChangeText={setAmount}
        error={errors.amount}
        keyboardType="decimal-pad"
      />
      <ChipGroup
        label={t.edit.frequency}
        testID="frequency"
        value={frequency}
        onChange={setFrequency}
        options={FREQUENCY_OPTIONS}
      />
      <Field
        label={t.edit.nextIncome}
        hint={kind === 'salary' ? t.edit.salaryNote : undefined}
        testID="days"
        value={nextIn}
        onChangeText={setNextIn}
        error={errors.days}
        keyboardType="number-pad"
      />
      <ChipGroup
        label={t.edit.stableLabel}
        testID="stable"
        value={stable}
        onChange={setStable}
        options={[
          { value: 'yes', label: t.edit.stableYes },
          { value: 'no', label: t.edit.stableNo },
        ]}
      />
      <Button label={t.edit.save} onPress={save} testID="edit-save" />
      {existing && (
        <Button
          label={t.edit.delete}
          variant="secondary"
          testID="edit-delete"
          onPress={() => {
            removeIncome(existing.id);
            router.back();
          }}
        />
      )}
    </Screen>
  );
}

function GoalForm({ existing }: { existing?: SavingsGoal }) {
  const router = useRouter();
  const { plan, upsertGoal, removeGoal } = usePrototype();
  const [name, setName] = useState(existing?.name ?? '');
  const [target, setTarget] = useState(existing ? toInput(existing.target) : '');
  const [saved, setSaved] = useState(existing ? toInput(existing.saved) : '0');
  const [monthly, setMonthly] = useState(existing ? toInput(existing.monthlyContribution) : '0');
  const [deadline, setDeadline] = useState(
    existing?.targetInDays !== undefined ? String(existing.targetInDays) : '',
  );
  const [enabled, setEnabled] = useState<'yes' | 'no'>(existing?.enabled === false ? 'no' : 'yes');
  const [emergency, setEmergency] = useState<'yes' | 'no'>(
    existing?.purpose === 'emergency' ? 'yes' : 'no',
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const save = () => {
    const tg = parseAmountToFils(target);
    const sv = parseAmountToFils(saved);
    const mo = parseAmountToFils(monthly);
    const dl = deadline.trim() === '' ? null : parseDays(deadline);
    const next: Record<string, string | undefined> = {};
    if (name.trim() === '') next.name = t.edit.errorName;
    if (!tg.ok || tg.fils <= 0) next.target = t.edit.errorAmount;
    if (!sv.ok) next.saved = t.edit.errorAmount;
    if (!mo.ok) next.monthly = t.edit.errorAmount;
    if (dl === undefined) next.days = t.edit.errorDays;
    setErrors(next);
    if (Object.keys(next).length > 0 || !tg.ok || !sv.ok || !mo.ok || dl === undefined) return;

    const id = existing?.id ?? nextId('goal', plan.goals);
    if (emergency === 'yes') {
      // Only one goal can be the emergency fund: clear the flag on any other goal.
      for (const g of plan.goals) {
        if (g.id !== id && g.purpose === 'emergency') {
          upsertGoal({
            id: g.id,
            name: g.name,
            target: g.target,
            saved: g.saved,
            monthlyContribution: g.monthlyContribution,
            enabled: g.enabled,
            ...(g.targetInDays === undefined ? {} : { targetInDays: g.targetInDays }),
          });
        }
      }
    }
    upsertGoal({
      id,
      name: name.trim(),
      target: tg.fils,
      saved: sv.fils,
      monthlyContribution: mo.fils,
      enabled: enabled === 'yes',
      ...(dl === null ? {} : { targetInDays: dl }),
      ...(emergency === 'yes' ? { purpose: 'emergency' as const } : {}),
    });
    router.back();
  };

  return (
    <Screen testID="edit-screen">
      <Heading>{existing ? existing.name : t.edit.titleNew}</Heading>
      <Field
        label={t.edit.name}
        testID="name"
        value={name}
        onChangeText={setName}
        error={errors.name}
      />
      <Field
        label="Target (AED)"
        testID="target"
        value={target}
        onChangeText={setTarget}
        error={errors.target}
        keyboardType="decimal-pad"
      />
      <Field
        label="Saved so far (AED)"
        testID="saved"
        value={saved}
        onChangeText={setSaved}
        error={errors.saved}
        keyboardType="decimal-pad"
      />
      <Field
        label="Set aside each month (AED)"
        testID="monthly"
        value={monthly}
        onChangeText={setMonthly}
        error={errors.monthly}
        keyboardType="decimal-pad"
      />
      <Field
        label="Deadline in days (optional)"
        testID="days"
        value={deadline}
        onChangeText={setDeadline}
        error={errors.days}
        keyboardType="number-pad"
      />
      <ChipGroup
        label="Include in my forecast?"
        testID="enabled"
        value={enabled}
        onChange={setEnabled}
        options={[
          { value: 'yes', label: 'Yes, set it aside' },
          { value: 'no', label: 'Paused' },
        ]}
      />
      <ChipGroup
        label="Is this your emergency fund?"
        testID="emergency"
        value={emergency}
        onChange={setEmergency}
        options={[
          { value: 'yes', label: 'Yes, this is my emergency fund' },
          { value: 'no', label: 'No' },
        ]}
      />
      <Button label={t.edit.save} onPress={save} testID="edit-save" />
      {existing && (
        <Button
          label={t.edit.delete}
          variant="secondary"
          testID="edit-delete"
          onPress={() => {
            removeGoal(existing.id);
            router.back();
          }}
        />
      )}
    </Screen>
  );
}

function EmploymentForm({ existing }: { existing?: Employment | undefined }) {
  const router = useRouter();
  const { setEmployment } = usePrototype();
  const [years, setYears] = useState(existing ? String(existing.yearsOfService) : '');
  const [basic, setBasic] = useState(existing ? toInput(existing.basicMonthly) : '');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const save = () => {
    const y = /^\d+(\.\d{1,2})?$/.test(years.trim()) ? Number(years.trim()) : undefined;
    const b = parseAmountToFils(basic);
    const next: Record<string, string | undefined> = {};
    if (y === undefined || y > 60) next.years = 'Enter years of service, for example 4 or 4.5.';
    if (!b.ok || b.fils <= 0) next.basic = t.edit.errorAmount;
    setErrors(next);
    if (Object.keys(next).length > 0 || y === undefined || !b.ok) return;
    setEmployment({ yearsOfService: y, basicMonthly: b.fils });
    router.back();
  };

  return (
    <Screen testID="edit-screen">
      <Heading>{t.savings.gratuityTitle}</Heading>
      <Body muted>{t.savings.gratuityNote}</Body>
      <Field
        label="Years of service so far"
        testID="years"
        value={years}
        onChangeText={setYears}
        error={errors.years}
        keyboardType="decimal-pad"
      />
      <Field
        label="Monthly basic wage (AED), not total pay"
        testID="basic"
        value={basic}
        onChangeText={setBasic}
        error={errors.basic}
        keyboardType="decimal-pad"
      />
      <Button label={t.edit.save} onPress={save} testID="edit-save" />
    </Screen>
  );
}
