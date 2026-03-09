import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ProgressPhoto } from '../types';
import { Camera, Plus, Trash2 } from 'lucide-react';

interface Props {
  clientId: string;
  isTrainer: boolean;
}

const ProgressPhotos: React.FC<Props> = ({ clientId, isTrainer }) => {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const data = await api.getProgressPhotos(clientId);
        setPhotos(data);
      } catch (error) {
        console.error("Error fetching progress photos:", error);
      }
    };
    fetchPhotos();
  }, [clientId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) return;
    try {
      await api.saveProgressPhoto({ clientId, imageUrl, notes, date: new Date().toISOString() });
      setImageUrl('');
      setNotes('');
      setShowForm(false);
      const data = await api.getProgressPhotos(clientId);
      setPhotos(data);
    } catch (error) {
      console.error("Error saving photo:", error);
      alert("Failed to save photo.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    try {
      await api.deleteProgressPhoto(id);
      const data = await api.getProgressPhotos(clientId);
      setPhotos(data);
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("Failed to delete photo.");
    }
  };

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
      <div className="p-8 border-b border-neutral-800 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Camera className="w-5 h-5 text-brand-red" />
          <h3 className="text-2xl font-display italic uppercase tracking-wider">Progress Photos</h3>
        </div>
        {isTrainer && (
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-red text-white px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Add Photo
          </button>
        )}
      </div>

      {showForm && (
        <div className="p-8 border-b border-neutral-800 bg-neutral-800/50">
          <form onSubmit={handleSave} className="space-y-4">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-4 text-white font-mono text-sm"
              placeholder="Enter image URL..."
              required
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-4 text-white font-mono text-sm"
              placeholder="Enter notes..."
              rows={2}
            />
            <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-emerald-700">Save Photo</button>
          </form>
        </div>
      )}

      <div className="p-8 grid grid-cols-2 md:grid-cols-3 gap-6">
        {photos.map(photo => (
          <div key={photo.id} className="relative group bg-neutral-800 rounded-2xl overflow-hidden aspect-square">
            <img src={photo.imageUrl} alt="Progress" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
              <p className="text-[10px] font-mono text-white">{new Date(photo.date).toLocaleDateString()}</p>
              {isTrainer && (
                <button onClick={() => handleDelete(photo.id)} className="text-brand-red hover:text-red-400 self-end">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressPhotos;
