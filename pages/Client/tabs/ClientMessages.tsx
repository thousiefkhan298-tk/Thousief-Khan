import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../../../types';
import { store } from '../../../store';
import { socket } from '../../../socket';

interface ClientMessagesProps {
  user: User;
}

const ClientMessages: React.FC<ClientMessagesProps> = ({ user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [trainerId, setTrainerId] = useState<string | null>(null);

  useEffect(() => {
    // Find trainer ID - in a real app this would be assigned or fetched
    // For now we'll look for a user with TRAINER role
    const findTrainer = async () => {
      // This is a bit of a hack since clients can't usually fetch all users
      // But for this demo we'll assume there's an endpoint or we can infer it
      // Let's assume the first trainer found is the assigned trainer
      // In a real app, the client object would have a `trainerId` field
      // Or we'd have a specific endpoint to get "my trainer"
      
      // Since we don't have a direct way, let's try to get messages from a known trainer ID if stored,
      // or wait for an incoming message to set the trainer ID.
      // BETTER APPROACH: Let's fetch all users (if allowed) or just hardcode for demo if needed.
      // Actually, let's use a store method to "get my trainer"
      
      // For this implementation, let's assume the trainer sends a message first OR
      // we fetch the trainer list. Since clients can't fetch all users usually,
      // let's add a `getAssignedTrainer` to store or just fetch all users and filter.
      // The `getAllClients` is for trainers.
      
      // Let's try to fetch messages with a wildcard or get recent conversations?
      // No, let's just assume there is one trainer and we can find them.
      // We'll use a hardcoded ID for the main trainer if not found, or fetch from a new endpoint.
      
      // Let's fetch all users for now (assuming the API allows it for simplicity in this demo)
      // If not, we might need to update the backend.
      // Checking server.ts... /api/users is available.
      
      try {
        const response = await fetch('/api/users');
        const users = await response.json();
        const trainer = users.find((u: User) => u.role === 'TRAINER');
        if (trainer) {
          setTrainerId(trainer.id);
        }
      } catch (e) {
        console.error("Failed to find trainer", e);
      }
    };
    
    findTrainer();
  }, []);

  const fetchMessages = async () => {
    if (!trainerId) return;
    const msgs = await store.getMessages(user.id, trainerId);
    setMessages(msgs);
  };

  useEffect(() => {
    if (trainerId) {
      fetchMessages();
    }
  }, [trainerId]);

  useEffect(() => {
    socket.emit('join_room', user.id);

    const handleReceiveMessage = (message: Message) => {
      if (message.senderId === trainerId || message.receiverId === trainerId) {
        setMessages(prev => [...prev, message]);
      }
    };

    const handleMessageSent = (message: Message) => {
        if (message.senderId === user.id && message.receiverId === trainerId) {
             setMessages(prev => {
                if (prev.find(m => m.id === message.id)) return prev;
                return [...prev, message];
            });
        }
    }

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_sent', handleMessageSent);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_sent', handleMessageSent);
    };
  }, [user.id, trainerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !trainerId) return;

    const messageData = {
      senderId: user.id,
      receiverId: trainerId,
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

  if (!trainerId) {
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center text-neutral-500">
        <p>Connecting to trainer...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Chat Header */}
      <div className="p-6 border-b border-neutral-800 bg-neutral-900 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-lime-500 flex items-center justify-center text-black shadow-lg shadow-lime-500/20">
          <i className="fas fa-user-tie text-xl"></i>
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Your Trainer</h3>
          <p className="text-xs text-lime-500 font-bold uppercase tracking-widest">Always here to help</p>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-neutral-950">
        {messages.map((msg, index) => {
          const isMe = msg.senderId === user.id;
          return (
            <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl p-4 ${isMe ? 'bg-lime-500 text-black rounded-tr-none shadow-lg shadow-lime-500/10' : 'bg-neutral-800 text-white rounded-tl-none border border-neutral-700'}`}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className={`text-[9px] mt-2 font-bold uppercase ${isMe ? 'text-black/60' : 'text-neutral-500'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-neutral-900 border-t border-neutral-800">
        <div className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask your trainer anything..."
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-6 py-4 text-sm focus:border-lime-500 outline-none text-white transition-colors"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="bg-lime-500 text-black px-6 rounded-xl font-bold hover:bg-lime-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-lime-500/20"
          >
            <i className="fas fa-paper-plane text-lg"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientMessages;
