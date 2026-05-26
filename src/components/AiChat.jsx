import { useState, useRef, useEffect, useCallback } from 'react';
import chatService from '../services/chatService';
import './AiChat.css';

const AiChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  const quickQuestions = [
    '🥚 Apa itu telur bagus?',
    '📊 Cara baca dashboard?',
    '🔧 Cara pakai ESP32?',
    '📋 Cara unduh laporan?',
  ];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleChat = () => {
    if (isOpen) {
      setIsClosing(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
      }, 250);
    } else {
      setIsOpen(true);
    }
  };

  const sendMessage = async (text) => {
    const messageText = text || inputValue.trim();
    if (!messageText || isLoading) return;

    setShowWelcome(false);
    setInputValue('');

    // Add user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: messageText,
      time: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await chatService.sendMessage(messageText);

      if (response.success) {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          text: response.data.reply,
          time: new Date(response.data.timestamp),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: '⚠️ Maaf, terjadi kesalahan. Silakan coba lagi.',
        time: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClearChat = async () => {
    try {
      await chatService.clearChat();
    } catch {
      // ignore
    }
    setMessages([]);
    setShowWelcome(true);
  };

  const handleTextareaInput = (e) => {
    setInputValue(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        id="ai-chat-fab"
        className={`ai-chat-fab ${isOpen ? 'active' : ''}`}
        onClick={toggleChat}
        title={isOpen ? 'Tutup Chat' : 'Eggspire AI Assistant'}
      >
        {isOpen ? (
          <i className="fas fa-times"></i>
        ) : (
          <i className="fas fa-comment-dots"></i>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={`ai-chat-window ${isClosing ? 'closing' : ''}`}>
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-avatar">🤖</div>
            <div className="ai-chat-header-info">
              <div className="ai-chat-header-title">Eggspire AI Assistant</div>
              <div className="ai-chat-header-status">
                <span className="ai-chat-header-status-dot"></span>
                Online • Siap membantu
              </div>
            </div>
            <div className="ai-chat-header-actions">
              <button
                className="ai-chat-header-btn"
                onClick={handleClearChat}
                title="Hapus Riwayat Chat"
              >
                <i className="fas fa-trash-alt"></i>
              </button>
              <button
                className="ai-chat-header-btn"
                onClick={toggleChat}
                title="Tutup"
              >
                <i className="fas fa-minus"></i>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="ai-chat-messages">
            {showWelcome && messages.length === 0 && (
              <>
                <div className="ai-chat-welcome">
                  <div className="ai-chat-welcome-icon">🥚</div>
                  <h3>Halo! Saya Eggspire AI 👋</h3>
                  <p>
                    Asisten cerdas untuk monitoring kualitas telur. Tanyakan apa
                    saja seputar peternakan, kualitas telur, atau penggunaan
                    sistem Eggspire!
                  </p>
                </div>
                <div className="ai-chat-quick-actions">
                  {quickQuestions.map((q, i) => (
                    <button
                      key={i}
                      className="ai-chat-quick-btn"
                      onClick={() => sendMessage(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`ai-chat-msg ${msg.type}`}>
                <div className="ai-chat-msg-avatar">
                  {msg.type === 'ai' ? '🤖' : '👤'}
                </div>
                <div className="ai-chat-msg-content">
                  <div className="ai-chat-msg-bubble">{msg.text}</div>
                  <span className="ai-chat-msg-time">
                    {formatTime(msg.time)}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="ai-chat-typing">
                <div className="ai-chat-msg-avatar" style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0
                }}>
                  🤖
                </div>
                <div className="ai-chat-typing-bubble">
                  <div className="ai-chat-typing-dot"></div>
                  <div className="ai-chat-typing-dot"></div>
                  <div className="ai-chat-typing-dot"></div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="ai-chat-input-area">
            <div className="ai-chat-input-wrapper">
              <textarea
                ref={textareaRef}
                className="ai-chat-input"
                placeholder="Ketik pesan..."
                value={inputValue}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={isLoading}
              />
              <button
                className="ai-chat-send-btn"
                onClick={() => sendMessage()}
                disabled={!inputValue.trim() || isLoading}
                title="Kirim"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AiChat;
