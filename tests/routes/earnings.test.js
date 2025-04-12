import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../../src/context/AuthContext';
import { NotificationProvider } from '../../src/context/NotificationContext';
import Earnings from '../../src/pages/Earnings';

describe('Earnings Page', () => {
  const mockUser = {
    name: 'Test User',
    email: 'test@example.com'
  };

  const mockEarnings = [
    {
      _id: '1',
      songTitle: 'Test Song 1',
      amount: 100,
      date: '2023-01-01'
    },
    {
      _id: '2',
      songTitle: 'Test Song 2',
      amount: 200,
      date: '2023-02-01'
    }
  ];

  beforeEach(() => {
    render(
      <AuthProvider value={{ user: mockUser }}>
        <NotificationProvider>
          <Earnings earnings={mockEarnings} />
        </NotificationProvider>
      </AuthProvider>
    );
  });

  test('renders earnings list', () => {
    expect(screen.getByText(/your earnings/i)).toBeInTheDocument();
  });

  test('displays earnings details', () => {
    expect(screen.getByText(mockEarnings[0].songTitle)).toBeInTheDocument();
    expect(screen.getByText(`$${mockEarnings[0].amount}`)).toBeInTheDocument();
    expect(screen.getByText(mockEarnings[1].songTitle)).toBeInTheDocument();
    expect(screen.getByText(`$${mockEarnings[1].amount}`)).toBeInTheDocument();
  });

  test('displays total earnings', () => {
    const totalEarnings = mockEarnings.reduce((acc, earning) => acc + earning.amount, 0);
    expect(screen.getByText(`Total Earnings: $${totalEarnings}`)).toBeInTheDocument();
  });
});
