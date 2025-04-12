import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../../src/context/AuthContext';
import { NotificationProvider } from '../../src/context/NotificationContext';
import Dashboard from '../../src/pages/Dashboard';

describe('Dashboard Page', () => {
  const mockUser = {
    name: 'Test User',
    email: 'test@example.com'
  };

  const mockStats = {
    totalSongs: 10,
    totalEarnings: 1000,
    monthlyPlays: 5000,
    pendingReleases: 2
  };

  beforeEach(() => {
    render(
      <AuthProvider value={{ user: mockUser }}>
        <NotificationProvider>
          <Dashboard stats={mockStats} />
        </NotificationProvider>
      </AuthProvider>
    );
  });

  test('renders dashboard with user greeting', () => {
    expect(screen.getByText(/welcome back, test user/i)).toBeInTheDocument();
  });

  test('displays total songs', () => {
    expect(screen.getByText(/total songs/i)).toBeInTheDocument();
    expect(screen.getByText(mockStats.totalSongs)).toBeInTheDocument();
  });

  test('displays total earnings', () => {
    expect(screen.getByText(/total earnings/i)).toBeInTheDocument();
    expect(screen.getByText(`$${mockStats.totalEarnings}`)).toBeInTheDocument();
  });

  test('displays monthly plays', () => {
    expect(screen.getByText(/monthly plays/i)).toBeInTheDocument();
    expect(screen.getByText(mockStats.monthlyPlays.toLocaleString())).toBeInTheDocument();
  });

  test('displays pending releases', () => {
    expect(screen.getByText(/pending releases/i)).toBeInTheDocument();
    expect(screen.getByText(mockStats.pendingReleases)).toBeInTheDocument();
  });
});
