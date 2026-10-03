import { useRouter } from 'expo-router';

import { t } from '../i18n/strings';
import { useSharing } from '../state/SharingContext';
import { ChipGroup } from './forms';
import { Body, Button } from './ui';

const PRIVATE = 'private';

/**
 * "Share this saving": private by default, or one of the groups the user belongs to. Sharing shows the same saving
 * to that group; it does not move money or change anyone's personal total.
 */
export function ShareToggle({
  value,
  onChange,
}: {
  /** The group the saving is shared with, or null when it is private. */
  value: string | null;
  onChange: (groupId: string | null) => void;
}) {
  const router = useRouter();
  const sharing = useSharing();

  if (!sharing.available) {
    return (
      <Body muted testID="share-unavailable">
        {t.shareChoice.notAvailable}
      </Body>
    );
  }
  if (sharing.groups.length === 0) {
    return (
      <>
        <Body muted testID="share-no-groups">
          {t.shareChoice.noGroups}
        </Body>
        <Button
          label={t.shareChoice.manage}
          variant="secondary"
          onPress={() => router.push('/groups')}
          testID="share-manage-groups"
        />
      </>
    );
  }
  return (
    <>
      <ChipGroup
        label={t.shareChoice.label}
        testID="share"
        value={value ?? PRIVATE}
        onChange={(v) => onChange(v === PRIVATE ? null : v)}
        options={[
          { value: PRIVATE, label: t.shareChoice.private },
          ...sharing.groups.map((g) => ({ value: g.groupId, label: g.name })),
        ]}
      />
      <Body muted>{t.shareChoice.hint}</Body>
    </>
  );
}
