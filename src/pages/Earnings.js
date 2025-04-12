import React, { useState, useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';

const Earnings = () => {
  const { success, error } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [earnings, setEarnings] = useState({
    total: 0,
    available: 0,
    pending: 0,
    platforms: [],
    recentTransactions: []
  });
  const [payoutRequest, setPayoutRequest] = useState({
    amount: '',
    method: 'paypal',
    paypalEmail: ''
  });
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [timeframe, setTimeframe] = useState('30days');
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  useEffect(() => {
    fetchEarnings();
  }, [timeframe, selectedPlatform]);

  const fetchEarnings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/earnings?timeframe=${timeframe}&platform=${selectedPlatform}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch earnings');

      const data = await response.json();
      setEarnings(data);
    } catch (err) {
      error('Failed to load earnings data');
      console.error('Error fetching earnings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayoutRequest = async (e) => {
    e.preventDefault();
    if (!payoutRequest.amount || parseFloat(payoutRequest.amount) <= 0) {
      error('Please enter a valid amount');
      return;
    }

    if (parseFloat(payoutRequest.amount) > earnings.available) {
      error('Amount exceeds available balance');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/earnings/payout-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payoutRequest)
      });

      if (!response.ok) throw new Error('Failed to submit payout request');

      const data = await response.json();
      success('Payout request submitted successfully');
      setIsPayoutModalOpen(false);
      setPayoutRequest({
        amount: '',
        method: 'paypal',
        paypalEmail: ''
      });
      
      // Update earnings data to reflect the pending payout
      setEarnings(prev => ({
        ...prev,
        available: prev.available - parseFloat(payoutRequest.amount),
        pending: prev.pending + parseFloat(payoutRequest.amount)
      }));
    } catch (err) {
      error('Failed to submit payout request');
      console.error('Payout request error:', err);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

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
        {/* Header with Overview Cards */}
        <div className="glass rounded-2xl p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Earnings Overview
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Total Earnings
              </h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(earnings.total)}
              </p>
            </div>
            <div className="glass p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Available Balance
              </h3>
              <p className="text-3xl font-bold text-green-500">
                {formatCurrency(earnings.available)}
              </p>
            </div>
            <div className="glass p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Pending Payouts
              </h3>
              <p className="text-3xl font-bold text-yellow-500">
                {formatCurrency(earnings.pending)}
              </p>
            </div>
          </div>
        </div>

        {/* Filters and Request Payout Button */}
        <div className="glass rounded-xl p-4 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Timeframe
                </label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                  <option value="1year">Last Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Platform
                </label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">All Platforms</option>
                  <option value="spotify">Spotify</option>
                  <option value="apple">Apple Music</option>
                  <option value="youtube">YouTube</option>
                  <option value="amazon">Amazon Music</option>
                  <option value="tidal">Tidal</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => setIsPayoutModalOpen(true)}
              disabled={earnings.available <= 0}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors duration-200 disabled:opacity-50"
            >
              <i className="fas fa-money-bill-wave mr-2"></i>
              Request Payout
            </button>
          </div>
        </div>

        {/* Platform Earnings */}
        <div className="glass rounded-xl p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Earnings by Platform
          </h2>
          <div className="space-y-4">
            {earnings.platforms.map(platform => (
              <div
                key={platform.name}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img
                      src={platform.icon}
                      alt={platform.name}
                      className="w-8 h-8 rounded"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {platform.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {platform.streams.toLocaleString()} streams
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(platform.earnings)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="glass rounded-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Recent Transactions
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-4 text-sm font-medium text-gray-600 dark:text-gray-400">Date</th>
                  <th className="pb-4 text-sm font-medium text-gray-600 dark:text-gray-400">Type</th>
                  <th className="pb-4 text-sm font-medium text-gray-600 dark:text-gray-400">Description</th>
                  <th className="pb-4 text-sm font-medium text-gray-600 dark:text-gray-400">Amount</th>
                  <th className="pb-4 text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {earnings.recentTransactions.map(transaction => (
                  <tr key={transaction.id}>
                    <td className="py-4 text-sm text-gray-900 dark:text-white">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="py-4 text-sm text-gray-900 dark:text-white">
                      {transaction.type}
                    </td>
                    <td className="py-4 text-sm text-gray-900 dark:text-white">
                      {transaction.description}
                    </td>
                    <td className="py-4 text-sm text-gray-900 dark:text-white">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-xs
                        ${transaction.status === 'completed' && 'bg-green-500 text-white'}
                        ${transaction.status === 'pending' && 'bg-yellow-500 text-white'}
                        ${transaction.status === 'failed' && 'bg-red-500 text-white'}
                      `}>
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payout Request Modal */}
        {isPayoutModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="glass rounded-xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Request Payout
              </h2>
              <form onSubmit={handlePayoutRequest} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount (Available: {formatCurrency(earnings.available)})
                  </label>
                  <input
                    type="number"
                    value={payoutRequest.amount}
                    onChange={(e) => setPayoutRequest(prev => ({ ...prev, amount: e.target.value }))}
                    min="0"
                    max={earnings.available}
                    step="0.01"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payout Method
                  </label>
                  <select
                    value={payoutRequest.method}
                    onChange={(e) => setPayoutRequest(prev => ({ ...prev, method: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="paypal">PayPal</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
                {payoutRequest.method === 'paypal' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      PayPal Email
                    </label>
                    <input
                      type="email"
                      value={payoutRequest.paypalEmail}
                      onChange={(e) => setPayoutRequest(prev => ({ ...prev, paypalEmail: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                )}
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsPayoutModalOpen(false)}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors duration-200"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Earnings;
