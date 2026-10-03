import { useRouter } from 'expo-router';
import { useState } from 'react';

import { t } from '../i18n/strings';
import { useSharing } from '../state/SharingContext';
import { ChipGroup, Field } from './forms';
import { Body, Button } from './ui';

const PRIVATE = 'private';
const SHARED = 'shared';
/** The "someone new" choice among the groups. */
const NEW_PERSON = '__new__';

type Mode = typeof PRIVATE | typeof SHARED;

/** Typed identifiers that are phone numbers cannot be looked up: the number is not verified. */
const LOOKS_LIKE_PHONE = /^\+?[0-9 ()-]{6,}$/;

export interface ShareChoice {
  mode: Mode;
  /** A group id, or the "someone new" marker. */
  pick: string;
  person: string;
  personError: string | undefined;
  /** What the saving is shared with right now, for comparing with what it was before: a group id or null. */
  currentGroupId: string | null;
  setMode: (m: Mode) => void;
  setPick: (p: string) => void;
  setPerson: (p: string) => void;
  /**
   * Works out which group the saving goes to. For "someone new" this starts a group with that person and invites them
   * (they see it only after they accept). Returns undefined when the choice is not valid yet.
   */
  resolve: () => Promise<{ groupId: string | null } | undefined>;
}

/** The share choice of one form: private, or shared with a group or with a person by username or email. */
export function useShareChoice(initialGroupId: string | null = null): ShareChoice {
  const sharing = useSharing();
  const [mode, setModeState] = useState<Mode>(initialGroupId ? SHARED : PRIVATE);
  const [pick, setPick] = useState<string>(initialGroupId ?? NEW_PERSON);
  const [person, setPerson] = useState('');
  const [personError, setPersonError] = useState<string | undefined>();

  const setMode = (m: Mode) => {
    setModeState(m);
    setPersonError(undefined);
    if (m === SHARED && pick === NEW_PERSON && sharing.groups.length > 0)
      setPick(sharing.groups[0]!.groupId);
  };

  const currentGroupId = mode === PRIVATE || pick === NEW_PERSON ? null : pick;

  const resolve = async () => {
    if (mode === PRIVATE) return { groupId: null };
    if (pick !== NEW_PERSON) return { groupId: pick };
    const who = person.trim().toLowerCase();
    if (who === '') {
      setPersonError(t.shareChoice.errorPerson);
      return undefined;
    }
    if (LOOKS_LIKE_PHONE.test(who)) {
      setPersonError(t.shareChoice.errorPhone);
      return undefined;
    }
    setPersonError(undefined);
    try {
      const name = t.shareChoice.groupNameFor(who).slice(0, 60);
      const existing = sharing.groups.find((g) => g.name === name);
      const groupId = existing ? existing.groupId : await sharing.createGroup(name);
      await sharing.invite(groupId, who);
      return { groupId };
    } catch (e) {
      setPersonError(e instanceof Error && e.message ? e.message : t.shareChoice.errorFailed);
      return undefined;
    }
  };

  return { mode, pick, person, personError, currentGroupId, setMode, setPick, setPerson, resolve };
}

/**
 * "Share this saving": Keep private (the default) or Shared. Shared asks who with: a group you are already in, or a
 * new person by username or email. The other person must accept before they see anything. Sharing shows the same
 * saving to them; it does not move money or change anyone's personal total.
 *
 * The control is always visible so people can find it. When sharing is not possible yet, it says exactly why.
 */
export function ShareToggle({ choice }: { choice: ShareChoice }) {
  const router = useRouter();
  const sharing = useSharing();

  return (
    <>
      <ChipGroup
        label={t.shareChoice.label}
        testID="share"
        value={choice.mode}
        onChange={choice.setMode}
        options={[
          { value: PRIVATE, label: t.shareChoice.private },
          { value: SHARED, label: t.shareChoice.shared },
        ]}
      />
      {choice.mode === PRIVATE ? (
        sharing.available ? (
          <Body muted>{t.shareChoice.hint}</Body>
        ) : null
      ) : !sharing.available ? (
        <Body muted testID="share-unavailable">
          {t.shareChoice.notAvailable}
        </Body>
      ) : (
        <>
          {sharing.groups.length > 0 ? (
            <ChipGroup
              label={t.shareChoice.with}
              testID="share-with"
              value={choice.pick}
              onChange={choice.setPick}
              options={[
                ...sharing.groups.map((g) => ({ value: g.groupId, label: g.name })),
                { value: NEW_PERSON, label: t.shareChoice.newPerson },
              ]}
            />
          ) : null}
          {choice.pick === NEW_PERSON ? (
            <Field
              label={t.shareChoice.personLabel}
              hint={t.shareChoice.personHint}
              testID="share-person"
              value={choice.person}
              onChangeText={choice.setPerson}
              error={choice.personError}
            />
          ) : null}
          <Body muted testID="share-agreement">
            {t.shareChoice.agreement}
          </Body>
          {sharing.groups.length > 0 ? (
            <Button
              label={t.shareChoice.manage}
              variant="secondary"
              onPress={() => router.push('/groups')}
              testID="share-manage-groups"
            />
          ) : null}
        </>
      )}
    </>
  );
}
