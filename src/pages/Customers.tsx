import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface Customer {
  id: string;
  name: string;
  phone_number: string;
  total_orders: number;
  ltv: number;
  last_order_date: string;
  status: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'customers' | 'leads'>('customers');
  const [activeSegmentFilter, setActiveSegmentFilter] = useState<string>('Todos');
  const segments = ['Todos', 'Contactó', 'Interesado', 'Cliente', 'Cliente Frecuente', 'VIP'];
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  useEffect(() => {
    fetchCustomers();
    fetchLeads();
    const subCustomers = supabase.channel('customers_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => fetchCustomers())
      .subscribe();

    const subLeads = supabase.channel('leads_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'landing_leads' }, () => fetchLeads())
      .subscribe();

    return () => {
      supabase.removeChannel(subCustomers);
      supabase.removeChannel(subLeads);
    };
  }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('last_order_date', { ascending: false });
    if (data) setCustomers(data);
    setLoading(false);
  };

  const fetchLeads = async () => {
    setLoadingLeads(true);
    const { data } = await supabase.from('landing_leads').select('*').order('created_at', { ascending: false });
    if (data) setLeads(data);
    setLoadingLeads(false);
  };

  const handleStatusChange = async (customerId: string, newStatus: string) => {
    // Optimistic update
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, status: newStatus } : c));
    
    // DB Update
    const { error } = await supabase
      .from('customers')
      .update({ status: newStatus })
      .eq('id', customerId);
      
    if (error) {
      console.error('Error updating status:', error);
      // Revert if error
      fetchCustomers();
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Contactó': return { bg: 'var(--surface-container-highest)', text: 'var(--secondary)' };
      case 'Interesado': return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8' }; // Blue
      case 'Cliente': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' }; // Emerald
      case 'Cliente Frecuente': return { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' }; // Purple
      case 'VIP': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' }; // Amber
      default: return { bg: 'var(--primary-dim)', text: 'var(--primary)' };
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone_number?.includes(searchTerm);
    const matchesSegment = activeSegmentFilter === 'Todos' || c.status === activeSegmentFilter;
    return matchesSearch && matchesSegment;
  });

  const filteredLeads = leads.filter(l => 
    l.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.phone?.includes(searchTerm) ||
    l.segment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.goal?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <header className="page-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title">Base de Clientes 👥</h2>
          <p className="body-md" style={{ color: 'var(--secondary)' }}>Gestiona y segmenta todos tus contactos en un solo lugar.</p>
        </div>
        <div className="flex gap-4" style={{ flexWrap: 'wrap', width: '100%' }}>
          <div className="input-group" style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
             <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary)' }}>search</span>
             <input 
               type="text" 
               placeholder="Buscar cliente o lead..." 
               className="input-base" 
                style={{ paddingLeft: '35px', width: '100%' }}
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
             />
          </div>
          <button className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Exportar CSV</button>
        </div>
      </header>

      {/* Tabs de Filtro */}
      <div className="flex gap-4 mb-6 hide-scrollbar" style={{ overflowX: 'auto', borderBottom: '1px solid var(--surface-container-highest)', paddingBottom: '1rem', WebkitOverflowScrolling: 'touch' }}>
        <button
          onClick={() => setActiveTab('customers')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: activeTab === 'customers' ? 'var(--primary)' : 'var(--secondary)',
            backgroundColor: activeTab === 'customers' ? 'rgba(255, 90, 31, 0.1)' : 'transparent',
            transition: 'all 0.2s',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}
        >
          Clientes CRM (WhatsApp)
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: activeTab === 'leads' ? 'var(--primary)' : 'var(--secondary)',
            backgroundColor: activeTab === 'leads' ? 'rgba(255, 90, 31, 0.1)' : 'transparent',
            transition: 'all 0.2s',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}
        >
          Leads de la Landing (Pre-calificados)
        </button>
      </div>

      {/* Segment Filters for CRM */}
      {activeTab === 'customers' && (
        <div className="flex gap-2 mb-6" style={{ overflowX: 'auto', paddingBottom: '0.5rem', WebkitOverflowScrolling: 'touch' }}>
          {segments.map(seg => {
            const count = seg === 'Todos' ? customers.length : customers.filter(c => c.status === seg).length;
            const colors = getStatusColor(seg);
            const isActive = activeSegmentFilter === seg;
            
            return (
              <button
                key={seg}
                onClick={() => setActiveSegmentFilter(seg)}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '2rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: isActive ? `1px solid ${colors.text}` : '1px solid var(--surface-container-highest)',
                  backgroundColor: isActive ? colors.bg : 'transparent',
                  color: isActive ? colors.text : 'var(--secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                  whiteSpace: 'nowrap'
                }}
              >
                {seg}
                <span style={{ 
                  backgroundColor: isActive ? colors.text : 'var(--surface-container-highest)', 
                  color: isActive ? '#fff' : 'var(--secondary)', 
                  padding: '2px 6px', 
                  borderRadius: '1rem', 
                  fontSize: '0.65rem' 
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="card table-container" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
          {activeTab === 'customers' ? (
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-container-low)', borderBottom: '1px solid var(--surface-container-highest)' }}>
                <th style={{ padding: '1rem', color: 'var(--secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Cliente</th>
                <th style={{ padding: '1rem', color: 'var(--secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Teléfono</th>
                <th style={{ padding: '1rem', color: 'var(--secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Actividad</th>
                <th style={{ padding: '1rem', color: 'var(--secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Total Gastado</th>
                <th style={{ padding: '1rem', color: 'var(--secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Estado</th>
              </tr>
            </thead>
          ) : (
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-container-low)', borderBottom: '1px solid var(--surface-container-highest)' }}>
                <th style={{ padding: '1rem', color: 'var(--secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Fecha</th>
                <th style={{ padding: '1rem', color: 'var(--secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Nombre</th>
                <th style={{ padding: '1rem', color: 'var(--secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>WhatsApp</th>
                <th style={{ padding: '1rem', color: 'var(--secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Giro / Sector</th>
                <th style={{ padding: '1rem', color: 'var(--secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Volumen Mensajes</th>
                <th style={{ padding: '1rem', color: 'var(--secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Objetivo Automatizar</th>
              </tr>
            </thead>
          )}
          <tbody>
            {activeTab === 'customers' ? (
              loading ? (
                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center' }}>Sincronizando clientes...</td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--secondary)' }}>No hay clientes registrados aún.</td></tr>
              ) : filteredCustomers.map(customer => (
                <tr key={customer.id} style={{ borderBottom: '1px solid var(--surface-container-highest)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{customer.name || 'Cliente WhatsApp'}</td>
                  <td style={{ padding: '1rem', color: 'var(--secondary)' }}>{customer.phone_number}</td>
                  <td style={{ padding: '1rem' }}>{customer.total_orders}</td>
                  <td style={{ padding: '1rem', fontWeight: 700 }}>${Number(customer.ltv || 0).toFixed(2)}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <select 
                        value={customer.status || 'Contactó'}
                        onChange={(e) => handleStatusChange(customer.id, e.target.value)}
                        style={{
                          appearance: 'none',
                          backgroundColor: getStatusColor(customer.status).bg,
                          color: getStatusColor(customer.status).text,
                          border: 'none',
                          padding: '0.3rem 1.8rem 0.3rem 0.8rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          outline: 'none',
                          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)'
                        }}
                      >
                        {segments.filter(s => s !== 'Todos').map(s => (
                          <option key={s} value={s} style={{ backgroundColor: 'var(--surface-bright)', color: 'var(--on-surface)' }}>{s}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined" style={{ 
                        position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', 
                        fontSize: '14px', pointerEvents: 'none', color: getStatusColor(customer.status).text 
                      }}>expand_more</span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              loadingLeads ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center' }}>Cargando leads de landing...</td></tr>
              ) : filteredLeads.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--secondary)' }}>No se encontraron leads perfilados.</td></tr>
              ) : filteredLeads.map(lead => (
                <tr key={lead.id} style={{ borderBottom: '1px solid var(--surface-container-highest)' }}>
                  <td style={{ padding: '1rem', color: 'var(--secondary)', fontSize: '0.85rem' }}>
                    {new Date(lead.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{lead.name}</td>
                  <td style={{ padding: '1rem', color: 'var(--secondary)' }}>
                    <a 
                      href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      style={{ color: 'var(--emerald-400)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chat</span>
                      {lead.phone}
                    </a>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {lead.segment || 'No especificado'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{lead.volume || 'No especificado'}</td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--secondary)' }}>{lead.goal || 'No especificado'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
