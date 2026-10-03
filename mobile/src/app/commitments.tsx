import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { Body, Button, Card, Heading, Row, Screen } from '../components/ui';
import { FREQUENCY_LABELS, type ExpenseItem, type IncomeItem } from '../domain/budgetModel';
import { addDays, formatDate, relativeDays, type ISODate } from '../domain/dates';
import { formatAed } from '../domain/money';
import { getExpenseCategory, getIncomeCategory } from '../domain/uaeCategories';
import { t } from '../i18n/strings';
import { usePrototype } from '../state/PrototypeContext';

/** "7 Oct 2026 (in 4 days)" for something due `days` from today. */
function whenText(today: ISODate, days: number): string {
  return t.commitments.nextOn(formatDate(addDays(today, days)), relativeDays(days));
}

export default function Commitments() {
  const router = useRouter();
  const { plan, today, resetToSample, clearSampleData } = usePrototype();
  const fixed = plan.expenses.filter((e) => e.kind === 'fixed');
  const variable = plan.expenses.filter((e) => e.kind === 'variable');

  return (
    <Screen testID="commitments-screen">
      <Heading>{t.commitments.title}</Heading>
      <Body muted>{t.commitments.intro}</Body>

      <Heading>{t.commitments.sectionIncome}</Heading>
      {plan.income.map((i) => (
        <IncomeCard
          key={i.id}
          item={i}
          today={today}
          onPress={() => router.push(`/edit/income/${i.id}`)}
        />
      ))}
      <Button
        label={t.commitments.addIncome}
        variant="secondary"
        onPress={() => router.push('/edit/income/new')}
        testID="add-income"
      />

      <Heading>{t.commitments.sectionFixed}</Heading>
      {fixed.map((e) => (
        <ExpenseCard
          key={e.id}
          item={e}
          today={today}
          onPress={() => router.push(`/edit/fixed/${e.id}`)}
        />
      ))}
      <Button
        label={t.commitments.addFixed}
        variant="secondary"
        onPress={() => router.push('/edit/fixed/new')}
        testID="add-fixed"
      />

      <Heading>{t.commitments.sectionVariable}</Heading>
      <Body muted>{t.commitments.sectionVariableHint}</Body>
      {variable.map((e) => (
        <ExpenseCard
          key={e.id}
          item={e}
          today={today}
          onPress={() => router.push(`/edit/variable/${e.id}`)}
        />
      ))}
      <Button
        label={t.commitments.addVariable}
        variant="secondary"
        onPress={() => router.push('/edit/variable/new')}
        testID="add-variable"
      />

      <Button
        label={t.monthlyPlan.open}
        variant="secondary"
        onPress={() => router.push('/monthly-plan')}
        testID="commitments-plan"
      />
      <Button
        label={t.commitments.toDashboard}
        testID="commitments-continue"
        onPress={() => router.navigate('/dashboard')}
      />
      <Button
        label={t.commitments.reset}
        variant="secondary"
        onPress={resetToSample}
        testID="reset-sample"
      />
      <Button
        label={t.monthlyPlan.clearSample}
        variant="secondary"
        onPress={clearSampleData}
        testID="clear-sample"
      />
    </Screen>
  );
}

function IncomeCard({
  item,
  today,
  onPress,
}: {
  item: IncomeItem;
  today: ISODate;
  onPress: () => void;
}) {
  const label = getIncomeCategory(item.kind).label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${formatAed(item.amount)}, ${FREQUENCY_LABELS[item.frequency]}`}
      onPress={onPress}
      testID={`income-${item.id}`}
    >
      <Card>
        <Row label={item.name} value={formatAed(item.amount)} strong />
        <Body muted>
          {item.amount === 0
            ? t.monthlyPlan.zeroIncome
            : `${label} · ${FREQUENCY_LABELS[item.frequency]} · ${whenText(today, item.nextInDays)}`}
        </Body>
      </Card>
    </Pressable>
  );
}

function ExpenseCard({
  item,
  today,
  onPress,
}: {
  item: ExpenseItem;
  today: ISODate;
  onPress: () => void;
}) {
  const category = getExpenseCategory(item.categoryId).label;
  const detail =
    item.kind === 'variable'
      ? t.commitments.spentOf(formatAed(item.spentSoFar), formatAed(item.amount))
      : `${FREQUENCY_LABELS[item.frequency]} · ${whenText(today, item.nextDueInDays)}`;
  const reminder =
    item.kind === 'fixed' && item.reminderDaysBefore !== undefined
      ? t.reminder.set(item.reminderDaysBefore)
      : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${formatAed(item.amount)}, ${detail}${reminder ? `, ${reminder}` : ''}`}
      onPress={onPress}
      testID={`expense-${item.id}`}
    >
      <Card>
        <Row label={item.name} value={formatAed(item.amount)} strong />
        <Body muted>
          {`${category} · ${item.essential ? t.commitments.essential : t.commitments.optional}`}
        </Body>
        <Body muted>{detail}</Body>
        {reminder ? <Body muted>{reminder}</Body> : null}
      </Card>
    </Pressable>
  );
}
