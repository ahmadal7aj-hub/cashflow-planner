import { useRouter } from 'expo-router';

import { t } from '../i18n/strings';
import { useSharing } from '../state/SharingContext';
import { ChipGroup } from './forms';
import { Body, Button } from './ui';

const PRIVATE = 'private';

/**
 * "Share this saving": private by default, or one of the groups the user belongs to. Sharing shows the same saving
 * to that group; it does not move money or change anyone's personal total.
 *
 * The control is always visible so people can find it. When sharing is not possible yet, it says exactly why and what
 * to do next instead of disappearing.
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

  const groups = sharing.available ? sharing.groups : [];
  const options = [
    { value: PRIVATE, label: t.shareChoice.private },
    ...groups.map((g) => ({ value: g.groupId, label: g.name })),
  ];

  return (
    <>
      <ChipGroup
        label={t.shareChoice.label}
        testID="share"
        value={value ?? PRIVATE}
        onChange={(v) => onChange(v === PRIVATE ? null : v)}
        options={options}
      />
      {!sharing.available ? (
        <Body muted testID="share-unavailable">
          {t.shareChoice.notAvailable}
        </Body>
      ) : groups.length === 0 ? (
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
      ) : (
        <Body muted>{t.shareChoice.hint}</Body>
      )}
    </>
  );
}
