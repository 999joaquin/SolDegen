"use client";

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

  const userColors: { [key: number]: string } = useRef({}).current;

  const getUserColor = (uid: number): string => {
    if (!userColors[uid]) {
      const colors = ['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316'];
      userColors[uid] = colors[Object.keys(userColors).length % colors.length];
    }
    return userColors[uid];
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleChatMessage = (data: ChatMessage) => setMessages(prev => [...prev, data]);
    const handleChatHistory = (history: ChatMessage[]) => setMessages(history);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chat_message', handleChatMessage);
    socket.on('chat_history', handleChatHistory);

    if (socket.connected) setIsConnected(true);
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
    const trimmed = inputMessage.trim();
    if (!trimmed || trimmed.length > 200) return;
    socket.emit('send_chat_message', { userId, username, message: trimmed });
    setInputMessage('');
    inputRef.current?.focus();
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  return (
    <div className="bg-gray-900 rounded-2xl shadow-lg overflow-hidden flex flex-col h-[400px]">
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-white text-lg font-semibold flex items-center gap-2">
          <span>Chat</span>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
        </h3>
        <span className="text-gray-400 text-xs">
          {messages.length} {messages.length === 1 ? 'message' : 'messages'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">No messages yet. Be the first to chat!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.userId === userId;
            const color = getUserColor(msg.userId);
            return (
              <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold" style={{ color }}>{msg.username}</span>
                  <span className="text-gray-500 text-xs">{formatTime(msg.timestamp)}</span>
                </div>
                <div className={`max-w-[80%] px-3 py-2 rounded-lg ${isOwn ? 'bg-lime-600 text-white' : 'bg-gray-800 text-gray-100'}`}>
                  <p className="text-sm break-words">{msg.message}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

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
          <span className="text-gray-500 text-xs">{inputMessage.length}/200</span>
          {!isConnected && <span className="text-red-400 text-xs">Disconnected</span>}
        </div>
      </form>
    </div>
  );
}