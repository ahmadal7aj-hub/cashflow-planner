import { useRouter } from 'expo-router';

import { t } from '../i18n/strings';
import { usePrototype } from '../state/PrototypeContext';
import { ChipGroup } from './forms';
import { Body, Button } from './ui';

/**
 * "Share this on the Shared dashboard" choice for one item. When no account is linked it explains how to link
 * instead (the preview never shares anything with a real person).
 */
export function ShareToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (shared: boolean) => void;
}) {
  const router = useRouter();
  const { sharing } = usePrototype();
  if (!sharing.linked) {
    return (
      <>
        <Body muted testID="share-not-linked">
          {t.shared.notLinkedHint}
        </Body>
        <Button
          label={t.shared.linkAccount}
          variant="secondary"
          onPress={() => router.push('/link')}
          testID="share-link-account"
        />
      </>
    );
  }
  return (
    <ChipGroup
      label={t.shared.shareLabel(sharing.partnerUsername)}
      testID="share"
      value={value ? 'yes' : 'no'}
      onChange={(v) => onChange(v === 'yes')}
      options={[
        { value: 'no', label: t.shared.private },
        { value: 'yes', label: t.shared.shared },
      ]}
    />
  );
}
