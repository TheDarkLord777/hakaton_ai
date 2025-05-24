import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Dark mode ni ishga tushirish
const setInitialTheme = () => {
  // Local storage dan olish
  const savedTheme = localStorage.getItem('theme');
  // Agar local storage da bo'lsa, uni ishlat
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    // Yo'q bo'lsa, tizim sozlamalaridan foydalanish
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }
};

// Sahifa yuklanganda dark mode ni tekshirish
setInitialTheme();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals(); 