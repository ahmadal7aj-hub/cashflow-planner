import { useState } from 'react';

import { t } from '../i18n/strings';
import { Body, Button } from './ui';

/** Two-step delete: the first tap asks, the second tap deletes, so a stray tap never removes anything. */
export function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <>
      {armed ? <Body testID="delete-confirm-note">{t.edit.deleteAsk}</Body> : null}
      <Button
        label={armed ? t.edit.deleteConfirm : t.edit.delete}
        variant="secondary"
        testID="edit-delete"
        onPress={() => (armed ? onConfirm() : setArmed(true))}
      />
      {armed ? (
        <Button
          label={t.edit.deleteCancel}
          variant="secondary"
          testID="edit-delete-cancel"
          onPress={() => setArmed(false)}
        />
      ) : null}
    </>
  );
}
