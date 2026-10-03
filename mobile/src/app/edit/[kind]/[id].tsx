import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { DateField } from '../../../components/dates';
import { DeleteButton } from '../../../components/DeleteButton';
import { ChipGroup, Field } from '../../../components/forms';
import { ReminderPicker } from '../../../components/ReminderPicker';
import { ShareToggle } from '../../../components/ShareToggle';
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
  type Investment,
  type InvestmentType,
  type SavingsGoal,
} from '../../../domain/budgetModel';
import { addDays, daysBetween, nextOnOrAfter, type ISODate } from '../../../domain/dates';
import { INVESTMENT_TYPES, getInvestmentType } from '../../../domain/investmentInsights';
import { formatAed, parseAmountToFils, type Fils } from '../../../domain/money';
import { monthlySplit } from '../../../domain/monthlyPlan';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getExpenseCategory,
  getIncomeCategory,
  type IncomeKind,
} from '../../../domain/uaeCategories';
import { sharedKey } from '../../../domain/sharedDashboard';
import { t } from '../../../i18n/strings';
import { usePrototype } from '../../../state/PrototypeContext';

type Kind =
  | 'income'
  | 'fixed'
  | 'variable'
  | 'goal'
  | 'employment'
  | 'savings-in'
  | 'savings-out'
  | 'investment';

const KINDS: readonly string[] = [
  'income',
  'fixed',
  'variable',
  'goal',
  'employment',
  'savings-in',
  'savings-out',
  'investment',
];

function isKind(v: string | undefined): v is Kind {
  return v !== undefined && KINDS.includes(v);
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
  if (kind === 'savings-in' || kind === 'savings-out') {
    return <SavingsMoveForm direction={kind === 'savings-in' ? 'in' : 'out'} />;
  }

  if (kind === 'investment') {
    const inv = store.plan.investments.find((v) => v.id === id);
    if (!isNew && !inv) return <NotFound />;
    return <InvestmentForm existing={inv} />;
  }

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
  const { plan, today, upsertExpense, removeExpense, sharing, setShared } = usePrototype();
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
  const [share, setShare] = useState(
    existing ? sharing.sharedKeys.includes(sharedKey('exp', existing.id)) : false,
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  // What would still be unbudgeted (income - savings - all spending) if this item were saved as typed.
  const typedAmount = parseAmountToFils(amount);
  const unbudgetedAfter = typedAmount.ok
    ? monthlySplit({
        ...plan,
        expenses: existing
          ? plan.expenses.map((e) =>
              e.id === existing.id ? { ...e, amount: typedAmount.fils } : e,
            )
          : [
              ...plan.expenses,
              {
                id: 'preview',
                name,
                categoryId,
                amount: typedAmount.fils,
                frequency: kind === 'variable' ? 'monthly' : frequency,
                nextDueInDays: 0,
                kind,
                essential: essential === 'yes',
                spentSoFar: 0,
              },
            ],
      }).room
    : null;

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
    if (!a.ok) next.amount = t.edit.errorAmount;
    if (kind === 'variable' && !s.ok) next.spent = t.edit.errorAmount;
    if (kind === 'fixed') {
      if (dueDate === null) next.date = t.dates.errorDueDate;
      else if (frequency === 'once' && daysBetween(today, dueDate) < 0)
        next.date = t.dates.errorPastOneOff;
    }
    setErrors(next);
    if (Object.keys(next).length > 0 || !a.ok) return;

    const id = existing?.id ?? nextId('exp', plan.expenses);
    if (sharing.linked) setShared(sharedKey('exp', id), share);
    upsertExpense({
      id,
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
      {unbudgetedAfter !== null ? (
        <Body muted testID="unbudgeted-note">
          {unbudgetedAfter >= 0
            ? t.monthlyPlan.unbudgetedAfter(formatAed(unbudgetedAfter))
            : t.monthlyPlan.overAfter(formatAed(-unbudgetedAfter))}
        </Body>
      ) : null}
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
      <ShareToggle value={share} onChange={setShare} />
      <Button label={t.edit.save} onPress={save} testID="edit-save" />
      {existing && (
        <DeleteButton
          onConfirm={() => {
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
    // Zero is allowed for income: it means "nothing expected this month" (or delete the item).
    if (!a.ok) next.amount = t.edit.errorAmount;
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
        hint={t.edit.incomeZeroHint}
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
        <DeleteButton
          onConfirm={() => {
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
  const { plan, today, upsertGoal, removeGoal, sharing, setShared } = usePrototype();
  const [share, setShare] = useState(
    existing ? sharing.sharedKeys.includes(sharedKey('goal', existing.id)) : false,
  );
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
    if (!tg.ok) next.target = t.edit.errorAmount;
    if (!sv.ok) next.saved = t.edit.errorAmount;
    if (!mo.ok) next.monthly = t.edit.errorAmount;
    setErrors(next);
    if (Object.keys(next).length > 0 || !tg.ok || !sv.ok || !mo.ok) return;

    const id = existing?.id ?? nextId('goal', plan.goals);
    if (sharing.linked) setShared(sharedKey('goal', id), share);
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
      <ShareToggle value={share} onChange={setShare} />
      <Button label={t.edit.save} onPress={save} testID="edit-save" />
      {existing && (
        <DeleteButton
          onConfirm={() => {
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
    if (!b.ok) next.basic = t.edit.errorAmount;
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

/** Add money to current savings, or take some out. */
function SavingsMoveForm({ direction }: { direction: 'in' | 'out' }) {
  const router = useRouter();
  const { plan, addToSavings, takeFromSavings } = usePrototype();
  const [share, setShare] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const save = () => {
    const a = parseAmountToFils(amount);
    if (!a.ok || a.fils <= 0) {
      setErrors({ amount: t.edit.errorAmount });
      return;
    }
    if (direction === 'in') {
      addToSavings(a.fils, note, share);
    } else {
      const result = takeFromSavings(a.fils, note);
      if (result !== 'ok') {
        setErrors({ amount: t.savings.errorInsufficient(formatAed(plan.savings.balance)) });
        return;
      }
    }
    router.back();
  };

  return (
    <Screen testID="edit-screen">
      <Heading>{direction === 'in' ? t.savings.formTitleIn : t.savings.formTitleOut}</Heading>
      <Body muted>{`${t.savings.currentTitle}: ${formatAed(plan.savings.balance)}`}</Body>
      <Field
        label={t.savings.formAmount}
        testID="amount"
        value={amount}
        onChangeText={setAmount}
        error={errors.amount}
        keyboardType="decimal-pad"
      />
      <Field
        label={t.savings.formNote}
        hint={t.savings.formNoteHint}
        testID="note"
        value={note}
        onChangeText={setNote}
      />
      {direction === 'in' ? <ShareToggle value={share} onChange={setShare} /> : null}
      <Button label={t.edit.save} onPress={save} testID="edit-save" />
    </Screen>
  );
}

const INCOME_FREQUENCY_OPTIONS = FREQUENCY_OPTIONS.filter((o) => o.value !== 'once');

function InvestmentForm({ existing }: { existing?: Investment | undefined }) {
  const router = useRouter();
  const { plan, upsertInvestment, removeInvestment } = usePrototype();
  const first = INVESTMENT_TYPES[0]!;
  const [type, setType] = useState<InvestmentType>(existing?.type ?? first.id);
  const [name, setName] = useState(existing?.name ?? first.label);
  const [invested, setInvested] = useState(existing ? toInput(existing.invested) : '');
  const [value, setValue] = useState(existing ? toInput(existing.currentValue) : '');
  const [contribution, setContribution] = useState(
    existing ? toInput(existing.monthlyContribution) : '0',
  );
  const [income, setIncome] = useState(existing ? toInput(existing.incomeAmount) : '0');
  const [incomeFrequency, setIncomeFrequency] = useState<Frequency>(
    existing?.incomeFrequency ?? 'quarterly',
  );
  const [enabled, setEnabled] = useState<'yes' | 'no'>(existing?.enabled === false ? 'no' : 'yes');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const pickType = (id: InvestmentType) => {
    setType(id);
    // A new investment gets the type name as a starting point; "Other" starts empty.
    if (!existing) setName(id === 'other' ? '' : getInvestmentType(id).label);
  };

  const save = () => {
    const inv = parseAmountToFils(invested);
    const val = parseAmountToFils(value);
    const con = parseAmountToFils(contribution);
    const inc = parseAmountToFils(income);
    const next: Record<string, string | undefined> = {};
    if (name.trim() === '') next.name = t.edit.errorName;
    if (!inv.ok) next.invested = t.investments.errorNumber;
    if (!val.ok) next.value = t.investments.errorNumber;
    if (!con.ok) next.contribution = t.investments.errorNumber;
    if (!inc.ok) next.income = t.investments.errorNumber;
    setErrors(next);
    if (Object.keys(next).length > 0 || !inv.ok || !val.ok || !con.ok || !inc.ok) return;

    upsertInvestment({
      id: existing?.id ?? nextId('inv', plan.investments),
      name: name.trim(),
      type,
      invested: inv.fils,
      currentValue: val.fils,
      monthlyContribution: con.fils,
      enabled: enabled === 'yes',
      incomeAmount: inc.fils,
      incomeFrequency,
    });
    router.back();
  };

  return (
    <Screen testID="edit-screen">
      <Heading>{existing ? existing.name : t.investments.add}</Heading>
      <Body muted>{t.investments.disclaimer}</Body>
      <ChipGroup
        label={t.investments.formType}
        testID="type"
        value={type}
        onChange={pickType}
        options={INVESTMENT_TYPES.map((x) => ({ value: x.id, label: x.label }))}
      />
      <Field
        label={t.investments.formName}
        testID="name"
        value={name}
        onChangeText={setName}
        error={errors.name}
      />
      <Field
        label={t.investments.formInvested}
        testID="invested"
        value={invested}
        onChangeText={setInvested}
        error={errors.invested}
        keyboardType="decimal-pad"
      />
      <Field
        label={t.investments.formValue}
        testID="value"
        value={value}
        onChangeText={setValue}
        error={errors.value}
        keyboardType="decimal-pad"
      />
      <Field
        label={t.investments.formContribution}
        hint={t.investments.formContributionHint}
        testID="contribution"
        value={contribution}
        onChangeText={setContribution}
        error={errors.contribution}
        keyboardType="decimal-pad"
      />
      <ChipGroup
        label={t.investments.formEnabled}
        testID="enabled"
        value={enabled}
        onChange={setEnabled}
        options={[
          { value: 'yes', label: t.investments.formEnabledYes },
          { value: 'no', label: t.investments.formEnabledNo },
        ]}
      />
      <Field
        label={`${getInvestmentType(type).incomeLabel} (AED)`}
        hint={t.investments.formIncomeHint}
        testID="income"
        value={income}
        onChangeText={setIncome}
        error={errors.income}
        keyboardType="decimal-pad"
      />
      <ChipGroup
        label={t.investments.formIncomeFrequency}
        testID="income-frequency"
        value={incomeFrequency}
        onChange={setIncomeFrequency}
        options={INCOME_FREQUENCY_OPTIONS}
      />
      <Button label={t.edit.save} onPress={save} testID="edit-save" />
      {existing && (
        <DeleteButton
          onConfirm={() => {
            removeInvestment(existing.id);
            router.back();
          }}
        />
      )}
    </Screen>
  );
}
