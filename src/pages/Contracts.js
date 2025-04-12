import React, { useState, useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';

const Contracts = () => {
  const { success, error } = useNotification();
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState(null);
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, signed, expired
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchContracts();
  }, [filter]);

  const fetchContracts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/contracts?filter=${filter}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch contracts');

      const data = await response.json();
      setContracts(data.contracts);
    } catch (err) {
      error('Failed to load contracts');
      console.error('Error fetching contracts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignContract = async (e) => {
    e.preventDefault();
    if (!signatureData) {
      error('Please provide your signature');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/contracts/${selectedContract._id}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ signature: signatureData })
      });

      if (!response.ok) throw new Error('Failed to sign contract');

      const updatedContract = await response.json();
      setContracts(contracts.map(contract => 
        contract._id === updatedContract._id ? updatedContract : contract
      ));
      success('Contract signed successfully');
      setIsSigningModalOpen(false);
      setSelectedContract(null);
      setSignatureData('');
    } catch (err) {
      error('Failed to sign contract');
      console.error('Contract signing error:', err);
    }
  };

  const downloadContract = async (contractId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/contracts/${contractId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to download contract');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract-${contractId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      error('Failed to download contract');
      console.error('Contract download error:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'signed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'expired':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredContracts = contracts.filter(contract =>
    contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contract.songTitle.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Contracts
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage your distribution contracts and agreements
          </p>
        </div>

        {/* Filters */}
        <div className="glass rounded-xl p-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Status
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Contracts</option>
                <option value="pending">Pending Signature</option>
                <option value="signed">Signed</option>
                <option value="expired">Expired</option>
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
                placeholder="Search by title or song..."
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Contracts List */}
        {filteredContracts.length > 0 ? (
          <div className="space-y-6">
            {filteredContracts.map(contract => (
              <div
                key={contract._id}
                className="glass rounded-xl p-6 transition-all duration-200"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {contract.title}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs text-white ${getStatusColor(contract.status)}`}>
                        {contract.status}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      Song: {contract.songTitle}
                    </p>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="mr-4">
                        <i className="fas fa-calendar mr-1"></i>
                        Created: {new Date(contract.createdAt).toLocaleDateString()}
                      </span>
                      {contract.signedAt && (
                        <span>
                          <i className="fas fa-signature mr-1"></i>
                          Signed: {new Date(contract.signedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => downloadContract(contract._id)}
                      className="px-4 py-2 text-primary hover:text-primary-dark transition-colors duration-200"
                    >
                      <i className="fas fa-download mr-2"></i>
                      Download
                    </button>
                    {contract.status === 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedContract(contract);
                          setIsSigningModalOpen(true);
                        }}
                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors duration-200"
                      >
                        <i className="fas fa-signature mr-2"></i>
                        Sign
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-xl p-8 text-center">
            <i className="fas fa-file-contract text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No contracts found
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {searchQuery
                ? "No contracts match your search criteria"
                : "Upload a song to generate your first contract"}
            </p>
          </div>
        )}

        {/* Signing Modal */}
        {isSigningModalOpen && selectedContract && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="glass rounded-xl p-8 max-w-2xl w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Sign Contract
              </h2>
              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  You are about to sign the distribution contract for:
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedContract.songTitle}
                </p>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Digital Signature
                </label>
                <input
                  type="text"
                  value={signatureData}
                  onChange={(e) => setSignatureData(e.target.value)}
                  placeholder="Type your full name to sign"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setIsSigningModalOpen(false);
                    setSelectedContract(null);
                    setSignatureData('');
                  }}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignContract}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors duration-200"
                >
                  Sign Contract
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Contracts;
