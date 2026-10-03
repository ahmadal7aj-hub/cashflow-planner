import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { SwipeableCard } from '../../components/SwipeableCard';
import { Body, Button, Card, Row, Screen } from '../../components/ui';
import { FREQUENCY_LABELS, type IncomeItem } from '../../domain/budgetModel';
import { formatDate, nextOnOrAfter, type ISODate } from '../../domain/dates';
import { formatAed } from '../../domain/money';
import { incomeAnchor } from '../../domain/spending';
import { getIncomeCategory } from '../../domain/uaeCategories';
import { t } from '../../i18n/strings';
import { usePrototype } from '../../state/PrototypeContext';

function IncomeCard({
  item,
  today,
  onPress,
}: {
  item: IncomeItem;
  today: ISODate;
  onPress: () => void;
}) {
  const category = getIncomeCategory(item.kind).label;
  const next = nextOnOrAfter(incomeAnchor(item, today), item.frequency, today);
  const detail =
    item.amount === 0
      ? t.incomePage.zero
      : `${category} · ${FREQUENCY_LABELS[item.frequency]} · ${t.budgetPage.nextDue(formatDate(next))}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${formatAed(item.amount)}, ${detail}`}
      onPress={onPress}
      onLongPress={onPress}
      testID={`income-${item.id}`}
    >
      <Card>
        <Row label={item.name} value={formatAed(item.amount)} strong />
        <Body muted>{detail}</Body>
        <Body muted>{item.stable ? t.incomePage.predictable : t.incomePage.varies}</Body>
      </Card>
    </Pressable>
  );
}

export default function Income() {
  const router = useRouter();
  const { plan, today, removeIncome } = usePrototype();

  return (
    <Screen testID="income-screen">
      {plan.income.length === 0 ? (
        <EmptyState
          title={t.incomePage.emptyTitle}
          body={t.incomePage.emptyBody}
          actionLabel={t.addItem}
          onAction={() => router.push('/edit/income/new')}
          testID="add-income"
        />
      ) : (
        <>
          {plan.income.map((i) => (
            <SwipeableCard
              key={i.id}
              testID={`swipe-income-${i.id}`}
              name={i.name}
              onDelete={() => removeIncome(i.id)}
            >
              <IncomeCard
                item={i}
                today={today}
                onPress={() => router.push(`/edit/income/${i.id}`)}
              />
            </SwipeableCard>
          ))}
          <Button
            label={t.addItem}
            icon="add"
            onPress={() => router.push('/edit/income/new')}
            testID="add-income"
          />
        </>
      )}
    </Screen>
  );
}
