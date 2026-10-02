import { useRouter } from 'expo-router';

import { GoalBar, StatTile, TrendBars } from '../../components/dashboardParts';
import { Body, Button, Card, Heading, Row, Screen } from '../../components/ui';
import { formatAed } from '../../domain/money';
import { SAMPLE_HISTORY } from '../../domain/sampleData';
import {
  bigBills,
  emergencyCover,
  goalProgress,
  gratuityEstimate,
  savingsSummary,
  type GoalProgress,
} from '../../domain/savingsInsights';
import { t } from '../../i18n/strings';
import { usePrototype } from '../../state/PrototypeContext';

function goalStatus(g: GoalProgress): string {
  switch (g.status) {
    case 'done':
      return t.savings.goalDone;
    case 'on-track':
      return t.savings.goalOnTrack;
    case 'behind':
      return t.savings.goalBehind(formatAed(g.neededPerMonth ?? 0));
    case 'paused':
      return t.savings.goalPaused;
    case 'no-deadline':
      return g.monthsToGo === null
        ? t.savings.goalNoEta
        : t.savings.goalEta(g.monthsToGo, formatAed(g.monthly));
  }
}

export default function Savings() {
  const router = useRouter();
  const { plan } = usePrototype();
  const summary = savingsSummary(plan);
  const cover = emergencyCover(plan);
  const goals = plan.goals.map(goalProgress);
  const bills = bigBills(plan);
  const history = SAMPLE_HISTORY.saved;
  const emp = plan.employment;

  return (
    <Screen testID="savings-screen">
      <StatTile
        testID="tile-monthly-saved"
        label={t.savings.tileMonthly}
        value={formatAed(summary.monthlySaved)}
        note={t.savings.tileMonthlyNote(`${(summary.savingsRate * 100).toFixed(1)}%`)}
      />
      <StatTile
        testID="tile-total-saved"
        label={t.savings.tileTotal}
        value={formatAed(summary.totalSaved)}
        note={t.savings.tileTotalNote}
      />
      <StatTile
        testID="tile-cover"
        label={t.savings.tileCover}
        value={cover ? t.savings.tileCoverValue(cover.months.toFixed(1)) : t.savings.tileCoverNone}
        note={cover ? t.savings.levels[cover.level] : t.savings.coverMissing}
      />

      <Card testID="cover-card">
        <Heading>{t.savings.coverTitle}</Heading>
        {cover ? (
          cover.gapToThreeMonths > 0 ? (
            <Body>
              {t.savings.coverBody(
                formatAed(cover.essentialMonthly),
                formatAed(cover.threeMonthTarget),
                formatAed(cover.gapToThreeMonths),
              )}
            </Body>
          ) : (
            <Body>{t.savings.coverReached(formatAed(cover.threeMonthTarget))}</Body>
          )
        ) : (
          <Body muted>{t.savings.coverMissing}</Body>
        )}
      </Card>

      <Card testID="goals-card">
        <Heading>{t.savings.goalsTitle}</Heading>
        {goals.map((g) => (
          <GoalBar
            key={g.id}
            testID={`goal-${g.id}`}
            name={g.name}
            pct={g.pct}
            line={t.savings.goalLine(
              formatAed(g.saved),
              formatAed(g.target),
              Math.round(g.pct * 100),
            )}
            status={goalStatus(g)}
            onPress={() => router.push(`/edit/goal/${g.id}`)}
          />
        ))}
        <Button
          label={t.savings.addGoal}
          variant="secondary"
          onPress={() => router.push('/edit/goal/new')}
          testID="add-goal"
        />
      </Card>

      <Card testID="bills-card">
        <Heading>{t.savings.billsTitle}</Heading>
        <Body muted>{t.savings.billsCaption}</Body>
        {bills.length === 0 ? (
          <Body muted>{t.savings.noBills}</Body>
        ) : (
          bills.map((b) => (
            <Card key={b.id} testID={`bill-${b.id}`}>
              <Row label={b.name} value={formatAed(b.amount)} strong />
              <Body muted>{t.savings.billLine(b.dueInDays, formatAed(b.neededPerMonth))}</Body>
            </Card>
          ))
        )}
      </Card>

      <Card tone={summary.unallocatedMonthly >= 0 ? 'info' : 'warn'} testID="surplus-card">
        <Heading>{t.savings.surplusTitle}</Heading>
        <Body>
          {summary.unallocatedMonthly >= 0
            ? t.savings.surplusPositive(formatAed(summary.unallocatedMonthly))
            : t.savings.surplusNegative(formatAed(-summary.unallocatedMonthly))}
        </Body>
      </Card>

      <Card testID="gratuity-card">
        <Heading>{t.savings.gratuityTitle}</Heading>
        {emp ? (
          <>
            <Heading>{formatAed(gratuityEstimate(emp))}</Heading>
            <Body>
              {t.savings.gratuityBody(String(emp.yearsOfService), formatAed(emp.basicMonthly))}
            </Body>
          </>
        ) : null}
        <Body muted>{t.savings.gratuityNote}</Body>
        <Button
          label={emp ? t.savings.gratuityEdit : t.savings.gratuityAdd}
          variant="secondary"
          onPress={() => router.push('/edit/employment/me')}
          testID="edit-employment"
        />
      </Card>

      <TrendBars
        testID="savings-trend"
        title={t.savings.trendTitle}
        caption={t.savings.trendCaption}
        values={history}
        firstLabel="6 cycles ago"
        lastLabel="Last cycle"
        summary={t.savings.trendSummary(
          formatAed(history[0] ?? 0),
          formatAed(history[history.length - 1] ?? 0),
        )}
      />
    </Screen>
  );
}
