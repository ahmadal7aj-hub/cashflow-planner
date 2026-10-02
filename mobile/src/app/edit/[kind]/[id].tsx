import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { DateField } from '../../../components/dates';
import { ChipGroup, Field } from '../../../components/forms';
import { ReminderPicker } from '../../../components/ReminderPicker';
import { Body, Button, Heading, Screen } from '../../../components/ui';
import {
  FREQUENCIES,
  FREQUENCY_LABELS,
  MAX_HORIZON_DAYS,
  nextId,
  type Employment,
  type ExpenseItem,
  type Frequency,
  type IncomeItem,
  type SavingsGoal,
} from '../../../domain/budgetModel';
import { addDays, daysBetween, nextOnOrAfter, type ISODate } from '../../../domain/dates';
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

const FREQUENCY_OPTIONS = FREQUENCIES.map((f) => ({ value: f, label: FREQUENCY_LABELS[f] }));

/** Categories where the user names the expense themselves instead of getting a preset name. */
const OPEN_NAME_CATEGORIES = ['other', 'other_bill'];

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
  const { plan, today, upsertExpense, removeExpense } = usePrototype();
  const categories = EXPENSE_CATEGORIES.filter((c) => c.kind === kind);
  const first = categories[0]!;
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? first.id);
  const [name, setName] = useState(existing?.name ?? first.label);
  const [amount, setAmount] = useState(existing ? toInput(existing.amount) : '');
  const [frequency, setFrequency] = useState<Frequency>(existing?.frequency ?? first.frequency);
  const [dueDate, setDueDate] = useState<ISODate | null>(
    existing?.dueDate ?? (existing ? addDays(today, existing.nextDueInDays) : null),
  );
  const [reminder, setReminder] = useState<number | undefined>(existing?.reminderDaysBefore);
  const [spent, setSpent] = useState(existing ? toInput(existing.spentSoFar) : '0');
  const [essential, setEssential] = useState<'yes' | 'no'>(
    (existing?.essential ?? first.essential) ? 'yes' : 'no',
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const pickCategory = (cid: string) => {
    setCategoryId(cid);
    if (!existing) {
      const c = getExpenseCategory(cid);
      // "Other" categories start with an empty name so the user types what the expense really is.
      setName(OPEN_NAME_CATEGORIES.includes(cid) ? '' : c.label);
      setFrequency(c.frequency);
      setEssential(c.essential ? 'yes' : 'no');
    }
  };

  const save = () => {
    const a = parseAmountToFils(amount);
    const s = parseAmountToFils(spent);
    const next: Record<string, string | undefined> = {};
    if (name.trim() === '') next.name = t.edit.errorName;
    if (!a.ok || a.fils <= 0) next.amount = t.edit.errorAmount;
    if (kind === 'variable' && !s.ok) next.spent = t.edit.errorAmount;
    if (kind === 'fixed') {
      if (dueDate === null) next.date = t.dates.errorDueDate;
      else if (frequency === 'once' && daysBetween(today, dueDate) < 0)
        next.date = t.dates.errorPastOneOff;
    }
    setErrors(next);
    if (Object.keys(next).length > 0 || !a.ok) return;

    upsertExpense({
      id: existing?.id ?? nextId('exp', plan.expenses),
      name: name.trim(),
      categoryId,
      amount: a.fils,
      frequency: kind === 'variable' ? 'monthly' : frequency,
      nextDueInDays: kind === 'fixed' && dueDate ? daysBetween(today, dueDate) : 0,
      kind,
      essential: essential === 'yes',
      spentSoFar: kind === 'variable' && s.ok ? s.fils : 0,
      ...(kind === 'fixed' && dueDate ? { dueDate } : {}),
      ...(kind === 'fixed' && reminder !== undefined ? { reminderDaysBefore: reminder } : {}),
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
          <DateField
            label={t.dates.dueDate}
            hint={t.dates.dueDateHint}
            testID="due-date"
            value={dueDate}
            today={today}
            onChange={setDueDate}
            error={errors.date}
            {...(frequency === 'once' ? { minDate: today } : {})}
          />
          <ReminderPicker dueDate={dueDate} today={today} value={reminder} onChange={setReminder} />
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
  const { plan, today, upsertIncome, removeIncome } = usePrototype();
  const first = INCOME_CATEGORIES[0]!;
  const [kind, setKind] = useState<IncomeKind>(existing?.kind ?? first.id);
  const [name, setName] = useState(existing?.name ?? first.label);
  const [amount, setAmount] = useState(existing ? toInput(existing.amount) : '');
  const [frequency, setFrequency] = useState<Frequency>(existing?.frequency ?? first.frequency);
  const [nextDate, setNextDate] = useState<ISODate | null>(
    existing?.nextDate ?? (existing ? addDays(today, existing.nextInDays) : null),
  );
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
    const next: Record<string, string | undefined> = {};
    if (name.trim() === '') next.name = t.edit.errorName;
    if (!a.ok || a.fils <= 0) next.amount = t.edit.errorAmount;
    // Days until the next payment on or after today (recurring dates roll forward).
    const days = nextDate
      ? daysBetween(today, nextOnOrAfter(nextDate, frequency, today))
      : undefined;
    if (nextDate === null) next.date = t.dates.errorDueDate;
    else if (kind === 'salary' && days !== undefined && days > MAX_HORIZON_DAYS)
      next.date = t.dates.errorSalaryDate;
    setErrors(next);
    if (Object.keys(next).length > 0 || !a.ok || nextDate === null || days === undefined) return;

    upsertIncome({
      id: existing?.id ?? nextId('inc', plan.income),
      name: name.trim(),
      kind,
      amount: a.fils,
      frequency,
      nextInDays: days,
      nextDate,
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
      <DateField
        label={t.dates.nextPayment}
        {...(kind === 'salary' ? { hint: t.edit.salaryNote } : {})}
        testID="next-date"
        value={nextDate}
        today={today}
        onChange={setNextDate}
        error={errors.date}
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
  const { plan, today, upsertGoal, removeGoal } = usePrototype();
  const [name, setName] = useState(existing?.name ?? '');
  const [target, setTarget] = useState(existing ? toInput(existing.target) : '');
  const [saved, setSaved] = useState(existing ? toInput(existing.saved) : '0');
  const [monthly, setMonthly] = useState(existing ? toInput(existing.monthlyContribution) : '0');
  const [deadline, setDeadline] = useState<ISODate | null>(
    existing?.targetDate ??
      (existing?.targetInDays !== undefined ? addDays(today, existing.targetInDays) : null),
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
    const next: Record<string, string | undefined> = {};
    if (name.trim() === '') next.name = t.edit.errorName;
    if (!tg.ok || tg.fils <= 0) next.target = t.edit.errorAmount;
    if (!sv.ok) next.saved = t.edit.errorAmount;
    if (!mo.ok) next.monthly = t.edit.errorAmount;
    setErrors(next);
    if (Object.keys(next).length > 0 || !tg.ok || !sv.ok || !mo.ok) return;

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
            ...(g.targetDate === undefined ? {} : { targetDate: g.targetDate }),
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
      ...(deadline
        ? { targetDate: deadline, targetInDays: Math.max(0, daysBetween(today, deadline)) }
        : {}),
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
      <DateField
        label={t.dates.deadline}
        testID="deadline"
        value={deadline}
        today={today}
        minDate={today}
        onChange={setDeadline}
        onClear={() => setDeadline(null)}
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
