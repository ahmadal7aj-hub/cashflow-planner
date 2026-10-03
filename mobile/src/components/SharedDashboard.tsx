import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import type { GroupEvent, GroupTotals, SharedEntry } from '../backend/sharingApi';
import { DateRangeControl, type DateRangeState } from './DateRangeControl';
import { ChipGroup } from './forms';
import { Body, Button, Card, Heading, Row } from './ui';
import { formatDate } from '../domain/dates';
import { formatAed } from '../domain/money';
import { entriesInRange, eventsInRange, localDay, totalsWindow } from '../domain/sharedView';
import { t } from '../i18n/strings';
import { useAccount } from '../state/AccountContext';
import { usePrototype } from '../state/PrototypeContext';
import { useSharing } from '../state/SharingContext';
import { makeStyles } from '../theme/ThemeProvider';
import { fontSize, spacing } from '../theme/tokens';

const useStyles = makeStyles(({ colors }) => ({
  wrap: { gap: spacing.md },
  big: { fontSize: fontSize.title, fontWeight: '800', color: colors.text },
}));

function signed(fils: number): string {
  return fils > 0 ? `+${formatAed(fils)}` : formatAed(fils);
}

function eventText(e: GroupEvent): string {
  const texts = t.groupPage.events as Record<string, (actor: string, subject: string) => string>;
  return (texts[e.kind] ?? (() => e.kind))(e.actor ?? '?', e.subject ?? '?');
}

/** The Shared Savings dashboard: a group's combined and per-person savings, its entries and its history. */
export function SharedDashboard({ dates }: { dates: DateRangeState }) {
  const router = useRouter();
  const styles = useStyles();
  const { today } = usePrototype();
  const account = useAccount();
  const sharing = useSharing();
  const { range } = dates;
  const [chosen, setChosen] = useState<string | null>(null);
  const [view, setView] = useState<'period' | 'total'>('period');
  const [totals, setTotals] = useState<GroupTotals | null>(null);
  const [entries, setEntries] = useState<SharedEntry[]>([]);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [asking, setAsking] = useState<SharedEntry | null>(null);

  const group = sharing.groups.find((g) => g.groupId === chosen) ?? sharing.groups[0];
  const groupId = group?.groupId;
  const me = account.status === 'signedIn' ? account.user : null;
  const window = useMemo(() => totalsWindow(range, today), [range, today]);

  const { api, version } = sharing;
  useEffect(() => {
    let cancelled = false;
    if (!api || !groupId) return;
    Promise.all([
      api.totals(groupId, window.from, window.to),
      api.entries(groupId),
      api.events(groupId),
    ])
      .then(([tt, ee, ev]) => {
        if (cancelled) return;
        setTotals(tt);
        setEntries(ee);
        setEvents(ev);
        setLoadError(null);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t.shared.syncError);
      });
    return () => {
      cancelled = true;
    };
  }, [api, groupId, window.from, window.to, version]);

  if (!sharing.available) {
    return (
      <View style={styles.wrap} testID="shared-screen">
        <Heading>{t.shared.title}</Heading>
        <Body muted testID="shared-unavailable">
          {account.status === 'unavailable' ? t.account.notAvailable : t.shared.notSignedIn}
        </Body>
      </View>
    );
  }
  if (!group) {
    return (
      <View style={styles.wrap} testID="shared-screen">
        <Heading>{t.shared.title}</Heading>
        <Body muted testID="shared-no-groups">
          {t.shared.noGroups}
        </Body>
        <Button
          label={t.shared.manage}
          onPress={() => router.push('/groups')}
          testID="shared-manage"
        />
      </View>
    );
  }

  const shownEntries = entriesInRange(entries, range);
  const shownEvents = eventsInRange(events, range);
  const combined = totals?.combined;
  const periodLabel = dates.preset === 'current-month' ? t.shared.thisMonth : t.shared.period;
  const noBalance = view === 'total' && combined && !combined.hasRecords;

  const makePrivate = async (entry: SharedEntry) => {
    try {
      await sharing.makePrivate(entry);
      setAsking(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t.auth.errors.unknown);
    }
  };

  const edit = (entry: SharedEntry) => {
    const movement = sharing.localMovementId(entry);
    router.push(movement ? `/edit/savings-edit/${movement}` : `/edit/shared-entry/${entry.id}`);
  };

  return (
    <View style={styles.wrap} testID="shared-screen">
      <Body muted>{t.shared.subtitle}</Body>
      {sharing.groups.length > 1 ? (
        <ChipGroup
          label={t.shared.groupLabel}
          testID="sgroup"
          value={group.groupId}
          onChange={setChosen}
          options={sharing.groups.map((g) => ({ value: g.groupId, label: g.name }))}
        />
      ) : null}
      <Heading>{group.name}</Heading>
      <Body muted>{t.shared.people(group.memberCount)}</Body>
      {sharing.error || loadError ? (
        <Body testID="shared-sync-error">{t.shared.syncError}</Body>
      ) : null}

      <DateRangeControl state={dates} idPrefix="srange" />

      <Card tone="info" testID="shared-summary">
        <ChipGroup
          label={t.shared.viewLabel}
          testID="sview"
          value={view}
          onChange={setView}
          options={[
            { value: 'period', label: periodLabel },
            { value: 'total', label: t.shared.total },
          ]}
        />
        {!combined ? (
          <Body muted>{t.auth.checking}</Body>
        ) : noBalance ? (
          <Body testID="shared-no-records">{t.shared.noRecords(formatDate(window.to))}</Body>
        ) : (
          <>
            <Text style={styles.big} testID="shared-combined">
              {view === 'period'
                ? window.future
                  ? signed(0)
                  : signed(combined.periodNet)
                : formatAed(combined.totalNet)}
            </Text>
            <Body muted>
              {view === 'period' ? t.shared.periodNote : t.shared.totalNote(formatDate(window.to))}
            </Body>
          </>
        )}
        <Body muted>{t.shared.privateNote}</Body>
      </Card>

      {combined && !noBalance ? (
        <Card testID="shared-members">
          <Heading>{t.shared.contributions}</Heading>
          {totals!.members.map((m) => (
            <Row
              key={m.memberId}
              label={m.memberId === me?.id ? t.shared.youLabel(m.username) : m.username}
              value={
                view === 'period'
                  ? window.future
                    ? signed(0)
                    : signed(m.periodNet)
                  : m.hasRecords
                    ? formatAed(m.totalNet)
                    : formatAed(0)
              }
              strong
            />
          ))}
        </Card>
      ) : null}

      <Heading>{t.shared.entries}</Heading>
      {shownEntries.length === 0 ? (
        <Body muted testID="shared-no-entries">
          {entries.length === 0 ? t.shared.empty : t.shared.noEntries}
        </Body>
      ) : null}
      {shownEntries.map((e) => {
        const mine = e.ownerId === me?.id;
        return (
          <Card key={e.id} testID={`entry-${e.localId}`}>
            <Row
              label={t.shared.entryLine(
                mine ? t.shared.youLabel(e.ownerUsername) : e.ownerUsername,
                e.kind === 'deposit' ? t.shared.deposit : t.shared.withdrawal,
              )}
              value={e.kind === 'deposit' ? formatAed(e.amount) : formatAed(-e.amount)}
              strong
            />
            <Body muted>{formatDate(e.entryDate)}</Body>
            {e.note ? <Body muted>{e.note}</Body> : null}
            <Body muted>{t.shared.sharedOn(formatDate(localDay(e.sharedAt)))}</Body>
            {mine ? (
              asking?.id === e.id ? (
                <>
                  <Body testID="private-ask">{t.shared.makePrivateAsk}</Body>
                  <Button
                    label={t.shared.makePrivateConfirm}
                    onPress={() => makePrivate(e)}
                    testID={`private-confirm-${e.localId}`}
                  />
                  <Button
                    label={t.shared.keep}
                    variant="secondary"
                    onPress={() => setAsking(null)}
                    testID="private-cancel"
                  />
                </>
              ) : (
                <>
                  <Button
                    label={t.shared.edit}
                    variant="secondary"
                    onPress={() => edit(e)}
                    testID={`edit-${e.localId}`}
                  />
                  <Button
                    label={t.shared.makePrivate}
                    variant="secondary"
                    onPress={() => setAsking(e)}
                    testID={`private-${e.localId}`}
                  />
                </>
              )
            ) : null}
          </Card>
        );
      })}

      <Heading>{t.shared.history}</Heading>
      {shownEvents.length === 0 ? <Body muted>{t.shared.noHistory}</Body> : null}
      {shownEvents.map((ev) => (
        <Body key={ev.id}>{`${formatDate(localDay(ev.occurredAt))} · ${eventText(ev)}`}</Body>
      ))}

      <Button
        label={t.shared.refresh}
        variant="secondary"
        onPress={() => sharing.refresh()}
        testID="shared-refresh"
      />
      <Button
        label={t.shared.manage}
        variant="secondary"
        onPress={() => router.push(`/groups/${group.groupId}`)}
        testID="shared-manage"
      />
    </View>
  );
}
