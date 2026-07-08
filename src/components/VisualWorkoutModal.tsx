import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Pause, CheckCircle, Video, Activity, Eye } from 'lucide-react';
import ExerciseAnimation from './ExerciseAnimation';

interface VisualWorkoutEntry {
  exercise: string;
  videoUrl?: string;
  sets?: string;
  reps?: string;
  target?: string;
  instructions?: string[];
  completed?: boolean;
}

interface VisualWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planTitle: string;
  exercises: VisualWorkoutEntry[];
  planContent: string;
  onToggleComplete?: (exerciseName: string) => void;
  completedExercises?: Record<string, boolean>;
  initialIndex?: number;
}

const VisualWorkoutModal: React.FC<VisualWorkoutModalProps> = ({ 
  isOpen, 
  onClose, 
  planTitle, 
  exercises, 
  planContent,
  onToggleComplete,
  completedExercises = {},
  initialIndex = 0
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setTimer(0);
      setIsRunning(false);
      setShowVideo(false);
    }
  }, [isOpen, initialIndex]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setTimer(0);
      setIsRunning(false);
      setShowVideo(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setTimer(0);
      setIsRunning(false);
      setShowVideo(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentExerciseData = exercises[currentIndex];
  if (!currentExerciseData) return null;

  const currentExercise = currentExerciseData.exercise;
  const currentVideoUrl = currentExerciseData.videoUrl;

  // Retrieve step-by-step instructional points and stats dynamically
  const getExerciseMeta = (exerciseName: string) => {
    const name = exerciseName.toLowerCase();
    if (name.includes('bench press')) {
      return {
        target: "Chest",
        sets: currentExerciseData.sets || "4",
        reps: currentExerciseData.reps || "8-10",
        rest: "60s",
        instructions: [
          "Lie flat on the bench with your feet planted firmly on the floor.",
          "Grip the barbell with hands slightly wider than shoulder-width.",
          "Lower the bar slowly to your mid-chest while keeping elbows tucked.",
          "Push the bar back up explosively to starting position, locking out arms."
        ]
      };
    } else if (name.includes('row')) {
      return {
        target: "Back & Lats",
        sets: currentExerciseData.sets || "4",
        reps: currentExerciseData.reps || "10-12",
        rest: "60s",
        instructions: [
          "Sit on the platform with knees slightly bent and grip the attachment handle.",
          "Pull the handle towards your lower abdomen while keeping your back straight.",
          "Squeeze your shoulder blades together tightly at the peak of the movement.",
          "Return the handle slowly under control to the start position."
        ]
      };
    } else if (name.includes('squat')) {
      return {
        target: "Quad & Glutes",
        sets: currentExerciseData.sets || "4",
        reps: currentExerciseData.reps || "12-15",
        rest: "90s",
        instructions: [
          "Place the barbell across your upper back and stand with feet shoulder-width.",
          "Keep your chest high and bend knees to lower hips like sitting on a chair.",
          "Descend until your thighs are parallel or below parallel with the floor.",
          "Drive through your heels to return to the starting standing position."
        ]
      };
    } else if (name.includes('lat pulldown') || name.includes('pulldown')) {
      return {
        target: "Back (Lats)",
        sets: currentExerciseData.sets || "3",
        reps: currentExerciseData.reps || "10-12",
        rest: "45s",
        instructions: [
          "Grip the pulldown bar with a wide overhand grip and sit down securely.",
          "Pull the bar down towards your upper chest while driving elbows down.",
          "Squeeze your lat muscles at the bottom, then extend slowly back up."
        ]
      };
    } else if (name.includes('lateral raise') || name.includes('shoulder')) {
      return {
        target: "Shoulders",
        sets: currentExerciseData.sets || "3",
        reps: currentExerciseData.reps || "12-15",
        rest: "45s",
        instructions: [
          "Stand tall holding dumbbells at your sides with core tight.",
          "Raise dumbbells out to your sides until arms are parallel with floor.",
          "Keep a slight forward tilt of palms and avoid arching lower back.",
          "Lower the weights back down slowly, resisting gravity on the way down."
        ]
      };
    } else if (name.includes('pushdown') || name.includes('tricep')) {
      return {
        target: "Triceps",
        sets: currentExerciseData.sets || "3",
        reps: currentExerciseData.reps || "12-15",
        rest: "45s",
        instructions: [
          "Grip the cable rope attachment keeping elbows pinned at your ribcage.",
          "Push down until your arms are fully extended, pulling the rope ends apart.",
          "Squeeze the triceps at the peak contraction, then slowly return to starting level."
        ]
      };
    } else if (name.includes('curl') || name.includes('bicep')) {
      return {
        target: "Biceps",
        sets: currentExerciseData.sets || "3",
        reps: currentExerciseData.reps || "10-12",
        rest: "45s",
        instructions: [
          "Stand tall holding dumbbells or barbell with an underhand grip.",
          "Keep elbows pinned close to your torso and curl weights toward shoulders.",
          "Squeeze biceps at the top peak, then slowly lower the weights under load."
        ]
      };
    } else if (name.includes('plank')) {
      return {
        target: "Core Strength",
        sets: currentExerciseData.sets || "3",
        reps: currentExerciseData.reps || "45-60s",
        rest: "30s",
        instructions: [
          "Position elbows directly beneath shoulders and raise knees up.",
          "Engage core, glutes, and quadriceps to maintain a straight spine.",
          "Breathe deeply and hold the isometric contraction continuously."
        ]
      };
    } else {
      // Elegant fallback metadata
      return {
        target: currentExerciseData.target || "Target Muscle Group",
        sets: currentExerciseData.sets || "3",
        reps: currentExerciseData.reps || "10-12",
        rest: "60s",
        instructions: [
          "Assume a stable starting position with your core fully engaged.",
          "Execute the movement through its complete and safe range of motion.",
          "Control both the lifting (concentric) and lowering (eccentric) portions.",
          "Breathe rhythmically and maintain strict, upright posture throughout."
        ]
      };
    }
  };

  const meta = getExerciseMeta(currentExercise);
  const isCurrentCompleted = completedExercises[currentExercise] || false;

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    try {
      const workingUrl = url.trim();
      if (workingUrl.includes('youtube.com/embed/') || workingUrl.includes('player.vimeo.com/video/')) {
        return workingUrl;
      }
      const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;
      const match = workingUrl.match(ytRegex);
      if (match && match[1]) {
        let embedUrl = `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1`;
        return embedUrl;
      }
      return workingUrl;
    } catch {
      return url;
    }
  };

  const handleToggleCompleteLocal = () => {
    if (onToggleComplete) {
      onToggleComplete(currentExercise);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="bg-[#070D16] text-[#E2E8F0] border-0 sm:border border-neural-800/60 rounded-none sm:rounded-[2.5rem] w-full max-w-4xl min-h-screen sm:min-h-0 sm:max-h-[85vh] flex flex-col md:flex-row overflow-hidden shadow-[0_20px_50px_rgba(140,82,255,0.15)]">
        
        {/* LEFT COLUMN: Visual Demonstration Hero Container */}
        <div className="relative flex-1 bg-[#03060b] flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-slate-900 min-h-[300px] md:min-h-0">
          
          {/* Close Floating Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 left-4 z-20 p-2.5 bg-black/60 hover:bg-[#8C52FF] text-white rounded-full transition-all active:scale-90 border border-slate-800/80 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Top Indicators & Timer Area */}
          <div className="absolute top-4 right-4 z-20 flex items-center space-x-3">
            <span className="text-[10px] font-mono tracking-widest text-[#8C52FF] bg-[#8C52FF]/10 px-3 py-1 rounded-full border border-[#8C52FF]/20 uppercase font-black">
              Exercise {currentIndex + 1} of {exercises.length}
            </span>
          </div>

          {/* Active Canvas / Screen Area */}
          <div className="w-full max-w-xl aspect-video rounded-[2.5rem] overflow-hidden bg-black/80 border border-slate-900/80 shadow-[inset_0_0_40px_rgba(140,82,255,0.05)] relative flex items-center justify-center p-8 mt-8 mb-6">
            
            {showVideo && (currentVideoUrl || meta.instructions) ? (
              <div className="absolute inset-0 w-full h-full">
                {currentVideoUrl ? (
                  <iframe
                    src={getEmbedUrl(currentVideoUrl)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Real Video Player"
                  ></iframe>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#070D16]">
                    <Video className="w-10 h-10 text-[#8C52FF] mb-2 animate-bounce" />
                    <p className="text-sm font-bold uppercase tracking-wider">Loading video...</p>
                    <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase">Fallback real video stream unavailable.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ExerciseAnimation exerciseName={currentExercise} className="w-[180px] h-[180px] filter drop-shadow-[0_0_20px_rgba(255,51,51,0.25)]" minimal />
                
                {/* Visual pulse glow circles */}
                <div className="absolute rounded-full w-40 h-40 border border-[#ff3333]/10 animate-ping -z-10"></div>
              </div>
            )}

            {/* Media toggle floating pill */}
            {currentVideoUrl && (
              <button 
                onClick={() => setShowVideo(!showVideo)}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 hover:bg-[#8C52FF] text-white border border-slate-800/80 text-[10px] font-mono uppercase tracking-widest font-black px-4 py-2 rounded-full transition-all active:scale-95 flex items-center space-x-1.5 cursor-pointer"
              >
                {showVideo ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-brand-red" />
                    <span>View Loop Animation</span>
                  </>
                ) : (
                  <>
                    <Video className="w-3.5 h-3.5 text-brand-red" />
                    <span>Watch Real Video</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Interactive StopWatch Controller Block */}
          <div className="w-full max-w-sm flex flex-col items-center space-y-3 bg-neutral-950/40 border border-slate-900 px-6 py-4 rounded-3xl">
            <div className="flex items-center space-x-3">
              <Activity className={`w-4 h-4 text-brand-red ${isRunning ? 'animate-pulse text-[#10B981]' : ''}`} />
              <div className="text-3xl font-mono font-black text-white tracking-widest">
                {formatTime(timer)}
              </div>
            </div>
            
            <div className="flex items-center space-x-3 w-full">
              <button 
                onClick={() => setIsRunning(!isRunning)}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-xl font-mono text-[10px] uppercase tracking-widest font-bold transition-all active:scale-95 cursor-pointer ${
                  isRunning 
                    ? 'bg-neutral-800 text-slate-300 hover:bg-neutral-700 border border-slate-700' 
                    : 'bg-[#8C52FF] text-white hover:bg-[#7b3fe6] shadow-[0_0_15px_rgba(140,82,255,0.3)]'
                }`}
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isRunning ? 'Pause' : 'Start Timer'}</span>
              </button>
              <button 
                onClick={() => { setTimer(0); setIsRunning(false); }}
                className="py-2 px-4 rounded-xl font-mono text-[10px] uppercase tracking-widest font-black bg-[#070D16] text-[#E2E8F0] border border-slate-800 hover:bg-neutral-900 transition-all active:scale-95 cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Physical Specifications details */}
        <div className="w-full md:w-[42%] bg-[#0A0F1D] p-8 flex flex-col justify-between overflow-y-auto">
          
          <div className="space-y-6">
            {/* Title & Target */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-brand-red font-black">
                {meta.target}
              </span>
              <h3 className="text-2xl font-display italic font-black uppercase text-white mt-1 leading-tight tracking-wide">
                {currentExercise}
              </h3>
            </div>

            {/* HIGH FIDELITY METRICS TRIO CARD PANEL */}
            <div className="grid grid-cols-3 gap-3 bg-neutral-950/60 p-4 rounded-3xl border border-slate-900/80">
              <div className="text-center flex flex-col justify-center border-r border-slate-900/60 py-1">
                <span className="text-xl font-display font-black text-white italic">{meta.sets}</span>
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-1 font-bold">SETS</span>
              </div>
              <div className="text-center flex flex-col justify-center border-r border-slate-900/60 py-1">
                <span className="text-xl font-display font-black text-white italic">{meta.reps}</span>
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-1 font-bold">REPS</span>
              </div>
              <div className="text-center flex flex-col justify-center py-1">
                <span className="text-xl font-display font-black text-brand-red italic">{meta.rest}</span>
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-1 font-bold">REST</span>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black block">
                How to Perform
              </span>
              <div className="space-y-2 bg-neutral-950/20 p-2 rounded-2xl">
                {meta.instructions.map((step, stepIdx) => (
                  <div key={stepIdx} className="flex items-start text-xs leading-relaxed">
                    <span className="text-[#8C52FF] font-mono font-black mr-2.5 mt-0.5 text-[10px]">
                      {stepIdx + 1}
                    </span>
                    <p className="text-slate-300 font-sans tracking-tight font-medium">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Up Next Preview Panel */}
            {currentIndex < exercises.length - 1 && (
              <div className="p-4 bg-[#070D16] rounded-2xl border border-slate-900 flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-mono uppercase tracking-widest text-slate-500 font-bold block">UP NEXT</span>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-tight mt-0.5 block truncate max-w-[180px]">
                    {exercises[currentIndex + 1].exercise}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </div>
            )}
          </div>

          {/* FOOTER ACTIONS AREA */}
          <div className="pt-6 border-t border-slate-900 mt-8 space-y-3">
            {onToggleComplete && (
              <button 
                onClick={handleToggleCompleteLocal}
                className={`w-full py-4 rounded-2xl font-mono text-xs uppercase tracking-widest font-bold transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer ${
                  isCurrentCompleted
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_4px_20px_rgba(16,185,129,0.25)]'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isCurrentCompleted ? '✓ EXERCISE LOGGED AS COMPLETED' : 'MARK EXERCISE COMPLETE'}</span>
              </button>
            )}

            <div className="flex items-center justify-between space-x-3">
              <button 
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="p-4 rounded-xl bg-neutral-950 border border-slate-800 text-slate-400 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-neutral-950 hover:text-white transition-all cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {currentIndex < exercises.length - 1 ? (
                <button 
                  onClick={handleNext}
                  className="flex-1 py-4 rounded-xl bg-[#8C52FF]/20 hover:bg-[#8C52FF]/30 border border-[#8C52FF]/30 text-white font-mono text-xs uppercase tracking-widest font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Next Exercise</span>
                  <ChevronRight className="w-4 h-4 text-[#8C52FF]" />
                </button>
              ) : (
                <button 
                  onClick={onClose}
                  className="flex-1 py-4 rounded-xl bg-slate-900 border border-[#8C52FF]/30 hover:bg-slate-850 text-white font-mono text-xs uppercase tracking-widest font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4 text-[#10B981]" />
                  <span>Finish Circuit</span>
                </button>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default VisualWorkoutModal;
