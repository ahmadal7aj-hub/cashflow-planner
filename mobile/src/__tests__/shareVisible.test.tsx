import { screen } from 'expo-router/testing-library';

import { installTestLifecycle, openApp } from '../testing/app';

installTestLifecycle();

describe('the Share this saving control is always visible', () => {
  it('shows Keep private and explains why sharing is not possible yet when there is no account', async () => {
    await openApp('/edit/savings-in/new');
    expect(screen.getByText('Share this saving')).toBeTruthy();
    expect(screen.getByTestId('share-private')).toBeTruthy();
    expect(screen.getByTestId('share-unavailable')).toBeTruthy();
  });
});
