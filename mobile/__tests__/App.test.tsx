import { render, screen } from '@testing-library/react-native';

import App from '../App';

describe('App', () => {
  it('renders the foundation home screen', async () => {
    await render(<App />);

    expect(screen.getByTestId('home-screen')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'UAE Cash-Flow Planner' })).toBeTruthy();
  });
});
