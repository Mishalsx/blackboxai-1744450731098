import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider } from '../../src/context/AuthContext';
import { NotificationProvider } from '../../src/context/NotificationContext';
import AITools from '../../src/pages/AITools';

describe('AITools Page', () => {
  const mockUser = {
    name: 'Test User',
    email: 'test@example.com'
  };

  beforeEach(() => {
    render(
      <AuthProvider value={{ user: mockUser }}>
        <NotificationProvider>
          <AITools />
        </NotificationProvider>
      </AuthProvider>
    );
  });

  test('renders AITools page', () => {
    expect(screen.getByText(/ai tools/i)).toBeInTheDocument();
  });

  test('displays tool options', () => {
    expect(screen.getByText(/cover art generator/i)).toBeInTheDocument();
    expect(screen.getByText(/song enhancement/i)).toBeInTheDocument();
    expect(screen.getByText(/description writer/i)).toBeInTheDocument();
    expect(screen.getByText(/trend analysis/i)).toBeInTheDocument();
  });

  test('allows cover art generation', () => {
    fireEvent.click(screen.getByText(/cover art generator/i));
    expect(screen.getByText(/generate unique album artwork/i)).toBeInTheDocument();
  });

  test('allows song enhancement', () => {
    fireEvent.click(screen.getByText(/song enhancement/i));
    expect(screen.getByText(/enhance audio quality/i)).toBeInTheDocument();
  });

  test('allows description writing', () => {
    fireEvent.click(screen.getByText(/description writer/i));
    expect(screen.getByText(/generate professional song descriptions/i)).toBeInTheDocument();
  });

  test('allows trend analysis', () => {
    fireEvent.click(screen.getByText(/trend analysis/i));
    expect(screen.getByText(/analyze current music trends/i)).toBeInTheDocument();
  });
});
