import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../../../types';
import { store } from '../../../store';
import { socket } from '../../../socket';

interface MessagesProps {
  clients: User[];
  currentUserId: string; // Trainer ID
}

const Messages: React.FC<MessagesProps> = ({ clients, currentUserId }) => {
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = clients.filter(client => 
    (client.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeClient = clients.find(c => c.id === activeClientId);

  const fetchMessages = async (clientId: string) => {
    const msgs = await store.getMessages(currentUserId, clientId);
    setMessages(msgs);
  };

  useEffect(() => {
    if (activeClientId) {
      fetchMessages(activeClientId);
    }
  }, [activeClientId]);

  useEffect(() => {
    // Join room for real-time updates
    socket.emit('join_room', currentUserId);

    const handleReceiveMessage = (message: Message) => {
      if (
        (message.senderId === activeClientId && message.receiverId === currentUserId) ||
        (message.senderId === currentUserId && message.receiverId === activeClientId)
      ) {
        setMessages(prev => [...prev, message]);
      }
    };

    const handleMessageSent = (message: Message) => {
       if (
        (message.senderId === currentUserId && message.receiverId === activeClientId)
      ) {
        setMessages(prev => {
            // Avoid duplicates if already added optimistically (though we aren't doing that here yet)
            if (prev.find(m => m.id === message.id)) return prev;
            return [...prev, message];
        });
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_sent', handleMessageSent);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_sent', handleMessageSent);
    };
  }, [currentUserId, activeClientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeClientId) return;

    const messageData = {
      senderId: currentUserId,
      receiverId: activeClientId,
      content: newMessage,
    };

    socket.emit('send_message', messageData);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white border border-black/5 rounded-3xl overflow-hidden shadow-sm">
      {/* Sidebar - Client List */}
      <div className="w-1/3 border-r border-black/5 flex flex-col">
        <div className="p-6 border-b border-black/5">
          <h3 className="text-xl font-bold mb-4 text-black">Messages</h3>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search clients..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border border-black/5 rounded-xl px-10 py-3 text-sm focus:border-red-600 outline-none transition-all text-black"
            />
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-xs"></i>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredClients.map(client => (
            <div 
              key={client.id}
              onClick={() => setActiveClientId(client.id)}
              className={`p-4 border-b border-black/5 cursor-pointer hover:bg-neutral-50 transition-colors ${activeClientId === client.id ? 'bg-neutral-50 border-l-4 border-l-red-600' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                    <i className="fas fa-user"></i>
                  </div>
                  {client.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-600 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-bold truncate ${activeClientId === client.id ? 'text-black' : 'text-neutral-600'}`}>
                    {client.name || client.email}
                  </h4>
                  <p className="text-xs text-neutral-400 truncate">Click to chat</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-neutral-50">
        {activeClientId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-black/5 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-red-600">
                  <i className="fas fa-user"></i>
                </div>
                <div>
                  <h3 className="font-bold text-black">{activeClient?.name || activeClient?.email}</h3>
                  <p className="text-xs text-neutral-400 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${activeClient?.isOnline ? 'bg-red-600' : 'bg-neutral-300'}`}></span>
                    {activeClient?.isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.map((msg, index) => {
                const isMe = msg.senderId === currentUserId;
                return (
                  <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl p-4 ${isMe ? 'bg-red-600 text-white rounded-tr-none shadow-lg shadow-red-600/10' : 'bg-white border border-black/5 text-black rounded-tl-none'}`}>
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-[9px] mt-1 font-bold uppercase ${isMe ? 'text-white/60' : 'text-neutral-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-black/5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 bg-neutral-50 border border-black/5 rounded-xl px-4 py-3 text-sm focus:border-red-600 outline-none text-black"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-red-600 text-white px-6 rounded-xl font-bold hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400">
            <div className="w-20 h-20 rounded-full bg-white border border-black/5 flex items-center justify-center mb-4">
              <i className="fas fa-comments text-3xl text-neutral-200"></i>
            </div>
            <p className="font-bold uppercase tracking-widest text-sm">Select a client to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
