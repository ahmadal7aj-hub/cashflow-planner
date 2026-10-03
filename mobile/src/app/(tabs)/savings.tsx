import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { GoalBar } from '../../components/dashboardParts';
import { EmptyState } from '../../components/EmptyState';
import { SwipeableCard } from '../../components/SwipeableCard';
import { Body, Button, Card, Heading, Row, Screen } from '../../components/ui';
import type { SavingsMovement } from '../../domain/budgetModel';
import { formatDate } from '../../domain/dates';
import { investmentSummary } from '../../domain/investmentInsights';
import { formatAed } from '../../domain/money';
import { formatMonthKey, monthOf } from '../../domain/months';
import { balanceAsOf, projectMonth, targetInMonth } from '../../domain/savingsEngine';
import { goalProgress, type GoalProgress } from '../../domain/savingsInsights';
import { t } from '../../i18n/strings';
import { usePrototype } from '../../state/PrototypeContext';
import { useSharing } from '../../state/SharingContext';

function signed(fils: number): string {
  return fils > 0 ? `+${formatAed(fils)}` : formatAed(fils);
}

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

function movementLabel(m: SavingsMovement): string {
  if (m.kind === 'month-close') return t.savingsPage.monthClose(formatMonthKey(m.month ?? ''));
  if (m.kind === 'correction') return t.savingsPage.correction(formatMonthKey(m.month ?? ''));
  const kind = m.kind === 'deposit' ? t.savingsPage.deposit : t.savingsPage.withdrawal;
  return m.note ? `${kind}: ${m.note}` : kind;
}

export default function Savings() {
  const router = useRouter();
  const { plan, today, removeSavingsEntry, removeGoal } = usePrototype();
  const sharing = useSharing();
  const ledger = plan.savings;
  const balance = balanceAsOf(ledger, today);
  const month = monthOf(today);
  const target = targetInMonth(ledger, month);
  const projection = ledger.opening ? projectMonth(plan, month, today) : null;
  const movements = [...ledger.movements].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
  );
  const closed = [...ledger.closed].sort((a, b) => b.month.localeCompare(a.month));
  const inv = investmentSummary(plan);

  return (
    <Screen testID="savings-screen">
      <Card tone={balance !== null && balance < 0 ? 'danger' : 'info'} testID="total-savings-card">
        <Body muted>{t.savingsPage.totalTitle}</Body>
        <Heading>{balance === null ? t.savingsPage.notSet : formatAed(balance)}</Heading>
        {ledger.opening ? (
          <Body muted>
            {t.savingsPage.openingLine(
              formatAed(ledger.opening.amount),
              formatDate(ledger.opening.date),
            )}
          </Body>
        ) : null}
        {balance !== null && balance < 0 ? (
          <Body testID="below-zero-note">{t.savings.belowZero}</Body>
        ) : null}
        <Button
          label={t.savingsPage.editOpening}
          variant="secondary"
          onPress={() => router.push('/edit/savings-opening/new')}
          testID="edit-opening"
        />
        <Button
          label={t.savingsPage.addMoney}
          onPress={() => router.push('/edit/savings-in/new')}
          testID="savings-add"
        />
        <Button
          label={t.savingsPage.takeOut}
          variant="secondary"
          onPress={() => router.push('/edit/savings-out/new')}
          testID="savings-take"
        />
      </Card>

      <Card testID="target-card">
        <Body muted>{t.savingsPage.targetTitle}</Body>
        <Heading>{formatAed(target)}</Heading>
        <Body muted>{t.savingsPage.targetNote}</Body>
        <Button
          label={t.savingsPage.editTarget}
          variant="secondary"
          onPress={() => router.push('/edit/savings-target/new')}
          testID="edit-target"
        />
      </Card>

      {projection ? (
        <Card tone={projection.taken > 0 ? 'warn' : 'default'} testID="projection-card">
          <Heading>{t.savingsPage.projectedTitle}</Heading>
          <Body muted>{t.savingsPage.projectedNote}</Body>
          {projection.taken > 0 ? (
            <Row label={t.savingsPage.projectedTaken} value={formatAed(projection.taken)} />
          ) : (
            <Row label={t.savingsPage.projectedSaving} value={formatAed(projection.added)} />
          )}
          {projection.projectedClosing !== null ? (
            <Row
              label={t.savingsPage.projectedClosing}
              value={formatAed(projection.projectedClosing)}
              strong
            />
          ) : null}
        </Card>
      ) : null}

      <Heading>{t.savingsPage.activityTitle}</Heading>
      {movements.length === 0 ? <Body muted>{t.savingsPage.noActivity}</Body> : null}
      {movements.map((m) => {
        const groupName = m.share
          ? sharing.groups.find((g) => g.groupId === m.share?.groupId)?.name
          : undefined;
        const card = (
          <Card testID={`movement-${m.id}`}>
            <Row label={movementLabel(m)} value={signed(m.change)} strong />
            <Body muted>{formatDate(m.date)}</Body>
            {m.share ? (
              <Body muted testID={`movement-shared-${m.id}`}>
                {t.shareChoice.sharedWith(groupName ?? t.groupsPage.title)}
              </Body>
            ) : null}
          </Card>
        );
        return m.kind === 'deposit' || m.kind === 'withdrawal' ? (
          <SwipeableCard
            key={m.id}
            testID={`swipe-movement-${m.id}`}
            name={movementLabel(m)}
            onDelete={() => removeSavingsEntry(m.id)}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${movementLabel(m)}, ${signed(m.change)}, ${formatDate(m.date)}`}
              onPress={() => router.push(`/edit/savings-edit/${m.id}`)}
              onLongPress={() => router.push(`/edit/savings-edit/${m.id}`)}
              testID={`movement-edit-${m.id}`}
            >
              {card}
            </Pressable>
          </SwipeableCard>
        ) : (
          <Card key={m.id} testID={`movement-${m.id}`}>
            <Row label={movementLabel(m)} value={signed(m.change)} strong />
            <Body muted>{formatDate(m.date)}</Body>
          </Card>
        );
      })}

      {closed.length > 0 ? (
        <>
          <Heading>{t.savingsPage.monthsTitle}</Heading>
          {closed.map((c) => (
            <Card key={c.month} testID={`closed-${c.month}`}>
              <Row label={formatMonthKey(c.month)} value={signed(c.net)} strong />
              <Body muted>
                {t.savingsPage.monthLine(formatAed(c.income), formatAed(c.spending))}
              </Body>
            </Card>
          ))}
        </>
      ) : null}

      <Heading>{t.savingsPage.goalsTitle}</Heading>
      {plan.goals.length === 0 ? (
        <EmptyState
          title={t.savingsPage.goalsEmptyTitle}
          body={t.savingsPage.goalsEmptyBody}
          actionLabel={t.addItem}
          onAction={() => router.push('/edit/goal/new')}
          testID="add-goal"
        />
      ) : (
        <>
          {plan.goals.map((g) => {
            const p = goalProgress(g);
            return (
              <SwipeableCard
                key={g.id}
                testID={`swipe-goal-${g.id}`}
                name={g.name}
                onDelete={() => removeGoal(g.id)}
              >
                <Card>
                  <GoalBar
                    testID={`goal-${g.id}`}
                    name={g.name}
                    pct={p.pct}
                    line={t.savings.goalLine(
                      formatAed(g.saved),
                      formatAed(g.target),
                      Math.round(p.pct * 100),
                    )}
                    status={goalStatus(p)}
                    onPress={() => router.push(`/edit/goal/${g.id}`)}
                  />
                </Card>
              </SwipeableCard>
            );
          })}
          <Button
            label={t.addItem}
            icon="add"
            onPress={() => router.push('/edit/goal/new')}
            testID="add-goal"
          />
        </>
      )}

      <Card testID="investments-card">
        <Heading>{t.investments.title}</Heading>
        <Row label={t.investments.tileValue} value={formatAed(inv.totalValue)} strong />
        <Row
          label={inv.totalGain >= 0 ? t.investments.gain : t.investments.loss}
          value={inv.totalGain >= 0 ? `+${formatAed(inv.totalGain)}` : formatAed(inv.totalGain)}
        />
        <Row label={t.investments.tileIncome} value={formatAed(inv.monthlyIncome)} />
        <Body muted>{t.investments.summaryNote(inv.count)}</Body>
        <Button
          label={t.investments.openCard}
          variant="secondary"
          onPress={() => router.push('/investments')}
          testID="open-investments"
        />
      </Card>
    </Screen>
  );
}
