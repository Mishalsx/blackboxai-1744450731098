import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { success } = useNotification();
  const [stats, setStats] = useState({
    totalSongs: 0,
    totalEarnings: 0,
    monthlyPlays: 0,
    pendingReleases: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentActivity(data.recentActivity);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const QuickActionCard = ({ icon, title, description, link, color }) => (
    <Link
      to={link}
      className="glass p-6 rounded-xl hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700"
    >
      <div className={`w-12 h-12 ${color} bg-opacity-10 rounded-full flex items-center justify-center mb-4`}>
        <i className={`fas ${icon} ${color.replace('bg-', 'text-')} text-xl`}></i>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
    </Link>
  );

  const StatCard = ({ title, value, icon, color }) => (
    <div className="glass p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</h3>
        <div className={`w-8 h-8 ${color} bg-opacity-10 rounded-full flex items-center justify-center`}>
          <i className={`fas ${icon} ${color.replace('bg-', 'text-')} text-sm`}></i>
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
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
        {/* Welcome Section */}
        <div className="glass rounded-2xl p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Here's what's happening with your music today
              </p>
            </div>
            <Link
              to="/upload"
              className="px-6 py-3 bg-primary text-white rounded-full hover:bg-opacity-90 transition-colors duration-200 flex items-center space-x-2"
            >
              <i className="fas fa-upload"></i>
              <span>Upload New Track</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Songs"
            value={stats.totalSongs}
            icon="fa-music"
            color="bg-primary"
          />
          <StatCard
            title="Total Earnings"
            value={`$${stats.totalEarnings.toFixed(2)}`}
            icon="fa-dollar-sign"
            color="bg-green-500"
          />
          <StatCard
            title="Monthly Plays"
            value={stats.monthlyPlays.toLocaleString()}
            icon="fa-play"
            color="bg-blue-500"
          />
          <StatCard
            title="Pending Releases"
            value={stats.pendingReleases}
            icon="fa-clock"
            color="bg-yellow-500"
          />
        </div>

        {/* Quick Actions */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <QuickActionCard
            icon="fa-upload"
            title="Upload Music"
            description="Upload your new tracks or albums"
            link="/upload"
            color="bg-primary"
          />
          <QuickActionCard
            icon="fa-chart-line"
            title="View Analytics"
            description="Check your music performance"
            link="/analytics"
            color="bg-blue-500"
          />
          <QuickActionCard
            icon="fa-robot"
            title="AI Tools"
            description="Enhance your music with AI"
            link="/ai-tools"
            color="bg-purple-500"
          />
          <QuickActionCard
            icon="fa-dollar-sign"
            title="Earnings"
            description="View and withdraw earnings"
            link="/earnings"
            color="bg-green-500"
          />
        </div>

        {/* Recent Activity */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Recent Activity
        </h2>
        <div className="glass rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentActivity.map((activity, index) => (
              <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200">
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 ${activity.color} bg-opacity-10 rounded-full flex items-center justify-center`}>
                    <i className={`fas ${activity.icon} ${activity.color.replace('bg-', 'text-')} text-sm`}></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
