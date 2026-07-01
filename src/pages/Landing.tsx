import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { InteractiveGlobe } from '../components/InteractiveGlobe';
import { supabase } from '../supabaseClient';

export default function Landing() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [chatStep, setChatStep] = useState(0);
  const [globeVisible, setGlobeVisible] = useState(false);
  const globeSectionRef = useRef<HTMLDivElement>(null);

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingName, setBookingName] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingSegment, setBookingSegment] = useState('');
  const [bookingVolume, setBookingVolume] = useState('');
  const [bookingGoal, setBookingGoal] = useState('');
  const [bookingStep, setBookingStep] = useState(0); // 0 = Questionnaire, 1 = Show Calendar / Confirm


  const [showLegalDropdown, setShowLegalDropdown] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'PEN'>('USD');
  useEffect(() => {
    if (isBookingOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isBookingOpen]);

  useEffect(() => {
    // Scroll to hash on initial load if present (e.g., /home#contacto)
    if (window.location.hash) {
      setTimeout(() => {
        const id = window.location.hash.substring(1);
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150); // slight delay to ensure DOM is fully painted
    }
  }, []);

  const DEMO_WHATSAPP_NUMBER = '5491165994057'; // Número de WhatsApp real
  const BUSINESS_EMAIL = 'soporte@robotinacentral.com';
  const LEGAL_RUC = '15607181699';
  const LEGAL_NAME = 'Robotina Central';

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingName || !bookingPhone || !bookingSegment || !bookingVolume) {
      alert('Por favor completa todos los campos.');
      return;
    }
    
    // Guardar en localStorage para persistencia y analíticas
    const savedLeads = JSON.parse(localStorage.getItem('booking_leads') || '[]');
    savedLeads.push({
      name: bookingName,
      phone: bookingPhone,
      segment: bookingSegment,
      volume: bookingVolume,
      goal: bookingGoal,
      date: new Date().toISOString()
    });
    localStorage.setItem('booking_leads', JSON.stringify(savedLeads));

    // Guardar en Supabase
    try {
      const { error } = await supabase.from('landing_leads').insert([{
        name: bookingName,
        phone: bookingPhone,
        segment: bookingSegment,
        volume: bookingVolume,
        goal: bookingGoal,
        tenant_id: '4c652a69-006f-4194-9436-fd281d55e644'
      }]);
      if (error) {
        console.error('Error al guardar lead en Supabase:', error);
      }
    } catch (err) {
      console.error('Error de red al guardar lead:', err);
    }

    // Cerrar modal
    setIsBookingOpen(false);
    
    // Redirigir a la página de agendamiento
    window.location.href = `/agendar?name=${encodeURIComponent(bookingName)}&phone=${encodeURIComponent(bookingPhone)}`;
  };

  const handleConfirmBooking = () => {
    window.location.href = `/agendar?name=${encodeURIComponent(bookingName)}&phone=${encodeURIComponent(bookingPhone)}`;
    setIsBookingOpen(false);
    setBookingStep(0);
    setBookingName('');
    setBookingPhone('');
    setBookingSegment('');
    setBookingVolume('');
    setBookingGoal('');
  };



  // Lazy-mount globe only when its section enters the viewport
  useEffect(() => {
    const el = globeSectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setGlobeVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Auto-advance chat demo for a dynamic showcase
  useEffect(() => {
    const timer = setTimeout(() => {
      if (chatStep < 4) {
        setChatStep(prev => prev + 1);
      } else {
        // Reset after reaching the end
        const resetTimer = setTimeout(() => setChatStep(0), 7000);
        return () => clearTimeout(resetTimer);
      }
    }, chatStep === 0 ? 1500 : chatStep === 1 ? 3000 : chatStep === 2 ? 2500 : 3500);

    return () => clearTimeout(timer);
  }, [chatStep]);

  const faqs = [
    {
      q: "¿Para qué tipo de negocios sirve Robotina?",
      a: "Sirve para cualquier negocio que venda o atienda por WhatsApp: tiendas de e-commerce, prestadores de servicios profesionales (médicos, mecánicos, agencias), academias, inmobiliarias y, por supuesto, restaurantes. Si tu negocio recibe mensajes de clientes, Robotina te ayuda a automatizar y centralizar."
    },
    {
      q: "¿Cómo se centralizan los datos en el Dashboard?",
      a: "Cada vez que la IA interactúa con un cliente, registra la información clave (nombre, teléfono, producto de interés, fecha de cita o pedido) y la guarda al instante en tu base de datos. Tendrás un panel unificado para ver estadísticas, gestionar ventas y monitorear el estado de cada chat en tiempo real."
    },
    {
      q: "¿Qué sucede si el bot no entiende a un cliente?",
      a: "El bot reconoce sus límites. Ante preguntas complejas o solicitudes de hablar con un humano, la IA detiene la automatización temporalmente y envía una alerta visual y sonora a tu Dashboard para que un operador de tu equipo tome el control del chat manualmente."
    },
    {
      q: "¿De verdad procesa mensajes de voz (audios)?",
      a: "Sí. Robotina integra la tecnología Whisper de OpenAI. Transcribe notas de voz complejas en segundos, entiende la intención de compra del cliente y le responde de forma natural, reduciendo radicalmente el tiempo que tu equipo pasa escuchando audios."
    },
    {
      q: "¿Cómo es el proceso de configuración inicial?",
      a: "Es muy rápido. Conectas tu número a la API oficial de Meta y cargas tus productos, servicios o agenda de turnos en el Dashboard. Nosotros te guiamos paso a paso con nuestro onboarding asistido o lo configuramos por ti en menos de 24 horas."
    }
  ];

  return (
    <div style={{
      backgroundColor: 'var(--background)',
      color: 'var(--on-surface)',
      fontFamily: 'var(--font-family)',
      minHeight: '100vh',
      overflowX: 'hidden',
      position: 'relative'
    }}>
      {/* --- HEADER WRAPPER --- */}
      <div style={{
        width: '100%',
        backgroundImage: 'url("/Header.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        paddingBottom: '2rem'
      }}>
        {/* Dark overlay so text is readable across the entire header */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(10, 11, 16, 0.85)',
          zIndex: 0
        }} />

        {/* Background Glowing Lights (static, GPU-composited) */}
        <div className="bg-glow-container" style={{ zIndex: 0 }}>
          {/* Glow 1 - Orange Top Left */}
          <div className="bg-glow-blob" style={{
            top: '-150px',
            left: '-150px',
            width: '500px',
            height: '500px',
            backgroundColor: 'rgba(255, 90, 31, 0.13)'
          }}></div>
          {/* Glow 2 - Yellow Bottom Right */}
          <div className="bg-glow-blob" style={{
            bottom: '10%',
            right: '5%',
            width: '480px',
            height: '480px',
            backgroundColor: 'rgba(245, 158, 11, 0.10)'
          }}></div>
        </div>

        {/* 1. FLOATING NAVIGATION BAR */}
        <div className="floating-nav-container">
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem var(--nav-padding-x)',
            backgroundColor: 'rgba(10, 11, 16, 0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '50px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/logo__1_-removebg-preview.png" alt="Robotina Central" className="nav-logo" />
            </div>

            {/* Links */}
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }} className="desktop-only">
              <a href="#how-it-works" style={{ color: 'var(--secondary)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                Producto <span className="material-symbols-outlined" style={{ fontSize: '14px', opacity: 0.7 }}>keyboard_arrow_down</span>
              </a>
              <a href="#how-it-works" style={{ color: 'var(--secondary)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                Clientes <span className="material-symbols-outlined" style={{ fontSize: '14px', opacity: 0.7 }}>keyboard_arrow_down</span>
              </a>
              <a href="#pricing" style={{ color: 'var(--secondary)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>
                Planes
              </a>
              <a href="#contacto" style={{ color: 'var(--secondary)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>
                Contacto
              </a>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
              <Link to="/login" className="desktop-only" style={{ color: 'var(--secondary)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                Iniciar sesión
              </Link>
              <a href={`https://wa.me/${DEMO_WHATSAPP_NUMBER}?text=Hola,%20quiero%20conocer%20m%C3%A1s%20sobre%20Robotina%20Central`} target="_blank" rel="noopener noreferrer" className="btn-primary nav-button" style={{
                boxShadow: '0 0 15px rgba(255, 85, 0, 0.25)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                Hablar con Ventas
              </a>
            </div>
          </nav>
        </div>

        {/* 2. HERO SECTION */}
        <section style={{
          width: '100%',
          position: 'relative',
          zIndex: 1,
          paddingTop: '2rem'
        }}>
          
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto var(--hero-gap) auto',
            padding: '0 var(--nav-padding-x)',
            display: 'grid',
            gridTemplateColumns: '1.10fr 0.90fr',
            gap: 'var(--hero-gap)',
            alignItems: 'center',
            position: 'relative'
          }} className="grid-auto-responsive">
          <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0px',
            marginBottom: '2rem',
            flexWrap: 'wrap'
          }}>
            {/* Pill 1 */}
            <div className="floating-pill" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              padding: '6px 16px',
              borderRadius: '30px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#e9edef',
              animationDelay: '0s'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--primary)' }}>monetization_on</span>
              Ventas 24/7
            </div>

            {/* Connecting line 1 */}
            <div style={{
              width: '24px',
              height: '1px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }} className="desktop-only"></div>

            {/* Pill 2 */}
            <div className="floating-pill" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              padding: '6px 16px',
              borderRadius: '30px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#e9edef',
              animationDelay: '1.4s'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--primary)' }}>calendar_today</span>
              Catálogo y Citas
            </div>

            {/* Connecting line 2 */}
            <div style={{
              width: '24px',
              height: '1px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }} className="desktop-only"></div>

            {/* Pill 3 */}
            <div className="floating-pill" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              padding: '6px 16px',
              borderRadius: '30px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#e9edef',
              animationDelay: '0.7s'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--primary)' }}>auto_awesome</span>
              Inteligencia Artificial
            </div>
          </div>

          <h1 className="display-lg reveal-fade-up" style={{ 
            marginBottom: '1.5rem'
          }}>
            Tu WhatsApp <span className="text-gradient-primary">vende en automático</span> mientras <span className="text-gradient">no estás.</span>
          </h1>

          <p className="reveal-fade-up delay-100" style={{
            fontSize: '1.1rem',
            color: 'var(--secondary)',
            lineHeight: '1.6',
            marginBottom: '2.5rem',
            maxWidth: '560px'
          }}>
            Robotina Central atiende a tus clientes por WhatsApp con Inteligencia Artificial. Automatiza tus ventas, agenda citas, responde consultas de tu catálogo y gestiona tu negocio en piloto automático, sin descargar ninguna app.
          </p>

          <div className="reveal-fade-up delay-200" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => { setIsBookingOpen(true); setBookingStep(0); }} className="btn-primary" style={{ 
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'none', 
              fontSize: '1rem', 
              padding: '0.8rem 2.2rem', 
              borderRadius: '30px',
              boxShadow: '0 10px 25px rgba(255, 85, 0, 0.4)'
            }}>
              Agendar Prueba de 14 Días
            </button>
            <a href="#how-it-works" className="btn-secondary" style={{ 
              textDecoration: 'none', 
              fontSize: '0.9rem', 
              padding: '0.8rem 2rem', 
              borderRadius: '30px'
            }}>
              Ver Cómo Funciona
            </a>
          </div>
          <p className="reveal-fade-up delay-300" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.75rem', marginLeft: '1rem' }}>
            * Configuración en menos de 24 horas. Prueba gratis por 14 días.
          </p>

          <div className="reveal-fade-up delay-400 hero-stats-container">
            <div>
              <h4 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800 }}>100%</h4>
              <p style={{ color: 'var(--secondary)', fontSize: '0.75rem' }}>Interacciones en tu panel</p>
            </div>
            <div className="hero-stats-divider"></div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800 }}>3 seg</h4>
              <p style={{ color: 'var(--secondary)', fontSize: '0.75rem' }}>Respuesta automática del bot</p>
            </div>
            <div className="hero-stats-divider"></div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800 }}>0%</h4>
              <p style={{ color: 'var(--secondary)', fontSize: '0.75rem' }}>Comisiones por venta</p>
            </div>
          </div>
        </div>

        {/* MOCKUP INTERACTIVO DE WHATSAPP (MULTIPROPÓSITO: SERVICIO / CITA / PRODUCTO) */}
        <div className="whatsapp-mockup" style={{
          backgroundColor: '#0c0d14',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.6), 0 0 100px rgba(255, 90, 31, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '380px',
          margin: '0 auto'
        }}>
          {/* Header de WhatsApp Simulado */}
          <div style={{
            backgroundColor: '#121b22',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,90,31,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>smart_toy</span>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--emerald-400)', position: 'absolute', bottom: 0, right: 0, border: '2px solid #121b22' }}></div>
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '0.9rem', margin: 0, fontWeight: 700 }}>Robotina Asistente 🤖</h4>
              <p style={{ color: 'var(--emerald-400)', fontSize: '0.7rem', margin: 0 }}>Ventas & Agenda activas</p>
            </div>
          </div>

          {/* Mensajes del Chat */}
          <div style={{
            flex: 1,
            padding: '1.25rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundImage: 'radial-gradient(rgba(255,90,31,0.02) 1px, transparent 0)',
            backgroundSize: '16px 16px',
            backgroundColor: '#0a0b10'
          }}>
            {/* Mensaje 1: Cliente */}
            {chatStep >= 0 && (
              <div className="chat-bubble-anim" style={{
                alignSelf: 'flex-end',
                backgroundColor: '#005c4b',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: '12px 12px 0 12px',
                maxWidth: '85%',
                fontSize: '0.825rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}>
                ¡Hola! Me interesa ver sus productos y agendar una cita por favor.
              </div>
            )}

            {/* Mensaje 2: Bot */}
            {chatStep >= 1 && (
              <div className="chat-bubble-anim" style={{
                alignSelf: 'flex-start',
                backgroundColor: '#202c33',
                color: '#e9edef',
                padding: '10px 14px',
                borderRadius: '12px 12px 12px 0',
                maxWidth: '85%',
                fontSize: '0.825rem',
                whiteSpace: 'pre-line',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}>
                ¡Hola! Con gusto te ayudo. 🤖
                {"\n\n"}
                Aquí tienes nuestro catálogo de productos y servicios:
                {"\n"}
                👉 _https://robotina.central/catalogo_
                {"\n\n"}
                ¿Qué te gustaría comprar o agendar hoy? Puedes escribirlo o enviarme un audio.
              </div>
            )}

            {/* Mensaje 3: Cliente (Audio) */}
            {chatStep >= 2 && (
              <div className="chat-bubble-anim" style={{
                alignSelf: 'flex-end',
                backgroundColor: '#005c4b',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: '12px 12px 0 12px',
                maxWidth: '85%',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>play_circle</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ width: '80px', height: '3px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '2px', position: 'relative' }}>
                    <div style={{ width: '60%', height: '100%', backgroundColor: '#fff', borderRadius: '2px' }}></div>
                  </div>
                  <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Mensaje de voz • 0:05</span>
                </div>
              </div>
            )}

            {/* Mensaje 4: Bot procesa audio */}
            {chatStep === 3 && (
              <div className="typing-bubble">
                <div className="dot-typing"></div>
                <div className="dot-typing"></div>
                <div className="dot-typing"></div>
              </div>
            )}

            {/* Mensaje 5: Bot responde confirmando pedido */}
            {chatStep >= 4 && (
              <div className="chat-bubble-anim" style={{
                alignSelf: 'flex-start',
                backgroundColor: '#202c33',
                color: '#e9edef',
                padding: '10px 14px',
                borderRadius: '12px 12px 12px 0',
                maxWidth: '85%',
                fontSize: '0.825rem',
                whiteSpace: 'pre-line',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}>
                🔊 _Entendido del audio:_ "Quiero agendar el servicio premium para mañana a las 4 PM e incluir el accesorio del catálogo".
                {"\n\n"}
                ¡Excelente! He programado tu cita y agregado a tu orden:
                {"\n"}
                • *1x Servicio Técnico Premium* (Mañana, 4:00 PM)
                {"\n"}
                • *1x Accesorio Adicional*
                {"\n\n"}
                ¿Deseas confirmar los datos de pago para finalizar tu reserva y compra?
              </div>
            )}
          </div>

          {/* Footer de Entrada */}
          <div style={{
            backgroundColor: '#1f2c34',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '22px' }}>mood</span>
            <div style={{
              flex: 1,
              backgroundColor: '#2a3942',
              borderRadius: '20px',
              padding: '6px 12px',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '0.8rem'
            }}>
              Escribe un mensaje...
            </div>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '22px' }}>mic</span>
          </div>
        </div>
        </div>
      </section>
      </div>

      {/* NUEVA ZONA NEÓN ORIGINAL (REEMPLAZANDO SOCIAL PROOF) */}
      <div className="reveal-fade-up delay-500" style={{ 
        padding: '1.5rem 0', 
        width: '100%', 
        position: 'relative', 
        zIndex: 1,
        backgroundColor: '#0c0d14',
        borderTop: '1px solid rgba(0, 255, 102, 0.1)',
        borderBottom: '1px solid rgba(0, 255, 102, 0.1)',
        boxShadow: '0 0 80px rgba(0, 255, 102, 0.05)',
        overflow: 'hidden'
      }}>
        <style>{`
          @keyframes neonPulse {
            0% { filter: drop-shadow(0 0 5px #25D366) drop-shadow(0 0 10px #25D366); transform: scale(1); }
            100% { filter: drop-shadow(0 0 10px #25D366) drop-shadow(0 0 20px #25D366) drop-shadow(0 0 30px #25D366); transform: scale(1.05); }
          }
        `}</style>

        {/* Background glowing orb */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '300px',
          height: '100px',
          backgroundColor: 'rgba(0, 255, 102, 0.08)',
          filter: 'blur(60px)',
          zIndex: 0,
          borderRadius: '50%'
        }}></div>

        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 var(--nav-padding-x)',
          gap: 'var(--neon-gap)',
          flexWrap: 'wrap'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--neon-gap)',
            zIndex: 1,
            flexWrap: 'wrap'
          }}>
            {/* WhatsApp Neon Icon */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'neonPulse 2s infinite alternate',
              willChange: 'transform, filter'
            }}>
              <svg viewBox="0 0 24 24" fill="#25D366" style={{ width: 'var(--neon-svg-size)', height: 'var(--neon-svg-size)' }}>
                <path d="M12.012 2C6.48 2 2 6.48 2 12.012c0 1.764.456 3.48 1.332 5.004L2 22l5.124-1.344c1.476.804 3.132 1.224 4.888 1.224 5.532 0 10.012-4.48 10.012-10.012C22.024 6.48 17.544 2 12.012 2zm0 18.36c-1.572 0-3.12-.42-4.488-1.212l-.324-.192-3.036.796.812-2.952-.212-.336c-.864-1.38-1.32-2.988-1.32-4.656 0-4.668 3.804-8.472 8.472-8.472 4.668 0 8.472 3.804 8.472 8.472 0 4.668-3.804 8.472-8.472 8.472zm4.62-6.312c-.252-.12-1.488-.732-1.716-.816-.228-.084-.396-.12-.564.12-.168.252-.648.816-.792.984-.144.168-.288.192-.54.072-.252-.12-1.068-.396-2.028-1.26-.744-.66-1.248-1.476-1.392-1.728-.144-.252-.016-.388.11-.512.112-.112.252-.288.376-.432.126-.144.168-.24.252-.4.084-.168.042-.312-.021-.432-.063-.12-.564-1.356-.774-1.86-.204-.492-.408-.426-.564-.432-.144-.006-.312-.006-.48-.006-.168 0-.444.063-.672.312-.228.252-.876.852-.876 2.076s.888 2.4 1.02 2.58c.132.18 1.776 2.712 4.3 3.804.6.258 1.068.414 1.428.528.606.192 1.158.168 1.596.102.486-.072 1.488-.606 1.692-1.188.204-.582.204-1.08.144-1.188-.06-.108-.228-.168-.48-.288z"/>
              </svg>
            </div>

            <span style={{ fontSize: 'var(--neon-font-sign)', fontWeight: 800, color: '#fff', textShadow: '0 0 10px rgba(255,255,255,0.4)' }}>+</span>

            <div style={{
              fontSize: 'var(--neon-font-ia)',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #00C2FF 0%, #0066FF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 15px rgba(0, 194, 255, 0.5))'
            }}>
              IA
            </div>

            <span style={{ fontSize: 'var(--neon-font-sign)', fontWeight: 800, color: '#fff', textShadow: '0 0 10px rgba(255,255,255,0.4)' }}>=</span>

            <div style={{
              fontSize: 'var(--neon-font-result)',
              fontWeight: 900,
              color: '#FF5A1F',
              textShadow: '0 0 10px rgba(255, 90, 31, 0.6), 0 0 20px rgba(255, 90, 31, 0.3)',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}>
              MÁS VENTAS
            </div>
          </div>

          <div style={{
            zIndex: 1,
            textAlign: 'center',
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            paddingLeft: '3rem'
          }} className="desktop-only">
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#fff',
              margin: 0,
              lineHeight: '1.4',
              textAlign: 'left'
            }}>
              Tu WhatsApp potenciado con IA,<br/>
              <span style={{ color: 'var(--emerald-400)', fontWeight: 700, textShadow: '0 0 10px rgba(0, 255, 102, 0.3)' }}>
                una máquina de ventas bien lubricada.
              </span>
            </h3>
          </div>
        </div>
      </div>

      {/* 2.5 STEPS TO BOOK MEETING (Estilo FunnelChat) */}
      <section style={{
        width: '100%',
        padding: 'var(--section-padding) 0',
        position: 'relative',
        zIndex: 1,
        background: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.15) 0%, rgba(10, 11, 16, 0) 70%)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 var(--nav-padding-x)', textAlign: 'center' }}>
        <span style={{ 
          fontSize: '0.85rem', 
          fontWeight: 800, 
          color: 'var(--emerald-400)', 
          letterSpacing: '1.5px', 
          textTransform: 'uppercase',
          display: 'block',
          marginBottom: '1rem',
          filter: 'drop-shadow(0 0 10px rgba(0, 255, 102, 0.45))'
        }}>
          Puesta en marcha rápida
        </span>
        <h2 className="display-md" style={{ marginBottom: '1rem', fontWeight: 800 }}>
          Configuración en <span style={{ background: 'linear-gradient(135deg, var(--emerald-400) 0%, #00C2FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>3 simples pasos</span>
        </h2>
        <p style={{ color: 'var(--secondary)', fontSize: '1.1rem', marginBottom: '4rem' }}>
          Llevamos la operación de tu negocio al piloto automático en tiempo récord.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 'var(--hero-gap)',
          position: 'relative',
          alignItems: 'start'
        }} className="grid-auto-responsive">
          {/* Connector Line (visible only on desktop) */}
          <div style={{
            position: 'absolute',
            top: '40px',
            left: '15%',
            right: '15%',
            height: '1px',
            backgroundColor: 'rgba(0, 255, 102, 0.15)',
            zIndex: 0
          }} className="desktop-only"></div>

          {/* Step 1 */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              backgroundColor: 'rgba(0, 255, 102, 0.05)',
              border: '1px solid rgba(0, 255, 102, 0.2)',
              boxShadow: '0 0 20px rgba(0, 255, 102, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--emerald-400)' }}>contact_phone</span>
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: 'var(--emerald-400)',
                color: '#050508',
                fontWeight: 800,
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px rgba(0, 255, 102, 0.6)'
              }}>1</span>
            </div>
            <h4 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Conecta tu WhatsApp</h4>
            <p style={{ color: 'var(--secondary)', fontSize: '0.88rem', lineHeight: '1.6', margin: 0, maxWidth: '280px' }}>
              Vinculamos tu número telefónico comercial a la API oficial en la nube de Meta, resguardando todo tu historial.
            </p>
          </div>

          {/* Step 2 */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              backgroundColor: 'rgba(0, 255, 102, 0.05)',
              border: '1px solid rgba(0, 255, 102, 0.2)',
              boxShadow: '0 0 20px rgba(0, 255, 102, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--emerald-400)' }}>inventory_2</span>
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: 'var(--emerald-400)',
                color: '#050508',
                fontWeight: 800,
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px rgba(0, 255, 102, 0.6)'
              }}>2</span>
            </div>
            <h4 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Carga tu catálogo o agenda</h4>
            <p style={{ color: 'var(--secondary)', fontSize: '0.88rem', lineHeight: '1.6', margin: 0, maxWidth: '280px' }}>
              Configura tus productos, servicios o agenda de citas. Controla la disponibilidad y precios en tiempo real con un clic.
            </p>
          </div>

          {/* Step 3 */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              backgroundColor: 'rgba(0, 255, 102, 0.05)',
              border: '1px solid rgba(0, 255, 102, 0.2)',
              boxShadow: '0 0 20px rgba(0, 255, 102, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--emerald-400)' }}>smart_toy</span>
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: 'var(--emerald-400)',
                color: '#050508',
                fontWeight: 800,
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px rgba(0, 255, 102, 0.6)'
              }}>3</span>
            </div>
            <h4 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Enciende el piloto automático</h4>
            <p style={{ color: 'var(--secondary)', fontSize: '0.88rem', lineHeight: '1.6', margin: 0, maxWidth: '280px' }}>
              La IA responde en segundos, procesa compras y reservas complejas de voz y actualiza tus ventas, citas y CRM automáticamente.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '4rem' }}>
          <button onClick={() => window.open('https://calendar.app.google/bMz6yssC1LsmjMQHA', '_blank')} className="btn-primary" style={{
            border: 'none',
            cursor: 'pointer',
            backgroundColor: 'var(--emerald-400)',
            color: '#050508',
            fontSize: '1rem',
            padding: '1rem 2.5rem',
            borderRadius: '30px',
            fontWeight: 800,
            boxShadow: '0 0 25px rgba(0, 255, 102, 0.35)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            Quiero Probarlo Gratis
            <span className="material-symbols-outlined" style={{ fontSize: '18px', fontWeight: 800 }}>arrow_forward</span>
          </button>
        </div>
        </div>
      </section>


      {/* 3.5 ECOSYSTEM SECTION (FunnelChat inspired connection nodes) */}
      <section className="bg-grid-pattern" style={{
        width: '100%',
        padding: '6rem 0 2rem 0',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Edge Illumination Glows */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `
            radial-gradient(circle at 0% 70%, rgba(0, 194, 255, 0.06) 0%, transparent 50%),
            radial-gradient(circle at 100% 70%, rgba(163, 113, 247, 0.06) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
          zIndex: -1,
          filter: 'blur(50px)'
        }}></div>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '3rem' }}>
          <h2 className="display-md" style={{ marginBottom: '1rem' }}>
            Toda tu operación en un solo <span className="text-gradient" style={{ background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ecosistema</span>
          </h2>
          <p style={{ color: 'var(--secondary)', maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem' }}>
            Desde el mensaje del cliente en WhatsApp hasta el despacho de tu producto o confirmación de cita, coordinado en tiempo real.
          </p>
        </div>

        {/* Central Hub icon with green glow */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4ade80',
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>hub</span>
          </div>
        </div>

        {/* SVG Connecting paths with running particles */}
        <svg className="ecosystem-svg" viewBox="0 0 1000 140">
          <defs>
            <linearGradient id="grad-left" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#00d8f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00d8f6" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="grad-center" x1="500" y1="10" x2="500" y2="140" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#39d353" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="grad-right" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#a371f7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#a371f7" stopOpacity="0.15" />
            </linearGradient>
          </defs>

          {/* Left connection path */}
          <path
            className="connection-path"
            stroke="url(#grad-left)"
            strokeWidth="12"
            fill="none"
            d="M500 10 L500 50 C500 65 485 70 470 70 L190 70 C175 70 166 75 166 90 L166 140"
          />
          {/* Center connection path */}
          <path
            className="connection-path"
            stroke="url(#grad-center)"
            strokeWidth="12"
            fill="none"
            d="M500 10 L500 140"
          />
          {/* Right connection path */}
          <path
            className="connection-path"
            stroke="url(#grad-right)"
            strokeWidth="12"
            fill="none"
            d="M500 10 L500 50 C500 65 515 70 530 70 L810 70 C825 70 834 75 834 90 L834 140"
          />

          {/* Glowing Animated circles flowing along the paths */}
          <circle r="6" fill="#00d8f6" style={{ filter: 'drop-shadow(0 0 15px #00d8f6)' }}>
            <animateMotion dur="4s" repeatCount="indefinite" path="M500 10 L500 50 C500 65 485 70 470 70 L190 70 C175 70 166 75 166 90 L166 140" />
          </circle>
          <circle r="6" fill="#39d353" style={{ filter: 'drop-shadow(0 0 15px #39d353)' }}>
            <animateMotion dur="3s" repeatCount="indefinite" path="M500 10 L500 140" />
          </circle>
          <circle r="6" fill="#a371f7" style={{ filter: 'drop-shadow(0 0 15px #a371f7)' }}>
            <animateMotion dur="4s" repeatCount="indefinite" path="M500 10 L500 50 C500 65 515 70 530 70 L810 70 C825 70 834 75 834 90 L834 140" />
          </circle>
        </svg>

        {/* Dest Cards corresponding to paths */}
        <div className="grid-auto-responsive" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
          marginTop: '1rem',
          textAlign: 'left'
        }}>
          {/* Card 1: CRM de Clientes */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid rgba(0, 216, 246, 0.4)', boxShadow: '0 10px 30px rgba(0, 216, 246, 0.15)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(0, 216, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00d8f6' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>badge</span>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>Fidelización Automática</span>
              <h3 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 800, marginTop: '4px', marginBottom: '8px' }}>CRM de Clientes</h3>
              <p style={{ color: 'var(--secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                Registra automáticamente el nombre, teléfono y preferencias de cada cliente. Brinda una atención VIP personalizada basada en su historial de compras o reservas.
              </p>
            </div>
          </div>

          {/* Card 2: Robotina Central */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid rgba(74, 222, 128, 0.5)', boxShadow: '0 10px 30px rgba(74, 222, 128, 0.15)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(74, 222, 128, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dashboard</span>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>Operación Integrada</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', marginBottom: '8px' }}>
                <h3 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>Robotina Central</h3>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, backgroundColor: 'rgba(255, 90, 31, 0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '20px' }}>PRO</span>
              </div>
              <p style={{ color: 'var(--secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                Visualiza todos tus pedidos, reservas y chats activos en vivo. Toma el control humano de la conversación cuando desees con un solo clic.
              </p>
            </div>
          </div>

          {/* Card 3: Campañas directas */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid rgba(163, 113, 247, 0.4)', boxShadow: '0 10px 30px rgba(163, 113, 247, 0.15)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(163, 113, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a371f7' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>campaign</span>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>Marketing de Difusión</span>
              <h3 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 800, marginTop: '4px', marginBottom: '8px' }}>Campañas Directas</h3>
              <p style={{ color: 'var(--secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                Envía promociones personalizadas, novedades y cupones de descuento masivamente por WhatsApp a tus clientes recurrentes para incentivar la recompra.
              </p>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* 3.8 ADAPTABILITY SECTION */}
      <section style={{
        width: '100%',
        padding: 'var(--section-padding) 0',
        position: 'relative',
        zIndex: 1,
        backgroundColor: '#07070b',
        borderTop: '1px solid rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        overflow: 'hidden'
      }}>
        {/* Glow Effects */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '450px',
          background: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.04) 0%, transparent 65%)',
          zIndex: 0,
          pointerEvents: 'none',
          filter: 'blur(80px)'
        }}></div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 var(--nav-padding-x)', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              color: 'var(--emerald-400)',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '1rem',
              filter: 'drop-shadow(0 0 10px rgba(0, 255, 102, 0.3))'
            }}>
              Flexibilidad Absoluta
            </span>
            <h2 className="display-md" style={{ marginBottom: '1.25rem', fontWeight: 800 }}>
              Robotina se adapta a <span className="text-gradient" style={{ background: 'linear-gradient(135deg, var(--emerald-400) 0%, #00C2FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>cualquier negocio</span>
            </h2>
            <p style={{ color: 'var(--secondary)', maxWidth: '700px', margin: '0 auto', fontSize: '1.15rem', lineHeight: '1.6' }}>
              Si utilizas WhatsApp para comunicarte con tus clientes y vender tus productos o servicios, nuestra Inteligencia Artificial se moldea perfectamente a tu flujo de trabajo.
            </p>
          </div>

          <div className="grid-auto-responsive" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem'
          }}>
            {/* Card 1: E-commerce / Tiendas de Ropa / Retail */}
            <div className="glass-card" style={{
              padding: 'var(--glass-card-padding)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              border: '1px solid rgba(255,255,255,0.05)',
              transition: 'transform 0.3s ease, border-color 0.3s ease',
              cursor: 'default'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = 'rgba(0, 255, 102, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                backgroundColor: 'rgba(0, 194, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00C2FF'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>shopping_bag</span>
              </div>
              <div>
                <h3 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem' }}>E-commerce & Retail</h3>
                <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                  Resuelve dudas sobre tallas, disponibilidad de stock, materiales, costos de envío y cierra el pago automáticamente enviando el link de compra directa.
                </p>
              </div>
            </div>

            {/* Card 2: Agendamiento / Servicios Profesionales / Clínicas */}
            <div className="glass-card" style={{
              padding: 'var(--glass-card-padding)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              border: '1px solid rgba(255,255,255,0.05)',
              transition: 'transform 0.3s ease, border-color 0.3s ease',
              cursor: 'default'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = 'rgba(0, 255, 102, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4ade80'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>calendar_month</span>
              </div>
              <div>
                <h3 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem' }}>Servicios y Citas</h3>
                <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                  Ideal para clínicas médicas, dentales, estéticas, salones de belleza, consultoras y talleres. Habilita el agendamiento inteligente integrado a tu calendario en segundos.
                </p>
              </div>
            </div>

            {/* Card 3: Restaurantes y Gastronomía */}
            <div className="glass-card" style={{
              padding: 'var(--glass-card-padding)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              border: '1px solid rgba(255,255,255,0.05)',
              transition: 'transform 0.3s ease, border-color 0.3s ease',
              cursor: 'default'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = 'rgba(0, 255, 102, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>restaurant</span>
              </div>
              <div>
                <h3 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem' }}>Restaurantes y Delivery</h3>
                <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                  Comparte tu menú, procesa pedidos complejos del carrito, valida zonas de reparto o delivery, confirma métodos de pago e integra todo con tu sistema POS central.
                </p>
              </div>
            </div>

            {/* Card 4: Academias, Inmobiliarias y Más */}
            <div className="glass-card" style={{
              padding: 'var(--glass-card-padding)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              border: '1px solid rgba(255,255,255,0.05)',
              transition: 'transform 0.3s ease, border-color 0.3s ease',
              cursor: 'default'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = 'rgba(0, 255, 102, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                backgroundColor: 'rgba(163, 113, 247, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a371f7'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>domain</span>
              </div>
              <div>
                <h3 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem' }}>Inmobiliarias y Educación</h3>
                <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                  Precalifica prospectos interesados en propiedades de forma automatizada, envía catálogos de departamentos/cursos, recopila datos de contacto y agenda visitas físicas o asesorías.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURES SECTION (SUPERPOWERS) */}
      <section className="bg-grid-pattern" style={{ width: '100%', padding: '6rem 0', position: 'relative', zIndex: 1 }}>
        {/* Unified Ambient Glow */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `
            radial-gradient(circle at 20% 30%, rgba(255, 85, 0, 0.08) 0%, transparent 60%),
            radial-gradient(circle at 80% 70%, rgba(255, 179, 0, 0.06) 0%, transparent 60%),
            radial-gradient(circle at 50% 50%, rgba(255, 85, 0, 0.04) 0%, transparent 80%)
          `,
          pointerEvents: 'none',
          zIndex: -1,
          filter: 'blur(60px)'
        }}></div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
          <h2 className="display-md" style={{ marginBottom: '1rem' }}>
            <span style={{ background: 'linear-gradient(135deg, #FFF 0%, #A0A5B5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Humano vs</span> <span style={{ background: 'linear-gradient(135deg, var(--emerald-400) 0%, #00C2FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Inteligencia Artificial</span>
          </h2>
          <p style={{ color: 'var(--secondary)', maxWidth: '650px', margin: '0 auto', fontSize: '1.1rem', lineHeight: '1.6' }}>
            La diferencia entre perder un cliente por demorar horas en responder, y asegurar la venta en 1 segundo con atención automatizada 24/7.
          </p>
        </div>

        <div className="grid-auto-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--big-card-gap)', position: 'relative' }}>
          
          {/* Tarjeta 1: Humano */}
          <div className="glass-card" style={{ padding: 'var(--glass-card-padding)', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#FF3B30' }}></div>
            <div>
              <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Atención Tradicional (Humano)</h3>
              <p style={{ color: 'var(--secondary)', fontSize: '0.95rem', margin: 0 }}>Demoras, cuellos de botella y ventas que se enfrían.</p>
            </div>
            
            {/* Fake Chat UI */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              {/* Client Bubble */}
              <div style={{ alignSelf: 'flex-end', background: '#22c55e', color: '#fff', padding: '10px 14px', borderRadius: '14px 14px 2px 14px', fontSize: '0.9rem', maxWidth: '85%' }}>
                Hola, me interesa el servicio. ¿Precios?
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: '4px' }}>09:00 AM</div>
              </div>
              
              {/* Agent Typing Bubble */}
              <div style={{ alignSelf: 'flex-start', background: '#2A2C38', color: '#fff', padding: '14px 16px', borderRadius: '14px 14px 14px 2px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', background: 'rgba(255,255,255,0.5)', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></span>
                <span style={{ width: '6px', height: '6px', background: 'rgba(255,255,255,0.5)', borderRadius: '50%', animation: 'pulse 1.5s infinite 0.2s' }}></span>
                <span style={{ width: '6px', height: '6px', background: 'rgba(255,255,255,0.5)', borderRadius: '50%', animation: 'pulse 1.5s infinite 0.4s' }}></span>
              </div>
            </div>

            {/* Status Bar */}
            <div style={{ marginTop: 'auto', background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.2)', padding: '1rem', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ color: '#FF3B30' }}>timer</span>
              <div>
                <div style={{ color: '#FF3B30', fontWeight: 600, fontSize: '0.9rem' }}>Tiempo: 45 min a horas</div>
                <div style={{ color: 'var(--secondary)', fontSize: '0.8rem' }}>El cliente pierde el interés.</div>
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Robotina */}
          <div className="glass-card" style={{ padding: 'var(--glass-card-padding)', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', overflow: 'hidden', borderColor: 'rgba(0, 194, 255, 0.3)', boxShadow: '0 0 30px rgba(0, 194, 255, 0.1)' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(to right, var(--emerald-400), #00C2FF)' }}></div>
            <div>
              <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Con Robotina Central</h3>
              <p style={{ color: 'var(--secondary)', fontSize: '0.95rem', margin: 0 }}>Atención 24/7 y conversiones instantáneas.</p>
            </div>
            
            {/* Fake Chat UI */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              {/* Client Bubble */}
              <div style={{ alignSelf: 'flex-end', background: '#22c55e', color: '#fff', padding: '10px 14px', borderRadius: '14px 14px 2px 14px', fontSize: '0.9rem', maxWidth: '85%' }}>
                Hola, me interesa el servicio. ¿Precios?
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: '4px' }}>09:00 AM</div>
              </div>
              
              {/* Agent Bubble */}
              <div style={{ alignSelf: 'flex-start', background: '#2A2C38', color: '#fff', padding: '12px 16px', borderRadius: '14px 14px 14px 2px', fontSize: '0.9rem', maxWidth: '90%', borderLeft: '3px solid #00C2FF' }}>
                <div style={{ marginBottom: '8px', lineHeight: '1.4' }}>¡Hola! Tenemos planes desde $49 adaptables a ti. Aquí tienes el enlace directo para elegir tu horario de Demo 👇</div>
                
                {/* Fake Link Preview */}
                <div style={{ background: 'rgba(0, 194, 255, 0.1)', border: '1px solid rgba(0, 194, 255, 0.2)', padding: '10px', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: '#00C2FF', fontSize: '20px' }}>calendar_month</span>
                  <div>
                    <div style={{ color: '#00C2FF', fontWeight: 600, fontSize: '0.85rem' }}>Agendar en Calendly</div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>robotinacentral.com</div>
                  </div>
                </div>
                
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>09:00 AM</div>
              </div>
            </div>

            {/* Status Bar */}
            <div style={{ marginTop: 'auto', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '1rem', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--emerald-400)' }}>bolt</span>
              <div>
                <div style={{ color: 'var(--emerald-400)', fontWeight: 600, fontSize: '0.9rem' }}>Tiempo: 1 segundo</div>
                <div style={{ color: 'var(--secondary)', fontSize: '0.8rem' }}>Venta o Cita asegurada.</div>
              </div>
            </div>
          </div>
          
        </div>
        </div>
      </section>

      {/* 4.5 SUPER AGENT SECTION */}
      <section style={{
        width: '100%',
        padding: 'var(--section-padding) 0',
        position: 'relative',
        zIndex: 1,
        background: `
          radial-gradient(circle at 0% 50%, rgba(0, 194, 255, 0.12) 0%, transparent 60%),
          radial-gradient(circle at 100% 50%, rgba(34, 197, 94, 0.15) 0%, transparent 60%),
          radial-gradient(circle at center, rgba(34, 197, 94, 0.05) 0%, transparent 70%)
        `
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 var(--nav-padding-x)' }}>
        <div className="glass-card grid-auto-responsive" style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: 'var(--big-card-gap)',
          alignItems: 'center',
          padding: 'var(--big-card-padding)',
          overflow: 'hidden',
          borderColor: 'rgba(255, 255, 255, 0.05)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
          textAlign: 'left'
        }}>
          
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Sparkle icon */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ 
                color: 'var(--emerald-400)', 
                fontSize: '28px',
                filter: 'drop-shadow(0 0 8px rgba(0, 255, 102, 0.5))' 
              }}>auto_awesome</span>
            </div>

            <div>
              <h2 style={{ fontSize: '2.8rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: '1.15', letterSpacing: '-1px' }}>
                <span style={{
                  background: 'linear-gradient(to right, var(--emerald-400), #00C2FF)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 10px rgba(0, 255, 102, 0.2))'
                }}>IA que entiende</span>, recomienda y vende
              </h2>
              <p style={{ color: 'var(--secondary)', fontSize: '1.1rem', marginTop: '1rem', marginBottom: 0 }}>
                Entrena al bot de tu negocio con tu catálogo, servicios y preguntas frecuentes.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Item 1 */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'start' }}>
                <div style={{ marginTop: '3px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--emerald-400)', fontSize: '22px' }}>description</span>
                </div>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Entrena con tu catálogo de productos y servicios</h4>
                  <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', margin: '4px 0 0 0', lineHeight: '1.5' }}>
                    Sube tu catálogo con variantes, extras y precios. La IA sugerirá adicionales para aumentar tu ticket promedio de venta.
                  </p>
                </div>
              </div>

              {/* Item 2 */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'start' }}>
                <div style={{ marginTop: '3px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--emerald-400)', fontSize: '22px' }}>schedule</span>
                </div>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Responde 24/7 sin demoras</h4>
                  <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', margin: '4px 0 0 0', lineHeight: '1.5' }}>
                    Atiende al instante a cualquier hora. Entiende intenciones complejas, procesa audios de consultas o reservas y deriva a un humano si es necesario.
                  </p>
                </div>
              </div>

              {/* Item 3 */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'start' }}>
                <div style={{ marginTop: '3px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--emerald-400)', fontSize: '22px' }}>database</span>
                </div>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Actualiza tu CRM en tiempo real</h4>
                  <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', margin: '4px 0 0 0', lineHeight: '1.5' }}>
                    Guarda el nombre del cliente, dirección o datos frecuentes, teléfono e historial de compras de forma automática.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ 
            position: 'relative', 
            borderRadius: '20px', 
            overflow: 'hidden', 
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            width: '100%',
            height: 'var(--image-box-height)',
            backgroundColor: '#0c0d14'
          }}>
            <img 
              src="/whatsapp_automation_conveyor.png" 
              alt="WhatsApp Automatización Industrial" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>

        </div>
        </div>
      </section>


      {/* 5.3 INTERACTIVE GLOBE SECTION */}
      <section
        ref={globeSectionRef}
        style={{
          width: '100%',
          padding: '6rem 0 2rem 0',
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          background: 'radial-gradient(ellipse at right center, rgba(34, 197, 94, 0.15) 0%, transparent 50%), radial-gradient(ellipse at left center, rgba(79, 70, 229, 0.15) 0%, transparent 50%)'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 className="display-md" style={{ marginBottom: '1rem', fontWeight: 800 }}>
            Nuestra <span className="text-gradient" style={{ background: 'linear-gradient(135deg, var(--emerald-400) 0%, #00C2FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>disponibilidad</span> internacional
          </h2>
          <p style={{ color: 'var(--secondary)', maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem', lineHeight: '1.6' }}>
            Operamos y habilitamos la IA de Robotina Central en toda América Latina. Actualmente con soporte activo y encendido en Perú y Argentina.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', overflow: 'hidden' }}>
          {globeVisible && <InteractiveGlobe />}
        </div>
        </div>
      </section>

      {/* 5.5 GUARANTEE / PITCH SECTION */}
      <section style={{
        width: '100%',
        padding: 'var(--section-padding) 0',
        position: 'relative',
        zIndex: 1,
        background: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.15) 0%, rgba(10, 11, 16, 0) 70%)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 var(--nav-padding-x)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 className="display-md" style={{ marginBottom: '1.5rem', lineHeight: '1.2', fontWeight: 800 }}>
            <span style={{ color: '#fff' }}>Cero Riesgos. </span><br/>
            <span style={{ color: '#4ade80' }}>Resultados Garantizados.</span>
          </h2>
          <p style={{ color: 'var(--secondary)', fontSize: '1.15rem', maxWidth: '750px', margin: '0 auto', lineHeight: '1.6' }}>
            Prueba Robotina Central por 14 días. Si la plataforma no agiliza tus ventas o simplemente no es lo que esperabas, te devolvemos cada centavo de tu inversión inicial. Sin preguntas incómodas.
          </p>
        </div>

        <div className="glass-card grid-auto-responsive" style={{
          padding: 'var(--big-card-padding)',
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: 'var(--big-card-gap)',
          alignItems: 'center',
          borderColor: 'rgba(34, 197, 94, 0.25)',
          boxShadow: '0 20px 50px rgba(34, 197, 94, 0.1)',
          background: 'linear-gradient(145deg, rgba(34, 197, 94, 0.05) 0%, rgba(10, 11, 16, 0.8) 100%)'
        }}>
          
          {/* Left: Guarantee Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', textAlign: 'left' }}>
            
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: 'rgba(74, 222, 128, 0.15)',
              color: '#4ade80',
              fontSize: '0.8rem',
              fontWeight: 800,
              width: 'fit-content'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>verified_user</span>
              Protección Total del Comprador
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'start' }}>
                <span className="material-symbols-outlined" style={{ color: '#4ade80', fontSize: '24px', marginTop: '2px' }}>task_alt</span>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px 0' }}>Sin Riesgo Inicial</h4>
                  <p style={{ color: 'var(--secondary)', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>Tu inversión de configuración y el primer mes están 100% protegidos por nuestra garantía de satisfacción.</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '16px', alignItems: 'start' }}>
                <span className="material-symbols-outlined" style={{ color: '#4ade80', fontSize: '24px', marginTop: '2px' }}>event_available</span>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px 0' }}>14 Días de Prueba Real</h4>
                  <p style={{ color: 'var(--secondary)', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>Tiempo suficiente para ver a tu bot agendando citas, respondiendo audios y cerrando ventas en piloto automático.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'start' }}>
                <span className="material-symbols-outlined" style={{ color: '#4ade80', fontSize: '24px', marginTop: '2px' }}>currency_exchange</span>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px 0' }}>Reembolso en 24 Horas</h4>
                  <p style={{ color: 'var(--secondary)', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>Si decides cancelar, te devolvemos tu dinero directo a tu cuenta el mismo día. Sin peros, sin trabas.</p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <button onClick={() => { setIsBookingOpen(true); setBookingStep(0); }} className="btn-primary" style={{
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'none',
                borderRadius: '30px',
                padding: '0.85rem 1.8rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)',
                backgroundColor: '#22c55e',
                display: 'inline-block'
              }}>
                Agendar Demo Ahora
              </button>
              <div style={{ color: 'var(--secondary)', fontSize: '0.8rem', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span> Tu inversión está segura.
              </div>
            </div>

          </div>

          {/* Right: Guarantee Badge / Seal */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="guarantee-badge-container" style={{
              width: '100%',
              maxWidth: '350px',
              aspectRatio: '1',
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              cursor: 'pointer',
              transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <style>{`
                @keyframes auraPulse {
                  0% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.4; filter: blur(40px); }
                  50% { transform: translate(-50%, -50%) scale(1.05); opacity: 0.7; filter: blur(50px); }
                  100% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.4; filter: blur(40px); }
                }
                @keyframes dashRotate {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
              
              {/* Latent Aura Background */}
              <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                width: '110%', height: '110%',
                background: 'radial-gradient(circle at center, rgba(34,197,94,0.3) 0%, transparent 70%)',
                animation: 'auraPulse 4s infinite ease-in-out',
                zIndex: 0,
                pointerEvents: 'none'
              }}></div>

              {/* Outer dashed ring */}
              <div style={{
                position: 'absolute',
                top: '10%', left: '10%', right: '10%', bottom: '10%',
                border: '2px dashed rgba(34, 197, 94, 0.3)',
                borderRadius: '50%',
                animation: 'dashRotate 30s infinite linear',
                zIndex: 1
              }}></div>
              
              {/* Inner Badge */}
              <div style={{
                width: '65%',
                height: '65%',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                boxShadow: '0 0 40px rgba(34, 197, 94, 0.5), inset 0 0 20px rgba(255,255,255,0.2)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#fff',
                textAlign: 'center',
                border: '4px solid rgba(255,255,255,0.1)',
                zIndex: 2,
                transition: 'box-shadow 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 60px rgba(34, 197, 94, 0.8), inset 0 0 30px rgba(255,255,255,0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 40px rgba(34, 197, 94, 0.5), inset 0 0 20px rgba(255,255,255,0.2)'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '4px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>workspace_premium</span>
                <span style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: '1', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>100%</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.9 }}>Garantizado</span>
              </div>
            </div>
          </div>

        </div>
        </div>
      </section>

      {/* 5.8 METRICS SECTION */}
      <section style={{
        width: '100%',
        padding: '6rem 0',
        position: 'relative',
        zIndex: 1,
        backgroundColor: '#0a0a0a',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 className="display-md" style={{ marginBottom: '1rem', fontWeight: 800 }}>
              No prometemos. <span style={{ background: 'linear-gradient(135deg, var(--emerald-400) 0%, #00C2FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Demostramos con datos.</span>
            </h2>
            <p style={{ color: 'var(--secondary)', fontSize: '1.15rem', maxWidth: '700px', margin: '0 auto', lineHeight: '1.6' }}>
              Este es el impacto promedio que nuestros clientes experimentan durante el primer mes de integrar Robotina Central en su canal de WhatsApp.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            {/* Metric 1: Circular Progress */}
            <div className="glass-card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{
                position: 'relative', width: '120px', height: '120px', borderRadius: '50%',
                background: 'conic-gradient(var(--emerald-400) 0% 99%, rgba(255,255,255,0.1) 99% 100%)',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                boxShadow: '0 0 30px rgba(34,197,94,0.2)'
              }}>
                <div style={{ width: '104px', height: '104px', borderRadius: '50%', backgroundColor: '#0c0d14', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                  <span style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>99%</span>
                  <span style={{ color: 'var(--emerald-400)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>en &lt; 3s</span>
                </div>
              </div>
              <div>
                <h4 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Respuesta Inmediata</h4>
                <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>Tus clientes jamás sentirán que hablan con una pared. La IA atiende de inmediato las 24 horas.</p>
              </div>
            </div>

            {/* Metric 2: Trend Line Chart */}
            <div className="glass-card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ width: '100%', height: '120px', position: 'relative', display: 'flex', alignItems: 'flex-end', paddingBottom: '10px' }}>
                <svg viewBox="0 0 100 40" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  <path d="M 0 35 Q 20 35, 30 25 T 60 15 T 100 5" fill="none" stroke="var(--primary)" strokeWidth="3" filter="drop-shadow(0 4px 6px rgba(255, 85, 0, 0.4))" strokeLinecap="round" />
                  <circle cx="100" cy="5" r="4" fill="#fff" stroke="var(--primary)" strokeWidth="2" />
                </svg>
                <div style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(255, 85, 0, 0.15)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800 }}>
                  +45%
                </div>
              </div>
              <div>
                <h4 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Aumento en Conversión</h4>
                <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>Al eliminar las esperas y ofrecer pagos o reservas directas, tus probabilidades de cierre se disparan.</p>
              </div>
            </div>

            {/* Metric 3: Bar Chart Comparison */}
            <div className="glass-card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '1.5rem', height: '120px', width: '100%' }}>
                {/* Human Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#FF3B30', fontSize: '0.75rem', fontWeight: 700 }}>35 hrs</span>
                  <div style={{ width: '40px', height: '90px', background: 'rgba(255, 59, 48, 0.2)', borderTop: '2px solid #FF3B30', borderRadius: '4px 4px 0 0' }}></div>
                  <span style={{ color: 'var(--secondary)', fontSize: '0.7rem' }}>Humano</span>
                </div>
                {/* Bot Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#00C2FF', fontSize: '0.75rem', fontWeight: 700 }}>5 hrs</span>
                  <div style={{ width: '40px', height: '20px', background: 'rgba(0, 194, 255, 0.2)', borderTop: '2px solid #00C2FF', borderRadius: '4px 4px 0 0', boxShadow: '0 -5px 15px rgba(0, 194, 255, 0.3)' }}></div>
                  <span style={{ color: 'var(--secondary)', fontSize: '0.7rem' }}>Robotina</span>
                </div>
              </div>
              <div>
                <h4 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>30+ Horas Salvadas</h4>
                <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>Delega la fase repetitiva. Tu equipo humano entra solo para cerrar tratos o casos especiales.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. PRICING SECTION */}
      <section id="pricing" className="bg-grid-pattern" style={{ width: '100%', padding: 'var(--section-padding) 0', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 var(--nav-padding-x)' }}>
          <div className="reveal-fade-up" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 className="display-md" style={{ marginBottom: '1rem', fontWeight: 800 }}>
              Deja de pagar comisiones por <span className="text-gradient">cada venta</span>
            </h2>
            <p style={{ color: 'var(--secondary)', maxWidth: '600px', margin: '0 auto', fontSize: '1.15rem' }}>
              Consolida WhatsApp, IA Conversacional, catálogo interactivo y CRM en una única suscripción fija.
            </p>

            {/* Currency Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginTop: '2.5rem',
              marginBottom: '1rem'
            }}>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: currency === 'USD' ? '#fff' : 'var(--secondary)',
                transition: 'color 0.3s ease'
              }}>
                Dólares (USD)
              </span>
              <button
                onClick={() => setCurrency(prev => prev === 'USD' ? 'PEN' : 'USD')}
                style={{
                  width: '56px',
                  height: '28px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  position: 'relative',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background-color 0.3s ease'
                }}
                aria-label="Cambiar moneda"
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--emerald-400)',
                  position: 'absolute',
                  left: currency === 'USD' ? '4px' : '30px',
                  transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)'
                }} />
              </button>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: currency === 'PEN' ? '#fff' : 'var(--secondary)',
                transition: 'color 0.3s ease'
              }}>
                Soles (PEN)
              </span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              Sin contratos ocultos. Cancela cuando quieras.
            </p>
          </div>

          <div className="grid-auto-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', alignItems: 'stretch' }}>
            {/* PLAN NORMAL */}
            <div className="pricing-card reveal-fade-up delay-200" style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              position: 'relative'
            }}>
              <div>
                <div style={{ color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', letterSpacing: '0.05em' }}>Mensual</div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                  <span className="text-gradient">Plan Completo</span>
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '0.25rem' }}>
                  <span className="price-amount" style={{ fontSize: '3rem', fontWeight: 800, color: 'white' }}>
                    {currency === 'USD' ? '$49' : 'S/. 180'}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--secondary)' }}>{currency === 'USD' ? 'USD' : 'PEN'}/mes</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '1.5rem' }}>
                  + {currency === 'USD' ? '$29' : 'S/. 110'} Setup (Único)
                </div>
                
                <p style={{ color: 'var(--secondary)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '2rem', minHeight: '60px' }}>
                  Todo lo que necesitas para automatizar tus ventas, responder consultas y gestionar tu negocio con IA desde WhatsApp.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e9edef', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--emerald-400)', fontSize: '18px' }}>check_circle</span>
                    <span>Catálogo Digital Interactivo Avanzado</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e9edef', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--emerald-400)', fontSize: '18px' }}>check_circle</span>
                    <span>Agente de Inteligencia Artificial Conversacional</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e9edef', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--emerald-400)', fontSize: '18px' }}>check_circle</span>
                    <span>Dashboard CRM en tiempo real</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e9edef', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--emerald-400)', fontSize: '18px' }}>check_circle</span>
                    <span>Gestión inteligente de disponibilidad y pagos</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e9edef', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--emerald-400)', fontSize: '18px' }}>check_circle</span>
                    <span>1 Número de WhatsApp Business</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e9edef', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--emerald-400)', fontSize: '18px' }}>check_circle</span>
                    <span>Contactos ilimitados</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e9edef', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--emerald-400)', fontSize: '18px' }}>check_circle</span>
                    <span>Soporte de audios de WhatsApp (Whisper)</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e9edef', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--emerald-400)', fontSize: '18px' }}>check_circle</span>
                    <span>0% de comisiones por tus ventas</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => { setIsBookingOpen(true); setBookingStep(0); }}
                className="btn-secondary"
                style={{
                  textAlign: 'center',
                  textDecoration: 'none',
                  padding: '0.8rem',
                  borderRadius: '30px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'block',
                  width: '100%',
                  backgroundColor: 'transparent',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
              >
                Iniciar Prueba de 14 Días
              </button>
            </div>

            {/* PLAN MULTISUCURSAL */}
            <div className="pricing-card popular reveal-fade-up delay-250" style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              position: 'relative',
              border: '2px solid #22c55e',
              boxShadow: '0 0 35px rgba(34, 197, 94, 0.15)',
              backgroundColor: 'rgba(10, 10, 10, 0.8)'
            }}>
              <div>
                <div style={{
                  position: 'absolute', top: '15px', right: '15px',
                  backgroundColor: '#22c55e', color: '#000',
                  padding: '4px 12px', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase'
                }}>
                  Más Popular
                </div>
                <div style={{ color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', letterSpacing: '0.05em' }}>Mensual</div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                  <span className="text-gradient">Multisucursal</span>
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '0.25rem' }}>
                  <span className="price-amount" style={{ fontSize: '3rem', fontWeight: 800, color: 'white' }}>
                    {currency === 'USD' ? '$99' : 'S/. 370'}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--secondary)' }}>{currency === 'USD' ? 'USD' : 'PEN'}/mes</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '1.5rem' }}>
                  + {currency === 'USD' ? '$79' : 'S/. 290'} Setup (Único)
                </div>
                
                <p style={{ color: 'var(--secondary)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '2rem', minHeight: '60px' }}>
                  Diseñado para negocios con múltiples locales físicos o marcas que necesitan gestionar varios catálogos.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e9edef', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--emerald-400)', fontSize: '18px' }}>check_circle</span>
                    <span style={{ fontWeight: 600 }}>Todo lo incluido en el Plan Completo</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e9edef', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--emerald-400)', fontSize: '18px' }}>check_circle</span>
                    <span>Gestión de múltiples sucursales</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e9edef', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--emerald-400)', fontSize: '18px' }}>check_circle</span>
                    <span>Catálogos independientes por tienda</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e9edef', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--emerald-400)', fontSize: '18px' }}>check_circle</span>
                    <span>Dashboard CRM unificado y por sucursal</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e9edef', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--emerald-400)', fontSize: '18px' }}>check_circle</span>
                    <span>Múltiples operadores en panel (Ilimitado)</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e9edef', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--emerald-400)', fontSize: '18px' }}>check_circle</span>
                    <span>Soporte prioritario</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => { setIsBookingOpen(true); setBookingStep(0); }}
                className="btn-primary"
                style={{
                  textAlign: 'center',
                  textDecoration: 'none',
                  padding: '1rem',
                  borderRadius: '30px',
                  fontSize: '1rem',
                  fontWeight: 800,
                  display: 'block',
                  width: '100%',
                  boxShadow: '0 10px 25px rgba(34, 197, 94, 0.25)',
                  transition: 'all 0.3s ease',
                  backgroundColor: '#22c55e',
                  color: '#000',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Iniciar Prueba de 14 Días
              </button>
            </div>

            {/* PLAN PERSONALIZADO */}
            <div className="pricing-card reveal-fade-up delay-400" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', position: 'relative' }}>
              <div>
                <div style={{ color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', letterSpacing: '0.05em' }}>A medida</div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                  <span style={{ background: 'linear-gradient(135deg, #FF007A 0%, #7928CA 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Personalizado</span>
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '0.25rem' }}>
                  <span className="price-amount" style={{ fontSize: '3rem', fontWeight: 800, color: 'white' }}>
                    A convenir
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '1.5rem' }}>
                  Setup Adaptado al Proyecto
                </div>
                
                <p style={{ color: 'var(--secondary)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '2rem', minHeight: '60px' }}>
                  Soluciones a la medida para franquicias o empresas corporativas con requerimientos de integración CRM, ERP o POS.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e9edef', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '18px' }}>workspace_premium</span>
                    <span style={{ fontWeight: 600 }}>Características Advanced incluidas</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e9edef', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '18px' }}>calendar_today</span>
                    <span>Planes Semestrales y Anuales con descuento</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e9edef', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '18px' }}>forum</span>
                    <span>Consultorías estratégicas de automatización 1 a 1</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e9edef', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '18px' }}>flash_on</span>
                    <span>Activación multi-sucursales dedicada</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e9edef', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '18px' }}>settings_suggest</span>
                    <span>Integración de APIs, Webhooks y ERP custom</span>
                  </div>
                </div>
              </div>

              <a 
                href={`https://wa.me/${DEMO_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola, me interesa solicitar una cotización personalizada para el Plan Personalizado de Robotina-Central.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{
                  textAlign: 'center',
                  textDecoration: 'none',
                  padding: '0.8rem',
                  borderRadius: '30px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'block',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease'
                }}
              >
                Contactar con Ventas
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* 7. FAQ SECTION */}
      <section style={{
        backgroundColor: 'var(--surface-container-low)',
        padding: 'var(--section-padding) var(--nav-padding-x)',
        borderTop: '1px solid rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.03)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span style={{ 
              fontSize: '0.85rem', 
              fontWeight: 800, 
              color: 'var(--emerald-400)', 
              letterSpacing: '1.5px', 
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '1rem',
              filter: 'drop-shadow(0 0 10px rgba(0, 255, 102, 0.45))'
            }}>
              Resolviendo Dudas
            </span>
            <h2 className="display-md" style={{ fontWeight: 900, marginBottom: '1rem', letterSpacing: '-1px' }}>
              Preguntas <span style={{ background: 'linear-gradient(135deg, var(--emerald-400) 0%, #00C2FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Frecuentes</span>
            </h2>
            <p style={{ color: 'var(--secondary)', fontSize: '0.95rem' }}>
              Respuestas rápidas sobre el bot de WhatsApp y nuestro ecosistema.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} style={{
                  backgroundColor: 'var(--surface-container)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}>
                  <button 
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '1.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      textAlign: 'left',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '1rem'
                    }}
                  >
                    <span>{faq.q}</span>
                    <span className="material-symbols-outlined" style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease',
                      color: 'var(--primary)'
                    }}>
                      keyboard_arrow_down
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{
                      padding: '0 1.5rem 1.5rem 1.5rem',
                      color: 'var(--secondary)',
                      fontSize: '0.9rem',
                      lineHeight: '1.6',
                      animation: 'fadeIn 0.2s ease'
                    }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. SECCIÓN DE CONTACTO */}
      <section id="contacto" style={{
        backgroundColor: 'transparent',
        padding: 'var(--section-padding) var(--nav-padding-x)',
        borderTop: '1px solid rgba(255,255,255,0.03)',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span style={{ 
              fontSize: '0.85rem', 
              fontWeight: 800, 
              color: 'var(--emerald-400)', 
              letterSpacing: '1.5px', 
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '1rem',
              filter: 'drop-shadow(0 0 10px rgba(0, 255, 102, 0.45))'
            }}>
              Ponte en Contacto
            </span>
            <h2 className="display-md" style={{ fontWeight: 900, marginBottom: '1rem', letterSpacing: '-1px' }}>
              ¿Tienes dudas? <span style={{ background: 'linear-gradient(135deg, var(--emerald-400) 0%, #00C2FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Escríbenos</span>
            </h2>
            <p style={{ color: 'var(--secondary)', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto' }}>
              Nuestro equipo comercial y de soporte técnico está disponible para ayudarte a automatizar tu canal de WhatsApp.
            </p>
          </div>

          <div className="grid-auto-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--big-card-gap)', alignItems: 'start' }}>
            {/* Datos de Contacto */}
            <div className="glass-card" style={{ padding: 'var(--glass-card-padding)', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <h3 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>Información de Contacto</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(0, 255, 102, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-400)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>mail</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Correo Electrónico</div>
                    <a href={`mailto:${BUSINESS_EMAIL}`} style={{ color: '#fff', fontSize: '0.95rem', textDecoration: 'none', fontWeight: 600 }}>{BUSINESS_EMAIL}</a>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(0, 255, 102, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-400)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>call</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', textTransform: 'uppercase', fontWeight: 700 }}>WhatsApp Comercial</div>
                    <a href={`https://wa.me/${DEMO_WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', fontSize: '0.95rem', textDecoration: 'none', fontWeight: 600 }}>+54 9 11 6599-4057</a>
                  </div>
                </div>


              </div>
            </div>

            {/* Contact CTA */}
            <div className="glass-card" style={{ padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '1.5rem', background: 'linear-gradient(145deg, rgba(34, 197, 94, 0.05) 0%, rgba(10, 11, 16, 0.8) 100%)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(0, 255, 102, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-400)', filter: 'drop-shadow(0 0 15px rgba(0,255,102,0.4))' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>forum</span>
              </div>
              <div>
                <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Habla con Robotina</h3>
                <p style={{ color: 'var(--secondary)', fontSize: '0.95rem', margin: 0, lineHeight: '1.5', maxWidth: '300px' }}>
                  Deja de enviar correos que nadie lee. Pruébalo tú mismo enviándole un mensaje a nuestro bot oficial.
                </p>
              </div>
              <a 
                href={`https://wa.me/${DEMO_WHATSAPP_NUMBER}?text=Hola,%20tengo%20unas%20dudas%20antes%20de%20empezar%20con%20Robotina.`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{
                  padding: '1rem 2rem',
                  borderRadius: '30px',
                  backgroundColor: 'var(--emerald-400)',
                  color: '#000',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 10px 25px rgba(34, 197, 94, 0.3)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chat</span>
                Chatear Ahora
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer style={{
        padding: '3rem 2rem',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.03)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }} className="justify-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-icon" style={{ width: '28px', height: '28px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: '#fff' }}>terminal</span>
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Robotina Central</span>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link 
              to="/terms" 
              style={{ color: 'var(--secondary)', fontSize: '0.8rem', textDecoration: 'none', transition: 'color 0.3s' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--emerald-400)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--secondary)'}
            >
              Términos y Condiciones
            </Link>
            <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '0.8rem' }}>|</span>
            <Link 
              to="/privacy" 
              style={{ color: 'var(--secondary)', fontSize: '0.8rem', textDecoration: 'none', transition: 'color 0.3s' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--emerald-400)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--secondary)'}
            >
              Política de Privacidad
            </Link>
            <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '0.8rem' }}>|</span>
            <span 
              onClick={() => setShowLegalDropdown(!showLegalDropdown)}
              style={{ 
                color: 'var(--secondary)', 
                fontSize: '0.8rem', 
                cursor: 'pointer', 
                transition: 'color 0.3s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--emerald-400)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--secondary)'}
            >
              Información de Registro
              <span className="material-symbols-outlined" style={{ fontSize: '14px', transition: 'transform 0.2s', transform: showLegalDropdown ? 'rotate(180deg)' : 'none' }}>expand_more</span>
            </span>
          </div>

          <p style={{ color: 'var(--secondary)', fontSize: '0.8rem' }}>
            © {new Date().getFullYear()} Robotina-Central. Todos los derechos reservados.
          </p>
        </div>

        {showLegalDropdown && (
          <div style={{
            margin: '1.5rem auto 0 auto',
            maxWidth: '400px',
            padding: '1rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            fontSize: '0.78rem',
            color: 'var(--secondary)',
            animation: 'fadeIn 0.2s ease',
            lineHeight: '1.6',
            textAlign: 'center',
            backdropFilter: 'blur(8px)'
          }}>
            <strong>Razón Social:</strong> {LEGAL_NAME}<br />
            <strong>RUC:</strong> {LEGAL_RUC}<br />
            <strong>Jurisdicción:</strong> Lima, Perú
          </div>
        )}
      </footer>

      {/* BOOKING MODAL */}
      {isBookingOpen && (
        <div 
          onClick={() => setIsBookingOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(5, 5, 8, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-card" style={{
            maxWidth: '520px',
            width: '100%',
            padding: 'var(--glass-card-padding)',
            position: 'relative',
            border: '1px solid rgba(0, 255, 102, 0.25)',
            boxShadow: '0 25px 50px rgba(0, 255, 102, 0.15), 0 0 100px rgba(0, 255, 102, 0.05)',
            transform: 'none', // Override standard translateY hover transform
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            textAlign: 'left',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Close Button */}
            <button onClick={() => setIsBookingOpen(false)} style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>close</span>
            </button>

            {bookingStep === 0 ? (
              <>
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(0, 255, 102, 0.1)',
                    color: 'var(--emerald-400)',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    marginBottom: '0.75rem',
                    filter: 'drop-shadow(0 0 8px rgba(0, 255, 102, 0.3))'
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>video_chat</span>
                    Perfilado de Negocio
                  </div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, lineHeight: '1.3' }}>
                    Agenda tu <span className="text-gradient">Demostración</span>
                  </h3>
                  <p style={{ color: 'var(--secondary)', fontSize: '0.85rem', margin: '0.35rem 0 0 0', lineHeight: '1.4' }}>
                    Completa la información de tu negocio para habilitar tu enlace de reserva en Google Calendar.
                  </p>
                </div>

                <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>Nombre Completo</label>
                    <input 
                      type="text" 
                      name="name"
                      autoComplete="name"
                      value={bookingName}
                      onChange={(e) => setBookingName(e.target.value)}
                      placeholder="Ej. Juan Pérez" 
                      required
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '0.75rem 1rem',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        transition: 'border-color 0.3s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--emerald-400)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>WhatsApp</label>
                    <input 
                      type="tel" 
                      name="tel"
                      autoComplete="tel"
                      value={bookingPhone}
                      onChange={(e) => setBookingPhone(e.target.value)}
                      placeholder="Ej. +34 600 000 000" 
                      required
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '0.75rem 1rem',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        transition: 'border-color 0.3s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--emerald-400)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                    />
                    <span style={{ color: 'var(--secondary)', fontSize: '0.72rem', marginTop: '2px', lineHeight: '1.3' }}>
                      Un asesor se pondrá en contacto contigo por esta vía para coordinar la sesión.
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>¿A qué te dedicas?</label>
                    <input
                      type="text"
                      placeholder="Ej: Venta de perfumes, Restaurante, Abogado..."
                      value={bookingSegment}
                      onChange={(e) => setBookingSegment(e.target.value)}
                      required
                      style={{
                        backgroundColor: '#0c0d14',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '0.75rem 1rem',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        transition: 'border-color 0.3s',
                        width: '100%',
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--emerald-400)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>Volumen aproximado de mensajes mensuales por WhatsApp</label>
                    <select
                      value={bookingVolume}
                      onChange={(e) => setBookingVolume(e.target.value)}
                      required
                      style={{
                        backgroundColor: '#0c0d14',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '0.75rem 1rem',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        transition: 'border-color 0.3s',
                        width: '100%',
                        cursor: 'pointer'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--emerald-400)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                    >
                      <option value="" disabled style={{ backgroundColor: '#0f1016', color: 'rgba(255,255,255,0.4)' }}>Selecciona una opción...</option>
                      <option value="Menos de 500 mensajes/mes" style={{ backgroundColor: '#0f1016', color: '#fff' }}>Menos de 500 mensajes/mes</option>
                      <option value="Entre 500 y 2,000 mensajes/mes" style={{ backgroundColor: '#0f1016', color: '#fff' }}>Entre 500 y 2,000 mensajes/mes</option>
                      <option value="Entre 2,000 y 5,000 mensajes/mes" style={{ backgroundColor: '#0f1016', color: '#fff' }}>Entre 2,000 y 5,000 mensajes/mes</option>
                      <option value="Más de 5,000 mensajes/mes" style={{ backgroundColor: '#0f1016', color: '#fff' }}>Más de 5,000 mensajes/mes</option>
                    </select>
                  </div>



                  <button type="submit" className="btn-primary" style={{
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: 'var(--emerald-400)',
                    color: '#050508',
                    fontSize: '0.95rem',
                    padding: '0.9rem 2rem',
                    borderRadius: '30px',
                    fontWeight: 800,
                    boxShadow: '0 0 20px rgba(0, 255, 102, 0.3)',
                    marginTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    Siguiente Paso
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', fontWeight: 800 }}>arrow_forward</span>
                  </button>
                </form>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem', padding: '1rem 0' }}>
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 255, 102, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--emerald-400)',
                  boxShadow: '0 0 30px rgba(0, 255, 102, 0.2)'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', fontWeight: 800 }}>check_circle</span>
                </div>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px 0' }}>¡Todo Listo, {bookingName}!</h4>
                  <p style={{ color: 'var(--secondary)', fontSize: '0.88rem', margin: 0, lineHeight: '1.5' }}>
                    Tu perfil de negocio ha sido registrado con éxito. Ahora selecciona la fecha y hora de tu videollamada demo 1-a-1 en Google Calendar.
                  </p>
                </div>
                <button onClick={handleConfirmBooking} className="btn-primary" style={{
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: 'var(--emerald-400)',
                  color: '#050508',
                  fontSize: '0.95rem',
                  padding: '1rem 2rem',
                  borderRadius: '30px',
                  fontWeight: 800,
                  boxShadow: '0 0 25px rgba(0, 255, 102, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  width: '100%',
                  marginTop: '0.5rem'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', fontWeight: 800 }}>calendar_today</span>
                  Seleccionar Día y Hora
                </button>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', margin: 0 }}>
                  * Al hacer clic, se abrirá tu Google Calendar en una pestaña nueva para elegir la fecha y hora.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating WhatsApp Button */}
      <a 
        href={`https://wa.me/${DEMO_WHATSAPP_NUMBER}?text=Hola! Me gustaría saber más sobre Robotina Central.`} 
        target="_blank" 
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '60px',
          height: '60px',
          backgroundColor: '#25D366',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)',
          zIndex: 9999,
          cursor: 'pointer',
          textDecoration: 'none',
          transition: 'transform 0.3s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <svg viewBox="0 0 24 24" width="35" height="35" fill="currentColor">
          <path d="M12.012 2C6.48 2 2 6.48 2 12.012c0 1.764.456 3.48 1.332 5.004L2 22l5.124-1.344c1.476.804 3.132 1.224 4.888 1.224 5.532 0 10.012-4.48 10.012-10.012C22.024 6.48 17.544 2 12.012 2zm0 18.36c-1.572 0-3.12-.42-4.488-1.212l-.324-.192-3.036.796.812-2.952-.212-.336c-.864-1.38-1.32-2.988-1.32-4.656 0-4.668 3.804-8.472 8.472-8.472 4.668 0 8.472 3.804 8.472 8.472 0 4.668-3.804 8.472-8.472 8.472zm4.62-6.312c-.252-.12-1.488-.732-1.716-.816-.228-.084-.396-.12-.564.12-.168.252-.648.816-.792.984-.144.168-.288.192-.54.072-.252-.12-1.068-.396-2.028-1.26-.744-.66-1.248-1.476-1.392-1.728-.144-.252-.016-.388.11-.512.112-.112.252-.288.376-.432.126-.144.168-.24.252-.4.084-.168.042-.312-.021-.432-.063-.12-.564-1.356-.774-1.86-.204-.492-.408-.426-.564-.432-.144-.006-.312-.006-.48-.006-.168 0-.444.063-.672.312-.228.252-.876.852-.876 2.076s.888 2.4 1.02 2.58c.132.18 1.776 2.712 4.3 3.804.6.258 1.068.414 1.428.528.606.192 1.158.168 1.596.102.486-.072 1.488-.606 1.692-1.188.204-.582.204-1.08.144-1.188-.06-.108-.228-.168-.48-.288z"/>
        </svg>
      </a>
    </div>
  );
}
