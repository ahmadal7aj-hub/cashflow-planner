import { router } from 'expo-router';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { bill, installTestLifecycle, openApp, userWith } from '../testing/app';

installTestLifecycle();

async function link(getPathname: () => string) {
  await fireEvent.changeText(screen.getByTestId('input-partner-username'), 'sara_ahmed');
  await fireEvent.press(screen.getByTestId('link-submit'));
  expect(screen.getByTestId('link-status')).toBeTruthy();
  expect(getPathname()).toBe('/link');
}

describe('Shared dashboard preview', () => {
  it('hides the Shared tab until an account is linked, then shows it', async () => {
    const { getPathname } = await openApp('/link', { seed: userWith() });
    expect(screen.queryByTestId('tab-shared')).toBeNull();

    await link(getPathname);
    await fireEvent.press(screen.getByTestId('link-open-shared'));
    await waitFor(() => expect(getPathname()).toBe('/shared'));
    expect(screen.getByTestId('tab-shared')).toBeTruthy();
    expect(screen.getByTestId('shared-empty')).toBeTruthy();
  });

  it('rejects a too-short username', async () => {
    await openApp('/link', { seed: userWith() });
    await fireEvent.changeText(screen.getByTestId('input-partner-username'), 'ab');
    await fireEvent.press(screen.getByTestId('link-submit'));
    expect(screen.getByTestId('error-partner-username')).toBeTruthy();
    expect(screen.queryByTestId('link-status')).toBeNull();
  });

  it('shares a 5,000 savings deposit and shows it with the partner on the Shared dashboard', async () => {
    const { getPathname } = await openApp('/link', { seed: userWith() });
    await link(getPathname);
    await fireEvent.press(screen.getByTestId('link-open-shared'));
    await waitFor(() => expect(getPathname()).toBe('/shared'));

    await fireEvent.press(screen.getByTestId('tab-savings'));
    await fireEvent.press(screen.getByTestId('savings-add'));
    await waitFor(() => expect(getPathname()).toBe('/edit/savings-in/new'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), '5000');
    await fireEvent.press(screen.getByTestId('share-yes'));
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));

    await fireEvent.press(screen.getByTestId('tab-shared'));
    await waitFor(() => expect(getPathname()).toBe('/shared'));
    expect(screen.getByTestId('shared-savings')).toBeTruthy();
    // 5,000 mine + 8,000 from the sample partner.
    expect(screen.getByText('AED 13,000.00')).toBeTruthy();
    expect(screen.queryByTestId('shared-empty')).toBeNull();
  });
});

describe('Shared dashboard: bills', () => {
  it('shares a bill and can stop sharing it again', async () => {
    const plan = userWith({ expenses: [bill('rent', 'rent', 'Rent', 3500, '2026-10-19')] });
    const { getPathname } = await openApp('/link', { seed: plan });
    await link(getPathname);
    await fireEvent.press(screen.getByTestId('link-open-shared'));
    await waitFor(() => expect(getPathname()).toBe('/shared'));

    await act(async () => router.push('/edit/fixed/rent'));
    await waitFor(() => expect(getPathname()).toBe('/edit/fixed/rent'));
    await fireEvent.press(screen.getByTestId('share-yes'));
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/shared'));

    expect(screen.getByTestId('shared-line-exp:rent')).toBeTruthy();
    expect(screen.getAllByText('AED 3,500.00').length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByTestId('unshare-exp:rent'));
    expect(screen.queryByTestId('shared-line-exp:rent')).toBeNull();
  });

  it('keeps the individual dashboard private and unaffected by sharing', async () => {
    await openApp('/dashboard', { seed: userWith() });
    expect(screen.queryByTestId('shared-screen')).toBeNull();
    expect(screen.queryByTestId('tab-shared')).toBeNull();
  });

  it('offers to link from a bill form when not linked', async () => {
    const plan = userWith({ expenses: [bill('rent', 'rent', 'Rent', 3500, '2026-10-19')] });
    await openApp('/edit/fixed/rent', { seed: plan });
    expect(screen.getByTestId('share-not-linked')).toBeTruthy();
  });
});
