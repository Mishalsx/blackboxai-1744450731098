import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider } from '../../src/context/AuthContext';
import { NotificationProvider } from '../../src/context/NotificationContext';
import Upload from '../../src/pages/Upload';

describe('Upload Page', () => {
  const mockUser = {
    name: 'Test User',
    email: 'test@example.com'
  };

  beforeEach(() => {
    render(
      <AuthProvider value={{ user: mockUser }}>
        <NotificationProvider>
          <Upload />
        </NotificationProvider>
      </AuthProvider>
    );
  });

  test('renders upload form', () => {
    expect(screen.getByText(/upload your music/i)).toBeInTheDocument();
  });

  test('allows file selection', () => {
    const fileInput = screen.getByLabelText(/drag and drop your audio file here/i);
    const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(screen.getByText(/selected: test.mp3/i)).toBeInTheDocument();
  });

  test('shows error for invalid file type', () => {
    const fileInput = screen.getByLabelText(/drag and drop your audio file here/i);
    const file = new File(['text content'], 'test.txt', { type: 'text/plain' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(screen.getByText(/please upload a valid audio file/i)).toBeInTheDocument();
  });

  test('shows error for file size exceeding limit', () => {
    const fileInput = screen.getByLabelText(/drag and drop your audio file here/i);
    const file = new File(['a'.repeat(50 * 1024 * 1024 + 1)], 'large.mp3', { type: 'audio/mpeg' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(screen.getByText(/file size must be less than 50mb/i)).toBeInTheDocument();
  });
});
