import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

interface Chat {
  id: string;
  phone_number: string;
  contact_name: string;
  last_message_at: string;
  unread_count: number;
  is_bot_active: boolean;
  is_pinned?: boolean;
  is_discarded?: boolean;
}

interface Message {
  id: string;
  chat_id: string;
  direction: 'inbound' | 'outbound';
  message_body: string;
  created_at: string;
  status: string;
  media_url?: string;
  media_type?: string;
}

const compressImage = (file: File, maxWidth = 1200): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.75);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const renderFormattedMessage = (text: string) => {
  if (!text) return '';
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return <strong key={index}>{part.slice(1, -1)}</strong>;
    }
    return part;
  });
};

export default function WhatsApp() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState<{ url: string, type: string, name: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const phoneToSelect = searchParams.get('phone');
  
  const [searchTerm, setSearchTerm] = useState('');

  const toggleHighlight = async (e: React.MouseEvent, chatId: string, currentPinned: boolean) => {
    e.stopPropagation();
    
    // Optimistic update
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, is_pinned: !currentPinned } : c));
    
    // Update Supabase
    const { error } = await supabase
      .from('whatsapp_chats')
      .update({ is_pinned: !currentPinned })
      .eq('id', chatId);
      
    if (error) {
      console.error('Error toggling pin:', error);
      // Revert optimistic update
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, is_pinned: currentPinned } : c));
    }
  };

  const toggleDiscard = async (e: React.MouseEvent, chatId: string, currentDiscarded: boolean) => {
    e.stopPropagation();
    
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, is_discarded: !currentDiscarded } : c));
    
    const { error } = await supabase
      .from('whatsapp_chats')
      .update({ is_discarded: !currentDiscarded })
      .eq('id', chatId);
      
    if (error) {
      console.error('Error toggling discard:', error);
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, is_discarded: currentDiscarded } : c));
    }
  };

  const activeChat = chats.find(c => c.id === activeChatId);
  const isHumanControlled = activeChat ? !activeChat.is_bot_active : false;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch initial chats
  useEffect(() => {
    fetchChats();
    
    // SuscripciÃ³n de Realtime a nuevos chats
    const chatSubscription = supabase
      .channel('dashboard-whatsapp-chats-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_chats' }, () => {
        fetchChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatSubscription);
    };
  }, []);

  useEffect(() => {
    if (phoneToSelect && chats.length > 0 && !activeChatId) {
      const targetChat = chats.find(c => c.phone_number.includes(phoneToSelect) || phoneToSelect.includes(c.phone_number));
      if (targetChat) {
        setActiveChatId(targetChat.id);
        // Eliminar el parÃ¡metro de la URL despuÃ©s de seleccionar el chat
        setSearchParams({});
      }
    }
  }, [chats, phoneToSelect, activeChatId, setSearchParams]);

  // Fetch messages when a chat is selected
  useEffect(() => {
    if (activeChatId) {
      fetchMessages(activeChatId);
      
      const clearUnread = async () => {
        await supabase
          .from('whatsapp_chats')
          .update({ unread_count: 0 })
          .eq('id', activeChatId);
        window.dispatchEvent(new Event('unreadUpdated'));
      };
      clearUnread();

      // Usar Supabase Realtime para capturar nuevos mensajes al vuelo!
      const msgSubscription = supabase
        .channel(`chat-messages-${activeChatId}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'whatsapp_messages',
            filter: `chat_id=eq.${activeChatId}`
        }, (payload) => {
          setIsTyping(true);
          setTimeout(() => {
            setMessages(prev => [...prev, payload.new as Message]);
            setIsTyping(false);
          }, 800); // PequeÃ±o delay para que se vea el "escribiendo"
          
          // Clear unread count immediately since the user is actively viewing this chat
          clearUnread();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(msgSubscription);
      };
    } else {
      setMessages([]);
    }
  }, [activeChatId]);

  const fetchChats = async () => {
    const { data, error } = await supabase
      .from('whatsapp_chats')
      .select('*')
      .order('is_pinned', { ascending: false, nullsFirst: false })
      .order('is_discarded', { ascending: true, nullsFirst: false })
      .order('last_message_at', { ascending: false });
    if (!error && data) setChats(data);
  };

  const fetchMessages = async (chatId: string) => {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (!error && data) setMessages(data);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeChatId) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    
    const mimeType = (file.type || '').toLowerCase();
    const fileName = file.name || '';
    
    const isVideo = mimeType.startsWith('video/') || 
                    mimeType.includes('mp4') || 
                    mimeType.includes('quicktime') || 
                    /\.(mp4|mov|avi|mkv|webm|3gp)$/i.test(fileName);
                    
    const isImage = mimeType.startsWith('image/') || 
                    mimeType.includes('png') || 
                    mimeType.includes('jpeg') || 
                    mimeType.includes('jpg') || 
                    mimeType.includes('gif') || 
                    mimeType.includes('webp') || 
                    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName);
                    
    const mediaType = isVideo ? 'video' : isImage ? 'image' : 'document';
    
    let fileExt = '';
    if (fileName.includes('.')) {
      fileExt = `.${fileName.split('.').pop()}`;
    } else {
      if (isVideo) {
        fileExt = mimeType.includes('quicktime') || mimeType.includes('mov') ? '.mov' : '.mp4';
      } else if (isImage) {
        fileExt = mimeType.includes('png') ? '.png' : mimeType.includes('gif') ? '.gif' : mimeType.includes('webp') ? '.webp' : '.jpg';
      } else {
        fileExt = '.bin';
      }
    }
    
    const cleanName = fileName ? fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, '_') : 'file';
    let finalFileExt = fileExt;
    let fileToUpload = file;

    if (isImage) {
      fileToUpload = await compressImage(file);
      finalFileExt = '.jpg';
    }

    const filePath = `${activeChatId}/${Date.now()}_${cleanName}${finalFileExt}`;
    
    const { error } = await supabase.storage
      .from('chat_media')
      .upload(filePath, fileToUpload, { cacheControl: '3600', upsert: true });
      
    if (error) {
      console.error("Error al subir archivo:", error);
      alert("Error al subir el archivo. Revisa los logs.");
      setIsUploading(false);
      return;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('chat_media')
      .getPublicUrl(filePath);
      
    setAttachedMedia({
      url: publicUrl,
      type: mediaType,
      name: fileName || `Archivo (${mediaType})`
    });
    
    setIsUploading(false);
    // Limpiar input
    e.target.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          const mimeType = (file.type || item.type || '').toLowerCase();
          const fileName = file.name || '';
          
          const isVideo = mimeType.startsWith('video/') || 
                          mimeType.includes('mp4') || 
                          mimeType.includes('quicktime') || 
                          /\.(mp4|mov|avi|mkv|webm|3gp)$/i.test(fileName);
                          
          const isImage = mimeType.startsWith('image/') || 
                          mimeType.includes('png') || 
                          mimeType.includes('jpeg') || 
                          mimeType.includes('jpg') || 
                          mimeType.includes('gif') || 
                          mimeType.includes('webp') || 
                          /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName);
          
          if (isVideo || isImage) {
            e.preventDefault(); // Evitar que pegue texto raro
            setIsUploading(true);
            const mediaType = isVideo ? 'video' : 'image';
            
            let fileExt = '';
            if (fileName.includes('.')) {
              fileExt = `.${fileName.split('.').pop()}`;
            } else {
              if (isVideo) {
                fileExt = mimeType.includes('quicktime') || mimeType.includes('mov') ? '.mov' : '.mp4';
              } else if (isImage) {
                fileExt = mimeType.includes('png') ? '.png' : mimeType.includes('gif') ? '.gif' : mimeType.includes('webp') ? '.webp' : '.jpg';
              } else {
                fileExt = '.bin';
              }
            }
            
            const cleanName = fileName ? fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, '_') : 'clipboard';
            let finalFileExt = fileExt;
            let fileToUpload = file;

            if (isImage) {
              fileToUpload = await compressImage(file);
              finalFileExt = '.jpg';
            }

            const filePath = `${activeChatId}/${Date.now()}_${cleanName}${finalFileExt}`;
            
            const { error } = await supabase.storage
              .from('chat_media')
              .upload(filePath, fileToUpload, { cacheControl: '3600', upsert: true });
              
            if (error) {
              console.error("Error al subir archivo pegado:", error);
              alert("Error al subir el archivo pegado.");
              setIsUploading(false);
              return;
            }
            
            const { data: { publicUrl } } = supabase.storage
              .from('chat_media')
              .getPublicUrl(filePath);
              
            setAttachedMedia({
              url: publicUrl,
              type: mediaType,
              name: fileName || `Archivo pegado (${mediaType})`
            });
            setIsUploading(false);
          }
        }
      }
    }
  };

  const handleSendMessage = async () => {
    if ((!replyText.trim() && !attachedMedia) || !activeChatId) return;
    
    // Inyectamos a Supabase como mensaje de salida. 
    // NOTA: Para producciÃ³n real, aquÃ­ tambiÃ©n harÃ­amos fetch a nuestro backend para que 
    // le diga a Meta Graph API que envÃ­e el mensaje al telÃ©fono fÃ­sico del cliente.
    const outboundText = replyText.trim();
    const currentMedia = attachedMedia;
    
    setReplyText('');
    setAttachedMedia(null);

    await supabase.from('whatsapp_messages').insert([{
      chat_id: activeChatId,
      direction: 'outbound',
      message_body: outboundText,
      media_url: currentMedia?.url || null,
      media_type: currentMedia?.type || null,
      status: 'sent'
    }]);

    // Llama a la Edge Function para enviar el mensaje físicamente por Meta API
    if (activeChat?.phone_number) {
      supabase.functions.invoke('send-whatsapp-manual', {
        body: {
          phone: activeChat.phone_number,
          message: outboundText,
          mediaUrl: currentMedia?.url || null,
          mediaType: currentMedia?.type || null,
        }
      }).catch(err => console.error("Error enviando mensaje vía API:", err));
    }
  };

  const toggleHumanMode = async () => {
    if (!activeChatId || !activeChat) return;
    
    // Actualizamos en la DB para que n8n se entere inmediatamente
    const { error } = await supabase
      .from('whatsapp_chats')
      .update({ is_bot_active: !activeChat.is_bot_active })
      .eq('id', activeChatId);

    if (error) {
      console.error('Error toggling bot:', error);
    } else {
      fetchChats(); // Refrescar UI
    }
  };

  const cleanSearchTerm = searchTerm.replace(/\D/g, '');
  const filteredChats = chats.filter(c => {
    const matchesName = c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPhone = c.phone_number?.includes(searchTerm) || (cleanSearchTerm.length > 0 && c.phone_number?.includes(cleanSearchTerm));
    return matchesName || matchesPhone;
  });

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4.5rem)', overflow: 'hidden', padding: '0.5rem 1.5rem', boxSizing: 'border-box' }}>
      <header style={{ marginBottom: '1rem' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Atención WhatsApp 📱</h2>
      </header>

      <div className="chat-layout" style={{ display: 'flex', flex: 1, gap: '1.5rem', minHeight: 0, width: '100%' }}>
        
        {/* Columna Izquierda: Lista de Chats */}
        <div className={`chat-sidebar-wrapper ${activeChatId ? 'chat-active' : 'chat-inactive'}`} style={{ display: 'flex', flexDirection: 'column', width: '380px', minWidth: '380px' }}>
          
          <div className="chat-sidebar" style={{ flex: 1, backgroundColor: 'var(--surface-container)', borderRadius: '12px', display: 'flex', flexDirection: 'column', border: '2px solid var(--outline-variant)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--surface-container-highest)', backgroundColor: '#10b981', color: '#ffffff', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems:'center' }}>
              <span className="material-symbols-outlined" style={{color: '#ffffff'}}>chat</span>
              Bandeja de Entrada
            </div>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontSize: '1rem' }}>search</span>
              <input 
                type="text" 
                placeholder="Buscar cliente..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: '2rem', border: 'none', outline: 'none', fontSize: '0.85rem', backgroundColor: '#ffffff', color: '#000' }}
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredChats.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay chats</div>
            ) : filteredChats.map(chat => {
              const isHighlighted = chat.is_pinned;
              const isDiscarded = chat.is_discarded;
              return (
              <div 
                key={chat.id} 
                onClick={() => setActiveChatId(chat.id)}
                style={{ 
                  padding: '1rem', 
                  borderBottom: '1px solid var(--surface-container-highest)', 
                  cursor: 'pointer',
                  backgroundColor: activeChatId === chat.id ? 'rgba(74, 158, 255, 0.1)' : isDiscarded ? 'rgba(239, 68, 68, 0.05)' : isHighlighted ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                  borderLeft: activeChatId === chat.id ? '3px solid var(--primary-color)' : isDiscarded ? '3px solid #ef4444' : isHighlighted ? '3px solid #f59e0b' : '3px solid transparent',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  opacity: isDiscarded ? 0.7 : 1

                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button 
                        onClick={(e) => toggleHighlight(e, chat.id, !!chat.is_pinned)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: isHighlighted ? '#f59e0b' : '#64748b',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          outline: 'none'
                        }}
                        title={isHighlighted ? "Quitar resaltado" : "Resaltar chat importante"}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: isHighlighted ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                      </button>
                      <button 
                        onClick={(e) => toggleDiscard(e, chat.id, !!chat.is_discarded)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: isDiscarded ? '#ef4444' : '#94a3b8',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          outline: 'none'
                        }}
                        title={isDiscarded ? "Restaurar cliente" : "Marcar como lead basura"}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: isDiscarded ? "'FILL' 1" : "'FILL' 0" }}>thumb_down</span>
                      </button>
                    </div>
                    <div style={{ fontWeight: chat.unread_count > 0 ? 800 : 600, color: 'var(--text-primary)', textDecoration: isDiscarded ? 'line-through' : 'none' }}>{chat.contact_name}</div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: chat.unread_count > 0 ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    {new Date(chat.last_message_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: chat.unread_count > 0 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: chat.unread_count > 0 ? 600 : 400 }}>+{chat.phone_number}</div>
                  <div style={{display: 'flex', gap: '6px', alignItems: 'center'}}>
                    {chat.unread_count > 0 && (
                      <span style={{ backgroundColor: 'var(--primary)', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>
                        {chat.unread_count}
                      </span>
                    )}
                    <span style={{ 
                      fontSize: '0.6rem', 
                      fontWeight: 800, 
                      padding: '2px 6px', 
                      borderRadius: '10px',
                      backgroundColor: chat.is_bot_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: chat.is_bot_active ? '#10b981' : '#ef4444'
                    }}>
                      {chat.is_bot_active ? 'BOT' : 'HUMANO'}
                    </span>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
        </div>

        {/* Panel Derecho: Ventana del Chat Activo */}
        <div className={`chat-main-window ${activeChatId ? 'chat-active' : 'chat-inactive'}`} style={{ flex: 1, backgroundColor: 'var(--surface-container-low)', borderRadius: '12px', display: 'flex', flexDirection: 'column', border: '1px solid var(--outline-variant)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          {activeChatId ? (
            <>
              {/* Header del chat */}
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <button className="mobile-only icon-btn" onClick={() => setActiveChatId(null)} style={{ padding: '0.5rem', marginRight: '-0.5rem' }}>
                      <span className="material-symbols-outlined">arrow_back</span>
                   </button>
                   <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <span className="material-symbols-outlined" style={{color: '#10b981'}}>account_circle</span>
                   </div>
                   <div>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{chats.find(c => c.id === activeChatId)?.contact_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Cliente Frecuente</div>
                   </div>
                 </div>
                 
                 <button 
                   onClick={toggleHumanMode} 
                   className={isHumanControlled ? "btn-primary" : "btn-secondary"} 
                   style={{ 
                     display: 'flex', 
                     alignItems: 'center', 
                     gap: '8px',
                     backgroundColor: isHumanControlled ? 'var(--error)' : undefined,
                     boxShadow: isHumanControlled ? '0 0 15px rgba(239, 68, 68, 0.3)' : undefined
                   }}
                 >
                   <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                     {isHumanControlled ? 'smart_toy' : 'support_agent'}
                   </span>
                   {isHumanControlled ? 'Devolver al Bot' : 'Tomar Control Humano'}
                 </button>
              </div>
              
              {/* Banner de Modo Humano */}
              {isHumanControlled && (
                <div style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  borderBottom: '2px solid rgba(245, 158, 11, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.82rem',
                  color: '#f59e0b',
                  fontWeight: 600
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>support_agent</span>
                  <span>Modo Humano activo — Robotina está silenciada. Tus mensajes llegan directamente al cliente.</span>
                  <button
                    onClick={toggleHumanMode}
                    style={{
                      marginLeft: 'auto',
                      background: 'rgba(245,158,11,0.15)',
                      border: '1px solid rgba(245,158,11,0.4)',
                      borderRadius: '6px',
                      padding: '3px 10px',
                      color: '#f59e0b',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    🤖 Reactivar Bot
                  </button>
                </div>
              )}

              {/* Burbujas de mensajes */}
              <div id="messages-container" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
                {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '2rem', color: 'rgba(255,255,255,0.3)' }}>Cargando mensajes...</div>
                ) : messages.map((msg, idx) => {
                  const isInbound = msg.direction === 'inbound';
                  return (
                    <div key={msg.id || idx} style={{
                      alignSelf: isInbound ? 'flex-start' : 'flex-end',
                      width: 'fit-content',
                      maxWidth: '85%',
                    }} className="chat-bubble-anim">
                      <div style={{
                          backgroundColor: isInbound ? '#005c4b' : 'var(--primary)', 
                          color: '#ffffff',
                          padding: '14px 18px',
                          borderRadius: '16px',
                          borderTopLeftRadius: isInbound ? '0' : '16px',
                          borderTopRightRadius: !isInbound ? '0' : '16px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          lineHeight: 1.5,
                          fontSize: '0.95rem'
                      }}>
                        {msg.media_type === 'video' && msg.media_url && (
                          <video src={msg.media_url} controls style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '8px', display: 'block', maxHeight: '280px', backgroundColor: '#000' }} />
                        )}
                        {msg.media_type === 'image' && msg.media_url && (
                          <img src={msg.media_url} alt="Media" loading="lazy" style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '8px', display: 'block', maxHeight: '280px', objectFit: 'cover' }} />
                        )}
                        {msg.message_body && <div style={{wordBreak: 'break-word', whiteSpace: 'pre-wrap'}}>{renderFormattedMessage(msg.message_body)}</div>}
                        <div style={{fontSize: '0.65rem', textAlign: 'right', marginTop: '6px', opacity: 0.6, letterSpacing: '0.5px', color: '#ffffff'}}>
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          {!isInbound && <span className="material-symbols-outlined" style={{fontSize: '12px', verticalAlign: 'middle', marginLeft: '4px'}}>done_all</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="typing-bubble chat-bubble-anim">
                    <div className="dot-typing"></div>
                    <div className="dot-typing"></div>
                    <div className="dot-typing"></div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Input para responder */}
              <div style={{ padding: '1rem', backgroundColor: 'var(--surface-container)', borderTop: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {attachedMedia && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: 'var(--surface-container-highest)', borderRadius: '8px', width: 'fit-content' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>{attachedMedia.type === 'video' ? 'movie' : 'image'}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachedMedia.name}</span>
                    <button onClick={() => setAttachedMedia(null)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--error)', cursor: 'pointer', display: 'flex' }}><span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span></button>
                  </div>
                )}
                {isUploading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <div style={{ width: '16px', height: '16px', border: '2px solid var(--text-secondary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    Subiendo archivo...
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label htmlFor="media-upload" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '44px', width: '44px', borderRadius: '50%', backgroundColor: 'var(--surface-container-highest)', color: 'var(--text-secondary)', transition: 'background-color 0.2s', border: '1px solid var(--outline-variant)' }} title="Adjuntar archivo multimedia">
                    <span className="material-symbols-outlined" style={{ fontSize: '1.3rem' }}>attach_file</span>
                    <input id="media-upload" type="file" accept="video/*,image/*" style={{ display: 'none' }} onChange={handleMediaUpload} disabled={isUploading} />
                  </label>
                  <div className="chat-input-container" style={{display: 'flex', flex: 1, backgroundColor: 'var(--surface-container-low)', borderRadius: '8px', border: '2px solid var(--outline)'}}>
                      <textarea 
                        placeholder="Escribe un mensaje al cliente..."
                        rows={2}
                        style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: 'var(--on-surface)', padding: '12px', fontSize: '0.85rem', outline: 'none', resize: 'none', fontFamily: 'inherit', scrollbarWidth: 'none' }}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        onPaste={handlePaste}
                      />
                  </div>
                  <button className="btn-primary" onClick={handleSendMessage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '44px', width: '44px', borderRadius: '50%', padding: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>send</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div id="messages-container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ textAlign: 'center', position: 'relative', zIndex: 10, padding: '2rem', backgroundColor: 'var(--surface-container-low)', borderRadius: '24px', border: '2px solid var(--primary)', boxShadow: '0 0 20px rgba(255, 90, 31, 0.2)' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', opacity: 0.5 }}>forum</span>
                </div>
                <h3>Central de <span style={{ color: '#25D366' }}>WhatsApp</span></h3>
                <p style={{ marginTop: '0.5rem', opacity: 0.6 }}>Selecciona un chat en la bandeja izquierda<br/>para empezar a responder.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

