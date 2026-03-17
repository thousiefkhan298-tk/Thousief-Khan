import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Pause, CheckCircle } from 'lucide-react';
import ExerciseAnimation from './ExerciseAnimation';

interface VisualWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planTitle: string;
  exercises: string[];
  planContent: string;
}

const VisualWorkoutModal: React.FC<VisualWorkoutModalProps> = ({ isOpen, onClose, planTitle, exercises, planContent }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

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
      setCurrentIndex(0);
      setTimer(0);
      setIsRunning(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setTimer(0);
      setIsRunning(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setTimer(0);
      setIsRunning(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentExercise = exercises[currentIndex];

  // Try to extract context/instructions for the current exercise from the plan content
  // This is a simple heuristic: find the line containing the exercise name
  const extractInstructions = () => {
    if (!currentExercise) return "Follow standard form.";
    const lines = planContent.split('\n');
    const matchingLine = lines.find(line => line.toLowerCase().includes(currentExercise.toLowerCase()));
    return matchingLine || "Perform sets and reps as instructed by your trainer.";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-8">
      <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] w-full max-w-4xl h-full max-h-[800px] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800 bg-neutral-950">
          <div>
            <p className="text-[10px] font-mono text-brand-red uppercase tracking-[0.3em] mb-1">Visual Training Mode</p>
            <h2 className="text-2xl font-display italic uppercase text-white">{planTitle}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded-full text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {exercises.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-10 text-center">
            <div>
              <p className="text-xl font-display italic uppercase text-neutral-500 mb-4">No Visual Exercises Found</p>
              <p className="text-xs font-mono text-neutral-600 uppercase tracking-widest max-w-md mx-auto">
                The current plan does not contain recognizable exercises from our visual database. Please read the text instructions.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Column: Animation & Timer */}
            <div className="flex-1 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-neutral-800 relative bg-neutral-900/50">
              <div className="absolute top-8 left-8">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                  Exercise {currentIndex + 1} of {exercises.length}
                </span>
              </div>
              
              <div className="w-64 h-64 md:w-96 md:h-96 mb-8 flex items-center justify-center">
                <ExerciseAnimation exerciseName={currentExercise} className="w-full h-full" minimal />
              </div>

              <div className="flex flex-col items-center space-y-4">
                <div className="text-5xl font-mono font-bold text-white tracking-wider">
                  {formatTime(timer)}
                </div>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => setIsRunning(!isRunning)}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-full font-mono text-xs uppercase tracking-widest transition-colors ${
                      isRunning ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-brand-red text-white hover:bg-red-700'
                    }`}
                  >
                    {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isRunning ? 'Pause' : 'Start Timer'}</span>
                  </button>
                  <button 
                    onClick={() => { setTimer(0); setIsRunning(false); }}
                    className="px-6 py-3 rounded-full font-mono text-xs uppercase tracking-widest bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Details & Controls */}
            <div className="w-full md:w-1/3 bg-neutral-950 p-8 flex flex-col">
              <div className="flex-1">
                <h3 className="text-3xl font-display italic uppercase text-white mb-6">{currentExercise}</h3>
                
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8">
                  <p className="text-[10px] font-mono text-brand-red uppercase tracking-widest mb-3">Instructions</p>
                  <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                    {extractInstructions()}
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-2">Up Next</p>
                  {exercises.slice(currentIndex + 1, currentIndex + 4).map((ex, idx) => (
                    <div key={idx} className="flex items-center space-x-3 opacity-50">
                      <div className="w-2 h-2 rounded-full bg-neutral-700"></div>
                      <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">{ex}</span>
                    </div>
                  ))}
                  {currentIndex === exercises.length - 1 && (
                    <div className="flex items-center space-x-3 text-emerald-500">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs font-mono uppercase tracking-wider">Workout Complete</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-8 border-t border-neutral-800 mt-auto">
                <button 
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                
                {currentIndex < exercises.length - 1 ? (
                  <button 
                    onClick={handleNext}
                    className="flex-1 mx-4 py-4 rounded-2xl bg-brand-red text-white font-mono text-xs uppercase tracking-widest hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>Next Exercise</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button 
                    onClick={onClose}
                    className="flex-1 mx-4 py-4 rounded-2xl bg-emerald-600 text-white font-mono text-xs uppercase tracking-widest hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Finish Workout</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualWorkoutModal;
