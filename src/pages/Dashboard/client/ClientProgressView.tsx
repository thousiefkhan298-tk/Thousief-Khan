import React from 'react';
import { 
  TrendingUp, 
  Activity, 
  Calendar, 
  Camera, 
  Award, 
  Info, 
  CheckCircle,
  Dumbbell
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ProgressRecord } from '../../../types';

interface ClientProgressViewProps {
  userData: any;
  progressRecords: ProgressRecord[];
}

export const ClientProgressView: React.FC<ClientProgressViewProps> = ({
  userData,
  progressRecords
}) => {
  // Sort chronologically for chart display
  const chronologicalRecords = [...progressRecords].sort(
    (a, b) => new Date(a.reviewDate || a.createdAt).getTime() - new Date(b.reviewDate || b.createdAt).getTime()
  );

  // Extract weight data points ONLY when real weights exist (no fabrication, no zero defaults)
  const weightChartData = chronologicalRecords
    .filter(r => r.weight !== undefined && r.weight !== null && Number(r.weight) > 0)
    .map(r => ({
      date: r.reviewDate || r.createdAt.slice(0, 10),
      weight: Number(r.weight)
    }));

  // Latest record for comparison
  const latestRecord = progressRecords[0] || null;
  const initialRecord = chronologicalRecords[0] || null;

  const weightDelta = (latestRecord && initialRecord && latestRecord.weight && initialRecord.weight)
    ? (Number(latestRecord.weight) - Number(initialRecord.weight)).toFixed(1)
    : null;

  return (
    <div className="space-y-6 pb-12 font-sans">
      
      {/* Header */}
      <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest block">
            Trainer-Assessed Development
          </span>
          <h2 className="text-xl sm:text-2xl font-display font-bold uppercase text-white tracking-tight mt-0.5">
            Progress & Performance History
          </h2>
          <p className="text-xs text-neutral-400 font-mono mt-0.5">
            Physical biometrics, progressive overload milestones, and feedback recorded by your trainer.
          </p>
        </div>

        {latestRecord && (
          <div className="bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-xl text-right">
            <span className="text-[10px] font-mono text-neutral-500 uppercase block">Last Review Date</span>
            <span className="text-xs font-bold font-mono text-white">
              {latestRecord.reviewDate || latestRecord.createdAt.slice(0, 10)}
            </span>
          </div>
        )}
      </div>

      {progressRecords.length === 0 ? (
        <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-12 text-center space-y-3 shadow-lg">
          <TrendingUp className="w-12 h-12 text-neutral-600 mx-auto" />
          <h3 className="text-lg font-bold text-white uppercase font-display">
            No Progress Reviews Recorded Yet
          </h3>
          <p className="text-xs text-neutral-400 font-mono max-w-md mx-auto">
            Your trainer logs biometrics, body measurements, strength progression, and feedback during periodic reviews. Records will display here once logged.
          </p>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          
          {/* Key Metrics Quick Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#141417] border border-neutral-800 p-5 rounded-2xl">
              <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">Current Body Weight</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold font-display text-white">
                  {latestRecord?.weight ? `${latestRecord.weight} kg` : 'Not recorded'}
                </span>
                {weightDelta && (
                  <span className={`text-xs font-mono font-bold ${
                    Number(weightDelta) < 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {Number(weightDelta) > 0 ? `+${weightDelta} kg` : `${weightDelta} kg`} overall
                  </span>
                )}
              </div>
            </div>

            <div className="bg-[#141417] border border-neutral-800 p-5 rounded-2xl">
              <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">Total Reviews Completed</span>
              <div className="mt-2">
                <span className="text-3xl font-bold font-display text-amber-400">
                  {progressRecords.length}
                </span>
                <span className="text-[10px] font-mono text-neutral-500 block uppercase mt-0.5">Certified Checkpoints</span>
              </div>
            </div>

            <div className="bg-[#141417] border border-neutral-800 p-5 rounded-2xl">
              <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">Latest Client Feedback</span>
              <p className="mt-2 text-xs text-neutral-300 italic line-clamp-2">
                "{latestRecord?.clientVisibleFeedback || 'Maintain consistency with assigned resistance reps.'}"
              </p>
            </div>
          </div>

          {/* Body Weight Trend Chart (Real Data Only) */}
          {weightChartData.length > 1 && (
            <div className="bg-[#141417] border border-neutral-800 p-6 rounded-2xl space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <h3 className="text-sm font-bold uppercase font-display text-white">Body Weight Trajectory (kg)</h3>
                <span className="text-[10px] font-mono text-neutral-400 uppercase">Verified Measurement Points</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                    <XAxis dataKey="date" stroke="#71717A" tick={{ fontSize: 10, fill: '#A1A1AA' }} />
                    <YAxis domain={['auto', 'auto']} stroke="#71717A" tick={{ fontSize: 10, fill: '#A1A1AA' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181B', borderColor: '#27272A', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                      formatter={(val: any) => [`${val} kg`, 'Weight']}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#FF3B30"
                      strokeWidth={3}
                      dot={{ fill: '#FF3B30', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Reviews History List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase font-display text-white tracking-wider">
              Comprehensive Progress Logs ({progressRecords.length})
            </h3>
            
            <div className="space-y-4">
              {progressRecords.map((record, idx) => (
                <div key={record.id || idx} className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-lg hover:border-neutral-700 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 pb-3 gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono text-xs font-bold">
                        #{progressRecords.length - idx}
                      </span>
                      <div>
                        <h4 className="text-base font-bold font-display uppercase text-white">
                          Review: {record.reviewDate || record.createdAt.slice(0, 10)}
                        </h4>
                        <span className="text-[10px] font-mono text-neutral-500">
                          Recorded by Trainer
                        </span>
                      </div>
                    </div>
                    {record.weight && (
                      <span className="text-base font-mono font-bold text-white bg-neutral-900 px-3 py-1 rounded-xl border border-neutral-800">
                        {record.weight} kg
                      </span>
                    )}
                  </div>

                  {/* Body Measurements */}
                  {record.measurements && Object.values(record.measurements).some(Boolean) && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold block">Body Measurements</span>
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs font-mono">
                        {record.measurements.chest && (
                          <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800 text-center">
                            <span className="text-[9px] text-neutral-500 uppercase block">Chest</span>
                            <strong className="text-white">{record.measurements.chest} cm</strong>
                          </div>
                        )}
                        {record.measurements.waist && (
                          <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800 text-center">
                            <span className="text-[9px] text-neutral-500 uppercase block">Waist</span>
                            <strong className="text-white">{record.measurements.waist} cm</strong>
                          </div>
                        )}
                        {record.measurements.hips && (
                          <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800 text-center">
                            <span className="text-[9px] text-neutral-500 uppercase block">Hips</span>
                            <strong className="text-white">{record.measurements.hips} cm</strong>
                          </div>
                        )}
                        {record.measurements.arms && (
                          <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800 text-center">
                            <span className="text-[9px] text-neutral-500 uppercase block">Arms</span>
                            <strong className="text-white">{record.measurements.arms} cm</strong>
                          </div>
                        )}
                        {record.measurements.thighs && (
                          <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800 text-center">
                            <span className="text-[9px] text-neutral-500 uppercase block">Thighs</span>
                            <strong className="text-white">{record.measurements.thighs} cm</strong>
                          </div>
                        )}
                        {record.measurements.neck && (
                          <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800 text-center">
                            <span className="text-[9px] text-neutral-500 uppercase block">Neck</span>
                            <strong className="text-white">{record.measurements.neck} cm</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Strength / Performance Results */}
                  {record.strengthResults && record.strengthResults.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold block">Strength & Performance Test Results</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                        {record.strengthResults.map((s, sIdx) => (
                          <div key={sIdx} className="bg-neutral-900/70 p-3 rounded-lg border border-neutral-800 flex justify-between items-center">
                            <span className="font-bold text-white">{s.exercise}</span>
                            <span className="text-amber-400">{s.weight} ({s.reps} reps)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Progress Photo (where consent is recorded) */}
                  {record.progressPhotoUrl && record.photoConsentRecorded && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold block flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Progress Photo (Consent Confirmed)</span>
                      </span>
                      <div className="max-w-xs overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
                        <img
                          src={record.progressPhotoUrl}
                          alt="Physique checkpoint"
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {/* Client-Visible Feedback (Separated from private trainer notes) */}
                  {record.clientVisibleFeedback && (
                    <div className="bg-neutral-900/50 border-l-2 border-brand-red p-4 rounded-r-xl space-y-1">
                      <span className="text-[9px] font-mono text-brand-red uppercase font-bold tracking-wider block">
                        Coach Feedback & Guidance
                      </span>
                      <p className="text-xs text-neutral-200 leading-relaxed italic">
                        "{record.clientVisibleFeedback}"
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
