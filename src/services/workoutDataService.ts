
import { WorkoutDisplayData } from '../types';

export const generateWorkoutDisplayData = (
  exerciseName: string,
  reps: number,
  targetMuscle: string,
  exerciseLetter: string,
  videoUrl: string
): WorkoutDisplayData => {
  return {
    exerciseName,
    videoUrl,
    gridLayout: "8-PANEL_SYNC",
    uiOverlays: {
      repBadge: `${exerciseLetter}. ${reps} REPS`,
      anatomyTarget: targetMuscle.toUpperCase(),
      glowColor: "WHITE_NEON",
    },
  };
};
