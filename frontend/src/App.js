import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Tasks from './components/Tasks';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userInfo = localStorage.getItem('user');

    if (token && userInfo) {
      setIsLoggedIn(true);
      setUser(JSON.parse(userInfo));
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setIsLoggedIn(true);
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="app-container">
        {isLoggedIn && user && (
          <header className="app-header">
            <div className="user-info">
              <span>{user.surname} {user.name} {user.patronymic}</span>
              <button onClick={handleLogout}>Выйти</button>
            </div>
          </header>
        )}

        <Routes>
          <Route 
            path="/" 
            element={isLoggedIn ? <Navigate to="/tasks" replace /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/login" 
            element={isLoggedIn ? <Navigate to="/tasks" replace /> : <Auth onLogin={handleLogin} />} 
          />
          <Route 
            path="/tasks" 
            element={isLoggedIn ? <Tasks user={user} /> : <Navigate to="/login" replace />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
