import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import type { GroupEvent, GroupMember } from '../../backend/sharingApi';
import { Field } from '../../components/forms';
import { Body, Button, Card, Heading, Row, Screen } from '../../components/ui';
import { t } from '../../i18n/strings';
import { useAccount } from '../../state/AccountContext';
import { useSharing } from '../../state/SharingContext';

function message(e: unknown): string {
  return e instanceof Error && e.message ? e.message : t.auth.errors.unknown;
}

function eventText(e: GroupEvent): string {
  const actor = e.actor ?? '?';
  const subject = e.subject ?? '?';
  const texts = t.groupPage.events as Record<string, (actor: string, subject: string) => string>;
  return (texts[e.kind] ?? (() => e.kind))(actor, subject);
}

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const account = useAccount();
  const sharing = useSharing();
  const group = sharing.groups.find((g) => g.groupId === id);
  const me = account.status === 'signedIn' ? account.user : null;

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [identifier, setIdentifier] = useState('');
  const [identifierError, setIdentifierError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [removing, setRemoving] = useState<GroupMember | null>(null);

  const { api, version } = sharing;
  const [reloads, setReloads] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (!api || !id) return;
    Promise.all([api.members(id), api.events(id)])
      .then(([m, ev]) => {
        if (cancelled) return;
        setMembers(m);
        setEvents(ev);
      })
      .catch(() => {
        // The group may have just been left; the list screen explains what happened.
      });
    return () => {
      cancelled = true;
    };
  }, [api, id, version, reloads]);
  const load = async () => setReloads((n) => n + 1);

  if (!sharing.available || !group || !id) {
    return (
      <Screen testID="group-screen">
        <Body muted testID="group-missing">
          {t.groupsPage.none}
        </Body>
        <Button
          label={t.groupsPage.title}
          onPress={() => router.replace('/groups')}
          testID="group-back"
        />
      </Screen>
    );
  }

  const isAdmin = group.role === 'admin';

  const invite = async () => {
    const value = identifier.trim();
    if (value === '') {
      setIdentifierError(t.groupPage.errorIdentifier);
      return;
    }
    setIdentifierError(undefined);
    setProblem(null);
    try {
      await sharing.invite(id, value);
      setIdentifier('');
      setNotice(t.groupPage.inviteSent);
      await load();
    } catch (e) {
      setProblem(message(e));
    }
  };

  const removeMember = async (m: GroupMember) => {
    setProblem(null);
    try {
      await sharing.removeMember(id, m.userId);
      setRemoving(null);
      await load();
    } catch (e) {
      setProblem(message(e));
    }
  };

  const leave = async () => {
    setProblem(null);
    try {
      await sharing.leave(id);
      router.replace('/groups');
    } catch (e) {
      setProblem(message(e));
    }
  };

  return (
    <Screen testID="group-screen">
      <Heading>{group.name}</Heading>
      <Body muted>
        {`${t.groupsPage.members(group.memberCount)} · ${t.groupsPage.shared(group.entryCount)}`}
      </Body>
      {isAdmin ? <Body muted>{t.groupPage.youAdmin}</Body> : null}
      {problem ? <Body testID="group-error">{problem}</Body> : null}

      <Heading>{t.groupPage.members}</Heading>
      {members.map((m) => (
        <Card key={m.userId} testID={`member-${m.username}`}>
          <Row
            label={m.userId === me?.id ? t.shared.youLabel(m.username) : m.username}
            value={m.role === 'admin' ? t.groupsPage.roleAdmin : ''}
            strong
          />
          {m.status === 'pending' ? <Body muted>{t.groupPage.pending}</Body> : null}
          {isAdmin && m.userId !== me?.id && m.role !== 'admin' ? (
            removing?.userId === m.userId ? (
              <>
                <Body testID="remove-ask">{t.groupPage.removeAsk(m.username)}</Body>
                <Button
                  label={t.groupPage.removeConfirm}
                  onPress={() => removeMember(m)}
                  testID={`remove-confirm-${m.username}`}
                />
                <Button
                  label={t.groupPage.keep}
                  variant="secondary"
                  onPress={() => setRemoving(null)}
                  testID="remove-cancel"
                />
              </>
            ) : (
              <Button
                label={m.status === 'pending' ? t.groupPage.cancelInvite : t.groupPage.remove}
                variant="secondary"
                onPress={() => setRemoving(m)}
                testID={`remove-${m.username}`}
              />
            )
          ) : null}
        </Card>
      ))}

      {isAdmin ? (
        <Card testID="invite-card">
          <Heading>{t.groupPage.invite}</Heading>
          <Field
            label={t.groupPage.inviteLabel}
            hint={t.groupPage.inviteHint}
            testID="invite-identifier"
            value={identifier}
            onChangeText={setIdentifier}
            error={identifierError}
          />
          {notice ? <Body testID="invite-notice">{notice}</Body> : null}
          <Button label={t.groupPage.inviteButton} onPress={invite} testID="invite-send" />
        </Card>
      ) : null}

      <Button
        label={t.shared.title}
        onPress={() => router.navigate({ pathname: '/dashboard', params: { section: 'shared' } })}
        testID="group-open-shared"
      />

      <Heading>{t.groupPage.history}</Heading>
      <Body muted>{t.groupPage.historyNote}</Body>
      {events.map((e) => (
        <Body key={e.id} testID={`event-${e.id}`}>
          {eventText(e)}
        </Body>
      ))}

      {leaving ? (
        <Card tone="warn" testID="leave-ask">
          <Body>{t.groupPage.leaveAsk}</Body>
          <Button label={t.groupPage.leaveConfirm} onPress={leave} testID="leave-confirm" />
          <Button
            label={t.groupPage.keep}
            variant="secondary"
            onPress={() => setLeaving(false)}
            testID="leave-cancel"
          />
        </Card>
      ) : (
        <Button
          label={t.groupPage.leave}
          variant="secondary"
          onPress={() => setLeaving(true)}
          testID="leave"
        />
      )}
    </Screen>
  );
}
