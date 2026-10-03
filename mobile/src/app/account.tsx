import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share } from 'react-native';

import { Field } from '../components/forms';
import { Body, Button, Card, Heading, Screen } from '../components/ui';
import {
  nameProblem,
  normalizeName,
  normalizePhone,
  phoneProblem,
} from '../domain/accountValidation';
import { t } from '../i18n/strings';
import { useAccount } from '../state/AccountContext';

export default function Account() {
  const router = useRouter();
  const account = useAccount();
  const [asking, setAsking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteWord, setDeleteWord] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [contactErrors, setContactErrors] = useState<{
    name?: string;
    phone?: string;
    form?: string;
  }>({});
  const [saved, setSaved] = useState(false);

  if (account.status !== 'signedIn') {
    return (
      <Screen testID="account-screen">
        <Heading>{t.account.title}</Heading>
        <Body muted testID="account-unavailable">
          {t.account.notAvailable}
        </Body>
      </Screen>
    );
  }

  const startEditing = () => {
    if (account.status !== 'signedIn') return;
    setNameInput(account.user.fullName);
    setPhoneInput(account.user.phone);
    setContactErrors({});
    setSaved(false);
    setEditing(true);
  };

  const saveContact = async () => {
    const next = {
      ...(nameProblem(nameInput) ? { name: t.auth.errors.nameLength } : {}),
      ...(phoneProblem(phoneInput) ? { phone: t.auth.errors.phoneInvalid } : {}),
    };
    setContactErrors(next);
    if (Object.keys(next).length > 0) return;
    try {
      await account.updateContact(normalizeName(nameInput), normalizePhone(phoneInput));
      setEditing(false);
      setSaved(true);
    } catch {
      setContactErrors({ form: t.account.contactFailed });
    }
  };

  const deleteAccount = async () => {
    if (account.status !== 'signedIn') return;
    if (deleteWord.trim() !== t.account.deleteWord) {
      setDeleteError(t.account.deleteMismatch);
      return;
    }
    setDeleteError(null);
    try {
      await account.deleteAccount(account.user.id);
    } catch {
      setDeleteError(t.account.deleteFailed);
    }
  };

  const signOut = async () => {
    try {
      await account.signOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.auth.errors.unknown);
    }
  };

  return (
    <Screen testID="account-screen">
      <Heading>{t.account.title}</Heading>
      <Card testID="account-card">
        <Heading>{t.account.profileTitle}</Heading>
        <Body muted>{t.account.usernameLabel}</Body>
        <Body testID="profile-username">{account.user.username || '-'}</Body>
        <Body muted>{t.account.emailLabel}</Body>
        <Body testID="profile-email">{account.user.email}</Body>
        <Body muted>{t.account.usernameHelp}</Body>
        {editing ? (
          <>
            <Field
              label={t.auth.fullName}
              testID="profile-edit-name"
              value={nameInput}
              onChangeText={setNameInput}
              error={contactErrors.name}
            />
            <Field
              label={t.auth.phone}
              hint={t.auth.phoneHint}
              testID="profile-edit-phone"
              value={phoneInput}
              onChangeText={setPhoneInput}
              error={contactErrors.phone}
              keyboardType="phone-pad"
            />
            {contactErrors.form ? <Body>{contactErrors.form}</Body> : null}
            <Button label={t.account.saveContact} onPress={saveContact} testID="profile-save" />
            <Button
              label={t.account.cancelContact}
              variant="secondary"
              onPress={() => setEditing(false)}
              testID="profile-cancel"
            />
          </>
        ) : (
          <>
            <Body muted>{t.account.nameLabel}</Body>
            <Body testID="profile-name">{account.user.fullName || t.account.notSet}</Body>
            <Body muted>{t.account.phoneLabel}</Body>
            <Body testID="profile-phone">{account.user.phone || t.account.notSet}</Body>
            <Body muted>{t.account.contactNote}</Body>
            {saved ? <Body testID="profile-saved">{t.account.contactSaved}</Body> : null}
            <Button
              label={t.account.editContact}
              variant="secondary"
              onPress={startEditing}
              testID="profile-edit"
            />
          </>
        )}
        {account.user.username ? (
          <Button
            label={t.account.shareUsername}
            variant="secondary"
            onPress={() => {
              void Share.share({ message: t.account.shareMessage(account.user.username) });
            }}
            testID="profile-share-username"
          />
        ) : null}
      </Card>
      {account.backend?.kind === 'dev-server' ? (
        <Body muted testID="dev-server-note">
          {t.account.devServer}
        </Body>
      ) : null}
      <Button
        label={t.account.groups}
        onPress={() => router.push('/groups')}
        testID="account-groups"
      />
      {asking ? (
        <Card tone="warn" testID="signout-ask">
          <Body>{t.account.signOutAsk}</Body>
          <Button label={t.account.signOutConfirm} onPress={signOut} testID="signout-confirm" />
          <Button
            label={t.account.keep}
            variant="secondary"
            onPress={() => setAsking(false)}
            testID="signout-cancel"
          />
        </Card>
      ) : (
        <Button
          label={t.account.signOut}
          variant="secondary"
          onPress={() => setAsking(true)}
          testID="signout"
        />
      )}
      {error ? <Body>{error}</Body> : null}
      {deleting ? (
        <Card tone="danger" testID="delete-ask">
          <Heading>{t.account.deleteTitle}</Heading>
          <Body>{t.account.deleteIntro}</Body>
          <Body muted>{t.account.deleteDetails}</Body>
          <Field
            label={t.account.deleteTypeLabel}
            testID="delete-word"
            value={deleteWord}
            onChangeText={setDeleteWord}
          />
          {deleteError ? <Body testID="delete-error">{deleteError}</Body> : null}
          <Button label={t.account.deleteConfirm} onPress={deleteAccount} testID="delete-confirm" />
          <Button
            label={t.account.deleteCancel}
            variant="secondary"
            onPress={() => {
              setDeleting(false);
              setDeleteWord('');
              setDeleteError(null);
            }}
            testID="delete-cancel"
          />
        </Card>
      ) : (
        <Button
          label={t.account.deleteStart}
          variant="secondary"
          onPress={() => setDeleting(true)}
          testID="delete-start"
        />
      )}
    </Screen>
  );
}
