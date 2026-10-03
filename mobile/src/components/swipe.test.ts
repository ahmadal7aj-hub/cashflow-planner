import { REVEAL_WIDTH, clampOffset, settleOffset } from './SwipeableCard';

describe('swipe geometry', () => {
  it('follows the finger to the left but never past the reveal width or to the right of rest', () => {
    expect(clampOffset(-30)).toBe(-30);
    expect(clampOffset(-999)).toBe(-REVEAL_WIDTH);
    expect(clampOffset(40)).toBe(0);
  });

  it('opens when dragged past half the reveal width, otherwise springs back', () => {
    expect(settleOffset(-REVEAL_WIDTH)).toBe(-REVEAL_WIDTH);
    expect(settleOffset(-REVEAL_WIDTH / 2)).toBe(-REVEAL_WIDTH);
    expect(settleOffset(-REVEAL_WIDTH / 2 + 1)).toBe(0);
    expect(settleOffset(0)).toBe(0);
  });
});
