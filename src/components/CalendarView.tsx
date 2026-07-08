import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WorkoutLog } from '../types';

interface Props {
  logs: WorkoutLog[];
  attendance: any[];
  sessions?: any[];
}

const CalendarView: React.FC<Props> = ({ logs, attendance, sessions = [] }) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const getDayStatus = (day: Date) => {
    const hasLog = logs.some(log => isSameDay(new Date(log.date), day));
    const att = attendance.find(a => isSameDay(new Date(a.date + 'T00:00:00'), day));
    const hasSession = sessions.some(s => isSameDay(new Date(s.date), day));
    return { hasLog, attendance: att?.status, hasSession };
  };

  return (
    <div className="bg-neutral-800/50 border border-neutral-700 rounded-[2.5rem] p-8 shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-display italic uppercase tracking-wider">Activity Calendar</h3>
        <div className="flex items-center space-x-4">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-white font-bold hover:text-white transition-colors"><ChevronLeft /></button>
          <span className="font-mono text-sm uppercase tracking-widest text-white">{format(currentMonth, 'MMMM yyyy')}</span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-white font-bold hover:text-white transition-colors"><ChevronRight /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-mono text-[10px] text-white font-bold uppercase py-2">{day}</div>
        ))}
        {days.map(day => {
          const { hasLog, attendance, hasSession } = getDayStatus(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <div 
              key={day.toString()} 
              className={`aspect-square flex flex-col items-center justify-center relative rounded-2xl transition-all cursor-default group ${
                isCurrentMonth ? 'bg-neutral-800/30 hover:bg-neutral-800' : 'bg-transparent opacity-20'
              } ${isToday ? 'ring-1 ring-brand-red ring-offset-2 ring-offset-neutral-900' : ''}`}
            >
              <span className={`font-mono text-xs z-10 ${isCurrentMonth ? 'text-white' : 'text-white font-bold font-bold'}`}>
                {format(day, 'd')}
              </span>
              <div className="absolute bottom-2 flex flex-wrap items-center justify-center gap-0.5 px-1">
                {hasLog && <div className="w-1 h-1 bg-emerald-500 rounded-full" title="Workout Log"></div>}
                {hasSession && <div className="w-1 h-1 bg-amber-500 rounded-full" title="Scheduled Session"></div>}
                {attendance === 'Present' && <div className="w-1 h-1 bg-emerald-500 rounded-full" title="Present"></div>}
                {attendance === 'Missed' && <div className="w-1 h-1 bg-brand-red rounded-full" title="Missed"></div>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-6 mt-8 pt-6 border-t border-neutral-700 font-mono text-[8px] uppercase tracking-widest text-white font-bold">
        <div className="flex items-center"><div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div> Workout</div>
        <div className="flex items-center"><div className="w-2 h-2 bg-amber-500 rounded-full mr-2 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></div> Session</div>
        <div className="flex items-center"><div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div> Present</div>
        <div className="flex items-center"><div className="w-2 h-2 bg-brand-red rounded-full mr-2 shadow-[0_0_8px_rgba(255,0,0,0.4)]"></div> Missed</div>
      </div>
    </div>
  );
};

export default CalendarView;
