'use client';

import { useState, useEffect, useRef } from 'react';
import { socket } from '@/lib/socket';

interface ChatMessage {
  id: string;
  userId: number;
  username: string;
  message: string;
  timestamp: number;
  color?: string;
}

interface PlinkoChatProps {
  userId: number;
  username?: string;
}

export default function PlinkoChat({ userId, username = `Player${userId}` }: PlinkoChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // User colors for consistent display
  const userColors: { [key: number]: string } = useRef({}).current;

  const getUserColor = (userId: number): string => {
    if (!userColors[userId]) {
      const colors = [
        '#ef4444', // red
        '#3b82f6', // blue
        '#10b981', // green
        '#f59e0b', // amber
        '#8b5cf6', // purple
        '#ec4899', // pink
        '#14b8a6', // teal
        '#f97316', // orange
      ];
      userColors[userId] = colors[Object.keys(userColors).length % colors.length];
    }
    return userColors[userId];
  };

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket connection status
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      console.log('Chat connected');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      console.log('Chat disconnected');
    };

    const handleChatMessage = (data: ChatMessage) => {
      setMessages(prev => [...prev, data]);
    };

    const handleChatHistory = (history: ChatMessage[]) => {
      setMessages(history);
    };

    // Register event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chat_message', handleChatMessage);
    socket.on('chat_history', handleChatHistory);

    // Check initial connection status
    if (socket.connected) {
      setIsConnected(true);
    }

    // Request chat history on mount
    socket.emit('get_chat_history');

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chat_message', handleChatMessage);
      socket.off('chat_history', handleChatHistory);
    };
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage || trimmedMessage.length > 200) {
      return;
    }

    // Send message via socket
    socket.emit('send_chat_message', {
      userId,
      username,
      message: trimmedMessage,
    });

    // Clear input
    setInputMessage('');
    inputRef.current?.focus();
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className="bg-gray-900 rounded-2xl shadow-lg overflow-hidden flex flex-col h-[400px]">
      {/* Chat Header */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-white text-lg font-semibold flex items-center gap-2">
          <span>Chat</span>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
        </h3>
        <span className="text-gray-400 text-xs">
          {messages.length} {messages.length === 1 ? 'message' : 'messages'}
        </span>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">No messages yet. Be the first to chat!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.userId === userId;
            const messageColor = getUserColor(msg.userId);

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
              >
                {/* Username and Time */}
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: messageColor }}
                  >
                    {msg.username}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg ${
                    isOwnMessage
                      ? 'bg-lime-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  <p className="text-sm break-words">{msg.message}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="border-t border-gray-700 p-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            maxLength={200}
            disabled={!isConnected}
            className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-lime-400 focus:outline-none text-sm placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!isConnected || !inputMessage.trim()}
            className="bg-lime-500 hover:bg-lime-600 text-white px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-lime-500"
          >
            Send
          </button>
        </div>
        <div className="mt-2 flex justify-between items-center">
          <span className="text-gray-500 text-xs">
            {inputMessage.length}/200
          </span>
          {!isConnected && (
            <span className="text-red-400 text-xs">Disconnected</span>
          )}
        </div>
      </form>
    </div>
  );
}
