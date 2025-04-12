import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';

const Songs = () => {
  const { error, success } = useNotification();
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const [sortBy, setSortBy] = useState('date'); // date, title, plays
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSongs();
  }, [filter, sortBy]);

  const fetchSongs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/songs?filter=${filter}&sort=${sortBy}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch songs');

      const data = await response.json();
      setSongs(data.songs);
    } catch (err) {
      error('Failed to load songs');
      console.error('Error fetching songs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (songId) => {
    if (!window.confirm('Are you sure you want to delete this song?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/songs/${songId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete song');

      setSongs(songs.filter(song => song._id !== songId));
      success('Song deleted successfully');
    } catch (err) {
      error('Failed to delete song');
      console.error('Error deleting song:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredSongs = songs.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.album?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light dark:bg-dark pt-20 pb-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="glass rounded-2xl p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Your Songs
            </h1>
            <Link
              to="/upload"
              className="px-6 py-3 bg-primary text-white rounded-full hover:bg-opacity-90 transition-colors duration-200 text-center"
            >
              <i className="fas fa-upload mr-2"></i>
              Upload New Track
            </Link>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="glass rounded-xl p-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Status
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Songs</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="date">Upload Date</option>
                <option value="title">Title</option>
                <option value="plays">Plays</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, artist, or album..."
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Songs Grid */}
        {filteredSongs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSongs.map(song => (
              <div key={song._id} className="glass rounded-xl overflow-hidden">
                <div className="aspect-square">
                  <img
                    src={song.coverArt}
                    alt={song.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {song.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor(song.status)}`}>
                      {song.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    {song.artist}
                  </p>
                  {song.album && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Album: {song.album}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>
                      <i className="fas fa-play mr-1"></i>
                      {song.plays.toLocaleString()} plays
                    </span>
                    <span>
                      <i className="fas fa-calendar mr-1"></i>
                      {new Date(song.uploadDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Link
                      to={`/songs/${song._id}`}
                      className="text-primary hover:text-primary-dark transition-colors duration-200"
                    >
                      <i className="fas fa-edit mr-1"></i>
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(song._id)}
                      className="text-red-500 hover:text-red-600 transition-colors duration-200"
                    >
                      <i className="fas fa-trash-alt mr-1"></i>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-xl p-8 text-center">
            <i className="fas fa-music text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No songs found
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {searchQuery
                ? "No songs match your search criteria"
                : "Upload your first track to get started!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Songs;
