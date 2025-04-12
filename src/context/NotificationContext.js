import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

// Notification Types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Action Types
const ADD_NOTIFICATION = 'ADD_NOTIFICATION';
const REMOVE_NOTIFICATION = 'REMOVE_NOTIFICATION';
const CLEAR_NOTIFICATIONS = 'CLEAR_NOTIFICATIONS';

// Initial State
const initialState = {
  notifications: []
};

// Reducer
const notificationReducer = (state, action) => {
  switch (action.type) {
    case ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };
    case REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(
          notification => notification.id !== action.payload
        )
      };
    case CLEAR_NOTIFICATIONS:
      return {
        ...state,
        notifications: []
      };
    default:
      return state;
  }
};

export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // Add a new notification
  const addNotification = useCallback(({
    type = NOTIFICATION_TYPES.INFO,
    message,
    title = '',
    duration = 5000, // Default duration 5 seconds
    isCloseable = true
  }) => {
    const id = uuidv4();
    
    dispatch({
      type: ADD_NOTIFICATION,
      payload: {
        id,
        type,
        message,
        title,
        isCloseable,
        createdAt: new Date()
      }
    });

    // Auto remove notification after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, []);

  // Remove a specific notification
  const removeNotification = useCallback((id) => {
    dispatch({
      type: REMOVE_NOTIFICATION,
      payload: id
    });
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    dispatch({ type: CLEAR_NOTIFICATIONS });
  }, []);

  // Convenience methods for different notification types
  const success = useCallback((message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.SUCCESS,
      message,
      ...options
    });
  }, [addNotification]);

  const error = useCallback((message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.ERROR,
      message,
      duration: 0, // Errors stay until manually closed
      ...options
    });
  }, [addNotification]);

  const warning = useCallback((message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.WARNING,
      message,
      ...options
    });
  }, [addNotification]);

  const info = useCallback((message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.INFO,
      message,
      ...options
    });
  }, [addNotification]);

  // Real-time notification handler for WebSocket events
  const handleRealtimeNotification = useCallback((event) => {
    const { type, message, ...options } = event;
    addNotification({ type, message, ...options });
  }, [addNotification]);

  const value = {
    notifications: state.notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    success,
    error,
    warning,
    info,
    handleRealtimeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {state.notifications.map(notification => (
          <div
            key={notification.id}
            className={`glass p-4 rounded-lg shadow-lg max-w-md transform transition-all duration-300 ease-in-out
              ${notification.type === NOTIFICATION_TYPES.SUCCESS && 'bg-green-50 dark:bg-green-900/10 border-green-500'}
              ${notification.type === NOTIFICATION_TYPES.ERROR && 'bg-red-50 dark:bg-red-900/10 border-red-500'}
              ${notification.type === NOTIFICATION_TYPES.WARNING && 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-500'}
              ${notification.type === NOTIFICATION_TYPES.INFO && 'bg-blue-50 dark:bg-blue-900/10 border-blue-500'}
            `}
          >
            {notification.title && (
              <h4 className="font-semibold mb-1">{notification.title}</h4>
            )}
            <p className="text-sm">{notification.message}</p>
            {notification.isCloseable && (
              <button
                onClick={() => removeNotification(notification.id)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
