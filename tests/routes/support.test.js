import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider } from '../../src/context/AuthContext';
import { NotificationProvider } from '../../src/context/NotificationContext';
import Support from '../../src/pages/Support';

describe('Support Page', () => {
  const mockUser = {
    name: 'Test User',
    email: 'test@example.com'
  };

  beforeEach(() => {
    render(
      <AuthProvider value={{ user: mockUser }}>
        <NotificationProvider>
          <Support />
        </NotificationProvider>
      </AuthProvider>
    );
  });

  test('renders support page', () => {
    expect(screen.getByText(/support tickets/i)).toBeInTheDocument();
  });

  test('allows user to create a new support ticket', () => {
    const ticketInput = screen.getByPlaceholderText(/describe your issue/i);
    fireEvent.change(ticketInput, { target: { value: 'I need help with my account.' } });
    fireEvent.click(screen.getByText(/submit ticket/i));
    expect(screen.getByText(/your ticket has been submitted/i)).toBeInTheDocument();
  });

  test('displays existing tickets', () => {
    const mockTickets = [
      { id: '1', subject: 'Issue with payment', status: 'open' },
      { id: '2', subject: 'Question about distribution', status: 'closed' }
    ];
    render(
      <AuthProvider value={{ user: mockUser }}>
        <NotificationProvider>
          <Support tickets={mockTickets} />
        </NotificationProvider>
      </AuthProvider>
    );
    expect(screen.getByText(mockTickets[0].subject)).toBeInTheDocument();
    expect(screen.getByText(mockTickets[1].subject)).toBeInTheDocument();
  });
});
