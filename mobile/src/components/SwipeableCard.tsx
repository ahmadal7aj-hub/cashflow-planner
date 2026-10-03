import { useState, type ReactNode } from 'react';
import { Alert, Animated, PanResponder, Pressable, Text, View } from 'react-native';

import { t } from '../i18n/strings';
import { makeStyles } from '../theme/ThemeProvider';
import { fontSize, minTouchTarget, radius } from '../theme/tokens';

/** How far the card slides to show the Delete button. */
export const REVEAL_WIDTH = 96;
/** A swipe must be mostly sideways and at least this far before it counts as a swipe. */
const START_THRESHOLD = 12;

/** Where the card rests after a swipe ends: open when it was dragged past half the reveal width. */
export function settleOffset(offset: number): number {
  return offset <= -REVEAL_WIDTH / 2 ? -REVEAL_WIDTH : 0;
}

/** The card follows the finger to the left, but never beyond the reveal width or to the right of rest. */
export function clampOffset(offset: number): number {
  return Math.max(-REVEAL_WIDTH, Math.min(0, offset));
}

const useStyles = makeStyles(() => ({
  wrap: { position: 'relative' },
  back: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: REVEAL_WIDTH,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  delete: {
    height: '100%',
    width: REVEAL_WIDTH,
    minHeight: minTouchTarget,
    backgroundColor: '#B3261E',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: '#FFFFFF', fontSize: fontSize.body, fontWeight: '700' },
}));

/**
 * A card that reveals a red Delete button when swiped left. Tapping Delete asks for confirmation (with Cancel)
 * before anything is deleted. Screen-reader users get a "delete" action instead of the gesture.
 */
export function SwipeableCard({
  children,
  name,
  onDelete,
  testID,
}: {
  children: ReactNode;
  /** What is being deleted, used in the confirmation text. */
  name: string;
  onDelete: () => void;
  testID: string;
}) {
  const styles = useStyles();
  const [x] = useState(() => new Animated.Value(0));
  const [open, setOpen] = useState(false);
  // Where the card rests: closed at 0, open at the reveal width to the left.
  const rest = open ? -REVEAL_WIDTH : 0;

  const animateTo = (to: number) => {
    setOpen(to !== 0);
    Animated.spring(x, { toValue: to, useNativeDriver: true, bounciness: 0 }).start();
  };

  const confirm = () => {
    Alert.alert(t.swipe.confirmTitle(name), t.swipe.confirmBody, [
      { text: t.swipe.cancel, style: 'cancel', onPress: () => animateTo(0) },
      {
        text: t.swipe.delete,
        style: 'destructive',
        onPress: () => {
          animateTo(0);
          onDelete();
        },
      },
    ]);
  };

  const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) =>
      Math.abs(g.dx) > START_THRESHOLD && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_e, g) => x.setValue(clampOffset(rest + g.dx)),
    onPanResponderRelease: (_e, g) => animateTo(settleOffset(rest + g.dx)),
    onPanResponderTerminate: () => animateTo(settleOffset(rest)),
  });

  return (
    <View
      style={styles.wrap}
      testID={testID}
      accessibilityActions={[{ name: 'delete', label: t.swipe.delete }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'delete') confirm();
      }}
    >
      <Animated.View
        style={[
          styles.back,
          { opacity: x.interpolate({ inputRange: [-24, 0], outputRange: [1, 0] }) },
        ]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.swipe.deleteLabel(name)}
          onPress={confirm}
          style={styles.delete}
          testID={`${testID}-delete`}
        >
          <Text style={styles.deleteText}>{t.swipe.delete}</Text>
        </Pressable>
      </Animated.View>
      <Animated.View
        style={{ transform: [{ translateX: x }] }}
        testID={`${testID}-front`}
        {...pan.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}
