import React, { useState } from 'react';
import { 
  Dumbbell, 
  Utensils, 
  Calendar, 
  Clock, 
  ExternalLink, 
  Play, 
  Info, 
  Archive, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  Flame,
  Droplet
} from 'lucide-react';
import { WorkoutPlan, DietPlan } from '../../../types';
import ExerciseAnimation from '../../../components/ExerciseAnimation';

interface ClientMyPlanViewProps {
  activeWorkoutPlan: WorkoutPlan | null;
  workoutPlans: WorkoutPlan[];
  activeDietPlan: DietPlan | null;
  dietPlans: DietPlan[];
  initialSubTab?: 'workout' | 'diet';
}

export const ClientMyPlanView: React.FC<ClientMyPlanViewProps> = ({
  activeWorkoutPlan,
  workoutPlans,
  activeDietPlan,
  dietPlans,
  initialSubTab = 'workout'
}) => {
  const [subTab, setSubTab] = useState<'workout' | 'diet'>(initialSubTab);
  const [selectedDemoExercise, setSelectedDemoExercise] = useState<string | null>(null);
  const [expandedArchiveWorkout, setExpandedArchiveWorkout] = useState<string | null>(null);
  const [expandedArchiveDiet, setExpandedArchiveDiet] = useState<string | null>(null);

  // Archived plans (previous versions)
  const archivedWorkouts = workoutPlans.filter(p => p.id !== activeWorkoutPlan?.id || p.isArchived);
  const archivedDiets = dietPlans.filter(p => p.id !== activeDietPlan?.id || p.isArchived);

  return (
    <div className="space-y-6 pb-12 font-sans">
      
      {/* Tab Switcher Header */}
      <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono text-brand-red font-bold uppercase tracking-widest block">
            Trainer-Assigned Regimens
          </span>
          <h2 className="text-xl sm:text-2xl font-display font-bold uppercase text-white tracking-tight mt-0.5">
            My Training & Nutrition Plan
          </h2>
          <p className="text-xs text-neutral-400 font-mono mt-0.5">
            Your customized regimen formulated and updated directly by your certified trainer.
          </p>
        </div>

        {/* Toggle Pills */}
        <div className="flex bg-neutral-900 border border-neutral-800 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setSubTab('workout')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              subTab === 'workout'
                ? 'bg-brand-red text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Workout Plan</span>
          </button>
          <button
            onClick={() => setSubTab('diet')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              subTab === 'diet'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Diet Plan</span>
          </button>
        </div>
      </div>

      {/* Demo Modal for Exercise Video / Animation */}
      {selectedDemoExercise && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h4 className="text-sm font-bold uppercase font-display text-white">{selectedDemoExercise}</h4>
              <button
                onClick={() => setSelectedDemoExercise(null)}
                className="text-neutral-400 hover:text-white text-xs font-mono px-2 py-1 bg-neutral-800 rounded cursor-pointer"
              >
                Close ✕
              </button>
            </div>
            <div className="flex justify-center p-4 bg-black/40 rounded-xl">
              <ExerciseAnimation exerciseName={selectedDemoExercise} className="w-48 h-48" />
            </div>
            <p className="text-xs text-neutral-400 font-mono text-center">
              Maintain strict form, engage stabilizing muscle groups, and control eccentric tempo.
            </p>
          </div>
        </div>
      )}

      {/* 1. WORKOUT PLAN SUB-VIEW */}
      {subTab === 'workout' && (
        <div className="space-y-8 animate-in fade-in-50 duration-200">
          
          {/* Active Workout Card */}
          {activeWorkoutPlan ? (
            <div className="bg-[#141417] border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-neutral-900 to-[#18181D] border-b border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase">
                      Current Published Plan (v{activeWorkoutPlan.version || 1})
                    </span>
                    {activeWorkoutPlan.startDate && (
                      <span className="text-neutral-400 text-[10px] font-mono">
                        Valid: {activeWorkoutPlan.startDate} {activeWorkoutPlan.endDate ? `to ${activeWorkoutPlan.endDate}` : ''}
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white">
                    {activeWorkoutPlan.title}
                  </h3>
                  {activeWorkoutPlan.trainingDays && activeWorkoutPlan.trainingDays.length > 0 && (
                    <div className="flex items-center gap-2 text-xs font-mono text-neutral-300 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-brand-red" />
                      <span>Training Days: <strong className="text-white">{activeWorkoutPlan.trainingDays.join(', ')}</strong></span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-neutral-900/90 border border-neutral-800 rounded-xl text-right">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase block">Total Exercises</span>
                  <span className="text-lg font-bold font-display text-white">
                    {activeWorkoutPlan.exercises?.length || activeWorkoutPlan.sections?.length || 0} Prescribed
                  </span>
                </div>
              </div>

              {/* Trainer Instructions */}
              {activeWorkoutPlan.trainerInstructions && (
                <div className="p-4 bg-neutral-900/40 border-b border-neutral-800 flex items-start gap-3">
                  <Info className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-white uppercase font-mono text-[10px]">Trainer Instructions</span>
                    <p className="text-neutral-300 leading-relaxed">{activeWorkoutPlan.trainerInstructions}</p>
                  </div>
                </div>
              )}

              {/* Exercises List (Structured) */}
              <div className="p-6 space-y-4">
                {activeWorkoutPlan.exercises && activeWorkoutPlan.exercises.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold">
                      Prescribed Exercises & Loading
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {activeWorkoutPlan.exercises.map((ex, idx) => (
                        <div
                          key={idx}
                          className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-neutral-700 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 font-mono text-xs flex items-center justify-center font-bold">
                                {idx + 1}
                              </span>
                              <h5 className="text-sm font-bold text-white uppercase tracking-wider">{ex.name}</h5>
                              <button
                                onClick={() => setSelectedDemoExercise(ex.name)}
                                className="px-2 py-0.5 bg-neutral-800 hover:bg-brand-red text-neutral-300 hover:text-white rounded text-[10px] font-mono uppercase flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Play className="w-2.5 h-2.5" />
                                <span>Demo</span>
                              </button>
                            </div>

                            {/* Details row: Sets, Reps, Rest, Tempo, Load */}
                            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-neutral-400 pl-8">
                              <span>Sets: <strong className="text-white">{ex.sets}</strong></span>
                              <span>•</span>
                              <span>Reps: <strong className="text-white">{ex.reps}</strong></span>
                              {ex.rest && (
                                <>
                                  <span>•</span>
                                  <span>Rest: <strong className="text-white">{ex.rest}</strong></span>
                                </>
                              )}
                              {ex.tempo && (
                                <>
                                  <span>•</span>
                                  <span>Tempo: <strong className="text-white">{ex.tempo}</strong></span>
                                </>
                              )}
                              {ex.prescribedLoad && (
                                <>
                                  <span>•</span>
                                  <span>Load: <strong className="text-white">{ex.prescribedLoad}</strong></span>
                                </>
                              )}
                            </div>

                            {/* Trainer note / instructions for exercise */}
                            {ex.instructions && (
                              <p className="text-xs text-neutral-400 italic pl-8 mt-1">
                                Note: {ex.instructions}
                              </p>
                            )}

                            {/* Alternative exercise */}
                            {ex.alternatives && (
                              <p className="text-[11px] text-amber-400 font-mono pl-8 mt-0.5">
                                Alternative: {ex.alternatives}
                              </p>
                            )}
                          </div>

                          {ex.demoLink && (
                            <a
                              href={ex.demoLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-mono flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                            >
                              <span>Video</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : activeWorkoutPlan.sections && activeWorkoutPlan.sections.length > 0 ? (
                  <div className="space-y-4">
                    {activeWorkoutPlan.sections.map((section, idx) => (
                      <div key={idx} className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-2">
                        <h5 className="text-xs font-mono uppercase tracking-wider font-bold text-brand-red">
                          {section.title}
                        </h5>
                        <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-line font-mono">
                          {section.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 font-mono">No exercise breakdown provided.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-12 text-center space-y-3 shadow-lg">
              <Dumbbell className="w-12 h-12 text-neutral-600 mx-auto" />
              <h3 className="text-lg font-bold text-white uppercase font-display">
                Your trainer has not assigned a workout yet.
              </h3>
              <p className="text-xs text-neutral-400 font-mono max-w-md mx-auto">
                Once your coach finishes assessing your intake form, your customized exercises, sets, reps, and tempos will be published right here.
              </p>
            </div>
          )}

          {/* Archived Workout Plans Section */}
          {archivedWorkouts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 font-bold uppercase tracking-wider">
                <Archive className="w-4 h-4" />
                <span>Previous Workout Plans ({archivedWorkouts.length})</span>
              </div>
              <div className="space-y-2">
                {archivedWorkouts.map(plan => {
                  const isExpanded = expandedArchiveWorkout === plan.id;
                  return (
                    <div key={plan.id} className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedArchiveWorkout(isExpanded ? null : plan.id)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-neutral-800/40 transition-colors cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-bold text-white uppercase">{plan.title}</p>
                          <p className="text-[10px] font-mono text-neutral-500">
                            Version {plan.version || 1} • {plan.startDate || 'Prior Regimen'}
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                      </button>
                      {isExpanded && (
                        <div className="p-4 border-t border-neutral-800 text-xs text-neutral-300 font-mono space-y-2">
                          <p>{plan.trainerInstructions || 'Previous plan configuration archived.'}</p>
                          {plan.exercises && plan.exercises.length > 0 && (
                            <ul className="list-disc pl-5 space-y-1">
                              {plan.exercises.map((e, i) => (
                                <li key={i}>{e.name} — {e.sets} sets x {e.reps} reps</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* 2. DIET PLAN SUB-VIEW */}
      {subTab === 'diet' && (
        <div className="space-y-8 animate-in fade-in-50 duration-200">
          
          {/* Active Diet Card */}
          {activeDietPlan ? (
            <div className="bg-[#141417] border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-neutral-900 to-[#18181D] border-b border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase">
                      Current Published Nutrition (v{activeDietPlan.version || 1})
                    </span>
                    <span className="text-neutral-400 text-[10px] font-mono">Active</span>
                  </div>
                  <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white">
                    {activeDietPlan.title || 'Personalized Diet Regime'}
                  </h3>
                </div>

                {/* Macros Badge Strip */}
                {activeDietPlan.calories && (
                  <div className="flex flex-wrap gap-2 text-xs font-mono">
                    <div className="bg-neutral-900/90 border border-neutral-800 px-3 py-2 rounded-xl text-center">
                      <span className="text-[10px] text-neutral-500 uppercase block">Calories</span>
                      <span className="text-sm font-bold text-white">{activeDietPlan.calories} kcal</span>
                    </div>
                    {activeDietPlan.macros?.protein && (
                      <div className="bg-neutral-900/90 border border-neutral-800 px-3 py-2 rounded-xl text-center">
                        <span className="text-[10px] text-neutral-500 uppercase block">Protein</span>
                        <span className="text-sm font-bold text-emerald-400">{activeDietPlan.macros.protein}g</span>
                      </div>
                    )}
                    {activeDietPlan.macros?.carbs && (
                      <div className="bg-neutral-900/90 border border-neutral-800 px-3 py-2 rounded-xl text-center">
                        <span className="text-[10px] text-neutral-500 uppercase block">Carbs</span>
                        <span className="text-sm font-bold text-amber-400">{activeDietPlan.macros.carbs}g</span>
                      </div>
                    )}
                    {activeDietPlan.macros?.fats && (
                      <div className="bg-neutral-900/90 border border-neutral-800 px-3 py-2 rounded-xl text-center">
                        <span className="text-[10px] text-neutral-500 uppercase block">Fats</span>
                        <span className="text-sm font-bold text-rose-400">{activeDietPlan.macros.fats}g</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Hydration Guidance & Trainer Notes */}
              {(activeDietPlan.hydrationGuidance || activeDietPlan.trainerNotes) && (
                <div className="p-4 bg-neutral-900/40 border-b border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeDietPlan.hydrationGuidance && (
                    <div className="flex items-start gap-2.5">
                      <Droplet className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-0.5">
                        <span className="font-bold text-white uppercase font-mono text-[10px]">Hydration Target</span>
                        <p className="text-neutral-300 leading-relaxed">{activeDietPlan.hydrationGuidance}</p>
                      </div>
                    </div>
                  )}
                  {activeDietPlan.trainerNotes && (
                    <div className="flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-0.5">
                        <span className="font-bold text-white uppercase font-mono text-[10px]">Trainer Nutrition Notes</span>
                        <p className="text-neutral-300 leading-relaxed">{activeDietPlan.trainerNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Meals Schedule */}
              <div className="p-6 space-y-4">
                {activeDietPlan.meals && activeDietPlan.meals.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold">
                      Prescribed Meal Timings & Items
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeDietPlan.meals.map((meal, idx) => (
                        <div key={idx} className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-5 space-y-3">
                          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                            <h5 className="text-sm font-bold text-white uppercase tracking-wider">{meal.name}</h5>
                            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{meal.mealTime}</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {meal.items && meal.items.map((item, iIdx) => (
                              <div key={iIdx} className="text-xs flex flex-col justify-between border-b border-neutral-800/40 pb-1.5">
                                <div className="flex justify-between items-baseline">
                                  <span className="font-bold text-neutral-200">{item.foodName}</span>
                                  <span className="text-neutral-400 font-mono">{item.quantity} {item.unit}</span>
                                </div>
                                {item.alternatives && (
                                  <span className="text-[10px] text-amber-400 font-mono mt-0.5">
                                    Alt: {item.alternatives}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {meal.instructions && (
                            <p className="text-xs text-neutral-400 italic pt-1">
                              Note: {meal.instructions}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : activeDietPlan.plan ? (
                  <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5">
                    <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-line font-mono">
                      {activeDietPlan.plan}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 font-mono">No meal breakdown details provided.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-12 text-center space-y-3 shadow-lg">
              <Utensils className="w-12 h-12 text-neutral-600 mx-auto" />
              <h3 className="text-lg font-bold text-white uppercase font-display">
                Your trainer has not assigned a diet plan yet.
              </h3>
              <p className="text-xs text-neutral-400 font-mono max-w-md mx-auto">
                Your custom daily caloric goals, macro splits, and meal timings will appear here once published by your trainer.
              </p>
            </div>
          )}

          {/* Archived Diet Plans Section */}
          {archivedDiets.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 font-bold uppercase tracking-wider">
                <Archive className="w-4 h-4" />
                <span>Previous Diet Plans ({archivedDiets.length})</span>
              </div>
              <div className="space-y-2">
                {archivedDiets.map(plan => {
                  const isExpanded = expandedArchiveDiet === plan.id;
                  return (
                    <div key={plan.id} className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedArchiveDiet(isExpanded ? null : plan.id)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-neutral-800/40 transition-colors cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-bold text-white uppercase">{plan.title || 'Diet Plan'}</p>
                          <p className="text-[10px] font-mono text-neutral-500">
                            Version {plan.version || 1} • {plan.calories ? `${plan.calories} kcal` : 'Archived'}
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                      </button>
                      {isExpanded && (
                        <div className="p-4 border-t border-neutral-800 text-xs text-neutral-300 font-mono space-y-2">
                          <p>{plan.trainerNotes || plan.plan || 'Previous nutrition plan archived.'}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
