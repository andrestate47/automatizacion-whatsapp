import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Marketing from './pages/Marketing';
import Catalog from './pages/Catalog';

import Analytics from './pages/Analytics';
import History from './pages/History';
import Settings from './pages/Settings';
import BotStatus from './pages/BotStatus';
import Bookings from './pages/Bookings';
import WhatsApp from './pages/WhatsApp';
import Login from './pages/Login';
import Notifications from './pages/Notifications';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import NotificationToast from './components/NotificationToast';
import Landing from './pages/Landing';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Agendar from './pages/Agendar';

// Singleton AudioContext para evitar bloqueos del navegador
let globalAudioCtx: AudioContext | null = null;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const saved = localStorage.getItem('isAuthenticated');
    return saved === 'true';
  });

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      supabase.auth.refreshSession().finally(() => {
        setIsReady(true);
      });
    } else {
      setIsReady(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Inicializar el AudioContext y desbloquearlo con interacción del usuario
    if (!globalAudioCtx) {
      globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const unlockAudio = () => {
      if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume();
      }
    };
    document.addEventListener('click', unlockAudio);
    
    const playGlobalSound = (type: 'chat' | 'meeting') => {
      if (localStorage.getItem('robotina_sound') === 'false') return;
      if (!globalAudioCtx) return;
      
      try {
        if (globalAudioCtx.state === 'suspended') {
          globalAudioCtx.resume();
        }
        
        const oscillator = globalAudioCtx.createOscillator();
        const gainNode = globalAudioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(globalAudioCtx.destination);
        if (type === 'chat') {
          // Soft short pop/tick
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(600, globalAudioCtx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(800, globalAudioCtx.currentTime + 0.05);
          gainNode.gain.setValueAtTime(0.6, globalAudioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, globalAudioCtx.currentTime + 0.15);
          oscillator.start(globalAudioCtx.currentTime);
          oscillator.stop(globalAudioCtx.currentTime + 0.15);
        } else if (type === 'meeting') {
          // Existing meeting sound
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(523.25, globalAudioCtx.currentTime); 
          oscillator.frequency.setValueAtTime(659.25, globalAudioCtx.currentTime + 0.15);
          gainNode.gain.setValueAtTime(0.4, globalAudioCtx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.01, globalAudioCtx.currentTime + 0.5);
          oscillator.start(globalAudioCtx.currentTime);
          oscillator.stop(globalAudioCtx.currentTime + 0.5);
        }
      } catch (e) {
        console.error('Audio play failed', e);
      }
    };

    const channel = supabase.channel('global_audio_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
        if (payload.new && payload.new.direction === 'inbound') {
          playGlobalSound('chat');
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reservations' }, () => {
        playGlobalSound('meeting');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'landing_leads' }, (payload) => {
        if (payload.new && payload.new.appointment_date) playGlobalSound('meeting');
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'landing_leads' }, (payload) => {
        if (payload.new && payload.new.appointment_date && (!payload.old || !payload.old.appointment_date)) playGlobalSound('meeting');
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
      document.removeEventListener('click', unlockAudio);
    };
  }, [isAuthenticated]);

  const handleLogin = () => {
    localStorage.setItem('isAuthenticated', 'true');
    setIsAuthenticated(true);
  };

  // const handleLogout = () => {
  //   localStorage.removeItem('isAuthenticated');
  //   setIsAuthenticated(false);
  // };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  // Componente interno para el layout principal
  const MainLayout = () => {
    if (!isAuthenticated) {
      return <Login onLogin={handleLogin} />;
    }
    return (
      <div className="app-container">
        <div 
          className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`} 
          onClick={closeSidebar}
        />
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <div className="main-canvas">
          <Topbar onToggleSidebar={toggleSidebar} />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/bookings" element={<Bookings />} />

            <Route path="/customers" element={<Customers />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/bot-status" element={<BotStatus />} />
            <Route path="/whatsapp" element={<WhatsApp />} />
            <Route path="/notifications" element={<Notifications />} />
          </Routes>
        </div>
        <NotificationToast />
      </div>
    );
  };
  if (!isReady) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(255, 90, 31, 0.2)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <MainLayout /> : <Landing />} />
      <Route path="/home" element={<Landing />} />
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route path="/register" element={<Register />} />
      <Route path="/onboarding" element={isAuthenticated ? <Onboarding onComplete={() => {}} /> : <Login onLogin={handleLogin} />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/agendar" element={<Agendar />} />
      <Route path="/*" element={<MainLayout />} />
    </Routes>
  );
}

export default App;
