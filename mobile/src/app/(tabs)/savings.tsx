import { useRouter } from 'expo-router';

import { GoalBar, StatTile, TrendBars } from '../../components/dashboardParts';
import { Body, Button, Card, Heading, Row, Screen } from '../../components/ui';
import { formatDate } from '../../domain/dates';
import { investmentSummary } from '../../domain/investmentInsights';
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
      <CurrentSavings />
      <CycleCard />

      <StatTile
        testID="tile-monthly-saved"
        label={t.savings.tileMonthly}
        value={formatAed(summary.monthlySaved)}
        note={t.savings.tileMonthlyNote(`${(summary.savingsRate * 100).toFixed(1)}%`)}
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

      <InvestmentsCard />

      <ActivityCard />

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

function signed(change: number): string {
  return change >= 0 ? `+${formatAed(change)}` : formatAed(change);
}

/** The headline balance with buttons to add money or take it out. */
function CurrentSavings() {
  const router = useRouter();
  const { plan } = usePrototype();
  const balance = plan.savings.balance;
  return (
    <Card tone={balance < 0 ? 'danger' : 'info'} testID="current-savings-card">
      <Body muted>{t.savings.currentTitle}</Body>
      <Heading>{formatAed(balance)}</Heading>
      <Body muted>{t.savings.currentNote}</Body>
      {balance < 0 ? <Body testID="below-zero-note">{t.savings.belowZero}</Body> : null}
      <Button
        label={t.savings.addMoney}
        onPress={() => router.push('/edit/savings-in/new')}
        testID="savings-add"
      />
      <Button
        label={t.savings.takeOut}
        variant="secondary"
        onPress={() => router.push('/edit/savings-out/new')}
        testID="savings-take"
      />
    </Card>
  );
}

/** Applies a pay cycle's result (income minus spending) to savings, only when the user confirms. */
function CycleCard() {
  const { cycle, closePayCycle } = usePrototype();
  return (
    <Card tone={cycle.result < 0 ? 'warn' : 'default'} testID="cycle-card">
      <Heading>{t.savings.cycleTitle}</Heading>
      <Body>{t.savings.cycleBody(formatAed(cycle.income), formatAed(cycle.spending))}</Body>
      <Body testID="cycle-result">
        {cycle.result >= 0
          ? t.savings.cycleGain(formatAed(cycle.result))
          : t.savings.cycleLoss(formatAed(-cycle.result))}
      </Body>
      {cycle.canClose ? (
        <Button label={t.savings.cycleApply} onPress={closePayCycle} testID="close-cycle" />
      ) : (
        <Body muted testID="cycle-done">
          {t.savings.cycleDone}
        </Body>
      )}
      <Body muted>{t.savings.cycleNote}</Body>
    </Card>
  );
}

const ACTIVITY_LIMIT = 6;

function ActivityCard() {
  const { plan } = usePrototype();
  const entries = plan.savings.entries.slice(0, ACTIVITY_LIMIT);
  return (
    <Card testID="activity-card">
      <Heading>{t.savings.activityTitle}</Heading>
      {entries.length === 0 ? (
        <Body muted>{t.savings.noActivity}</Body>
      ) : (
        entries.map((e) => (
          <Row
            key={e.id}
            label={t.savings.entryLine(formatDate(e.date), t.savings.entryKinds[e.kind], e.note)}
            value={signed(e.change)}
          />
        ))
      )}
    </Card>
  );
}

/** A short summary of investments with a link to the full Investments screen. */
function InvestmentsCard() {
  const router = useRouter();
  const { plan } = usePrototype();
  const s = investmentSummary(plan);
  const gain = s.totalGain >= 0 ? `+${formatAed(s.totalGain)}` : formatAed(s.totalGain);
  return (
    <Card testID="investments-card">
      <Heading>{t.investments.title}</Heading>
      <Row label={t.investments.tileValue} value={formatAed(s.totalValue)} strong />
      <Row label={s.totalGain >= 0 ? t.investments.gain : t.investments.loss} value={gain} />
      <Row label={t.investments.tileIncome} value={formatAed(s.monthlyIncome)} />
      <Body muted>{t.investments.summaryNote(s.count)}</Body>
      <Button
        label={t.investments.openCard}
        variant="secondary"
        onPress={() => router.push('/investments')}
        testID="open-investments"
      />
    </Card>
  );
}
