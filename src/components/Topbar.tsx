import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  onToggleSidebar?: () => void;
}

export default function Topbar({ onToggleSidebar }: TopbarProps = {}) {
  const navigate = useNavigate();
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [unreadChats, setUnreadChats] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hasViewedNotifications, setHasViewedNotifications] = useState(false);
  const [prevCount, setPrevCount] = useState(0);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search state
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{type: string, id: string, label: string, desc: string, path: string}[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // AI Kill Switch
  const [isBotActive, setIsBotActive] = useState(() => {
    const saved = localStorage.getItem('robotina_bot_active');
    return saved !== 'false'; // Defaults to true
  });

  const toggleBot = () => {
    const newState = !isBotActive;
    setIsBotActive(newState);
    localStorage.setItem('robotina_bot_active', String(newState));
  };

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('theme-mode');
    if (savedMode) return savedMode === 'dark';
    return true; // Default to dark mode
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light-mode');
      localStorage.setItem('theme-mode', 'dark');
    } else {
      document.documentElement.classList.add('light-mode');
      localStorage.setItem('theme-mode', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const fetchPending = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'Pendiente')
        .order('created_at', { ascending: false });
      if (data) setPendingOrders(data);
    };

    const fetchUnreadChats = async () => {
      const { data } = await supabase
        .from('whatsapp_chats')
        .select('*')
        .gt('unread_count', 0)
        .order('last_message_at', { ascending: false });
      if (data) setUnreadChats(data);
    };
    
    fetchPending();
    fetchUnreadChats();

    const channelOrders = supabase.channel('topbar-notifications-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, _payload => {
        fetchPending();
      })
      .subscribe();

    const channelChats = supabase.channel('topbar-notifications-chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_chats' }, _payload => {
        fetchUnreadChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelOrders);
      supabase.removeChannel(channelChats);
    };
  }, []);

  const notificationsList = [
    ...pendingOrders.map(o => ({
      id: `order-${o.id}`,
      originalId: o.id,
      type: 'order',
      title: `Pedido Pendiente: ${o.order_code}`,
      desc: `Pedido por $${Number(o.total_amount).toFixed(2)}`,
      time: o.created_at,
      icon: 'shopping_cart_checkout',
      color: 'var(--primary)',
      link: '/orders',
      count: 0
    })),
    ...unreadChats.map(c => ({
      id: `chat-${c.id}`,
      originalId: c.id,
      type: 'chat',
      title: `Mensaje de ${c.contact_name || 'Cliente'}`,
      desc: c.last_message || 'Mensaje de WhatsApp',
      time: c.last_message_at,
      icon: 'forum',
      color: 'var(--emerald-400)',
      link: '/whatsapp',
      count: c.unread_count
    }))
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const visibleNotifications = notificationsList.filter(n => !dismissedNotificationIds.includes(n.id));

  useEffect(() => {
    const visibleCount = visibleNotifications.length;
    if (visibleCount > prevCount) {
      setHasViewedNotifications(false);
    }
    setPrevCount(visibleCount);
  }, [pendingOrders.length, unreadChats.length, dismissedNotificationIds.length, prevCount]);

  const handleClearAll = () => {
    const allIds = notificationsList.map(n => n.id);
    setDismissedNotificationIds(prev => [...new Set([...prev, ...allIds])]);
    setHasViewedNotifications(true);
  };

  // Global Search Debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (globalSearch.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      const query = `%${globalSearch.trim()}%`;
      
      const res: any[] = [];
      
      try {
        const cleanQuery = globalSearch.replace(/\D/g, '');
        const phoneQuery = cleanQuery.length > 0 ? `%${cleanQuery}%` : query;
        const { data: cData } = await supabase.from('customers').select('*').or(`name.ilike.${query},phone_number.ilike.${phoneQuery}`).limit(3);
        if (cData) cData.forEach(c => res.push({ type: 'Cliente', id: c.id, label: c.name, desc: c.phone_number, path: `/whatsapp?phone=${c.phone_number}` }));
        
        const { data: oData } = await supabase.from('orders').select('*, customer:customers(name)').ilike('order_code', query).limit(3);
        if (oData) oData.forEach(o => res.push({ type: 'Pedido', id: o.id, label: o.order_code, desc: `Cliente: ${o.customer?.name || 'N/A'}`, path: '/orders' }));
        
        const { data: mData } = await supabase.from('menu_items').select('*').ilike('name', query).limit(3);
        if (mData) mData.forEach(m => res.push({ type: 'Menú', id: m.item_code || m.id, label: m.name, desc: m.category, path: '/catalog' }));
        
        setSearchResults(res);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400); 
    
    return () => clearTimeout(timer);
  }, [globalSearch]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const handleOpenNotifications = () => {
    setIsDropdownOpen(!isDropdownOpen);
    if (!isDropdownOpen) {
      setHasViewedNotifications(true);
    }
  };

  return (
    <header className="topbar">
      <div className="flex items-center" style={{ flex: '1', position: 'relative', marginRight: '1.5rem', gap: '0.5rem' }}>
        <button 
          className="mobile-menu-btn icon-btn" 
          onClick={onToggleSidebar}
          style={{ color: 'var(--on-surface)', display: 'none', padding: '0.5rem' }}
          title="Menú"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>menu</span>
        </button>
        <div className="desktop-search" style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary)', fontSize: '1.2rem', pointerEvents: 'none' }}>search</span>
          <input 
            type="text" 
            className="input-base" 
            placeholder="Buscar cliente, teléfono o pedido..." 
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.6rem', fontSize: '0.9rem', borderRadius: '2rem', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--surface-container-highest)', outline: 'none' }}
          />
          {isSearching && <span className="material-symbols-outlined" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', animation: 'spin 1s linear infinite', fontSize: '1.2rem' }}>sync</span>}
          
          {/* Search Results Dropdown */}
          {isSearchFocused && globalSearch.length >= 2 && !isSearching && (
            <div className="card" style={{ position: 'absolute', top: '120%', left: 0, width: '100%', zIndex: 1000, padding: '0.5rem', border: '1px solid var(--card-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', maxHeight: '350px', overflowY: 'auto' }}>
              {searchResults.length === 0 ? (
                <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--secondary)', fontSize: '0.85rem', margin: 0 }}>No se encontraron resultados.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {searchResults.map((res, i) => (
                    <button 
                      key={i}
                      onClick={() => navigate(res.path)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s', width: '100%' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-container-high)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--surface-container-highest)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                          {res.type === 'Cliente' ? 'person' : res.type === 'Pedido' ? 'receipt_long' : 'restaurant_menu'}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.85rem', margin: 0, color: 'var(--on-surface)' }}>{res.label}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--secondary)', margin: 0 }}>{res.type} • {res.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Bot Kill Switch */}
        <button 
          onClick={toggleBot}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', 
            padding: '0.4rem 0.8rem', 
            borderRadius: '2rem', 
            border: `1px solid ${isBotActive ? 'rgba(52, 211, 153, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            backgroundColor: isBotActive ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: isBotActive ? 'var(--emerald-400)' : 'var(--error)',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginRight: '0.5rem'
          }}
          title={isBotActive ? 'Pausar a Robotina' : 'Reactivar a Robotina'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
            {isBotActive ? 'smart_toy' : 'power_off'}
          </span>
          <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
             IA {isBotActive ? 'Activa' : 'Pausada'}
             <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                backgroundColor: isBotActive ? 'var(--emerald-400)' : 'var(--error)',
                boxShadow: isBotActive ? '0 0 6px var(--emerald-400)' : 'none',
                animation: isBotActive ? 'pulse 2s infinite' : 'none'
             }}></span>
          </span>
        </button>

        <button 
          onClick={toggleTheme}
          style={{ color: 'var(--primary)', position: 'relative' }} 
          className="icon-btn"
          title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
        >
          <span className="material-symbols-outlined">
            {isDarkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
        
        {/* Notificaciones Bell with Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button 
            onClick={handleOpenNotifications} 
            style={{ color: 'var(--secondary)', position: 'relative' }} 
            className="icon-btn"
            title="Centro de Alertas"
          >
            <span className="material-symbols-outlined">notifications</span>
            {visibleNotifications.length > 0 && (
              <span style={{ 
                position: 'absolute', top: '0', right: '0', 
                backgroundColor: 'var(--error)', color: '#fff', 
                fontSize: '0.6rem', fontWeight: 'bold', 
                width: hasViewedNotifications ? '8px' : '18px', 
                height: hasViewedNotifications ? '8px' : '18px', 
                borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
                transition: 'all 0.2s ease'
              }}>
                {!hasViewedNotifications && visibleNotifications.length}
              </span>
            )}
          </button>

          {isDropdownOpen && (
            <div className="card" style={{ 
              position: 'absolute', top: '130%', right: '-1rem', 
              width: '320px', zIndex: 1000, padding: '1.2rem',
              border: '1px solid var(--card-border)',
              boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
              backgroundColor: 'var(--surface-bright)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                <h4 style={{ fontWeight: 600, margin: 0, color: 'var(--on-surface)' }}>Notificaciones</h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {visibleNotifications.length > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--error)', fontWeight: 'bold', padding: '2px 8px', borderRadius: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>{visibleNotifications.length} Por Aceptar</span>}
                  {visibleNotifications.length > 0 && (
                    <button onClick={handleClearAll} style={{ background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px' }} title="Borrar todas las notificaciones">
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>clear_all</span>
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                {visibleNotifications.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem', color: 'var(--secondary)', gap: '0.5rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '2rem', opacity: 0.5 }}>check_circle</span>
                    <p style={{ fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>Cero notificaciones pendientes.</p>
                  </div>
                ) : (
                  visibleNotifications.map(n => (
                    <div 
                      key={n.id}
                      onClick={async () => {
                        setIsDropdownOpen(false);
                        if (n.type === 'chat') {
                          await supabase.from('whatsapp_chats').update({ unread_count: 0 }).eq('id', n.originalId);
                        }
                        navigate(n.link);
                      }}
                      style={{ 
                        padding: '0.75rem', borderRadius: '0.5rem', 
                        backgroundColor: 'var(--surface-container)', 
                        border: '1px solid var(--surface-container-highest)',
                        cursor: 'pointer', display: 'flex', gap: '0.75rem', alignItems: 'start', transition: 'background 0.2s',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-container-high)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-container)'}
                    >
                      <div style={{ color: n.color, marginTop: '2px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>{n.icon}</span>
                      </div>
                      <div className="flex flex-col flex-1" style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{n.title}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{n.desc}</span>
                      </div>
                      
                      {n.count > 0 ? (
                        <div style={{ 
                          backgroundColor: 'var(--emerald-400)', 
                          color: '#000', 
                          fontSize: '0.65rem', 
                          fontWeight: 'bold', 
                          padding: '2px 6px', 
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: '2px',
                          minWidth: '18px',
                          height: '18px'
                        }}>
                          {n.count}
                        </div>
                      ) : (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--error)', marginTop: '6px' }}></div>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              <button 
                onClick={() => {
                  setIsDropdownOpen(false);
                  navigate('/notifications');
                }}
                className="btn-primary" 
                style={{ width: '100%', marginTop: '1rem', fontSize: '0.75rem', padding: '0.6rem' }}
              >
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
