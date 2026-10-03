import { Body, Button, Card, Heading } from './ui';

/** What a section shows before the user has saved anything: a short explanation and an Add item button. */
export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  testID,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  testID: string;
}) {
  return (
    <Card testID={`${testID}-empty`}>
      <Heading>{title}</Heading>
      <Body muted>{body}</Body>
      <Button label={actionLabel} icon="add" onPress={onAction} testID={testID} />
    </Card>
  );
}
