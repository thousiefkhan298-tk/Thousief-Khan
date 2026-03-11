import React, { useState, useEffect, useRef } from 'react';
import { firebaseService } from '../../services/firebaseService';
import { auth } from '../../firebase';
import Layout from '../../components/Layout';
import { Message, User } from '../../types';
import { Send, User as UserIcon, MessageSquare, ShieldCheck, Zap } from 'lucide-react';

const Messages: React.FC = () => {
  const [userData, setUserData] = useState<any>(null);
  const [contacts, setContacts] = useState<User[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch current user and contacts
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const currentUserData = await firebaseService.getUser(uid);
        if (!currentUserData) return;
        setUserData(currentUserData);

        // Fetch contacts
        const contactsData = await firebaseService.getUsers();
        // Filter out self
        const otherUsers = contactsData.filter(u => u.id !== currentUserData.id);
        setContacts(otherUsers);
        if (otherUsers.length > 0) {
          setSelectedContactId(otherUsers[0].id);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch messages
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsubscribe = firebaseService.subscribeToMessages(uid, (msgs) => {
      // Filter messages for the selected contact
      const filteredMessages = msgs.filter(m => 
        (m.senderId === uid && m.receiverId === selectedContactId) ||
        (m.senderId === selectedContactId && m.receiverId === uid)
      );
      setAllMessages(filteredMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    });
    
    return () => unsubscribe();
  }, [selectedContactId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = auth.currentUser?.uid;
    if (!newMessage.trim() || !selectedContactId || !uid) return;

    const msgContent = newMessage.trim();
    setNewMessage(''); // Optimistic clear

    try {
      await firebaseService.sendMessage({
        senderId: uid,
        receiverId: selectedContactId,
        participants: [uid, selectedContactId],
        content: msgContent,
        timestamp: new Date().toISOString(),
        read: false
      });
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message.");
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Layout userData={userData}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Establishing Uplink...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userData={userData}>
      <div className="mb-12">
        <div className="flex items-center space-x-3 mb-2">
          <MessageSquare className="w-4 h-4 text-brand-red" />
          <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-brand-red">Secure Comms</p>
        </div>
        <h2 className="text-6xl font-display italic uppercase leading-none">
          Intel <span className="text-brand-red">Feed</span>
        </h2>
        <p className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest mt-4">
          Encrypted communication channel with {userData?.role === 'TRAINER' ? 'recruits' : 'commanders'}.
        </p>
      </div>

      <div className="bg-neutral-900/50 rounded-[2.5rem] border border-neutral-800 overflow-hidden flex h-[700px] shadow-2xl">
        {/* Contacts Sidebar */}
        <div className="w-1/3 border-r border-neutral-800 flex flex-col bg-neutral-900/30">
          <div className="p-6 border-b border-neutral-800 bg-neutral-900/50">
            <h3 className="font-display italic text-xl uppercase tracking-wider text-white">Contacts</h3>
            <p className="text-[8px] font-mono uppercase tracking-widest text-neutral-600 mt-1">Active Operatives</p>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {contacts.length === 0 ? (
              <div className="p-10 text-center">
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No contacts found.</p>
              </div>
            ) : (
              contacts.map(contact => {
                const contactId = contact.id;
                const unreadCount = 0; // Simplified for now

                return (
                  <button
                    key={contactId}
                    onClick={() => setSelectedContactId(contactId)}
                    className={`w-full text-left p-6 flex items-center space-x-4 border-b border-neutral-800/50 transition-all group ${
                      selectedContactId === contactId ? 'bg-neutral-800' : 'hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      selectedContactId === contactId ? 'bg-brand-red text-white' : 'bg-neutral-800 text-neutral-500 group-hover:bg-neutral-700'
                    }`}>
                      <UserIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-mono text-[10px] uppercase tracking-widest truncate ${
                        selectedContactId === contactId ? 'text-white' : 'text-neutral-400'
                      }`}>{contact.name || contact.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${selectedContactId === contactId ? 'bg-brand-red animate-pulse' : 'bg-neutral-700'}`}></div>
                        <p className="text-[8px] font-mono text-neutral-600 uppercase tracking-widest">{contact.role}</p>
                      </div>
                    </div>
                    {unreadCount > 0 && (
                      <div className="w-6 h-6 rounded-full bg-brand-red text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-brand-red/20">
                        {unreadCount}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-neutral-900/10">
          {selectedContactId ? (
            <>
              {/* Chat Header */}
              <div className="p-6 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center border border-neutral-700">
                    <UserIcon className="w-6 h-6 text-neutral-400" />
                  </div>
                  <div>
                    <h3 className="font-display italic text-2xl uppercase tracking-wider text-white">
                      {contacts.find(c => c.id === selectedContactId)?.name || 'Unknown Operative'}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-3 h-3 text-brand-red" />
                      <p className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">Secure Channel Active</p>
                    </div>
                  </div>
                </div>
                <Zap className="w-5 h-5 text-brand-red animate-pulse" />
              </div>

              {/* Messages List */}
              <div className="flex-1 p-8 overflow-y-auto space-y-6 custom-scrollbar bg-brand-dark/20">
                {allMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 rounded-full border border-dashed border-neutral-800 flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-neutral-800" />
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-700 italic">
                      No transmission history found. Initiate contact.
                    </p>
                  </div>
                ) : (
                  allMessages.map(msg => {
                    const isMine = msg.senderId === userData?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${
                          isMine 
                            ? 'bg-brand-red text-white rounded-3xl rounded-tr-none shadow-lg shadow-brand-red/10' 
                            : 'bg-neutral-800 text-neutral-200 rounded-3xl rounded-tl-none border border-neutral-700'
                        } px-6 py-4`}>
                          <p className="font-mono text-[10px] uppercase tracking-wider leading-relaxed">{msg.content}</p>
                          <div className={`flex items-center justify-end space-x-2 mt-3 ${isMine ? 'text-red-200' : 'text-neutral-500'}`}>
                            <p className="text-[8px] font-mono uppercase tracking-widest">
                              {formatTime(msg.timestamp)}
                            </p>
                            {isMine && (
                              <div className="flex items-center space-x-1">
                                <span className="text-[8px] font-mono uppercase tracking-widest opacity-50">•</span>
                                <span className="text-[8px] font-mono uppercase tracking-widest">
                                  {msg.read ? 'Acknowledged' : 'Transmitted'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-8 border-t border-neutral-800 bg-neutral-900/50">
                <form onSubmit={handleSend} className="flex space-x-4">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Enter transmission content..."
                    className="flex-1 input-field"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-white text-black p-4 rounded-2xl hover:bg-neutral-200 transition-all disabled:opacity-20 disabled:grayscale flex items-center justify-center w-14 h-14 shadow-xl"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <div className="w-24 h-24 rounded-[2rem] border border-dashed border-neutral-800 flex items-center justify-center">
                <Zap className="w-10 h-10 text-neutral-800" />
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-700 italic">
                Select an operative to establish uplink.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Messages;
