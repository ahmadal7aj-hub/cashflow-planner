import { useRouter } from 'expo-router';

import { BudgetBar, HorizontalBars, StatTile, TrendBars } from '../../components/dashboardParts';
import { Body, Button, Card, Heading, Screen } from '../../components/ui';
import { formatAed } from '../../domain/money';
import { SAMPLE_HISTORY } from '../../domain/sampleData';
import {
  budgetLines,
  cycleElapsedFraction,
  monthlyByGroup,
  spendingSummary,
} from '../../domain/spendingInsights';
import { t } from '../../i18n/strings';
import { usePrototype } from '../../state/PrototypeContext';

export default function Spending() {
  const router = useRouter();
  const { plan, baseline } = usePrototype();
  const days = baseline.horizonDays;
  const s = spendingSummary(plan, baseline, days);
  const lines = budgetLines(plan, days);
  const groups = monthlyByGroup(plan);
  const elapsed = cycleElapsedFraction(days);
  const history = SAMPLE_HISTORY.spending;

  return (
    <Screen testID="spending-screen">
      <Body muted>{t.spending.cycleNote(Math.round(elapsed * 100), days)}</Body>

      <StatTile
        testID="tile-everyday"
        label={t.spending.tileEveryday}
        value={formatAed(s.everydaySpent)}
        note={t.spending.tileEverydayNote(formatAed(s.everydaySpent), formatAed(s.everydayBudget))}
      />
      <StatTile
        testID="tile-bills"
        label={t.spending.tileBills}
        value={formatAed(s.billsBeforePayday)}
        note={t.spending.tileBillsNote(s.billCount)}
      />
      <StatTile
        testID="tile-flex"
        label={t.spending.tileFlex}
        value={formatAed(s.discretionaryRemaining)}
        note={t.spending.tileFlexNote}
      />
      <Card tone={s.discretionaryHeadroom >= 0 ? 'info' : 'warn'} testID="headroom-note">
        <Body>
          {s.discretionaryHeadroom >= 0
            ? t.spending.headroomOk(formatAed(s.discretionaryHeadroom))
            : t.spending.headroomShort(formatAed(-s.discretionaryHeadroom))}
        </Body>
      </Card>

      <Card testID="budgets-card">
        <Heading>{t.spending.budgetsTitle}</Heading>
        <Body muted>{t.spending.budgetsCaption}</Body>
        {lines.map((l) => (
          <BudgetBar
            key={l.id}
            testID={`budget-${l.id}`}
            name={l.name}
            spent={l.spent}
            budget={l.budget}
            elapsed={elapsed}
            status={l.status}
          />
        ))}
      </Card>

      <HorizontalBars
        testID="groups-card"
        title={t.spending.groupsTitle}
        caption={t.spending.groupsCaption}
        items={groups.map((g) => ({ key: g.group, label: g.label, value: g.monthly }))}
      />

      <Card testID="driving-card">
        <Heading>{t.spending.drivingTitle}</Heading>
        <Body>
          {t.spending.drivingBody(formatAed(s.driving.spent), formatAed(s.driving.budget))}
        </Body>
        <Body muted>{t.spending.drivingTip}</Body>
      </Card>

      <TrendBars
        testID="spending-trend"
        title={t.spending.trendTitle}
        caption={t.spending.trendCaption}
        values={history}
        firstLabel={t.spending.trendFirst}
        lastLabel={t.spending.trendLast}
        summary={t.spending.trendSummary(
          formatAed(history[0] ?? 0),
          formatAed(history[history.length - 1] ?? 0),
        )}
      />

      <Button
        label={t.spending.editExpenses}
        variant="secondary"
        onPress={() => router.push('/commitments')}
        testID="edit-expenses"
      />
    </Screen>
  );
}
