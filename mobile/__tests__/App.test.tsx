import { render, screen } from '@testing-library/react-native';

import App from '../App';

describe('App', () => {
  it('renders the foundation home screen', async () => {
    await render(<App />);

    expect(screen.getByTestId('home-screen')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'UAE Cash-Flow Planner' })).toBeTruthy();
  });

  it('clearly shows a non-production environment banner (P0-02)', async () => {
    await render(<App />);

    // EXPO_PUBLIC_APP_ENV is unset under Jest, which resolves to development.
    expect(screen.getByTestId('environment-banner')).toBeTruthy();
    expect(screen.getByText('DEVELOPMENT build')).toBeTruthy();
  });
});
