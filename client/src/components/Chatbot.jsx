import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import {
  FiMessageSquare, FiX, FiSend, FiMinus,
  FiRefreshCw, FiUser, FiCpu
} from 'react-icons/fi';

const SUGGESTIONS = {
  customer: [
    'What is my latest order status?',
    'How do I book ration items?',
    'How to pay online?',
    'How do I raise a complaint?',
    'What products are available?',
    'How to update my profile?',
  ],
  distributor: [
    'Show my pending deliveries',
    'How to mark order as delivered?',
    'How to request more stock?',
    'How to collect COD payment?',
  ],
  admin: [
    'How to add a new distributor?',
    'How to allocate stock?',
    'How to manage complaints?',
    'How to update order status?',
  ],
};

const WELCOME = {
  customer: "👋 Hi! I'm **RationBot**, your E-Ration assistant.\n\nI can help you check orders, book ration items, handle complaints, and more.\n\nWhat can I help you with today?",
  distributor: "👋 Hi! I'm **RationBot**.\n\nI can help you manage deliveries, stock requests, and customer orders.\n\nHow can I assist you?",
  admin: "👋 Hi Admin! I'm **RationBot**.\n\nI can help you navigate system features and answer questions about the platform.\n\nWhat do you need?",
};

const renderText = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part.split('\n').map((line, j, arr) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </span>
    ));
  });
};

export default function Chatbot() {
  const { user } = useAuth();

  // ALL hooks declared before any early return
  const [open, setOpen]         = useState(false);
  const [minimised, setMin]     = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [unread, setUnread]     = useState(0);
  const [history, setHistory]   = useState([]);
  const bottomRef               = useRef(null);
  const inputRef                = useRef(null);

  useEffect(() => {
    if (!user) return;
    if (messages.length === 0) {
      const welcome = WELCOME[user.role] || WELCOME.customer;
      setMessages([{ id: Date.now(), role: 'assistant', text: welcome, ts: new Date() }]);
    }
  }, [user?.role]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open && !minimised) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, minimised]);

  useEffect(() => {
    if (!open && messages.length > 1) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant') setUnread(u => u + 1);
    }
  }, [messages]);

  // Early return AFTER all hooks
  if (!user) return null;

  const handleOpen = () => {
    setOpen(true);
    setMin(false);
    setUnread(0);
  };

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg = { id: Date.now(), role: 'user', text: msg, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const typingId = Date.now() + 1;
    setMessages(prev => [...prev, { id: typingId, role: 'assistant', text: '...', typing: true, ts: new Date() }]);

    try {
      const { data } = await API.post('/chatbot/message', { message: msg, history });

      setHistory(prev => [
        ...prev,
        { role: 'user', content: msg },
        { role: 'assistant', content: data.reply },
      ]);

      setMessages(prev =>
        prev.filter(m => m.id !== typingId).concat({
          id: Date.now() + 2,
          role: 'assistant',
          text: data.reply,
          ts: new Date(),
        })
      );
    } catch {
      setMessages(prev =>
        prev.filter(m => m.id !== typingId).concat({
          id: Date.now() + 2,
          role: 'assistant',
          text: "⚠️ Sorry, I'm having trouble connecting. Please try again in a moment.",
          ts: new Date(),
          error: true,
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    const welcome = WELCOME[user.role] || WELCOME.customer;
    setMessages([{ id: Date.now(), role: 'assistant', text: welcome, ts: new Date() }]);
    setHistory([]);
  };

  const suggestions = SUGGESTIONS[user.role] || SUGGESTIONS.customer;

  const roleColor = {
    admin: 'from-emerald-700 to-emerald-800',
    distributor: 'from-blue-700 to-blue-800',
    customer: 'from-orange-600 to-orange-700',
  }[user.role] || 'from-primary-600 to-primary-700';

  const roleAccent = {
    admin: 'bg-emerald-600 hover:bg-emerald-700',
    distributor: 'bg-blue-600 hover:bg-blue-700',
    customer: 'bg-orange-600 hover:bg-orange-700',
  }[user.role] || 'bg-primary-600 hover:bg-primary-700';

  return (
    <>
      {!open && (
        <button
          onClick={handleOpen}
          className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all hover:scale-110 bg-gradient-to-br ${roleColor}`}
          title="Chat with RationBot"
        >
          <FiMessageSquare className="text-2xl" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-bounce">
              {unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className={`fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-100 transition-all duration-200 ${minimised ? 'h-14' : 'h-[540px]'}`}>
          <div className={`flex items-center justify-between px-4 py-3 rounded-t-2xl bg-gradient-to-r ${roleColor} text-white flex-shrink-0`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <FiCpu className="text-sm" />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">RationBot</p>
                <p className="text-xs text-white/70">AI Assistant • Online</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={clearChat} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors" title="Clear chat">
                <FiRefreshCw className="text-xs" />
              </button>
              <button onClick={() => setMin(m => !m)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors" title={minimised ? 'Expand' : 'Minimise'}>
                <FiMinus className="text-sm" />
              </button>
              <button onClick={() => setOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors" title="Close">
                <FiX className="text-sm" />
              </button>
            </div>
          </div>

          {!minimised && (
            <>
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gradient-to-br ${roleColor} text-white`}>
                        <FiCpu className="text-xs" />
                      </div>
                    )}
                    <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? `text-white bg-gradient-to-br ${roleColor} rounded-br-sm`
                        : msg.error
                        ? 'bg-red-50 text-red-700 border border-red-100 rounded-bl-sm'
                        : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-sm'
                    }`}>
                      {msg.typing ? (
                        <div className="flex gap-1 items-center py-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : (
                        <span>{renderText(msg.text)}</span>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {user.profileImage
                          ? <img src={user.profileImage} className="w-full h-full rounded-full object-cover" alt="" />
                          : <FiUser className="text-xs text-gray-500" />
                        }
                      </div>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {messages.length <= 1 && (
                <div className="px-3 py-2 border-t border-gray-100 bg-white flex-shrink-0">
                  <p className="text-xs text-gray-400 mb-2 font-medium">Quick questions:</p>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {suggestions.map((s, i) => (
                      <button key={i} onClick={() => sendMessage(s)} className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors whitespace-nowrap">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="px-3 py-3 border-t border-gray-100 bg-white rounded-b-2xl flex-shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message… (Enter to send)"
                    rows={1}
                    disabled={loading}
                    className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent max-h-24 overflow-y-auto disabled:opacity-50 leading-relaxed"
                    style={{ minHeight: '38px' }}
                    onInput={e => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
                    }}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all flex-shrink-0 ${roleAccent} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <FiSend className="text-sm" />
                  </button>
                </div>
                <p className="text-xs text-gray-300 mt-1.5 text-center">Powered by Groq AI</p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}