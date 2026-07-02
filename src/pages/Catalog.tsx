import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export default function Catalog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [reservationsCount, setReservationsCount] = useState(0); 
  const [reservationsList, setReservationsList] = useState<any[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [togglingAllOff, setTogglingAllOff] = useState(false);
  const [showConfirmOff, setShowConfirmOff] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '', 
    name: '',
    category: 'Servicios',
    price: '',
    cost: '', // NUEVO: Costo
    upsell: '', // NUEVO: Upsell sugerido
    modifiers: false, // NUEVO: Permite extras
    keywords: '', 
    img: ''
  });

  const fetchMenu = useCallback(async () => {
    setLoading(true);

    // 1. Obtener el tenant_id actual del usuario logueado
    const { data: userData } = await supabase.auth.getUser();
    let currentTenantId = null;

    if (userData.user) {
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', userData.user.id)
        .single();
      
      if (tenantUser) {
        currentTenantId = tenantUser.tenant_id;
        setTenantId(currentTenantId);
      }
    }

    // Traer config de la base para saber qué moneda usa el negocio
    const { data: configData } = await supabase.from('business_config').select('currency').maybeSingle();
    let symbol = '$';
    if (configData?.currency === 'PEN') symbol = 'S/';
    else if (configData?.currency === 'EUR') symbol = '€';
    setCurrencySymbol(symbol);

    // 2. Traer el menú (RLS ya filtra automáticamente, pero guardamos el tenant_id para las inserciones)
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('sales_30d', { ascending: false });

    if (error) {
      console.error('Error fetching menu:', error);
    } else if (data) {
      const mapped = data.map((item: any) => ({
        id: item.item_code,
        name: item.name,
        category: item.category,
        price: `${symbol}${Number(item.price).toFixed(2)}`,
        rawPrice: item.price,
        cost: item.cost_price || 0,
        upsell: item.upsell_item_code || '',
        modifiers: item.has_modifiers || false,
        stock: item.stock_status,
        keywords: item.keywords || [],
        sales30d: item.sales_30d,
        img: item.img_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400',
        available: item.is_available
      }));
      setMenuItems(mapped);
    }

    // NUEVO: Consultar total de reservas pendientes para el panel y la agenda
    const { data: resData, count: resCount } = await supabase
      .from('reservations')
      .select(`
        *,
        customer:customers (name, phone_number)
      `, { count: 'exact', head: false })
      .eq('status', 'Pendiente')
      .order('reservation_time', { ascending: true });
    
    if (resData) {
      setReservationsList(resData);
    }
    setReservationsCount(resCount || 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const categories = ['Todos', 'Servicios', 'Consultas', 'Productos', 'Suscripciones', 'Planes', 'Asesorías', 'Paquetes', 'Tratamientos', 'Mantenimiento', 'Menú/Carta', 'Bebidas', 'Postres', 'Otros'];

  const filteredMenu = menuItems.filter(m => {
    const searchLower = searchTerm.toLowerCase();
    
    // Normalizar keywords para asegurar que siempre sea un array
    const keywordsArray = Array.isArray(m.keywords) 
      ? m.keywords 
      : (typeof m.keywords === 'string' ? m.keywords.split(',').map((k: string) => k.trim()) : []);
      
    const matchesSearch = m.name.toLowerCase().includes(searchLower) || 
                          keywordsArray.some((k: string) => k.toLowerCase().includes(searchLower));
                          
    const matchesTab = activeCategory === 'Todos' || m.category === activeCategory;
    return matchesSearch && matchesTab;
  });

  const topProduct = menuItems.length > 0 ? [...menuItems].sort((a,b) => b.sales30d - a.sales30d)[0] : null;

  const handleTurnOffAll = () => {
    setShowConfirmOff(true);
  };

  const confirmTurnOffAll = async () => {
    setTogglingAllOff(true);
    // Turn off all items that aren't already off
    const { error } = await supabase.from('menu_items')
      .update({ is_available: false, stock_status: 'Agotado' })
      .eq('is_available', true);
    
    if (!error) {
      fetchMenu();
    } else {
      console.error('Error turning off items:', error.message);
      alert('Error al apagar los productos: ' + error.message);
    }
    setTogglingAllOff(false);
    setShowConfirmOff(false);
  };

  const handleToggle = async (id: string, currentAvailable: boolean) => {
    const { error } = await supabase.from('menu_items').update({ 
      is_available: !currentAvailable,
      stock_status: !currentAvailable ? 'Disponible' : 'Agotado'
    }).eq('item_code', id);
    if (!error) fetchMenu();
  };

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setUploadingImage(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `items/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('catalog_images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('catalog_images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, img: data.publicUrl });
    } catch (error: any) {
      alert('Error subiendo imagen: ' + error.message + '\n\nNota: Asegúrate de crear un bucket llamado "catalog_images" en Supabase y configurarlo como Público.');
    } finally {
      setUploadingImage(false);
    }
  };

  const openNewItem = () => {
    setFormData({ id: '', name: '', category: 'Servicios', price: '', cost: '', upsell: '', modifiers: false, keywords: '', img: '' });
    setIsModalOpen(true);
  };

  const openEditItem = (item: any) => {
    setFormData({
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.rawPrice,
      cost: item.cost,
      upsell: item.upsell,
      modifiers: item.modifiers,
      keywords: item.keywords.join(', '),
      img: item.img
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemCode = formData.id || 'P-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    const payload: any = {
      name: formData.name,
      category: formData.category,
      price: Number(formData.price),
      cost_price: Number(formData.cost) || 0,
      upsell_item_code: formData.upsell || null,
      has_modifiers: formData.modifiers,
      keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k !== ''),
    };
    if (formData.img) payload.img_url = formData.img;

    if (formData.id) {
      const { error } = await supabase.from('menu_items').update(payload).eq('item_code', formData.id);
      if (error) alert("Error actualizando: " + error.message);
    } else {
      payload.item_code = itemCode;
      payload.is_available = true;
      payload.stock_status = 'Disponible';
      payload.sales_30d = 0;
      
      // INYECCIÓN DE SEGURIDAD MULTI-TENANT: Asignar producto al restaurante correcto
      if (tenantId) {
        payload.tenant_id = tenantId;
      }

      const { error } = await supabase.from('menu_items').insert(payload);
      if (error) alert("Error creando: " + error.message);
    }
    setIsModalOpen(false);
    fetchMenu();
  };

  if (loading && menuItems.length === 0) return <div className="p-8 text-center text-secondary">Cargando Catálogo Maestro...</div>;

  return (
    <div className="p-8">
      {/* Header Premium */}
      <div className="flex justify-between items-end mb-8" style={{ marginTop: 0 }}>
        <div>
          <h2 className="page-title">Inventario & Inteligencia Comercial</h2>
          <p className="body-md" style={{ color: 'var(--secondary)' }}>Gestión de productos, márgenes de ganancia y reglas de upsell IA.</p>
        </div>
        <div className="flex gap-3 items-center">

          {/* Botón Disimulado: Apagar Todo */}
          <button 
            onClick={handleTurnOffAll}
            disabled={togglingAllOff}
            title="Apagar todos los productos y servicios"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--secondary)',
              cursor: togglingAllOff ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.5rem',
              opacity: 0.6,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>
              {togglingAllOff ? 'hourglass_empty' : 'power_off'}
            </span>
          </button>

          <button onClick={openNewItem} className="btn-primary" style={{ height: '44px', padding: '0 1.5rem', borderRadius: '8px', boxShadow: '0 4px 14px rgba(255, 90, 31, 0.2)' }}>
             + Nuevo Item
          </button>
        </div>
      </div>

      {/* METRICS GRID OPERATIVO (Enfoque Trabajador) */}
      <div className="metrics-grid mb-6">
        {/* 1. Estado del Catálogo (Activos / Total) */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="flex justify-between items-start mb-2">
            <p className="label-sm">Items Activos</p>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>inventory_2</span>
          </div>
          <h3 className="display-md" style={{ fontSize: '1.8rem', color: menuItems.filter(m => m.available).length === menuItems.length ? 'var(--emerald-400)' : 'var(--on-surface)' }}>
             {menuItems.filter(m => m.available).length} <span style={{ fontSize: '1.2rem', color: 'var(--secondary)' }}>/ {menuItems.length}</span>
          </h3>
          <p className="body-md" style={{ color: 'var(--secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Listos para la venta</p>
        </div>

        {/* 2. Reservas IA (Reemplaza a Agotados) */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="flex justify-between items-start mb-2">
            <p className="label-sm">Reservas Activas</p>
            <span className="material-symbols-outlined" style={{ color: 'var(--tertiary)' }}>event_seat</span>
          </div>
          <h3 className="display-md" style={{ fontSize: '1.8rem', color: reservationsCount > 0 ? 'var(--tertiary)' : 'var(--on-surface)' }}>
             {reservationsCount}
          </h3>
          <p className="body-md" style={{ color: 'var(--secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
             Asignadas por Robotina
          </p>
        </div>

        {/* 3. Salud del Bot (Sin Keywords) */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="flex justify-between items-start mb-2">
            <p className="label-sm">Alerta de Config. (IA)</p>
            <span className="material-symbols-outlined" style={{ color: 'var(--tertiary)' }}>warning</span>
          </div>
          <h3 className="display-md" style={{ fontSize: '1.8rem', color: menuItems.filter(m => m.keywords.length === 0).length > 0 ? 'var(--tertiary)' : 'var(--emerald-400)' }}>
             {menuItems.filter(m => m.keywords.length === 0).length}
          </h3>
          <p className="body-md" style={{ color: 'var(--secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
             {menuItems.filter(m => m.keywords.length === 0).length > 0 ? 'Ítems invisibles para el bot' : 'Catálogo 100% optimizado'}
          </p>
        </div>

        {/* 4. TARJETA DE TOP RENDIMIENTO CON IMAGEN AJUSTADA */}
        <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--primary-dim)' }}>
          <div className="flex justify-between items-start mb-2">
            <p className="label-sm" style={{ color: 'var(--primary)' }}>Item Estrella</p>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>trending_up</span>
          </div>
          {topProduct ? (
            <div className="flex items-center gap-3 mt-1">
              <img src={topProduct.img} alt={topProduct.name} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontWeight: 800, fontSize: '0.9rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topProduct.name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', margin: 0 }}>{topProduct.sales30d} ventas (30d)</p>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--secondary)' }}>Sin datos</p>
          )}
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '2rem', backgroundColor: 'var(--surface-container-low)', borderRadius: '12px' }}>
         <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex gap-2 flex-wrap">
               {['Todos', ...Array.from(new Set(menuItems.map(item => item.category)))].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: activeCategory === cat ? 'var(--primary)' : 'var(--surface-container-highest)', color: activeCategory === cat ? '#fff' : 'var(--on-surface)' }}>
                     {cat}
                  </button>
               ))}
            </div>
            <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
               <input type="text" placeholder="Buscar por nombre o keyword..." className="input-base" style={{ width: '100%', borderRadius: '8px', paddingLeft: '2.5rem', height: '40px', backgroundColor: 'var(--surface-bright)' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
               <span className="material-symbols-outlined absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary)', fontSize: '1.2rem' }}>search</span>
            </div>
         </div>
      </div>

      {/* CATÁLOGO DE PRODUCTOS (PRO) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
         {filteredMenu.map(item => {
            const hasDiscount = item.cost > 0 && item.cost < item.rawPrice;
            const discount = hasDiscount ? Math.round(((item.rawPrice - item.cost) / item.rawPrice) * 100) : 0;
            const upsellObj = menuItems.find(m => m.id === item.upsell);
            const isMissingKeywords = !item.keywords || item.keywords.length === 0;

            return (
               <div key={item.id} className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', transition: 'all 0.2s', opacity: item.available ? 1 : 0.6, borderLeft: item.upsell ? '3px solid var(--tertiary)' : '1px solid var(--surface-container-highest)', boxShadow: isMissingKeywords ? '0 0 0 2px #ff4d4f, 0 4px 12px rgba(255, 77, 79, 0.2)' : undefined }}>
                  <img src={item.img} alt={item.name} style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                     <div className="flex justify-between items-start">
                       <div>
                         <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>{item.category}</span>
                         <h4 style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0.1rem 0 0.25rem 0', color: 'var(--on-surface)' }}>{item.name}</h4>
                       </div>
                       <div style={{ textAlign: 'right' }}>
                          {hasDiscount ? (
                            <>
                              <span style={{ fontSize: '0.7rem', fontWeight: 600, textDecoration: 'line-through', color: 'var(--secondary)' }}>{item.price}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span style={{ fontSize: '0.9rem', fontWeight: 900, display: 'block', color: 'var(--primary)' }}>{currencySymbol}{Number(item.cost).toFixed(2)}</span>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--emerald-400)' }}>{discount}% OFF</span>
                              </div>
                            </>
                          ) : (
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, display: 'block' }}>{item.price}</span>
                          )}
                       </div>
                     </div>
                     
                     {/* Tags de Inteligencia (Upsell / Modificadores) */}
                     <div className="flex gap-1 mt-1 mb-2">
                        {item.modifiers && <span style={{ fontSize: '0.6rem', padding: '2px 6px', backgroundColor: 'var(--surface-container-highest)', borderRadius: '4px', color: 'var(--on-surface)' }}>Acepta Extras</span>}
                        {upsellObj && <span style={{ fontSize: '0.6rem', padding: '2px 6px', backgroundColor: 'var(--tertiary)', color: '#fff', borderRadius: '4px' }}>Upsell: {upsellObj.name}</span>}
                     </div>

                     <div className="flex justify-between items-center border-top" style={{ borderTop: '1px solid var(--surface-container-highest)', paddingTop: '0.5rem', marginTop: 'auto' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--secondary)', margin: 0 }}>{item.sales30d} vendidos</p>
                        
                        <div className="flex gap-2">
                           <button onClick={() => openEditItem(item)} className="icon-btn" style={{ padding: '0.2rem' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: 'var(--secondary)' }}>edit</span>
                           </button>
                           <div onClick={() => handleToggle(item.id, item.available)} style={{ width: '36px', height: '20px', borderRadius: '10px', backgroundColor: item.available ? 'var(--primary)' : 'var(--surface-container-highest)', display: 'flex', alignItems: 'center', padding: '2px', cursor: 'pointer', justifyContent: item.available ? 'flex-end' : 'flex-start' }}>
                              <div style={{ width: '16px', height: '16px', backgroundColor: '#fff', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            )
         })}
      </div>

      {/* MODAL CONFIGURACIÓN PRO */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', padding: '1.5rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '640px',
              backgroundColor: 'var(--surface-bright)',
              borderRadius: '20px',
              border: '1px solid var(--surface-container-highest)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              display: 'flex', flexDirection: 'column',
              maxHeight: '88vh',
              animation: 'fadeIn 0.2s cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            {/* Header */}
            <div style={{ padding: '1.5rem 1.75rem 1.25rem', borderBottom: '1px solid var(--surface-container-highest)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontWeight: 900, fontSize: '1.2rem', margin: 0 }}>{formData.id ? 'Editar Ítem IA' : 'Nuevo Ítem IA'}</h3>
                <p style={{ fontSize: '0.72rem', opacity: 0.45, margin: '3px 0 0' }}>Configura los parámetros del catálogo</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'var(--surface-container-highest)', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface)', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>

            {/* Scrollable body with styled scrollbar */}
            <div style={{ overflowY: 'auto', overflowX: 'hidden', padding: '1.25rem 1.75rem', flex: 1 }} className="modal-scroll-body">
              <form id="product-form" onSubmit={handleSave} className="flex flex-col gap-4" style={{ width: '100%' }}>

                {/* 1. Datos Básicos */}
                <p style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--primary)', margin: 0 }}>1 · Datos Básicos</p>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', width: '100%' }}>
                  <div className="flex flex-col gap-1">
                    <label className="label-sm">Nombre del Ítem / Servicio *</label>
                    <input required className="input-base" style={{ width: '100%', paddingLeft: '1rem' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Menú, Producto, Catálogo..." />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="label-sm">Categoría *</label>
                    <select className="input-base" style={{ width: '100%', paddingLeft: '1rem' }} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {categories.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* 2. Estrategia de Precios */}
                <div style={{ borderTop: '1px solid var(--surface-container-highest)', paddingTop: '1rem' }}>
                  <p style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--primary)', margin: '0 0 0.75rem' }}>2 · Estrategia de Precios</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.7fr', gap: '0.75rem', width: '100%' }}>
                    <div className="flex flex-col gap-1">
                      <label className="label-sm">Precio Normal ({currencySymbol}) *</label>
                      <input required type="number" step="0.01" className="input-base" style={{ width: '100%', paddingLeft: '1rem' }} value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="Ej: 2500" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="label-sm">Precio Promocional ({currencySymbol})</label>
                      <input type="number" step="0.01" className="input-base" style={{ width: '100%', paddingLeft: '1rem' }} placeholder="Ej: 2000" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface-container)', borderRadius: '12px', padding: '0.4rem 0.5rem' }}>
                      <span style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--secondary)' }}>Descuento</span>
                      <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.5rem', lineHeight: 1.1 }}>
                        {Number(formData.price) > 0 && Number(formData.cost) > 0 && Number(formData.cost) < Number(formData.price) ? Math.round(((Number(formData.price) - Number(formData.cost)) / Number(formData.price)) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.65rem', color: 'var(--secondary)', marginTop: '0.5rem', marginBottom: 0 }}>La IA usará el Precio Promocional como táctica para cerrar ventas si el cliente duda.</p>
                </div>

                {/* 3. Reglas IA */}
                <div style={{ borderTop: '1px solid var(--surface-container-highest)', paddingTop: '1rem' }}>
                  <p style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--primary)', margin: '0 0 0.75rem' }}>3 · Reglas para el Bot (IA)</p>
                  
                  <div className="flex flex-col gap-1" style={{ marginBottom: '0.75rem', width: '100%' }}>
                    <label className="label-sm">Upsell Automático</label>
                    <select className="input-base" style={{ width: '100%', paddingLeft: '1rem' }} value={formData.upsell} onChange={e => setFormData({...formData, upsell: e.target.value})}>
                      <option value="">Ninguna sugerencia</option>
                      {menuItems.filter(m => m.id !== formData.id).map(m => (
                        <option key={m.id} value={m.id}>Ofrecer: {m.name} ({m.price})</option>
                      ))}
                    </select>
                    <span style={{ fontSize: '0.65rem', color: 'var(--secondary)' }}>El bot sugerirá esto automáticamente al cliente.</span>
                  </div>

                  <div className="flex flex-col gap-1" style={{ marginBottom: '0.75rem', width: '100%' }}>
                    <label className="label-sm">Keywords (bot)</label>
                    <input className="input-base" style={{ width: '100%', paddingLeft: '1rem' }} placeholder="Ej: blanqueamiento, urgencia, instalación..." value={formData.keywords} onChange={e => setFormData({...formData, keywords: e.target.value})} />
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem 1rem', backgroundColor: 'var(--surface-container)', borderRadius: '12px', width: '100%' }}>
                    <input type="checkbox" checked={formData.modifiers} onChange={e => setFormData({...formData, modifiers: e.target.checked})} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>Acepta Extras / Cambios</p>
                      <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.5 }}>El bot permitirá opciones o servicios adicionales</p>
                    </div>
                  </label>
                </div>

                {/* Imagen y Previsualización */}
                <div style={{ borderTop: '1px solid var(--surface-container-highest)', paddingTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', width: '100%' }}>
                  
                  {/* Controles de Imagen */}
                  <div className="flex flex-col gap-1">
                    <label className="label-sm">Imagen del Ítem (cuadrada)</label>
                    <div style={{ marginTop: '0.5rem' }}>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ display: 'none' }}
                          id="image-upload"
                        />
                        <label htmlFor="image-upload" className="btn-secondary" style={{ display: 'inline-flex', cursor: 'pointer', fontSize: '0.8rem', padding: '0.4rem 0.8rem', alignItems: 'center', gap: '0.4rem', margin: 0, width: '100%', justifyContent: 'center' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>{uploadingImage ? 'hourglass_empty' : 'upload_file'}</span>
                            {uploadingImage ? 'Subiendo...' : 'Subir Imagen desde PC'}
                        </label>
                        <p style={{ margin: '0.75rem 0 0.25rem', fontSize: '0.65rem', color: 'var(--secondary)' }}>O pega la URL directamente:</p>
                        <input className="input-base" style={{ width: '100%', paddingLeft: '1rem' }} value={formData.img} onChange={e => setFormData({...formData, img: e.target.value})} placeholder="https://..." />
                    </div>
                  </div>

                  {/* Tarjeta de Previsualización en Vivo */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                     <label className="label-sm" style={{ color: 'var(--primary)' }}>Previsualización en Vivo</label>
                     <div className="card" style={{ padding: '0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem', backgroundColor: 'var(--surface-container)' }}>
                        <img src={formData.img || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=150'} alt="Preview" style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                           <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', display: 'block' }}>{formData.category || 'Categoría'}</span>
                           <h4 style={{ fontWeight: 700, fontSize: '0.8rem', margin: '0 0 0.2rem 0', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formData.name || 'Nombre del Ítem'}</h4>
                           <span style={{ fontSize: '0.8rem', fontWeight: 800, display: 'block' }}>{currencySymbol}{Number(formData.price || 0).toFixed(2)}</span>
                        </div>
                     </div>
                  </div>

                </div>

              </form>
            </div>

            {/* Footer sticky */}
            <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid var(--surface-container-highest)', display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
              <button form="product-form" type="submit" className="btn-primary" style={{ flex: 2, fontWeight: 800 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>check_circle</span>
                Guardar Ítem
              </button>
            </div>
          </div>
        </div>
      )}



      {/* MODAL CALENDARIO DE RESERVAS */}
      {isCalendarOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '2.5rem', backgroundColor: 'var(--surface-bright)', borderRadius: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-6">
               <h3 className="display-sm" style={{ fontWeight: 800 }}>Agenda de Reservas</h3>
               <button onClick={() => setIsCalendarOpen(false)} className="icon-btn" style={{ padding: '0.5rem', backgroundColor: 'var(--surface-container-highest)', borderRadius: '50%' }}>
                  <span className="material-symbols-outlined">close</span>
               </button>
            </div>
            
            {reservationsList.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--secondary)', backgroundColor: 'var(--surface-container-low)', borderRadius: '16px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '4rem', opacity: 0.3, marginBottom: '1rem' }}>event_available</span>
                  <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>El calendario está libre.</p>
                  <p style={{ fontSize: '0.85rem' }}>Las reservas tomadas por Robotina aparecerán aquí automáticamente.</p>
               </div>
            ) : (
               <div className="flex flex-col gap-3">
                  {reservationsList.map((res) => {
                     const dateObj = new Date(res.reservation_time);
                     return (
                        <div key={res.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid var(--surface-container-highest)', borderRadius: '16px', backgroundColor: 'var(--surface-container-low)' }}>
                           <div style={{ backgroundColor: 'var(--primary-container)', color: 'var(--on-primary-container)', padding: '0.5rem 1rem', borderRadius: '12px', textAlign: 'center', minWidth: '85px' }}>
                              <p style={{ fontSize: '0.75rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>{dateObj.toLocaleDateString('es-ES', { month: 'short' })}</p>
                              <p style={{ fontSize: '1.8rem', fontWeight: 900, margin: '-4px 0' }}>{dateObj.getDate()}</p>
                           </div>
                           <div style={{ flex: 1 }}>
                              <h4 style={{ fontWeight: 800, margin: 0, fontSize: '1.1rem' }}>{res.customer?.name || 'Cliente WhatsApp'}</h4>
                              <p style={{ color: 'var(--secondary)', fontSize: '0.85rem', margin: 0, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                 <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chat</span> {res.customer?.phone_number || 'Sin número'}
                              </p>
                           </div>
                           <div style={{ textAlign: 'right' }}>
                              <p style={{ fontWeight: 900, margin: 0, fontSize: '1.2rem', color: 'var(--on-surface)' }}>{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              <p style={{ color: 'var(--tertiary)', fontSize: '0.85rem', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px' }}>
                                 <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group</span> {res.guest_count} Personas
                              </p>
                           </div>
                        </div>
                     )
                  })}
               </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN: APAGAR TODO */}
      {showConfirmOff && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', padding: '1.5rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', backgroundColor: 'var(--surface-bright)', borderRadius: '20px', padding: '2rem', textAlign: 'center', animation: 'fadeIn 0.2s cubic-bezier(0.4,0,0.2,1)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>warning</span>
            </div>
            <h3 style={{ fontWeight: 900, fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--on-surface)' }}>¿Apagar Catálogo Entero?</h3>
            <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.5 }}>
              Estás a punto de apagar <strong>todos los productos y servicios</strong>. La IA dejará de ofrecerlos hasta que los vuelvas a encender manualmente.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmOff(false)} className="btn-secondary" style={{ flex: 1, height: '44px' }}>
                Cancelar
              </button>
              <button 
                onClick={confirmTurnOffAll} 
                disabled={togglingAllOff}
                className="btn-primary" 
                style={{ flex: 1, height: '44px', backgroundColor: '#ef4444', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)' }}
              >
                {togglingAllOff ? 'Apagando...' : 'Sí, Apagar Todo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
