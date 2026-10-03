import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { Field } from '../../components/forms';
import { Body, Button, Card, Heading, Row, Screen } from '../../components/ui';
import { t } from '../../i18n/strings';
import { useSharing } from '../../state/SharingContext';

function message(e: unknown): string {
  return e instanceof Error && e.message ? e.message : t.auth.errors.unknown;
}

export default function Groups() {
  const router = useRouter();
  const sharing = useSharing();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [problem, setProblem] = useState<string | null>(null);

  if (!sharing.available) {
    return (
      <Screen testID="groups-screen">
        <Heading>{t.groupsPage.title}</Heading>
        <Body muted testID="groups-unavailable">
          {t.account.notAvailable}
        </Body>
      </Screen>
    );
  }

  const answer = async (groupId: string, accept: boolean) => {
    setProblem(null);
    try {
      await sharing.respond(groupId, accept);
    } catch (e) {
      setProblem(message(e));
    }
  };

  const create = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 60) {
      setError(t.groupsPage.errorName);
      return;
    }
    setError(undefined);
    setProblem(null);
    try {
      const id = await sharing.createGroup(trimmed);
      setName('');
      router.push(`/groups/${id}`);
    } catch (e) {
      setProblem(message(e));
    }
  };

  return (
    <Screen testID="groups-screen">
      <Body muted>{t.groupsPage.intro}</Body>
      {problem ? <Body testID="groups-error">{problem}</Body> : null}
      {sharing.error ? <Body muted>{t.shared.syncError}</Body> : null}

      {sharing.invitations.length > 0 ? (
        <>
          <Heading>{t.groupsPage.invitations}</Heading>
          {sharing.invitations.map((i) => (
            <Card key={i.groupId} tone="info" testID={`invitation-${i.groupId}`}>
              <Heading>{i.groupName}</Heading>
              <Body muted>{t.groupsPage.invitedBy(i.invitedBy)}</Body>
              <Body muted>{t.groupsPage.acceptNote}</Body>
              <Button
                label={t.groupsPage.accept}
                onPress={() => answer(i.groupId, true)}
                testID={`accept-${i.groupId}`}
              />
              <Button
                label={t.groupsPage.decline}
                variant="secondary"
                onPress={() => answer(i.groupId, false)}
                testID={`decline-${i.groupId}`}
              />
            </Card>
          ))}
        </>
      ) : null}

      <Heading>{t.groupsPage.yourGroups}</Heading>
      {sharing.groups.length === 0 ? <Body muted>{t.groupsPage.none}</Body> : null}
      {sharing.groups.map((g) => (
        <Pressable
          key={g.groupId}
          accessibilityRole="button"
          accessibilityLabel={g.name}
          onPress={() => router.push(`/groups/${g.groupId}`)}
          testID={`group-${g.groupId}`}
        >
          <Card>
            <Row label={g.name} value={g.role === 'admin' ? t.groupsPage.roleAdmin : ''} strong />
            <Body muted>
              {`${t.groupsPage.members(g.memberCount)} · ${t.groupsPage.shared(g.entryCount)}`}
            </Body>
          </Card>
        </Pressable>
      ))}

      <Card testID="new-group">
        <Heading>{t.groupsPage.newGroup}</Heading>
        <Field
          label={t.groupsPage.groupName}
          hint={t.groupsPage.groupNameHint}
          testID="group-name"
          value={name}
          onChangeText={setName}
          error={error}
        />
        <Button label={t.groupsPage.create} onPress={create} testID="group-create" />
      </Card>
      <Button
        label={t.groupsPage.refresh}
        variant="secondary"
        onPress={() => sharing.refresh()}
        testID="groups-refresh"
      />
    </Screen>
  );
}
