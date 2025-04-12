import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider } from '../../src/context/AuthContext';
import { NotificationProvider } from '../../src/context/NotificationContext';
import Contracts from '../../src/pages/Contracts';

describe('Contracts Page', () => {
  const mockUser = {
    name: 'Test User',
    email: 'test@example.com'
  };

  const mockContracts = [
    {
      _id: '1',
      title: 'Contract 1',
      songTitle: 'Test Song 1',
      status: 'pending',
      createdAt: '2023-01-01',
      signedAt: null
    },
    {
      _id: '2',
      title: 'Contract 2',
      songTitle: 'Test Song 2',
      status: 'signed',
      createdAt: '2023-02-01',
      signedAt: '2023-02-02'
    }
  ];

  beforeEach(() => {
    render(
      <AuthProvider value={{ user: mockUser }}>
        <NotificationProvider>
          <Contracts />
        </NotificationProvider>
      </AuthProvider>
    );
  });

  test('renders contracts list', () => {
    expect(screen.getByText(/manage your distribution contracts/i)).toBeInTheDocument();
  });

  test('displays contract details', () => {
    expect(screen.getByText(mockContracts[0].title)).toBeInTheDocument();
    expect(screen.getByText(mockContracts[0].songTitle)).toBeInTheDocument();
    expect(screen.getByText(mockContracts[0].status)).toBeInTheDocument();
  });

  test('allows closing a contract', () => {
    const closeButton = screen.getByText(/close contract/i);
    fireEvent.click(closeButton);
    expect(screen.getByText(/are you sure you want to close this contract/i)).toBeInTheDocument();
  });

  test('displays pending contracts', () => {
    const filterSelect = screen.getByLabelText(/filter by status/i);
    fireEvent.change(filterSelect, { target: { value: 'pending' } });
    expect(screen.getByText(mockContracts[0].title)).toBeInTheDocument();
    expect(screen.queryByText(mockContracts[1].title)).not.toBeInTheDocument();
  });
});
