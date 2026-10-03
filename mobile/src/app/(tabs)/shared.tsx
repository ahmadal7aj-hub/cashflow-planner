import { useRouter } from 'expo-router';

import { Body, Button, Card, Heading, Row, Screen } from '../../components/ui';
import { formatAed } from '../../domain/money';
import {
  buildSharedView,
  SAMPLE_PARTNER,
  type SectionView,
  type SharedLine,
} from '../../domain/sharedDashboard';
import { relativeDays } from '../../domain/dates';
import { t } from '../../i18n/strings';
import { usePrototype } from '../../state/PrototypeContext';

function lineNote(l: SharedLine): string {
  const who = l.owner === 'me' ? t.shared.you : SAMPLE_PARTNER.name;
  return l.dueInDays !== undefined ? `${who} · ${t.shared.due(relativeDays(l.dueInDays))}` : who;
}

function Section({
  view,
  title,
  note,
  onStop,
}: {
  view: SectionView;
  title: string;
  note: string;
  onStop: (key: string) => void;
}) {
  return (
    <Card testID={`shared-${view.section}`}>
      <Heading>{title}</Heading>
      <Body muted>{note}</Body>
      <Row label={t.shared.combined} value={formatAed(view.combined)} strong />
      <Row label={t.shared.you} value={formatAed(view.mine)} />
      <Row label={SAMPLE_PARTNER.name} value={formatAed(view.partner)} />
      {view.lines.length === 0 ? <Body muted>{t.shared.nothingYet}</Body> : null}
      {view.lines.map((l) => (
        <Card key={l.key} testID={`shared-line-${l.key}`}>
          <Row label={l.label} value={formatAed(l.amount)} />
          <Body muted>{lineNote(l)}</Body>
          {l.owner === 'me' ? (
            <Button
              label={t.shared.stopSharing}
              variant="secondary"
              onPress={() => onStop(l.key)}
              testID={`unshare-${l.key}`}
            />
          ) : null}
        </Card>
      ))}
    </Card>
  );
}

export default function Shared() {
  const router = useRouter();
  const { plan, sharing, setShared } = usePrototype();
  const view = buildSharedView(plan, sharing.sharedKeys);

  if (!sharing.linked) {
    return (
      <Screen testID="shared-screen">
        <Heading>{t.shared.title}</Heading>
        <Body muted>{t.shared.notLinkedHint}</Body>
        <Button
          label={t.shared.linkAccount}
          onPress={() => router.push('/link')}
          testID="shared-link"
        />
      </Screen>
    );
  }

  return (
    <Screen testID="shared-screen">
      <Card tone="info" testID="shared-banner">
        <Body>{t.shared.linkedWith(sharing.partnerUsername)}</Body>
        <Body muted>{t.shared.previewNote}</Body>
      </Card>
      {view.empty ? <Body testID="shared-empty">{t.shared.emptyHint}</Body> : null}
      <Section
        view={view.sections.savings}
        title={t.shared.savingsTitle}
        note={t.shared.savingsNote}
        onStop={(k) => setShared(k, false)}
      />
      <Section
        view={view.sections.upcoming}
        title={t.shared.upcomingTitle}
        note={t.shared.upcomingNote}
        onStop={(k) => setShared(k, false)}
      />
      <Section
        view={view.sections.spending}
        title={t.shared.spendingTitle}
        note={t.shared.spendingNote}
        onStop={(k) => setShared(k, false)}
      />
      <Button
        label={t.shared.manageLink}
        variant="secondary"
        onPress={() => router.push('/link')}
        testID="shared-manage"
      />
    </Screen>
  );
}
