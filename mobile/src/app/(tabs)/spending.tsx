import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { SwipeableCard } from '../../components/SwipeableCard';
import { Body, Button, Card, Heading, Row, Screen } from '../../components/ui';
import { formatDate } from '../../domain/dates';
import { formatAed } from '../../domain/money';
import { addMonthKeys, formatMonthKey, monthEnd, monthOf, monthStart } from '../../domain/months';
import { spendingReport, transactionsBetween, type CategoryRow } from '../../domain/spending';
import { getExpenseCategory } from '../../domain/uaeCategories';
import { t } from '../../i18n/strings';
import { usePrototype } from '../../state/PrototypeContext';

function CategoryCard({ row }: { row: CategoryRow }) {
  const status = row.unbudgeted
    ? t.spendingPage.unbudgeted
    : row.over
      ? t.spendingPage.overBy(formatAed(-row.remaining))
      : t.spendingPage.onBudget;
  return (
    <Card
      tone={row.over ? 'danger' : row.unbudgeted ? 'warn' : 'default'}
      testID={`cat-${row.categoryId}`}
    >
      <Heading>{row.label}</Heading>
      <Row label={t.spendingPage.budget} value={formatAed(row.budget)} />
      <Row label={t.spendingPage.spent} value={formatAed(row.actual)} />
      <Row label={t.spendingPage.remaining} value={formatAed(row.remaining)} strong />
      <Body testID={`cat-status-${row.categoryId}`}>{status}</Body>
    </Card>
  );
}

export default function Spending() {
  const router = useRouter();
  const { plan, today, removeSpending } = usePrototype();
  const [month, setMonth] = useState(monthOf(today));
  const from = monthStart(month);
  const to = monthEnd(month);
  const report = spendingReport(plan, from, to, today);
  const records = transactionsBetween(plan, from, to).sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
  );
  const empty = report.rows.length === 0 && records.length === 0;

  return (
    <Screen testID="spending-screen">
      <Card testID="month-picker">
        <Heading>{formatMonthKey(month)}</Heading>
        <Button
          label={t.spendingPage.previousMonth}
          variant="secondary"
          onPress={() => setMonth(addMonthKeys(month, -1))}
          testID="month-prev"
        />
        <Button
          label={t.spendingPage.nextMonth}
          variant="secondary"
          onPress={() => setMonth(addMonthKeys(month, 1))}
          testID="month-next"
        />
      </Card>

      {empty ? (
        <EmptyState
          title={t.spendingPage.emptyTitle}
          body={t.spendingPage.emptyBody}
          actionLabel={t.addItem}
          onAction={() => router.push('/edit/expense/new')}
          testID="add-spending"
        />
      ) : (
        <>
          <Card tone={report.totalRemaining < 0 ? 'danger' : 'info'} testID="spending-summary">
            <Row label={t.spendingPage.summaryBudget} value={formatAed(report.totalBudget)} />
            <Row label={t.spendingPage.summarySpent} value={formatAed(report.totalActual)} />
            <Row
              label={
                report.totalRemaining < 0
                  ? t.spendingPage.summaryOver
                  : t.spendingPage.summaryRemaining
              }
              value={formatAed(Math.abs(report.totalRemaining))}
              strong
            />
          </Card>

          <Heading>{t.spendingPage.categoriesTitle}</Heading>
          {report.rows.map((r) => (
            <CategoryCard key={r.categoryId} row={r} />
          ))}

          <Heading>{t.spendingPage.recordsTitle}</Heading>
          {records.length === 0 ? <Body muted>{t.spendingPage.noRecords}</Body> : null}
          {records.map((r) => (
            <SwipeableCard
              key={r.id}
              testID={`swipe-spend-${r.id}`}
              name={r.note || getExpenseCategory(r.categoryId).label}
              onDelete={() => removeSpending(r.id)}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${getExpenseCategory(r.categoryId).label}, ${formatAed(r.amount)}, ${formatDate(r.date)}`}
                onPress={() => router.push(`/edit/expense/${r.id}`)}
                onLongPress={() => router.push(`/edit/expense/${r.id}`)}
                testID={`spend-${r.id}`}
              >
                <Card>
                  <Row
                    label={r.note || getExpenseCategory(r.categoryId).label}
                    value={formatAed(r.amount)}
                    strong
                  />
                  <Body
                    muted
                  >{`${getExpenseCategory(r.categoryId).label} · ${formatDate(r.date)}`}</Body>
                </Card>
              </Pressable>
            </SwipeableCard>
          ))}
          <Button
            label={t.addItem}
            icon="add"
            onPress={() => router.push('/edit/expense/new')}
            testID="add-spending"
          />
        </>
      )}
    </Screen>
  );
}
