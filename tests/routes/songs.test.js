import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider } from '../../src/context/AuthContext';
import { NotificationProvider } from '../../src/context/NotificationContext';
import Songs from '../../src/pages/Songs';

describe('Songs Page', () => {
  const mockUser = {
    name: 'Test User',
    email: 'test@example.com'
  };

  const mockSongs = [
    {
      _id: '1',
      title: 'Test Song 1',
      artist: 'Artist 1',
      album: 'Album 1',
      status: 'approved',
      coverArt: 'cover1.jpg',
      plays: 100,
      uploadDate: '2023-01-01'
    },
    {
      _id: '2',
      title: 'Test Song 2',
      artist: 'Artist 2',
      album: 'Album 2',
      status: 'pending',
      coverArt: 'cover2.jpg',
      plays: 50,
      uploadDate: '2023-02-01'
    }
  ];

  beforeEach(() => {
    render(
      <AuthProvider value={{ user: mockUser }}>
        <NotificationProvider>
          <Songs />
        </NotificationProvider>
      </AuthProvider>
    );
  });

  test('renders songs list', () => {
    expect(screen.getByText(/your songs/i)).toBeInTheDocument();
  });

  test('displays song details', () => {
    expect(screen.getByText(mockSongs[0].title)).toBeInTheDocument();
    expect(screen.getByText(mockSongs[0].artist)).toBeInTheDocument();
    expect(screen.getByText(mockSongs[0].album)).toBeInTheDocument();
    expect(screen.getByText(mockSongs[0].plays.toLocaleString())).toBeInTheDocument();
  });

  test('filters songs by status', () => {
    const filterSelect = screen.getByLabelText(/filter by status/i);
    fireEvent.change(filterSelect, { target: { value: 'pending' } });
    expect(screen.getByText(mockSongs[1].title)).toBeInTheDocument();
    expect(screen.queryByText(mockSongs[0].title)).not.toBeInTheDocument();
  });

  test('searches songs by title', () => {
    const searchInput = screen.getByPlaceholderText(/search by title, artist, or album/i);
    fireEvent.change(searchInput, { target: { value: 'Test Song 1' } });
    expect(screen.getByText(mockSongs[0].title)).toBeInTheDocument();
    expect(screen.queryByText(mockSongs[1].title)).not.toBeInTheDocument();
  });
});
