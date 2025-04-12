import React, { useState, useEffect, useRef } from 'react';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const Support = () => {
  const { success, error } = useNotification();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, open, closed
  const messagesEndRef = useRef(null);

  const [newTicketForm, setNewTicketForm] = useState({
    subject: '',
    category: 'technical',
    priority: 'normal',
    message: ''
  });

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  useEffect(() => {
    if (selectedTicket) {
      scrollToBottom();
    }
  }, [selectedTicket?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/support/tickets?filter=${filter}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch tickets');

      const data = await response.json();
      setTickets(data.tickets);
    } catch (err) {
      error('Failed to load support tickets');
      console.error('Error fetching tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newTicketForm)
      });

      if (!response.ok) throw new Error('Failed to create ticket');

      const data = await response.json();
      setTickets([data.ticket, ...tickets]);
      setIsCreatingTicket(false);
      setNewTicketForm({
        subject: '',
        category: 'technical',
        priority: 'normal',
        message: ''
      });
      success('Support ticket created successfully');
    } catch (err) {
      error('Failed to create support ticket');
      console.error('Ticket creation error:', err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/support/tickets/${selectedTicket._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: newMessage })
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      setSelectedTicket(data.ticket);
      setNewMessage('');
      
      // Update ticket in the list
      setTickets(tickets.map(ticket => 
        ticket._id === data.ticket._id ? data.ticket : ticket
      ));
    } catch (err) {
      error('Failed to send message');
      console.error('Message sending error:', err);
    }
  };

  const closeTicket = async () => {
    if (!window.confirm('Are you sure you want to close this ticket?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/support/tickets/${selectedTicket._id}/close`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to close ticket');

      const data = await response.json();
      setSelectedTicket(data.ticket);
      setTickets(tickets.map(ticket => 
        ticket._id === data.ticket._id ? data.ticket : ticket
      ));
      success('Ticket closed successfully');
    } catch (err) {
      error('Failed to close ticket');
      console.error('Ticket closing error:', err);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'normal':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-green-500';
      case 'closed':
        return 'bg-gray-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.category.toLowerCase().includes(searchQuery.toLowerCase())
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Support Center
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Get help with your account and music distribution
              </p>
            </div>
            <button
              onClick={() => setIsCreatingTicket(true)}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors duration-200"
            >
              <i className="fas fa-plus mr-2"></i>
              New Ticket
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tickets List */}
          <div className="lg:col-span-1">
            <div className="glass rounded-xl p-4 mb-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filter
                  </label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Tickets</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
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
                    placeholder="Search tickets..."
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="glass rounded-xl overflow-hidden">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTickets.map(ticket => (
                  <button
                    key={ticket._id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full p-4 text-left transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-800
                      ${selectedTicket?._id === ticket._id ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {ticket.subject}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {ticket.category}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        <i className="fas fa-clock mr-1"></i>
                        {new Date(ticket.updatedAt).toLocaleDateString()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-white ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ticket Details / Chat */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <div className="glass rounded-xl h-full flex flex-col">
                {/* Ticket Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedTicket.subject}
                    </h2>
                    {selectedTicket.status === 'open' && (
                      <button
                        onClick={closeTicket}
                        className="px-4 py-2 text-red-500 hover:text-red-600 transition-colors duration-200"
                      >
                        <i className="fas fa-times-circle mr-2"></i>
                        Close Ticket
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                    <span>
                      <i className="fas fa-tag mr-1"></i>
                      {selectedTicket.category}
                    </span>
                    <span>
                      <i className="fas fa-calendar mr-1"></i>
                      {new Date(selectedTicket.createdAt).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs text-white ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-4">
                    {selectedTicket.messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.sender === user._id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${
                          message.sender === user._id
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                        } rounded-lg p-4`}>
                          <p className="text-sm">{message.content}</p>
                          <span className="text-xs opacity-75 mt-2 block">
                            {new Date(message.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Message Input */}
                {selectedTicket.status === 'open' && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <form onSubmit={sendMessage} className="flex gap-4">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors duration-200 disabled:opacity-50"
                      >
                        <i className="fas fa-paper-plane"></i>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass rounded-xl p-8 text-center">
                <i className="fas fa-comments text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Select a ticket to view the conversation
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Or create a new ticket to get help from our support team
                </p>
              </div>
            )}
          </div>
        </div>

        {/* New Ticket Modal */}
        {isCreatingTicket && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="glass rounded-xl p-8 max-w-2xl w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Create New Support Ticket
              </h2>
              <form onSubmit={createTicket} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={newTicketForm.subject}
                    onChange={(e) => setNewTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={newTicketForm.category}
                      onChange={(e) => setNewTicketForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="technical">Technical Support</option>
                      <option value="account">Account Issues</option>
                      <option value="billing">Billing</option>
                      <option value="distribution">Distribution</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority
                    </label>
                    <select
                      value={newTicketForm.priority}
                      onChange={(e) => setNewTicketForm(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    value={newTicketForm.message}
                    onChange={(e) => setNewTicketForm(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white h-32"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsCreatingTicket(false)}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors duration-200"
                  >
                    Create Ticket
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

export default Support;
