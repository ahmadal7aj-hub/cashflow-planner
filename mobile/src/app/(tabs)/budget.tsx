import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { SwipeableCard } from '../../components/SwipeableCard';
import { Body, Button, Card, Heading, Row, Screen } from '../../components/ui';
import { FREQUENCY_LABELS, type ExpenseItem } from '../../domain/budgetModel';
import { formatDate, nextOnOrAfter, type ISODate } from '../../domain/dates';
import { formatAed } from '../../domain/money';
import { monthEnd, monthOf, monthStart } from '../../domain/months';
import { itemOccurrences } from '../../domain/occurrences';
import { billAnchor, isBillPaid } from '../../domain/spending';
import { getExpenseCategory } from '../../domain/uaeCategories';
import { t } from '../../i18n/strings';
import { usePrototype } from '../../state/PrototypeContext';

function BillCard({ item, onPress }: { item: ExpenseItem; onPress: () => void }) {
  const { plan, today, payBill } = usePrototype();
  const category = getExpenseCategory(item.categoryId).label;
  const anchor = billAnchor(item, today);
  const month = monthOf(today);
  // The occurrence of this bill that falls in the current month, if any, can be marked as paid.
  const due = itemOccurrences(item, anchor, monthStart(month), monthEnd(month))[0]?.date;
  const paid = due ? isBillPaid(plan, item.id, due) : false;
  const next = nextOnOrAfter(anchor, item.frequency, today);
  const reminder =
    item.reminderDaysBefore !== undefined ? t.reminder.set(item.reminderDaysBefore) : null;
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${formatAed(item.amount)}, ${FREQUENCY_LABELS[item.frequency]}`}
        onPress={onPress}
        onLongPress={onPress}
        testID={`expense-${item.id}`}
      >
        <Row label={item.name} value={formatAed(item.amount)} strong />
        <Body muted>{`${category} · ${FREQUENCY_LABELS[item.frequency]}`}</Body>
        <Body muted>
          {due ? t.budgetPage.dueOn(formatDate(due)) : t.budgetPage.nextDue(formatDate(next))}
        </Body>
        {reminder ? <Body muted>{reminder}</Body> : null}
      </Pressable>
      {due ? (
        paid ? (
          <Body testID={`paid-${item.id}`}>{t.budgetPage.paid(formatDate(due))}</Body>
        ) : (
          <Button
            label={t.budgetPage.markPaid}
            variant="secondary"
            onPress={() => payBill(item.id, due, today as ISODate)}
            testID={`pay-${item.id}`}
            hint={t.budgetPage.markPaidLabel(item.name)}
          />
        )
      ) : null}
    </Card>
  );
}

function BudgetCard({ item, onPress }: { item: ExpenseItem; onPress: () => void }) {
  const category = getExpenseCategory(item.categoryId).label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${t.budgetPage.monthly(formatAed(item.amount))}`}
      onPress={onPress}
      onLongPress={onPress}
      testID={`expense-${item.id}`}
    >
      <Card>
        <Row label={item.name} value={t.budgetPage.monthly(formatAed(item.amount))} strong />
        <Body muted>{category}</Body>
      </Card>
    </Pressable>
  );
}

export default function Budget() {
  const router = useRouter();
  const { plan, removeExpense } = usePrototype();
  const bills = plan.expenses.filter((e) => e.kind === 'fixed');
  const everyday = plan.expenses.filter((e) => e.kind === 'variable');

  return (
    <Screen testID="budget-screen">
      <Heading>{t.budgetPage.billsTitle}</Heading>
      {bills.length === 0 ? (
        <EmptyState
          title={t.budgetPage.billsEmptyTitle}
          body={t.budgetPage.billsEmptyBody}
          actionLabel={t.addItem}
          onAction={() => router.push('/edit/fixed/new')}
          testID="add-fixed"
        />
      ) : (
        <>
          {bills.map((e) => (
            <SwipeableCard
              key={e.id}
              testID={`swipe-expense-${e.id}`}
              name={e.name}
              onDelete={() => removeExpense(e.id)}
            >
              <BillCard item={e} onPress={() => router.push(`/edit/fixed/${e.id}`)} />
            </SwipeableCard>
          ))}
          <Button
            label={t.addItem}
            icon="add"
            onPress={() => router.push('/edit/fixed/new')}
            testID="add-fixed"
          />
        </>
      )}

      <Heading>{t.budgetPage.everydayTitle}</Heading>
      <Body muted>{t.budgetPage.everydayHint}</Body>
      {everyday.length === 0 ? (
        <EmptyState
          title={t.budgetPage.everydayEmptyTitle}
          body={t.budgetPage.everydayEmptyBody}
          actionLabel={t.addItem}
          onAction={() => router.push('/edit/variable/new')}
          testID="add-variable"
        />
      ) : (
        <>
          {everyday.map((e) => (
            <SwipeableCard
              key={e.id}
              testID={`swipe-expense-${e.id}`}
              name={e.name}
              onDelete={() => removeExpense(e.id)}
            >
              <BudgetCard item={e} onPress={() => router.push(`/edit/variable/${e.id}`)} />
            </SwipeableCard>
          ))}
          <Button
            label={t.addItem}
            icon="add"
            onPress={() => router.push('/edit/variable/new')}
            testID="add-variable"
          />
        </>
      )}
    </Screen>
  );
}
