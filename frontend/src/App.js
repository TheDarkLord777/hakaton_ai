import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ClientRegister from './pages/ClientRegister';
import LiveDetection from './pages/LiveDetection';
import UsersManagement from './pages/UsersManagement';
import CarsManagement from './pages/CarsManagement';
import History from './pages/History';
import Analytics from './pages/Analytics';
import { ToastProvider } from './components/ui/Toaster';
import { ThemeProvider } from './utils/ThemeContext';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <ToastProvider>
          <div className="App min-h-screen bg-gray-50 dark:bg-gray-900">
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/register" element={<ClientRegister />} />
                <Route path="/detection" element={<LiveDetection />} />
                <Route path="/users" element={<UsersManagement />} />
                <Route path="/cars" element={<CarsManagement />} />
                <Route path="/history" element={<History />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/clients/:clientId" element={<ClientRegister />} />
              </Routes>
            </Layout>
          </div>
        </ToastProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App; 