import React, { useState, useEffect } from 'react';
import { 
  authorizeCalendar, 
  isCalendarAuthorized, 
  getCalendarToken, 
  clearCalendarAuthorization, 
  listCalendarEvents, 
  createCalendarEvent, 
  deleteCalendarEvent, 
  CalendarEvent 
} from '../services/googleCalendarService';
import { Calendar, Plus, RefreshCw, Trash2, ExternalLink, CheckCircle2, AlertCircle, Clock, MapPin, UserCheck } from 'lucide-react';

interface GoogleCalendarIntegrationProps {
  sessions?: any[];
  clients?: any[];
}

export const GoogleCalendarIntegration: React.FC<GoogleCalendarIntegrationProps> = ({ sessions = [], clients = [] }) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New Event Form
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [summary, setSummary] = useState<string>('Speed Fit High Performance Training');
  const [description, setDescription] = useState<string>('EMS Athletic Overload & Recovery Workout');
  const [location, setLocation] = useState<string>('Speed Fit Performance Studio');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [startTime, setStartTime] = useState<string>('10:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [attendeeEmail, setAttendeeEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const authStatus = isCalendarAuthorized();
    setIsAuthorized(authStatus);
    if (authStatus) {
      loadEvents();
    }
  }, []);

  const handleAuthorize = async () => {
    try {
      setLoading(true);
      setError(null);
      await authorizeCalendar();
      setIsAuthorized(true);
      setSuccess('Google Calendar connected successfully!');
      await loadEvents();
    } catch (err: any) {
      console.error('Calendar Auth Error:', err);
      setError(err.message || 'Failed to authenticate Google Calendar.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    clearCalendarAuthorization();
    setIsAuthorized(false);
    setEvents([]);
    setSuccess('Google Calendar disconnected.');
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedEvents = await listCalendarEvents();
      setEvents(fetchedEvents);
    } catch (err: any) {
      console.error('Failed to load events:', err);
      setError(err.message || 'Unable to fetch calendar events.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !startTime) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const startDateTime = new Date(`${startDate}T${startTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

      await createCalendarEvent({
        summary: summary.trim(),
        description: description.trim(),
        location: location.trim(),
        startISO: startDateTime.toISOString(),
        endISO: endDateTime.toISOString(),
        attendees: attendeeEmail.trim() ? [attendeeEmail.trim()] : []
      });

      setSuccess(`Event "${summary}" successfully added to Google Calendar!`);
      setShowCreateForm(false);
      await loadEvents();
    } catch (err: any) {
      console.error('Create Event Error:', err);
      setError(err.message || 'Failed to create Google Calendar event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncSession = async (session: any) => {
    if (!isAuthorized) {
      setError('Please connect Google Calendar first.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      const clientObj = clients.find(c => c.id === session.clientId);
      const clientName = clientObj?.name || 'Athlete';
      const clientEmail = clientObj?.email;

      // Parse date & time string
      const dateStr = session.date || new Date().toISOString().substring(0, 10);
      const timeStr = session.time || '10:00';
      
      const startDateTime = new Date(`${dateStr}T${timeStr}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 45 * 60 * 1000); // 45 min workout

      await createCalendarEvent({
        summary: `Speed Fit EMS: ${clientName}`,
        description: `High-intensity EMS workout session with Speed Fit. Session status: ${session.status || 'CONFIRMED'}`,
        location: 'Speed Fit Performance Center',
        startISO: isNaN(startDateTime.getTime()) ? new Date().toISOString() : startDateTime.toISOString(),
        endISO: isNaN(endDateTime.getTime()) ? new Date(Date.now() + 45*60000).toISOString() : endDateTime.toISOString(),
        attendees: clientEmail ? [clientEmail] : []
      });

      setSuccess(`Synced workout for ${clientName} to Google Calendar!`);
      await loadEvents();
    } catch (err: any) {
      console.error('Sync error:', err);
      setError(err.message || 'Failed to sync session to Google Calendar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    const confirmed = window.confirm(`Are you sure you want to remove "${eventTitle}" from your Google Calendar? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setLoading(true);
      setError(null);
      await deleteCalendarEvent(eventId);
      setSuccess(`Event "${eventTitle}" removed from Google Calendar.`);
      await loadEvents();
    } catch (err: any) {
      console.error('Delete event error:', err);
      setError(err.message || 'Failed to delete event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#141417] border border-[#262630] rounded-[24px] p-6 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-red/10 border border-brand-red/30 rounded-2xl text-brand-red">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-display uppercase tracking-wider">
              Google Calendar Sync
            </h3>
            <p className="text-xs text-[#64748B] font-mono">
              Integrate workout schedules directly with your official Google Calendar.
            </p>
          </div>
        </div>

        {!isAuthorized ? (
          <button
            onClick={handleAuthorize}
            disabled={loading}
            className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black font-mono text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2.5 shadow-sm active:scale-95 shrink-0"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            <span>{loading ? 'Connecting...' : 'Connect Google Calendar'}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={loadEvents}
              disabled={loading}
              className="p-2 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl font-mono text-xs flex items-center gap-1.5 transition-all"
              title="Refresh Calendar Events"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleDisconnect}
              className="px-3 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider transition-all"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Connected Controls */}
      {isAuthorized ? (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0D0D0F] p-4 rounded-2xl border border border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
                Google Calendar Sync Active
              </span>
            </div>

            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-brand-red hover:bg-neutral-100 text-white hover:text-black font-mono text-[10px] uppercase font-black tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showCreateForm ? 'Close Event Form' : 'Schedule Google Event'}</span>
            </button>
          </div>

          {/* New Event Creation Form */}
          {showCreateForm && (
            <form onSubmit={handleCreateEvent} className="p-5 bg-[#0D0D0F] border border-neutral-800 rounded-2xl space-y-4 font-mono text-xs">
              <h4 className="text-xs font-bold text-brand-red uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Create Google Calendar Appointment
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase">Event Title / Summary</label>
                  <input
                    type="text"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full p-2.5 bg-[#141417] border border-neutral-800 rounded-xl text-white outline-none focus:border-brand-red"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-2.5 bg-[#141417] border border-neutral-800 rounded-xl text-white outline-none focus:border-brand-red"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase">Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 bg-[#141417] border border-neutral-800 rounded-xl text-white outline-none focus:border-brand-red"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2.5 bg-[#141417] border border-neutral-800 rounded-xl text-white outline-none focus:border-brand-red"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase">Duration (Minutes)</label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#141417] border border-neutral-800 rounded-xl text-white outline-none focus:border-brand-red"
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes (EMS Standard)</option>
                    <option value={60}>60 Minutes</option>
                    <option value={90}>90 Minutes</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-400 uppercase">Invite Athlete (Optional Email)</label>
                <input
                  type="email"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  placeholder="athlete@example.com"
                  className="w-full p-2.5 bg-[#141417] border border-neutral-800 rounded-xl text-white outline-none focus:border-brand-red"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-400 uppercase">Description / Workout Notes</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-[#141417] border border-neutral-800 rounded-xl text-white outline-none focus:border-brand-red"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-neutral-800 text-neutral-400 text-[10px] uppercase font-bold rounded-xl hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-brand-red hover:bg-neutral-100 text-white hover:text-black text-[10px] uppercase font-black rounded-xl transition-all"
                >
                  {isSubmitting ? 'Adding Event...' : 'Confirm & Add to Google Calendar'}
                </button>
              </div>
            </form>
          )}

          {/* Quick Sync Speed Fit Sessions */}
          {sessions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase text-neutral-400 tracking-wider flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5 text-brand-red" />
                Booked Speed Fit Sessions (One-Click Google Sync)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sessions.map((sess) => {
                  const clientObj = clients.find(c => c.id === sess.clientId);
                  return (
                    <div key={sess.id} className="p-3.5 bg-[#0D0D0F] border border-neutral-800 rounded-2xl flex items-center justify-between text-xs font-mono">
                      <div>
                        <p className="font-bold text-white uppercase">{clientObj?.name || 'Class Athlete'}</p>
                        <p className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-brand-red" /> {sess.date} at {sess.time}
                        </p>
                      </div>
                      <button
                        onClick={() => handleSyncSession(sess)}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-brand-red text-neutral-200 hover:text-white border border-neutral-700 text-[9px] uppercase font-bold rounded-xl transition-all"
                      >
                        Sync to Google
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* List of Fetched Google Calendar Events */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-mono font-bold uppercase text-neutral-400 tracking-wider flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-brand-red" />
              Live Google Calendar Schedule ({events.length})
            </h4>

            {loading && events.length === 0 ? (
              <p className="text-xs font-mono text-neutral-500 py-4 text-center">Loading events from Google Calendar...</p>
            ) : events.length === 0 ? (
              <p className="text-xs font-mono text-neutral-500 py-4 text-center border border-dashed border-neutral-800 rounded-2xl">
                No events found in primary Google Calendar.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {events.map((evt) => {
                  const startStr = evt.start?.dateTime ? new Date(evt.start.dateTime).toLocaleString() : 'N/A';

                  return (
                    <div key={evt.id} className="p-3.5 bg-[#0D0D0F] border border-neutral-800 rounded-2xl flex items-center justify-between gap-4 text-xs font-mono group hover:border-neutral-700 transition-all">
                      <div className="space-y-1">
                        <p className="font-bold text-white text-sm">{evt.summary || 'Untitled Event'}</p>
                        <p className="text-[10px] text-neutral-400 flex items-center gap-2">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-brand-red" /> {startStr}</span>
                          {evt.location && (
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-neutral-500" /> {evt.location}</span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {evt.htmlLink && (
                          <a
                            href={evt.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl transition-all"
                            title="Open in Google Calendar"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => evt.id && handleDeleteEvent(evt.id, evt.summary)}
                          className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                          title="Delete Google Calendar Event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-6 border border-dashed border-neutral-800 rounded-2xl bg-[#0D0D0F] text-center space-y-3">
          <Calendar className="w-8 h-8 text-neutral-600 mx-auto" />
          <p className="text-xs text-neutral-400 font-mono max-w-md mx-auto leading-relaxed">
            Connect your primary Google Calendar account to view live appointments, sync client EMS workout bookings, and manage training schedules across devices.
          </p>
        </div>
      )}
    </div>
  );
};
