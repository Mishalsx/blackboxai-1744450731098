import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider } from '../../src/context/AuthContext';
import { NotificationProvider } from '../../src/context/NotificationContext';
import Profile from '../../src/pages/Profile';

describe('Profile Page', () => {
  const mockUser = {
    name: 'Test User',
    email: 'test@example.com',
    avatar: null
  };

  beforeEach(() => {
    render(
      <AuthProvider value={{ user: mockUser, updateProfile: jest.fn() }}>
        <NotificationProvider>
          <Profile />
        </NotificationProvider>
      </AuthProvider>
    );
  });

  test('renders profile form with user data', () => {
    expect(screen.getByLabelText(/name/i)).toHaveValue(mockUser.name);
    expect(screen.getByLabelText(/email/i)).toHaveValue(mockUser.email);
  });

  test('updates name on input change', () => {
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    expect(nameInput).toHaveValue('New Name');
  });

  test('shows error when passwords do not match', () => {
    const passwordInput = screen.getByLabelText(/password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentPassword' } });
    
    fireEvent.click(screen.getByText(/update profile/i));
    
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });
});
