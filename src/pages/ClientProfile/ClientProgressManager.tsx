import React, { useState } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Calendar, 
  Camera, 
  Trash2, 
  Edit2, 
  Check, 
  AlertCircle,
  Lock,
  Eye,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ProgressRecord } from '../../types';
import { firebaseService } from '../../services/firebaseService';

interface ClientProgressManagerProps {
  clientId: string;
  progressRecords: ProgressRecord[];
  userData: any;
}

export const ClientProgressManager: React.FC<ClientProgressManagerProps> = ({
  clientId,
  progressRecords,
  userData
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    reviewDate: format(new Date(), 'yyyy-MM-dd'),
    weight: '',
    chest: '',
    waist: '',
    hips: '',
    arms: '',
    thighs: '',
    neck: '',
    exercise: '',
    exerciseWeight: '',
    exerciseReps: '',
    progressPhotoUrl: '',
    photoConsentRecorded: true,
    clientVisibleFeedback: '',
    privateTrainerNotes: ''
  });

  const handleEdit = (record: ProgressRecord) => {
    setEditingId(record.id);
    setFormData({
      reviewDate: record.reviewDate || record.createdAt.slice(0, 10),
      weight: record.weight ? String(record.weight) : '',
      chest: record.measurements?.chest || '',
      waist: record.measurements?.waist || '',
      hips: record.measurements?.hips || '',
      arms: record.measurements?.arms || '',
      thighs: record.measurements?.thighs || '',
      neck: record.measurements?.neck || '',
      exercise: record.strengthResults?.[0]?.exercise || '',
      exerciseWeight: record.strengthResults?.[0]?.weight || '',
      exerciseReps: record.strengthResults?.[0]?.reps || '',
      progressPhotoUrl: record.progressPhotoUrl || '',
      photoConsentRecorded: record.photoConsentRecorded ?? true,
      clientVisibleFeedback: record.clientVisibleFeedback || '',
      privateTrainerNotes: record.privateTrainerNotes || ''
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: any = {
        id: editingId || undefined,
        clientId,
        reviewDate: formData.reviewDate,
        weight: formData.weight ? Number(formData.weight) : undefined,
        measurements: {
          chest: formData.chest || undefined,
          waist: formData.waist || undefined,
          hips: formData.hips || undefined,
          arms: formData.arms || undefined,
          thighs: formData.thighs || undefined,
          neck: formData.neck || undefined,
        },
        strengthResults: formData.exercise ? [{
          exercise: formData.exercise,
          weight: formData.exerciseWeight,
          reps: formData.exerciseReps
        }] : [],
        progressPhotoUrl: formData.progressPhotoUrl || undefined,
        photoConsentRecorded: formData.photoConsentRecorded,
        clientVisibleFeedback: formData.clientVisibleFeedback,
        privateTrainerNotes: formData.privateTrainerNotes,
        createdBy: userData?.uid || 'trainer'
      };

      await firebaseService.saveProgressRecord(payload);
      setShowForm(false);
      setEditingId(null);
      setFormData({
        reviewDate: format(new Date(), 'yyyy-MM-dd'),
        weight: '',
        chest: '',
        waist: '',
        hips: '',
        arms: '',
        thighs: '',
        neck: '',
        exercise: '',
        exerciseWeight: '',
        exerciseReps: '',
        progressPhotoUrl: '',
        photoConsentRecorded: true,
        clientVisibleFeedback: '',
        privateTrainerNotes: ''
      });
    } catch (err: any) {
      alert('Failed to save progress review: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this progress review?')) return;
    try {
      await firebaseService.deleteProgressRecord(id);
    } catch (err: any) {
      alert('Failed to delete progress record: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header */}
      <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 flex justify-between items-center shadow-xl">
        <div>
          <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest block">
            Trainer-Managed Biometrics & Reviews
          </span>
          <h3 className="text-xl font-display font-bold uppercase text-white tracking-tight mt-0.5">
            Physical Progress & Strength Checkpoints
          </h3>
          <p className="text-xs text-neutral-400 font-mono mt-0.5">
            Record weight, measurements, performance results, client feedback, and private trainer notes.
          </p>
        </div>

        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
          }}
          className="px-5 py-2.5 bg-brand-red hover:bg-red-700 text-white font-mono text-xs uppercase font-bold tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{showForm ? 'Cancel' : 'Record Progress Review'}</span>
        </button>
      </div>

      {/* Progress Entry Form */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-[#18181D] border-2 border-amber-500/40 rounded-2xl p-6 space-y-6 shadow-2xl animate-in slide-in-from-top-4 duration-200">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
            <h4 className="text-sm font-bold uppercase font-display text-white">
              {editingId ? 'Edit Progress Review' : 'New Client Progress Review'}
            </h4>
            <span className="text-[10px] font-mono text-neutral-400 uppercase bg-neutral-900 px-2 py-1 rounded">
              Secure Trainer Log
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1.5 font-bold">
                Review Date *
              </label>
              <input
                type="date"
                required
                value={formData.reviewDate}
                onChange={(e) => setFormData({ ...formData, reviewDate: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono focus:border-brand-red outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1.5 font-bold">
                Body Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g., 74.5"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono focus:border-brand-red outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1.5 font-bold">
                Progress Photo URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={formData.progressPhotoUrl}
                onChange={(e) => setFormData({ ...formData, progressPhotoUrl: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono focus:border-brand-red outline-none"
              />
            </div>
          </div>

          {/* Body Measurements */}
          <div className="space-y-2 border-t border-neutral-800 pt-4">
            <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold block">
              Circumference Measurements (cm)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div>
                <label className="block text-[9px] font-mono uppercase text-neutral-500 mb-1">Chest</label>
                <input
                  type="text"
                  placeholder="cm"
                  value={formData.chest}
                  onChange={(e) => setFormData({ ...formData, chest: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-neutral-500 mb-1">Waist</label>
                <input
                  type="text"
                  placeholder="cm"
                  value={formData.waist}
                  onChange={(e) => setFormData({ ...formData, waist: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-neutral-500 mb-1">Hips</label>
                <input
                  type="text"
                  placeholder="cm"
                  value={formData.hips}
                  onChange={(e) => setFormData({ ...formData, hips: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-neutral-500 mb-1">Arms</label>
                <input
                  type="text"
                  placeholder="cm"
                  value={formData.arms}
                  onChange={(e) => setFormData({ ...formData, arms: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-neutral-500 mb-1">Thighs</label>
                <input
                  type="text"
                  placeholder="cm"
                  value={formData.thighs}
                  onChange={(e) => setFormData({ ...formData, thighs: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-neutral-500 mb-1">Neck</label>
                <input
                  type="text"
                  placeholder="cm"
                  value={formData.neck}
                  onChange={(e) => setFormData({ ...formData, neck: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-white text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Strength / Performance Result */}
          <div className="space-y-2 border-t border-neutral-800 pt-4">
            <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold block">
              Strength / Performance Benchmark Result
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[9px] font-mono uppercase text-neutral-500 mb-1">Exercise Name</label>
                <input
                  type="text"
                  placeholder="e.g., Barbell Back Squat"
                  value={formData.exercise}
                  onChange={(e) => setFormData({ ...formData, exercise: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-neutral-500 mb-1">Weight / Load</label>
                <input
                  type="text"
                  placeholder="e.g., 90 kg"
                  value={formData.exerciseWeight}
                  onChange={(e) => setFormData({ ...formData, exerciseWeight: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-neutral-500 mb-1">Reps Achieved</label>
                <input
                  type="text"
                  placeholder="e.g., 8 reps"
                  value={formData.exerciseReps}
                  onChange={(e) => setFormData({ ...formData, exerciseReps: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-white text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Feedback & Notes: STRICT SEPARATION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-neutral-800 pt-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-emerald-400 mb-1.5 font-bold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Client-Visible Feedback *</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Feedback visible directly to client on their dashboard (e.g. Great progressive overload this month on squats. Keep hitting hydration targets)."
                value={formData.clientVisibleFeedback}
                onChange={(e) => setFormData({ ...formData, clientVisibleFeedback: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-amber-400 mb-1.5 font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Private Trainer Notes (Confidential)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Private observations NEVER visible to client (e.g. Watch knee valgus during heavy sets; check hip mobility next session)."
                value={formData.privateTrainerNotes}
                onChange={(e) => setFormData({ ...formData, privateTrainerNotes: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-xs font-mono focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-brand-red hover:bg-red-700 disabled:opacity-50 text-white font-mono text-xs font-bold uppercase rounded-xl transition-all shadow-md cursor-pointer"
            >
              {isSaving ? 'Saving...' : (editingId ? 'Update Review' : 'Save Progress Review')}
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h4 className="text-sm font-bold uppercase font-display text-white border-b border-neutral-800 pb-3">
          Progress Checkpoints ({progressRecords.length})
        </h4>

        {progressRecords.length === 0 ? (
          <p className="text-xs text-neutral-500 font-mono text-center py-8">
            No progress reviews recorded yet for this client. Click "Record Progress Review" to log the initial checkpoint.
          </p>
        ) : (
          <div className="space-y-4">
            {progressRecords.map(record => (
              <div key={record.id} className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-4 hover:border-neutral-700 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 pb-3 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold font-display uppercase text-white">
                      Review: {record.reviewDate || record.createdAt.slice(0, 10)}
                    </span>
                    {record.weight && (
                      <span className="text-xs font-mono font-bold text-amber-400 bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800">
                        {record.weight} kg
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(record)}
                      className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="p-1.5 bg-neutral-800 hover:bg-rose-900/40 text-neutral-300 hover:text-rose-400 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Measurements */}
                {record.measurements && Object.values(record.measurements).some(Boolean) && (
                  <div className="flex flex-wrap gap-2 text-xs font-mono">
                    {record.measurements.chest && <span className="bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800">Chest: {record.measurements.chest}cm</span>}
                    {record.measurements.waist && <span className="bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800">Waist: {record.measurements.waist}cm</span>}
                    {record.measurements.hips && <span className="bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800">Hips: {record.measurements.hips}cm</span>}
                    {record.measurements.arms && <span className="bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800">Arms: {record.measurements.arms}cm</span>}
                    {record.measurements.thighs && <span className="bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800">Thighs: {record.measurements.thighs}cm</span>}
                    {record.measurements.neck && <span className="bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800">Neck: {record.measurements.neck}cm</span>}
                  </div>
                )}

                {/* Strength */}
                {record.strengthResults && record.strengthResults.length > 0 && (
                  <div className="text-xs font-mono text-neutral-300 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                    Strength: <strong className="text-white">{record.strengthResults[0].exercise}</strong> — {record.strengthResults[0].weight} ({record.strengthResults[0].reps})
                  </div>
                )}

                {/* Feedback */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  {record.clientVisibleFeedback && (
                    <div className="bg-emerald-950/20 border border-emerald-800/30 p-3 rounded-xl space-y-1">
                      <span className="text-[9px] text-emerald-400 font-bold uppercase block">Client-Visible Feedback:</span>
                      <p className="text-neutral-200 italic">"{record.clientVisibleFeedback}"</p>
                    </div>
                  )}

                  {record.privateTrainerNotes && (
                    <div className="bg-amber-950/20 border border-amber-800/30 p-3 rounded-xl space-y-1">
                      <span className="text-[9px] text-amber-400 font-bold uppercase block flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>Private Trainer Notes (Hidden from Client):</span>
                      </span>
                      <p className="text-neutral-200 italic">"{record.privateTrainerNotes}"</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
