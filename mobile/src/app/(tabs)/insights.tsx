import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { Body, Card, Heading, Screen } from '../../components/ui';
import { buildInsights, type Insight } from '../../domain/insights';
import { formatAed } from '../../domain/money';
import { t } from '../../i18n/strings';
import { usePrototype } from '../../state/PrototypeContext';

function copy(i: Insight): { title: string; body: string; route: string } {
  const amount = formatAed(i.amount ?? 0);
  const name = i.subject ?? '';
  switch (i.kind) {
    case 'shortfall':
      return {
        title: t.insights.shortfallTitle,
        body: t.insights.shortfallBody(amount),
        route: '/dashboard',
      };
    case 'budget-over':
      return {
        title: t.insights.overTitle(name),
        body: t.insights.overBody(amount),
        route: '/spending',
      };
    case 'budget-ahead':
      return {
        title: t.insights.aheadTitle(name),
        body: t.insights.aheadBody(amount),
        route: '/spending',
      };
    case 'big-bill':
      return {
        title: t.insights.billTitle(name),
        body: t.insights.billBody(i.days ?? 0, amount),
        route: '/savings',
      };
    case 'discretionary-tight':
      return {
        title: t.insights.tightTitle,
        body: t.insights.tightBody(amount),
        route: '/spending',
      };
    case 'emergency-low':
      return { title: t.insights.cashTitle, body: t.insights.cashBody(amount), route: '/savings' };
    case 'goal-behind':
      return {
        title: t.insights.goalTitle(name),
        body: t.insights.goalBody(amount),
        route: '/savings',
      };
    case 'income-gap':
      return { title: t.insights.gapTitle, body: t.insights.gapBody(amount), route: '/income' };
  }
}

export default function Insights() {
  const router = useRouter();
  const { plan, baseline } = usePrototype();
  const insights = buildInsights(plan, baseline);

  return (
    <Screen testID="insights-screen">
      <Body muted>{t.insights.intro}</Body>
      {insights.length === 0 ? (
        <Card testID="insights-empty">
          <Body>{t.insights.empty}</Body>
        </Card>
      ) : (
        insights.map((i) => {
          const c = copy(i);
          return (
            <Pressable
              key={i.id}
              accessibilityRole="button"
              accessibilityLabel={`${t.insights.severity[i.severity]}. ${c.title}. ${c.body}`}
              onPress={() => router.navigate(c.route)}
              testID={`insight-${i.id}`}
            >
              <Card
                tone={
                  i.severity === 'attention'
                    ? 'danger'
                    : i.severity === 'heads-up'
                      ? 'warn'
                      : 'default'
                }
              >
                <Body muted>{t.insights.severity[i.severity]}</Body>
                <Heading>{c.title}</Heading>
                <Body>{c.body}</Body>
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}
