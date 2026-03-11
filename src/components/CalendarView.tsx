import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WorkoutLog, TrainerNote } from '../types';

interface Props {
  logs: WorkoutLog[];
  notes: TrainerNote[];
  attendance: any[];
}

const CalendarView: React.FC<Props> = ({ logs, notes, attendance }) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getDayStatus = (day: Date) => {
    const hasLog = logs.some(log => isSameDay(new Date(log.date), day));
    const hasNote = notes.some(note => isSameDay(new Date(note.updatedAt), day));
    const att = attendance.find(a => isSameDay(new Date(a.date), day));
    return { hasLog, hasNote, attendance: att?.status };
  };

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-[2.5rem] p-8 shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-display italic uppercase tracking-wider">Activity Calendar</h3>
        <div className="flex items-center space-x-4">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-neutral-500 hover:text-white"><ChevronLeft /></button>
          <span className="font-mono text-sm uppercase tracking-widest">{format(currentMonth, 'MMMM yyyy')}</span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-neutral-500 hover:text-white"><ChevronRight /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-mono text-[10px] text-neutral-500 uppercase">{day}</div>
        ))}
        {days.map(day => {
          const { hasLog, hasNote, attendance } = getDayStatus(day);
          return (
            <div key={day.toString()} className="aspect-square flex items-center justify-center relative bg-neutral-800/30 rounded-full">
              <span className={`font-mono text-xs ${isSameMonth(day, currentMonth) ? 'text-white' : 'text-neutral-700'}`}>
                {format(day, 'd')}
              </span>
              {hasLog && <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>}
              {hasNote && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-brand-red rounded-full"></div>}
              {attendance === 'ATTENDED' && <div className="absolute bottom-1 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
              {attendance === 'MISSED' && <div className="absolute bottom-1 w-1.5 h-1.5 bg-red-500 rounded-full"></div>}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 mt-6 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        <div className="flex items-center"><div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div> Workout Log</div>
        <div className="flex items-center"><div className="w-2 h-2 bg-brand-red rounded-full mr-2"></div> Trainer Note</div>
        <div className="flex items-center"><div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div> Attended</div>
        <div className="flex items-center"><div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div> Missed</div>
      </div>
    </div>
  );
};

export default CalendarView;
