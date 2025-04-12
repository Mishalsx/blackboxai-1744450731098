import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

// Components
import Navigation from './components/Navigation';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Songs from './pages/Songs';
import AITools from './pages/AITools';
import Contracts from './pages/Contracts';
import Subscriptions from './pages/Subscriptions';
import Earnings from './pages/Earnings';
import Support from './pages/Support';
import Profile from './pages/Profile';

// Context
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <div className="min-h-screen bg-light dark:bg-dark transition-colors duration-200">
              <Navigation />
              <Switch>
                <Route exact path="/" component={Home} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/upload" component={Upload} />
                <Route path="/songs" component={Songs} />
                <Route path="/ai-tools" component={AITools} />
                <Route path="/contracts" component={Contracts} />
                <Route path="/subscriptions" component={Subscriptions} />
                <Route path="/earnings" component={Earnings} />
                <Route path="/support" component={Support} />
                <Route path="/profile" component={Profile} />
              </Switch>
              <Footer />
            </div>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
