import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

function wrap(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('App', () => {
  it('renders login at root', () => {
    render(wrap(<App />));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/welcome back/i);
    expect(screen.getByRole('tab', { name: /sign in/i })).toBeTruthy();
    expect(screen.getByText('TrendPulse')).toBeTruthy();
  });
});
