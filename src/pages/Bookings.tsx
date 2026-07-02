import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Bookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Próximas');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDayBookings, setSelectedDayBookings] = useState<any[] | null>(null);
  
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', phone: '', date: '', time: '', details: '' });
  
  const [stats, setStats] = useState({
    today: 0,
    pending: 0,
    attendance: 92,
    newToday: 0
  });

  const parseSpanishDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const months: any = { 'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11 };
    const parts = dateStr.toLowerCase().split(' de ');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = months[parts[1].trim()];
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    const isoParsed = new Date(dateStr);
    if (!isNaN(isoParsed.getTime())) return isoParsed;
    return new Date();
  };

  const fetchBookings = async () => {
    setLoading(true);
    
    const { data: resData } = await supabase
      .from('reservations')
      .select(`*, customer:customers (name, phone_number, status)`);

    const { data: leadsData } = await supabase
      .from('landing_leads')
      .select('*')
      .not('appointment_date', 'is', null);

    let allBookings: any[] = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (resData) {
      allBookings = [...allBookings, ...resData.map((b: any) => {
        const timestamp = b.combined_time || `${b.reservation_date}T${b.reservation_time}`;
        const bDate = new Date(timestamp);
        return {
          ...b,
          isToday: b.reservation_date === todayStr,
          time: bDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: bDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }),
          rawDateObj: bDate
        };
      })];
    }

    if (leadsData) {
      allBookings = [...allBookings, ...leadsData.map((l: any) => {
        const bDate = parseSpanishDate(l.appointment_date);
        const isoDate = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}-${String(bDate.getDate()).padStart(2, '0')}`;
        return {
          id: l.id,
          reservation_date: isoDate,
          isToday: isoDate === todayStr,
          time: l.appointment_time || '',
          date: bDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }),
          rawDateObj: bDate,
          customer: { name: l.name, phone_number: l.phone },
          service_name: 'Demo RobotinaCentral',
          guest_count: 1,
          status: l.status || 'Pendiente',
          created_at: l.created_at,
          isLead: true,
          goal: l.goal
        };
      })];
    }
    
    allBookings.sort((a, b) => a.rawDateObj.getTime() - b.rawDateObj.getTime());

    setBookings(allBookings);
    
    const todayBookings = allBookings.filter((b: any) => b.isToday);
    const pendingBookings = allBookings.filter((b: any) => b.status === 'Pendiente' || b.status === 'En Espera');
    setStats({
      today: todayBookings.length,
      pending: pendingBookings.length,
      attendance: 94,
      newToday: todayBookings.filter((b: any) => new Date(b.created_at).toDateString() === now.toDateString()).length
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
    const channel = supabase.channel('bookings_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, fetchBookings)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('reservations')
      .update({ status: newStatus })
      .eq('id', id);
    if (!error) {
      fetchBookings();
      if (selectedDayBookings) {
         setSelectedDayBookings(prev => prev ? prev.map(b => b.id === id ? {...b, status: newStatus} : b) : null);
      }
    } else {
      // Intenta actualizar en landing_leads si falla (porque podría ser de esa tabla)
      await supabase.from('landing_leads').update({ status: newStatus }).eq('id', id);
      fetchBookings();
      if (selectedDayBookings) {
         setSelectedDayBookings(prev => prev ? prev.map(b => b.id === id ? {...b, status: newStatus} : b) : null);
      }
    }
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name || !manualForm.phone || !manualForm.date || !manualForm.time) return;
    
    setLoading(true);
    
    const [y, m, d] = manualForm.date.split('-');
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const formattedDate = `${parseInt(d, 10)} de ${months[parseInt(m, 10) - 1]} de ${y}`;

    const { error } = await supabase.from('landing_leads').insert([{
      name: manualForm.name,
      phone: manualForm.phone,
      segment: 'Manual',
      volume: 'Cita Manual',
      goal: manualForm.details ? `Reunión Manual - Notas: ${manualForm.details}` : 'Reunión Manual',
      email: '',
      appointment_date: formattedDate,
      appointment_time: manualForm.time,
      status: 'Confirmado', // By default manual appointments are confirmed
      tenant_id: '4c652a69-006f-4194-9436-fd281d55e644'
    }]);

    if (!error) {
      fetchBookings();
      setShowManualModal(false);
      setManualForm({ name: '', phone: '', date: '', time: '', details: '' });
    } else {
      console.error(error);
    }
    setLoading(false);
  };

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'Próximas') return b.rawDateObj >= new Date(new Date().setHours(0,0,0,0));
    if (activeTab === 'Pendientes') return b.status === 'Pendiente';
    if (activeTab === 'Completadas') return b.status === 'Completado';
    return true; 
  });

  // Calendar Logic
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; 
  };

  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const getBookingsForDay = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookings.filter(b => b.reservation_date === dateStr);
  };

  const renderBookingCard = (b: any) => (
    <div key={b.id} className="card booking-card-grid" style={{ 
      alignItems: 'center',
      borderLeft: b.status === 'Confirmado' ? '4px solid var(--emerald-400)' : (b.status === 'Pendiente' ? '4px solid var(--tertiary)' : '1px solid var(--card-border)'),
      marginBottom: '1rem'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0 }}>{b.time}</p>
        <p style={{ fontSize: '0.7rem', color: 'var(--secondary)', textTransform: 'capitalize', margin: 0 }}>{b.date}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="avatar" style={{ width: '40px', height: '40px', borderRadius: '12px' }}>
          {b.customer?.name?.[0] || 'W'}
        </div>
        <div>
          <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>{b.customer?.name || 'Cliente WhatsApp'}</h4>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--secondary)' }}>{b.customer?.phone_number || b.customer?.phone}</p>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>settings_suggest</span>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{b.service_name || 'Servicio Agendado'}</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--secondary)' }}>{b.guest_count > 1 ? `${b.guest_count} asistentes` : 'Sesión individual'}</p>
        {b.goal && b.goal.includes('Notas:') && (
          <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--surface-container-highest)', borderRadius: '8px', borderLeft: '2px solid var(--primary)' }}>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--on-surface)', fontStyle: 'italic' }}>
              {b.goal.split('Notas:')[1].trim()}
            </p>
          </div>
        )}
      </div>
      <div>
        <span style={{ 
          padding: '4px 12px', 
          borderRadius: '20px', 
          fontSize: '0.65rem', 
          fontWeight: 900, 
          letterSpacing: '0.5px',
          backgroundColor: b.status === 'Confirmado' ? 'rgba(16, 185, 129, 0.1)' : (b.status === 'Pendiente' ? 'rgba(245, 158, 11, 0.1)' : 'var(--surface-container-highest)'),
          color: b.status === 'Confirmado' ? 'var(--emerald-400)' : (b.status === 'Pendiente' ? 'var(--tertiary)' : 'var(--secondary)'),
          textTransform: 'uppercase'
        }}>
          {b.status}
        </span>
      </div>
      <div className="flex justify-end gap-2">
        {b.status === 'Pendiente' && (
          <button onClick={() => handleStatusChange(b.id, 'Confirmado')} className="icon-btn" style={{ color: 'var(--emerald-400)' }}>
            <span className="material-symbols-outlined">check_circle</span>
          </button>
        )}
        <button className="icon-btn" style={{ color: 'var(--secondary)' }}>
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </div>
    </div>
  );

  if (loading && bookings.length === 0) return <div className="p-8 text-center text-secondary">Sincronizando Agenda IA...</div>;

  return (
    <div className="p-8" style={{ position: 'relative' }}>
      <header className="page-header">
        <div>
          <h2 className="page-title">Gestión de Citas y Agenda</h2>
          <p className="body-md" style={{ color: 'var(--secondary)' }}>Control y seguimiento de todas las citas agendadas por la IA y manualmente.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={() => window.print()}>
            <span className="material-symbols-outlined">download</span> Exportar a PDF
          </button>
          <button className="btn-primary" onClick={() => setShowManualModal(true)}>
            <span className="material-symbols-outlined">add</span> Nueva Cita Manual
          </button>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="flex mb-6" style={{ gap: '1rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--primary)', padding: '0.75rem 1rem', flex: '0 0 200px' }}>
          <div className="flex justify-between items-start">
            <p className="label-sm" style={{ margin: 0, fontSize: '0.6rem' }}>Citas para Hoy</p>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '16px' }}>today</span>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.25rem 0' }}>{stats.today}</h3>
          <p className="body-md" style={{ color: 'var(--emerald-400)', fontSize: '0.65rem', fontWeight: 600, margin: 0 }}>
            +{stats.newToday} nuevas hoy
          </p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--tertiary)', padding: '0.75rem 1rem', flex: '0 0 200px' }}>
          <div className="flex justify-between items-start">
            <p className="label-sm" style={{ margin: 0, fontSize: '0.6rem' }}>Por Confirmar</p>
            <span className="material-symbols-outlined" style={{ color: 'var(--tertiary)', fontSize: '16px' }}>pending_actions</span>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.25rem 0' }}>{stats.pending}</h3>
          <p className="body-md" style={{ color: 'var(--secondary)', fontSize: '0.65rem', margin: 0 }}>Atención requerida</p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--emerald-400)', padding: '0.75rem 1rem', flex: '0 0 200px' }}>
          <div className="flex justify-between items-start">
            <p className="label-sm" style={{ margin: 0, fontSize: '0.6rem' }}>Tasa de Asistencia</p>
            <span className="material-symbols-outlined" style={{ color: 'var(--emerald-400)', fontSize: '16px' }}>check_circle</span>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.25rem 0' }}>{stats.attendance}%</h3>
          <p className="body-md" style={{ color: 'var(--secondary)', fontSize: '0.65rem', margin: 0 }}>Eficiencia de bots</p>
        </div>
      </div>

      {/* View Toggle & Filters */}
      <div className="flex justify-between items-center mb-4 gap-4" style={{ flexWrap: 'wrap', borderBottom: '1px solid var(--surface-container-highest)', paddingBottom: '0.5rem' }}>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          {viewMode === 'list' && ['Próximas', 'Pendientes', 'Completadas', 'Historial'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: activeTab === tab ? 'var(--primary)' : 'var(--secondary)',
                backgroundColor: activeTab === tab ? 'rgba(255, 90, 31, 0.1)' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              {tab}
            </button>
          ))}
          {viewMode === 'calendar' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button onClick={prevMonth} className="icon-btn" style={{ backgroundColor: 'var(--surface-container)' }}><span className="material-symbols-outlined">chevron_left</span></button>
              <h3 style={{ margin: 0, fontSize: '1.25rem', textTransform: 'capitalize' }}>
                {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={nextMonth} className="icon-btn" style={{ backgroundColor: 'var(--surface-container)' }}><span className="material-symbols-outlined">chevron_right</span></button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', backgroundColor: 'var(--surface-container)', borderRadius: '8px', padding: '4px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setViewMode('list')}
            style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: viewMode === 'list' ? 'var(--surface-container-high)' : 'transparent', color: viewMode === 'list' ? 'var(--on-surface)' : 'var(--secondary)', transition: 'all 0.2s' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>list</span> Lista
          </button>
          <button 
            onClick={() => setViewMode('calendar')}
            style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: viewMode === 'calendar' ? 'var(--surface-container-high)' : 'transparent', color: viewMode === 'calendar' ? 'var(--on-surface)' : 'var(--secondary)', transition: 'all 0.2s' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_month</span> Calendario
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'list' ? (
        <div className="flex flex-col gap-4">
          {filteredBookings.length === 0 ? (
            <div className="card" style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>calendar_today</span>
              <p className="title-md mt-4">No hay citas registradas en esta sección.</p>
            </div>
          ) : (
            filteredBookings.map(renderBookingCard)
          )}
        </div>
      ) : (
        /* CALENDAR VIEW */
        /* CALENDAR VIEW */
        <div className="card" style={{ padding: '0.75rem 0.5rem', borderRadius: '16px', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--surface-container-highest)', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ width: '100%' }}>
          {/* Days of Week */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--surface-container-highest)' }}>
            {[
              { full: 'Lunes', short: 'L' },
              { full: 'Martes', short: 'M' },
              { full: 'Miércoles', short: 'X' },
              { full: 'Jueves', short: 'J' },
              { full: 'Viernes', short: 'V' },
              { full: 'Sábado', short: 'S' },
              { full: 'Domingo', short: 'D' }
            ].map((d, i) => (
              <div key={d.full} style={{ 
                fontSize: '0.75rem', 
                fontWeight: 800, 
                color: 'var(--secondary)', 
                textTransform: 'uppercase', 
                borderRight: i < 6 ? '1px solid var(--outline-variant)' : 'none',
                padding: '0 2px'
              }}>
                <span className="desktop-only">{d.full}</span>
                <span className="mobile-only">{d.short}</span>
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', gridAutoRows: '70px' }}>
            {blanks.map(b => <div key={`blank-${b}`} style={{ backgroundColor: 'transparent' }} />)}
            
            {days.map(day => {
              const dayBookings = getBookingsForDay(day);
              const hasBookings = dayBookings.length > 0;
              const hasPending = dayBookings.some(b => b.status === 'Pendiente');
              
              const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const isToday = new Date().toDateString() === dateObj.toDateString();

              return (
                <div
                  key={day}
                  onClick={() => { if(hasBookings) setSelectedDayBookings(dayBookings); }}
                  style={{
                    backgroundColor: hasBookings ? 'rgba(0, 194, 255, 0.08)' : 'rgba(0, 0, 0, 0.2)',
                    border: isToday ? '2px solid var(--primary)' : (hasBookings ? '2px solid var(--emerald-400)' : '1px solid var(--outline-variant)'),
                    borderRadius: '12px',
                    padding: '0.5rem',
                    cursor: hasBookings ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: 1
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    e.currentTarget.style.backgroundColor = hasBookings ? 'rgba(0, 194, 255, 0.15)' : 'rgba(0, 0, 0, 0.3)'; 
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.backgroundColor = hasBookings ? 'rgba(0, 194, 255, 0.08)' : 'rgba(0, 0, 0, 0.2)'; 
                  }}
                >
                  <span style={{ 
                    fontSize: '1rem', 
                    fontWeight: 800, 
                    color: isToday ? 'var(--primary)' : 'var(--on-surface)',
                    marginBottom: 'auto'
                  }}>
                    {day}
                  </span>
                  
                  {hasBookings && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                      <div className="desktop-only" style={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 900, 
                        color: hasPending ? '#000' : 'var(--emerald-400)',
                        backgroundColor: hasPending ? 'var(--tertiary)' : 'rgba(16, 185, 129, 0.1)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        width: 'fit-content'
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>{hasPending ? 'notification_important' : 'event_available'}</span>
                        {dayBookings.length} {dayBookings.length === 1 ? 'Cita' : 'Citas'}
                      </div>
                      
                      {/* Indicador móvil simplificado */}
                      <div className="mobile-only" style={{
                         width: '8px', height: '8px', borderRadius: '50%',
                         backgroundColor: hasPending ? 'var(--tertiary)' : 'var(--emerald-400)',
                         marginTop: '4px'
                      }}></div>

                      {/* Avatar Row */}
                      <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', marginTop: '2px' }}>
                        {dayBookings.slice(0, 3).map((b, i) => (
                          <div key={b.id} style={{ 
                            width: '20px', height: '20px', borderRadius: '50%', 
                            backgroundColor: 'var(--primary-dim)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.65rem', fontWeight: 900, color: '#fff',
                            border: '2px solid var(--surface-container)',
                            marginLeft: i > 0 ? '-8px' : '0',
                            zIndex: 3 - i
                          }}>
                            {b.customer?.name?.[0] || 'W'}
                          </div>
                        ))}
                        {dayBookings.length > 3 && (
                          <div style={{ 
                            width: '20px', height: '20px', borderRadius: '50%', 
                            backgroundColor: 'var(--surface-container-highest)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.6rem', fontWeight: 900, color: 'var(--on-surface)',
                            border: '2px solid var(--surface-container)',
                            marginLeft: '-8px',
                            zIndex: 0
                          }}>
                            +{dayBookings.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          </div>
        </div>
      )}

      {/* Modal Detalles del Día */}
      {selectedDayBookings && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem',
          animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => setSelectedDayBookings(null)}>
          <div style={{
            backgroundColor: 'var(--background)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid var(--surface-container-highest)',
            animation: 'slideUp 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            
            <div style={{ padding: '2rem 2.5rem', borderBottom: '1px solid var(--surface-container-highest)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-container-lowest)', borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Agenda Detallada</span>
                <h2 style={{ margin: '0.25rem 0 0 0', fontSize: '2rem', fontWeight: 800 }}>
                  {selectedDayBookings[0]?.date}
                </h2>
              </div>
              <button onClick={() => setSelectedDayBookings(null)} className="icon-btn" style={{ backgroundColor: 'var(--surface-container)', width: '40px', height: '40px', borderRadius: '50%' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div style={{ padding: '2rem 2.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
              {selectedDayBookings.map(renderBookingCard)}
            </div>
            
          </div>
        </div>
      )}

      {/* Modal Nueva Cita Manual */}
      {showManualModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100, padding: '2rem', animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => setShowManualModal(false)}>
          <div style={{
            backgroundColor: 'var(--surface-container-low)', borderRadius: '24px',
            width: '100%', maxWidth: '500px', border: '1px solid var(--surface-container-highest)',
            boxShadow: 'var(--shadow-xl)', overflow: 'hidden', animation: 'slideUp 0.2s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--surface-container-highest)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Agendar Cita Manual</h3>
              <button onClick={() => setShowManualModal(false)} className="icon-btn"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleSaveManual} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm" style={{ fontWeight: 800 }}>Nombre del Cliente</label>
                <input type="text" className="input-field" required value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} placeholder="Ej. Carlos Martínez" style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--surface-container-highest)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)', width: '100%' }} />
              </div>
              <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm" style={{ fontWeight: 800 }}>Número de WhatsApp</label>
                <input type="text" className="input-field" required value={manualForm.phone} onChange={e => setManualForm({...manualForm, phone: e.target.value})} placeholder="+54 9 11 1234 5678" style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--surface-container-highest)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)', width: '100%' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="label-sm" style={{ fontWeight: 800 }}>Fecha</label>
                  <input type="date" className="input-field" required value={manualForm.date} onChange={e => setManualForm({...manualForm, date: e.target.value})} style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--surface-container-highest)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)', width: '100%' }} />
                </div>
                <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="label-sm" style={{ fontWeight: 800 }}>Hora</label>
                  <input type="time" className="input-field" required value={manualForm.time} onChange={e => setManualForm({...manualForm, time: e.target.value})} style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--surface-container-highest)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)', width: '100%' }} />
                </div>
              </div>
              <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm" style={{ fontWeight: 800 }}>Detalles (Opcional)</label>
                <textarea className="input-field" value={manualForm.details} onChange={e => setManualForm({...manualForm, details: e.target.value})} placeholder="Notas sobre la cita, motivo..." style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--surface-container-highest)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)', width: '100%', minHeight: '80px', resize: 'vertical' }} />
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setShowManualModal(false)} className="btn-secondary" style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', fontWeight: 800 }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', fontWeight: 800 }}>Guardar Cita</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
