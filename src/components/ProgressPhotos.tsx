import React, { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService.js';
import { ProgressPhoto } from '../types.js';
import { Camera, Plus, Trash2, Calendar, FileText, X, Upload, Maximize2, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  clientId: string;
  isTrainer: boolean;
}

const ProgressPhotos: React.FC<Props> = ({ clientId, isTrainer }) => {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonPhotos, setComparisonPhotos] = useState<ProgressPhoto[]>([]);
  const [postureLoading, setPostureLoading] = useState(false);
  const [postureError, setPostureError] = useState<string | null>(null);

  const handleAnalyzePosture = async (photo: ProgressPhoto) => {
    setPostureLoading(true);
    setPostureError(null);
    try {
      const response = await fetch('/api/posture/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: photo.imageUrl })
      });
      
      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.error || 'Failed to analyze posture');
      }
      
      const result = resData.data;
      
      // Update the progress photo document in Firestore with posture assessment
      const updatedPhoto = {
        ...photo,
        postureAnalysisResult: result
      };
      
      await firebaseService.saveProgressPhoto(updatedPhoto);
      
      // Set local state to show findings immediately
      setSelectedPhoto(updatedPhoto);
    } catch (err: any) {
      console.error("Error analyzing posture:", err);
      setPostureError(err.message || 'Posture analysis failed. Please try again.');
    } finally {
      setPostureLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToProgressPhotos(clientId, (photosData) => {
      // Sort by date descending
      setPhotos(photosData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });
    return () => unsubscribe();
  }, [clientId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    try {
      const fileName = `${clientId}_${Date.now()}_${selectedFile.name}`;
      const storagePath = `progress_photos/${clientId}/${fileName}`;
      const imageUrl = await firebaseService.uploadFile(selectedFile, storagePath);

      await firebaseService.saveProgressPhoto({
        clientId,
        imageUrl,
        notes,
        date: new Date().toISOString()
      });

      setSelectedFile(null);
      setPreviewUrl(null);
      setNotes('');
      setShowForm(false);
    } catch (error) {
      console.error("Error saving photo:", error);
      alert("Failed to upload photo. Please check your connection and storage permissions.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (photo: ProgressPhoto) => {
    if (!confirm("Confirm deletion of this progress record? Irreversible action.")) return;
    try {
      await firebaseService.deleteProgressPhoto(photo.id, photo.imageUrl);
      if (selectedPhoto?.id === photo.id) setSelectedPhoto(null);
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("Failed to delete record.");
    }
  };

  const toggleComparison = (photo: ProgressPhoto) => {
    if (comparisonPhotos.find(p => p.id === photo.id)) {
      setComparisonPhotos(prev => prev.filter(p => p.id !== photo.id));
    } else if (comparisonPhotos.length < 2) {
      setComparisonPhotos(prev => [...prev, photo]);
    } else {
      setComparisonPhotos([comparisonPhotos[1], photo]);
    }
  };

  return (
    <div className="bg-neutral-800/50 border border-neutral-700 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="p-8 border-b border-neutral-700 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-brand-red/10 rounded-2xl border border-brand-red/20 shadow-[0_0_15px_rgba(255,0,0,0.1)]">
            <Camera className="w-6 h-6 text-brand-red" />
          </div>
          <div>
            <h3 className="text-3xl font-display italic uppercase tracking-wider text-white">Progress Evolution</h3>
            <p className="text-[10px] font-mono text-white font-bold uppercase tracking-widest mt-1">Visual Transformation History</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {photos.length >= 2 && (
            <button
              onClick={() => setComparisonMode(!comparisonMode)}
              className={`px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-widest transition-all ${
                comparisonMode ? 'bg-brand-red text-white' : 'bg-neutral-800 text-neutral-50 font-bold hover:text-white'
              }`}
            >
              {comparisonMode ? 'Exit Compare' : 'Compare Mode'}
            </button>
          )}
          {isTrainer && (
            <button 
              onClick={() => setShowForm(!showForm)}
              className="bg-brand-red text-white px-6 py-2.5 rounded-2xl font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all flex items-center space-x-2 shadow-[0_0_15px_rgba(255,0,0,0.2)] hover:shadow-[0_0_20px_rgba(255,0,0,0.4)]"
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{showForm ? 'Cancel' : 'Upload Data'}</span>
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-neutral-800/30 border-b border-neutral-700"
          >
            <div className="p-10">
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Upload Zone */}
                <div className="space-y-4">
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold mb-2">Payload Selection</label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="photo-upload"
                      required
                    />
                    <label 
                      htmlFor="photo-upload"
                      className={`
                        flex flex-col items-center justify-center p-12 border-2 border-dashed 
                        rounded-3xl cursor-pointer transition-all aspect-video
                        ${previewUrl ? 'border-brand-red bg-neutral-800' : 'border-neutral-700 bg-neutral-950 hover:border-neutral-500 hover:bg-neutral-800'}
                      `}
                    >
                      {previewUrl ? (
                        <div className="relative w-full h-full">
                          <img src={previewUrl} alt="Preview" className="w-full h-full object-contain rounded-xl" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white font-mono text-[10px] uppercase tracking-widest">Change Image</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="p-4 bg-neutral-800 rounded-full mb-4">
                            <Upload className="w-8 h-8 text-neutral-50 font-bold" />
                          </div>
                          <span className="text-neutral-50 font-bold font-mono text-[10px] uppercase tracking-widest">Deploy Visual File</span>
                          <span className="text-neutral-50 font-bold font-mono text-[8px] uppercase tracking-[0.2em] mt-2">JPG, PNG or WEBP</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Notes & Metadata */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold mb-4">Tactical Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-2xl p-6 text-white font-mono text-sm focus:border-brand-red focus:outline-none transition-colors min-h-[160px]"
                      placeholder="Enter transformation details, body fat estimations, or specific focus areas..."
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading || !selectedFile}
                    className={`w-full py-4 rounded-2xl font-mono text-xs font-bold uppercase tracking-[0.3em] transition-all
                      ${loading || !selectedFile ? 'bg-neutral-800 text-neutral-50 font-bold grayscale' : 'bg-white text-black hover:bg-brand-red hover:text-white'}
                    `}
                  >
                    {loading ? 'Initializing Upload...' : 'Commit to Database'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid */}
      <div className="p-10">
        {photos.length === 0 ? (
          <div className="p-20 text-center border-2 border-dashed border-neutral-700 rounded-[3rem]">
            <Camera className="w-12 h-12 text-white font-bold font-bold mx-auto mb-6 opacity-50" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-50 font-bold italic">No visual biometric data recorded in this frequency.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {comparisonMode && (
              <div className="bg-neutral-800/20 rounded-[2.5rem] border border-brand-red/20 overflow-hidden mb-16">
                <div className="p-6 border-b border-neutral-700 flex justify-between items-center bg-neutral-800/50">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-brand-red font-bold">A/B Comparison Node</span>
                  <p className="text-[8px] font-mono text-white font-bold uppercase tracking-widest">
                    {comparisonPhotos.length === 2 ? 'Analysis Ready' : `Select ${2 - comparisonPhotos.length} more data points`}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-neutral-800">
                  {comparisonPhotos.length > 0 ? (
                    comparisonPhotos.map(p => (
                      <div key={p.id} className="relative aspect-[4/3] bg-neutral-800">
                        <img src={p.imageUrl} alt="Compare" className="w-full h-full object-cover" />
                        <div className="absolute top-6 left-6 px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10">
                          <p className="text-white font-mono text-[10px] uppercase tracking-widest">{new Date(p.date).toLocaleDateString()}</p>
                        </div>
                        <button 
                          onClick={() => setComparisonPhotos(prev => prev.filter(photo => photo.id !== p.id))}
                          className="absolute top-6 right-6 p-2 bg-black/60 rounded-xl text-white hover:text-brand-red transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 p-20 text-center flex flex-col items-center">
                      <Maximize2 className="w-8 h-8 text-white font-bold font-bold mb-4" />
                      <p className="text-white font-bold font-mono text-[10px] uppercase tracking-widest">Pending Phase Selection</p>
                    </div>
                  )}
                  {comparisonPhotos.length === 1 && (
                    <div className="aspect-[4/3] bg-neutral-800/50 flex flex-col items-center justify-center border-l border-neutral-700">
                      <p className="text-neutral-50 font-bold font-mono text-[8px] uppercase tracking-widest italic">Select second checkpoint below</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8`}>
              {photos.map((photo, index) => {
                const isCompared = comparisonPhotos.some(p => p.id === photo.id);
                return (
                  <motion.div 
                    layout
                    key={photo.id} 
                    className={`relative flex flex-col group rounded-[2rem] overflow-hidden bg-neutral-800/40 border transition-all duration-500
                      ${isCompared ? 'border-brand-red ring-4 ring-brand-red/20 shadow-[0_0_30px_rgba(255,0,0,0.15)]' : 'border-neutral-700 hover:border-neutral-700'}
                    `}
                  >
                    {/* Image Layer */}
                    <div className="relative aspect-[3/4] overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-700">
                      <img 
                        src={photo.imageUrl} 
                        alt="Progress Evolution" 
                        className="w-full h-full object-cover transform scale-110 group-hover:scale-100 transition-transform duration-1000" 
                        referrerPolicy="no-referrer" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                      
                      {/* Interaction Overlays */}
                      <div className="absolute inset-0 flex flex-col justify-between p-6 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                        <div className="flex justify-between items-start">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPhoto(photo);
                            }}
                            className="p-3 bg-black/60 backdrop-blur-md rounded-2xl text-white hover:text-brand-red transition-colors border border-white/10"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                          {comparisonMode ? (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleComparison(photo);
                              }}
                              className={`p-3 backdrop-blur-md rounded-2xl border transition-all ${
                                isCompared ? 'bg-brand-red text-white border-brand-red' : 'bg-black/60 text-white border-white/10'
                              }`}
                            >
                              <Plus className={`w-4 h-4 transform transition-transform ${isCompared ? 'rotate-45' : 'rotate-0'}`} />
                            </button>
                          ) : isTrainer && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(photo);
                              }}
                              className="p-3 bg-black/60 backdrop-blur-md rounded-2xl text-white hover:text-brand-red transition-colors border border-white/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Date Badge */}
                      <div className="absolute bottom-6 left-6 right-6">
                        <div className="flex items-center space-x-2 mb-1">
                          <Calendar className="w-3 h-3 text-brand-red" />
                          <span className="text-[10px] font-mono text-white tracking-widest">{new Date(photo.date).toLocaleDateString()}</span>
                        </div>
                        {index === 0 && (
                          <span className="px-2 py-0.5 bg-brand-red text-white text-[8px] font-mono uppercase tracking-widest rounded-md">Newest Scan</span>
                        )}
                      </div>
                    </div>

                    {/* Metadata Section */}
                    {photo.notes && (
                      <div className="p-6 bg-neutral-800/50 border-t border-neutral-700">
                        <div className="flex items-start space-x-3">
                          <FileText className="w-3 h-3 text-white font-bold mt-0.5 flex-shrink-0" />
                          <p className="text-[9px] font-mono text-neutral-50 font-bold leading-relaxed line-clamp-3 italic">
                            {photo.notes}
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox / Fullscreen Viewer */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-20"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="relative w-full max-w-7xl h-full flex flex-col md:flex-row bg-neutral-800 rounded-[3rem] overflow-hidden border border-neutral-700 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Massive Image Display */}
              <div className="flex-1 bg-black relative group overflow-hidden">
                <img src={selectedPhoto.imageUrl} alt="Fullscreen Evolution" className="w-full h-full object-contain" />
                <button 
                  onClick={() => setSelectedPhoto(null)}
                  className="absolute top-8 right-8 p-4 bg-white/10 hover:bg-brand-red rounded-full text-white transition-all backdrop-blur-md"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Analysis Sidebar */}
              <div className="w-full md:w-[400px] border-l border-neutral-700 flex flex-col bg-neutral-800">
                <div className="p-10 border-b border-neutral-700 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-brand-red/10 rounded-2xl flex items-center justify-center border border-brand-red/20 shadow-[0_0_20px_rgba(255,0,0,0.1)]">
                    <Camera className="w-6 h-6 text-brand-red" />
                  </div>
                  <div>
                    <h4 className="text-xl font-display uppercase italic tracking-[0.2em] text-white">Capture Analysis</h4>
                    <p className="text-[8px] font-mono text-white font-bold uppercase tracking-widest">ID: {selectedPhoto.id.slice(0, 12)}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-8">
                  <div className="p-6 bg-neutral-800/30 rounded-3xl border border-neutral-700">
                    <p className="text-[8px] font-mono text-white font-bold uppercase tracking-widest mb-2">Timestamp Verification</p>
                    <p className="text-sm text-white font-mono">{new Date(selectedPhoto.date).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}</p>
                  </div>

                  <div className="p-6 bg-neutral-800/30 rounded-3xl border border-neutral-700">
                    <p className="text-[8px] font-mono text-white font-bold uppercase tracking-widest mb-4">Tactical Intelligence</p>
                    {selectedPhoto.notes ? (
                      <p className="text-xs font-mono text-white font-bold leading-relaxed whitespace-pre-wrap">{selectedPhoto.notes}</p>
                    ) : (
                      <p className="text-[10px] font-mono text-neutral-50 font-bold uppercase italic">No metadata logged for this scan.</p>
                    )}
                  </div>

                  {/* AI Posture Checker Module */}
                  <div className="p-6 bg-neutral-950/40 rounded-3xl border border-neutral-700 space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                      <p className="text-[10px] font-mono text-white font-bold uppercase tracking-widest">AI POSTURE CHECKER</p>
                      <span className="text-[8px] font-mono bg-red-500/10 text-brand-red font-bold px-2 py-0.5 rounded uppercase">Gemini Vision</span>
                    </div>

                    {(selectedPhoto as any).postureAnalysisResult ? (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-neutral-900 border border-neutral-850 p-3 rounded-xl text-center">
                            <p className="text-[8px] font-mono text-neutral-400 uppercase">Posture Score</p>
                            <p className="text-2xl font-display italic text-white mt-1">
                              {(selectedPhoto as any).postureAnalysisResult.postureScore || 100}%
                            </p>
                          </div>
                          <div className="bg-neutral-900 border border-neutral-850 p-3 rounded-xl text-center">
                            <p className="text-[8px] font-mono text-neutral-400 uppercase">Mobility Score</p>
                            <p className="text-2xl font-display italic text-white mt-1">
                              {(selectedPhoto as any).postureAnalysisResult.mobilityScore || 100}%
                            </p>
                          </div>
                        </div>

                        {(selectedPhoto as any).postureAnalysisResult.summary && (
                          <div className="bg-neutral-900/40 p-4 border border-neutral-850 rounded-xl">
                            <p className="text-[8px] font-mono text-neutral-400 uppercase mb-1">SUMMARY</p>
                            <p className="text-xs font-mono text-neutral-200 leading-relaxed">{(selectedPhoto as any).postureAnalysisResult.summary}</p>
                          </div>
                        )}

                        {(selectedPhoto as any).postureAnalysisResult.findings && (selectedPhoto as any).postureAnalysisResult.findings.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-[8px] font-mono text-neutral-400 uppercase">Findings:</p>
                            {(selectedPhoto as any).postureAnalysisResult.findings.map((f: any, i: number) => (
                              <div key={i} className="bg-neutral-900 border border-neutral-855 p-4 rounded-xl space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-mono text-white font-bold">{f.issue}</span>
                                  <span className={`text-[8px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                                    f.severity === 'High' ? 'bg-red-500/10 text-red-400' :
                                    f.severity === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                                    'bg-emerald-500/10 text-emerald-400'
                                  }`}>
                                    {f.severity}
                                  </span>
                                </div>
                                {f.rehabExercises && f.rehabExercises.length > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-[8px] font-mono text-neutral-500 uppercase font-bold">Suggested Corrections:</p>
                                    <ul className="list-disc list-inside space-y-1 text-[10px] font-mono text-neutral-300">
                                      {f.rehabExercises.map((ex: string, k: number) => (
                                        <li key={k} className="leading-relaxed">{ex}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => handleAnalyzePosture(selectedPhoto)}
                          disabled={postureLoading}
                          className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-mono text-[9px] uppercase tracking-widest font-bold rounded-xl transition-all"
                        >
                          {postureLoading ? 'Re-Scanning...' : 'Re-Scan Posture'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 py-2">
                        <p className="text-[10px] font-mono text-neutral-400 leading-relaxed text-center">
                          Scan this physique photo with Gemini Multimodal AI to assess posture alignment, neck tilting, shoulder curves, and pelvic balance.
                        </p>
                        
                        {postureError && (
                          <p className="text-[10px] font-mono text-red-400 font-bold text-center bg-red-400/5 p-3 border border-red-500/10 rounded-xl">
                            {postureError}
                          </p>
                        )}

                        <button
                          onClick={() => handleAnalyzePosture(selectedPhoto)}
                          disabled={postureLoading}
                          className={`w-full py-3 text-white rounded-xl font-mono text-[9px] uppercase tracking-widest font-bold transition-all flex items-center justify-center space-x-2 shadow-lg
                            ${postureLoading 
                              ? 'bg-neutral-850 cursor-not-allowed opacity-50' 
                              : 'bg-brand-red hover:bg-red-600 shadow-red-500/5'
                            }
                          `}
                        >
                          {postureLoading ? (
                            <>
                              <Plus className="w-4 h-4 animate-spin text-white" />
                              <span>AI Analyzing Alignment...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 text-white" />
                              <span>Run AI Posture Check</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-auto p-10 bg-neutral-950/50 flex flex-col space-y-4">
                  {isTrainer && (
                    <button 
                      onClick={() => handleDelete(selectedPhoto)}
                      className="w-full py-4 bg-brand-red/10 border border-brand-red/20 text-brand-red hover:bg-brand-red hover:text-white transition-all rounded-2xl font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
                    >
                      Purge Data Entry
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedPhoto(null)}
                    className="w-full py-4 bg-neutral-800 hover:bg-neutral-700 text-white transition-all rounded-2xl font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
                  >
                    Close Analyzer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProgressPhotos;
