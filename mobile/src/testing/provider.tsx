import { render, act } from '@testing-library/react-native';

import { PrototypeProvider, usePrototype } from '../state/PrototypeContext';
import { setTestSeed } from '../state/testSeed';
import { ThemeProvider } from '../theme/ThemeProvider';

type State = ReturnType<typeof usePrototype>;

/**
 * Mounts only the state provider (no screens) and gives the test a live view of it.
 * Used to test saving and loading without any navigation.
 */
export async function mountProvider(today = '2026-10-15') {
  jest.useFakeTimers({ now: new Date(`${today}T08:00:00`) });
  setTestSeed(undefined);
  let latest: State | null = null;
  function Probe() {
    latest = usePrototype();
    return null;
  }
  const view = await render(
    <ThemeProvider>
      <PrototypeProvider today={today}>
        <Probe />
      </PrototypeProvider>
    </ThemeProvider>,
  );
  // Wait for the saved data to be read.
  await act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
  return {
    state: () => {
      if (!latest) throw new Error('provider not mounted');
      return latest;
    },
    /** Run state changes the way a tap would. */
    act: async (fn: (s: State) => void) => {
      await act(async () => {
        fn(latest!);
        for (let i = 0; i < 20; i++) await Promise.resolve();
      });
    },
    unmount: async () => {
      await act(async () => {
        view.unmount();
      });
    },
  };
}
