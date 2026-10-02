import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { Body, Button, Card, Heading, Row, Screen } from '../components/ui';
import { FREQUENCY_LABELS, type ExpenseItem, type IncomeItem } from '../domain/budgetModel';
import { formatAed } from '../domain/money';
import { getExpenseCategory, getIncomeCategory } from '../domain/uaeCategories';
import { t } from '../i18n/strings';
import { usePrototype } from '../state/PrototypeContext';

export default function Commitments() {
  const router = useRouter();
  const { plan, resetToSample } = usePrototype();
  const fixed = plan.expenses.filter((e) => e.kind === 'fixed');
  const variable = plan.expenses.filter((e) => e.kind === 'variable');

  return (
    <Screen testID="commitments-screen">
      <Heading>{t.commitments.title}</Heading>
      <Body muted>{t.commitments.intro}</Body>

      <Heading>{t.commitments.sectionIncome}</Heading>
      {plan.income.map((i) => (
        <IncomeCard key={i.id} item={i} onPress={() => router.push(`/edit/income/${i.id}`)} />
      ))}
      <Button
        label={t.commitments.addIncome}
        variant="secondary"
        onPress={() => router.push('/edit/income/new')}
        testID="add-income"
      />

      <Heading>{t.commitments.sectionFixed}</Heading>
      {fixed.map((e) => (
        <ExpenseCard key={e.id} item={e} onPress={() => router.push(`/edit/fixed/${e.id}`)} />
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
        <ExpenseCard key={e.id} item={e} onPress={() => router.push(`/edit/variable/${e.id}`)} />
      ))}
      <Button
        label={t.commitments.addVariable}
        variant="secondary"
        onPress={() => router.push('/edit/variable/new')}
        testID="add-variable"
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
    </Screen>
  );
}

function IncomeCard({ item, onPress }: { item: IncomeItem; onPress: () => void }) {
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
          {`${label} · ${FREQUENCY_LABELS[item.frequency]} · ${t.commitments.nextIn(item.nextInDays)}`}
        </Body>
      </Card>
    </Pressable>
  );
}

function ExpenseCard({ item, onPress }: { item: ExpenseItem; onPress: () => void }) {
  const category = getExpenseCategory(item.categoryId).label;
  const detail =
    item.kind === 'variable'
      ? t.commitments.spentOf(formatAed(item.spentSoFar), formatAed(item.amount))
      : `${FREQUENCY_LABELS[item.frequency]} · ${t.commitments.nextIn(item.nextDueInDays)}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${formatAed(item.amount)}, ${detail}`}
      onPress={onPress}
      testID={`expense-${item.id}`}
    >
      <Card>
        <Row label={item.name} value={formatAed(item.amount)} strong />
        <Body muted>
          {`${category} · ${item.essential ? t.commitments.essential : t.commitments.optional}`}
        </Body>
        <Body muted>{detail}</Body>
      </Card>
    </Pressable>
  );
}
