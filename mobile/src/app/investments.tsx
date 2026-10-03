import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { HorizontalBars, StatTile } from '../components/dashboardParts';
import { SwipeableCard } from '../components/SwipeableCard';
import { Body, Button, Card, Heading, Screen } from '../components/ui';
import { FREQUENCY_LABELS } from '../domain/budgetModel';
import {
  allocationByType,
  investmentLine,
  investmentSummary,
  type InvestmentLine,
} from '../domain/investmentInsights';
import { formatAed } from '../domain/money';
import { t } from '../i18n/strings';
import { usePrototype } from '../state/PrototypeContext';

/** `+AED 2,400.00` or `-AED 300.00`. */
function signed(fils: number): string {
  return fils >= 0 ? `+${formatAed(fils)}` : formatAed(fils);
}

/** `+12.0%` or `-3.5%`. */
function signedPercent(ratio: number): string {
  const pct = (ratio * 100).toFixed(1);
  return ratio >= 0 ? `+${pct}%` : `${pct}%`;
}

export default function Investments() {
  const router = useRouter();
  const { plan, removeInvestment } = usePrototype();
  const s = investmentSummary(plan);
  const lines = plan.investments.map(investmentLine);
  const slices = allocationByType(plan);

  return (
    <Screen testID="investments-screen">
      <Card tone="info" testID="investments-disclaimer">
        <Body>{t.investments.disclaimer}</Body>
      </Card>

      <StatTile
        testID="tile-invested"
        label={t.investments.tileInvested}
        value={formatAed(s.totalInvested)}
        note={t.investments.summaryNote(s.count)}
      />
      <StatTile
        testID="tile-value"
        label={t.investments.tileValue}
        value={formatAed(s.totalValue)}
      />
      <StatTile
        testID="tile-profit"
        label={s.totalGain >= 0 ? t.investments.gain : t.investments.loss}
        value={signed(s.totalGain)}
        note={signedPercent(s.gainRatio)}
      />
      <StatTile
        testID="tile-investment-income"
        label={t.investments.tileIncome}
        value={formatAed(s.monthlyIncome)}
        note={t.investments.incomeNote(`${(s.incomeYield * 100).toFixed(1)}%`)}
      />

      {slices.length > 0 && (
        <HorizontalBars
          testID="allocation-chart"
          title={t.investments.allocationTitle}
          caption={t.investments.allocationCaption}
          items={slices.map((x) => ({ key: x.type, label: x.label, value: x.value }))}
        />
      )}

      <Card testID="investments-list">
        <Heading>{t.investments.listTitle}</Heading>
        {lines.length === 0 ? (
          <Body muted>{t.investments.empty}</Body>
        ) : (
          lines.map((l) => (
            <SwipeableCard
              key={l.id}
              testID={`swipe-investment-${l.id}`}
              name={l.name}
              onDelete={() => removeInvestment(l.id)}
            >
              <InvestmentCard
                line={l}
                frequency={
                  plan.investments.find((v) => v.id === l.id)?.incomeFrequency ?? 'monthly'
                }
                onPress={() => router.push(`/edit/investment/${l.id}`)}
              />
            </SwipeableCard>
          ))
        )}
        <Button
          label={t.investments.add}
          variant="secondary"
          onPress={() => router.push('/edit/investment/new')}
          testID="add-investment"
        />
      </Card>
    </Screen>
  );
}

function InvestmentCard({
  line,
  frequency,
  onPress,
}: {
  line: InvestmentLine;
  frequency: keyof typeof FREQUENCY_LABELS;
  onPress: () => void;
}) {
  const profit = `${line.gain >= 0 ? t.investments.gain : t.investments.loss} ${signed(line.gain)} (${signedPercent(line.gainRatio)})`;
  const income =
    line.monthlyIncome > 0
      ? t.investments.income(formatAed(line.monthlyIncome))
      : t.investments.noIncome;
  const contribution =
    line.monthlyContribution > 0
      ? line.enabled
        ? t.investments.contribution(formatAed(line.monthlyContribution))
        : t.investments.paused
      : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${line.name}, worth ${formatAed(line.currentValue)}. ${profit}. ${income}`}
      onPress={onPress}
      onLongPress={onPress}
      testID={`investment-${line.id}`}
    >
      <Card>
        <Heading>{line.name}</Heading>
        <Body>{`${formatAed(line.currentValue)}`}</Body>
        <Body muted>{t.investments.line(line.typeLabel, formatAed(line.invested))}</Body>
        <Body>{profit}</Body>
        <Body
          muted
        >{`${income}${line.monthlyIncome > 0 ? ` (${FREQUENCY_LABELS[frequency]})` : ''}`}</Body>
        {contribution ? <Body muted>{contribution}</Body> : null}
      </Card>
    </Pressable>
  );
}
