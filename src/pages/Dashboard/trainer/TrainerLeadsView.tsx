import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  MessageSquare, 
  Copy, 
  ExternalLink, 
  Download, 
  FileSpreadsheet, 
  Plus, 
  X, 
  UserCheck, 
  ShieldCheck, 
  Trash2, 
  ChevronRight, 
  Check, 
  Sparkles, 
  HelpCircle,
  Activity,
  Heart,
  Scale
} from 'lucide-react';
import { LeadSubmission, LeadStatus, LeadFollowUpItem, User } from '../../../types';
import { firebaseService } from '../../../services/firebaseService';
import { formatWhatsAppPhone } from '../../../utils/healthAssessmentFlags';

interface TrainerLeadsViewProps {
  userData: any;
  clients: User[];
}

const PIPELINE_STATUSES: LeadStatus[] = [
  'New',
  'Contacted',
  'Qualified',
  'Assessment Booked',
  'Won',
  'Not Now'
];

export const TrainerLeadsView: React.FC<TrainerLeadsViewProps> = ({ userData, clients }) => {
  const [leads, setLeads] = useState<LeadSubmission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [healthFlagsOnly, setHealthFlagsOnly] = useState<boolean>(false);
  const [selectedLead, setSelectedLead] = useState<LeadSubmission | null>(null);
  
  // WhatsApp Template Modal State
  const [whatsAppModalLead, setWhatsAppModalLead] = useState<LeadSubmission | null>(null);
  const [activeTemplateStage, setActiveTemplateStage] = useState<'immediate' | 'day1' | 'day3' | 'day7' | 'day14' | 'custom'>('immediate');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [copiedStage, setCopiedStage] = useState<string | null>(null);

  // Conversion Modal State
  const [convertingLead, setConvertingLead] = useState<LeadSubmission | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [conversionResult, setConversionResult] = useState<any | null>(null);

  // Google Sheets Setup Guide Modal
  const [showSheetsGuide, setShowSheetsGuide] = useState<boolean>(false);

  // Notes editor inside detail
  const [leadNotes, setLeadNotes] = useState<string>('');
  const [leadFollowUpDate, setLeadFollowUpDate] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const isTrainer = userData?.role === 'TRAINER' || userData?.email === 'thousiefkhan298@gmail.com';

  const loadLeadsFromServer = async () => {
    if (!isTrainer) {
      setLoading(false);
      setLoadError('Access restricted: Trainer privileges required to view prospective athlete biometrics.');
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const headers: Record<string, string> = {
        'X-User-Role': userData?.role || 'TRAINER',
        'X-User-Email': userData?.email || ''
      };
      const res = await fetch('/api/leads', { headers });
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Access restricted: Trainer credentials required.');
        }
        throw new Error(`Failed to load assessment leads (${res.status})`);
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.leads)) {
        setLeads(json.leads);
      } else {
        throw new Error(json.error || 'Failed to retrieve leads.');
      }
    } catch (err: any) {
      console.warn('Leads fetch error:', err.message);
      setLoadError(err.message || 'Unable to load leads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeadsFromServer();
    const interval = setInterval(loadLeadsFromServer, 20000);
    return () => clearInterval(interval);
  }, [userData]);

  // Sync modal notes when lead selected
  useEffect(() => {
    if (selectedLead) {
      setLeadNotes(selectedLead.trainerNotes || '');
      setLeadFollowUpDate(selectedLead.followUpAt ? selectedLead.followUpAt.substring(0, 10) : '');
    }
  }, [selectedLead]);

  // Derived filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (lead.contact?.name || '').toLowerCase().includes(q) ||
        (lead.contact?.whatsapp || '').toLowerCase().includes(q) ||
        (lead.contact?.email || '').toLowerCase().includes(q) ||
        (lead.goals?.primaryGoal || '').toLowerCase().includes(q);

      const matchesStatus = selectedStatus === 'all' || lead.status === selectedStatus;
      const matchesHealthFlags = !healthFlagsOnly || (Array.isArray(lead.healthFlags) && lead.healthFlags.length > 0);

      return matchesSearch && matchesStatus && matchesHealthFlags;
    });
  }, [leads, searchQuery, selectedStatus, healthFlagsOnly]);

  // Status counts for pipeline tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: leads.length };
    PIPELINE_STATUSES.forEach(s => {
      counts[s] = leads.filter(l => l.status === s).length;
    });
    return counts;
  }, [leads]);

  // Health flags total
  const totalWithHealthFlags = useMemo(() => {
    return leads.filter(l => Array.isArray(l.healthFlags) && l.healthFlags.length > 0).length;
  }, [leads]);

  // Follow-up overdue count
  const overdueCount = useMemo(() => {
    const todayStr = new Date().toISOString().substring(0, 10);
    return leads.filter(l => l.status !== 'Won' && l.status !== 'Not Now' && l.followUpAt && l.followUpAt.substring(0, 10) < todayStr).length;
  }, [leads]);

  // WhatsApp Message Generators
  const getWhatsAppMessage = (lead: LeadSubmission, stage: string): string => {
    const name = lead.contact?.name?.split(' ')[0] || 'there';
    const coachName = userData?.name || 'Coach Thousief';
    const goal = lead.goals?.primaryGoal || 'your transformation';
    const location = lead.assessment?.training?.location || 'Speed Fit';

    switch (stage) {
      case 'immediate':
        return `Hi ${name}! This is ${coachName} from Speed Fit. I just reviewed your assessment for ${goal}. Fantastic job taking the first step! Are you free for a quick 5-minute call today to discuss your schedule and program targets?`;
      case 'day1':
        return `Hey ${name}, ${coachName} here from Speed Fit following up! I've drafted a preliminary routine based on your ${goal} and ${location} preferences. When is a good time to connect today so I can walk you through it?`;
      case 'day3':
        return `Hi ${name}! Speed Fit checking in. Our coaching slots for this week's 1-on-1 biometrics evaluations are filling up quickly. Would morning or evening work better for your initial evaluation session?`;
      case 'day7':
        return `Hey ${name}, wanted to share a quick coaching tip for ${goal}: consistent execution in week 1 sets the tone for your entire result! Let me know if you'd still like to get started with your Speed Fit program.`;
      case 'day14':
        return `Hi ${name}, checking in one last time from Speed Fit! If life got busy, no worries at all. Whenever you're ready to restart your fitness journey, your assessment biometrics are safely saved with us. Just reply to this message!`;
      case 'custom':
        return customMessage || `Hi ${name}, this is ${coachName} from Speed Fit following up on your fitness assessment.`;
      default:
        return '';
    }
  };

  const handleCopyWhatsApp = (lead: LeadSubmission, stage: string) => {
    const msg = getWhatsAppMessage(lead, stage);
    navigator.clipboard.writeText(msg);
    setCopiedStage(stage);
    setTimeout(() => setCopiedStage(null), 2500);

    // Record follow-up event
    if (lead.id) {
      const followUpItem: LeadFollowUpItem = {
        date: new Date().toISOString(),
        stage,
        channel: 'whatsapp',
        note: `Copied ${stage} message template`
      };
      firebaseService.addLeadFollowUp(lead.id, followUpItem);
      setLeads(prev => prev.map(l => {
        if (l.id !== lead.id) return l;
        const history = l.followUpHistory || [];
        return {
          ...l,
          status: l.status === 'New' ? 'Contacted' : l.status,
          followUpHistory: [...history, followUpItem]
        };
      }));
      if (selectedLead && selectedLead.id === lead.id) {
        setSelectedLead(prev => prev ? {
          ...prev,
          status: prev.status === 'New' ? 'Contacted' : prev.status,
          followUpHistory: [...(prev.followUpHistory || []), followUpItem]
        } : null);
      }
    }
  };

  const handleOpenWhatsApp = (lead: LeadSubmission, stage: string) => {
    const msg = getWhatsAppMessage(lead, stage);
    const phone = formatWhatsAppPhone(lead.contact?.whatsapp || '');
    const encoded = encodeURIComponent(msg);
    const url = `https://wa.me/${phone}?text=${encoded}`;

    // Record follow-up event and transition to Contacted if New
    if (lead.id) {
      const followUpItem: LeadFollowUpItem = {
        date: new Date().toISOString(),
        stage,
        channel: 'whatsapp',
        note: `Opened WhatsApp with ${stage} message`
      };
      firebaseService.addLeadFollowUp(lead.id, followUpItem);
      setLeads(prev => prev.map(l => {
        if (l.id !== lead.id) return l;
        const history = l.followUpHistory || [];
        return {
          ...l,
          status: l.status === 'New' ? 'Contacted' : l.status,
          followUpHistory: [...history, followUpItem]
        };
      }));
      if (selectedLead && selectedLead.id === lead.id) {
        setSelectedLead(prev => prev ? {
          ...prev,
          status: prev.status === 'New' ? 'Contacted' : prev.status,
          followUpHistory: [...(prev.followUpHistory || []), followUpItem]
        } : null);
      }
    }

    window.open(url, '_blank');
  };

  // Convert Lead to Client via Server API
  const handleConvertLead = async (lead: LeadSubmission) => {
    if (!lead.id) return;
    setIsConverting(true);
    setConversionResult(null);

    try {
      const res = await fetch('/api/leads/convert-to-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          trainerId: userData?.uid || 'thousiefkhan298@gmail.com'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to convert lead to client.');
      }

      setConversionResult(data);
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'Won', convertedClientId: data.clientId } : l));
      if (selectedLead && selectedLead.id === lead.id) {
        setSelectedLead(prev => prev ? { ...prev, status: 'Won', convertedClientId: data.clientId } : null);
      }
    } catch (err: any) {
      console.error('Conversion error:', err);
      alert(`Error converting lead: ${err.message}`);
      setConvertingLead(null);
    } finally {
      setIsConverting(false);
    }
  };

  // Save Trainer Notes & Follow-Up Date
  const handleSaveNotes = async () => {
    if (!selectedLead || !selectedLead.id) return;
    setIsSavingNotes(true);
    try {
      await firebaseService.updateLead(selectedLead.id, {
        trainerNotes: leadNotes,
        followUpAt: leadFollowUpDate ? new Date(leadFollowUpDate).toISOString() : selectedLead.followUpAt
      });
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? {
        ...l,
        trainerNotes: leadNotes,
        followUpAt: leadFollowUpDate ? new Date(leadFollowUpDate).toISOString() : l.followUpAt
      } : l));
      setSelectedLead(prev => prev ? { ...prev, trainerNotes: leadNotes, followUpAt: leadFollowUpDate } : null);
      alert('Lead notes updated successfully!');
    } catch (err: any) {
      alert(`Failed to save notes: ${err.message}`);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Update Status directly
  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await firebaseService.updateLeadStatus(leadId, newStatus);
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  // Delete Lead
  const handleDeleteLead = async (leadId: string, leadName: string) => {
    if (!window.confirm(`Are you sure you want to delete lead submission for "${leadName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await firebaseService.deleteLead(leadId);
      setLeads(prev => prev.filter(l => l.id !== leadId));
      if (selectedLead?.id === leadId) setSelectedLead(null);
    } catch (err: any) {
      alert(`Failed to delete lead: ${err.message}`);
    }
  };

  // Trigger CSV export
  const handleExportCSV = () => {
    window.location.href = '/api/leads/export-csv';
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A2A2A] pb-5">
        <div>
          <div className="flex items-center space-x-2 text-[#E10600] font-mono text-[10px] uppercase tracking-widest font-bold mb-1">
            <span className="w-2 h-2 rounded-full bg-[#E10600] animate-pulse"></span>
            <span>Client Acquisition Pipeline</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tight text-white">
            Leads &amp; <span className="text-[#E10600]">Assessments</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage incoming public assessments, health flags, WhatsApp follow-ups, and athlete conversions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowSheetsGuide(true)}
            aria-label="Google Sheets Setup Guide"
            className="px-3.5 py-2.5 min-h-[44px] bg-[#1E1E24] hover:bg-[#2A2A32] border border-[#2D2D38] text-gray-200 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Google Sheets</span>
          </button>

          <button
            onClick={handleExportCSV}
            aria-label="Export Leads as CSV"
            className="px-3.5 py-2.5 min-h-[44px] bg-[#E10600] hover:bg-[#FF3B30] text-white rounded-xl text-xs font-bold transition-all shadow-[0_4px_12px_rgba(225,6,0,0.3)] flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#141417] border border-[#262630] rounded-2xl p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Total Leads</p>
          <p className="text-2xl font-display font-black text-white mt-1">{leads.length}</p>
          <span className="text-[10px] font-mono text-gray-500 mt-1 block">In intake system</span>
        </div>

        <div className="bg-[#141417] border border-[#262630] rounded-2xl p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-sky-400">New Submissions</p>
          <p className="text-2xl font-display font-black text-sky-400 mt-1">{statusCounts['New'] || 0}</p>
          <span className="text-[10px] font-mono text-gray-500 mt-1 block">Awaiting first contact</span>
        </div>

        <div className="bg-[#141417] border border-[#262630] rounded-2xl p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Converted (Won)</p>
          <p className="text-2xl font-display font-black text-emerald-400 mt-1">{statusCounts['Won'] || 0}</p>
          <span className="text-[10px] font-mono text-gray-500 mt-1 block">Active athlete accounts</span>
        </div>

        <div className="bg-[#141417] border border-[#262630] rounded-2xl p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-red-400">Health Flags</p>
          <p className="text-2xl font-display font-black text-red-400 mt-1">{totalWithHealthFlags}</p>
          <span className="text-[10px] font-mono text-gray-500 mt-1 block">Require coach safety review</span>
        </div>
      </div>

      {/* SEARCH & PIPELINE FILTER TABS */}
      <div className="space-y-3 bg-[#141417] border border-[#262630] p-4 rounded-2xl">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search leads by name, WhatsApp, email, or primary goal..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl pl-10 pr-4 py-2.5 min-h-[44px] text-xs text-white placeholder-gray-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Toggle Health Flags Only */}
          <button
            onClick={() => setHealthFlagsOnly(!healthFlagsOnly)}
            className={`px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 cursor-pointer ${
              healthFlagsOnly
                ? 'bg-red-500/15 border-red-500 text-red-400'
                : 'bg-[#1B1B20] border-[#2D2D38] text-gray-300 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>Health Flags Only {totalWithHealthFlags > 0 && `(${totalWithHealthFlags})`}</span>
          </button>
        </div>

        {/* Pipeline Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-2 min-h-[40px] rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer ${
              selectedStatus === 'all'
                ? 'bg-white text-black font-bold'
                : 'bg-[#1B1B20] text-gray-400 hover:text-white'
            }`}
          >
            All Leads ({statusCounts.all})
          </button>

          {PIPELINE_STATUSES.map(status => {
            const count = statusCounts[status] || 0;
            const active = selectedStatus === status;
            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-2 min-h-[40px] rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#E10600] text-white font-bold shadow-sm'
                    : 'bg-[#1B1B20] text-gray-400 hover:text-white'
                }`}
              >
                <span>{status}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-white font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ACCESS RESTRICTION BANNER */}
      {!isTrainer && (
        <div className="p-6 bg-[#141417] border border-amber-500/40 rounded-2xl flex items-start gap-3.5 text-xs text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-white text-sm">Trainer Access Required</p>
            <p className="text-gray-300">
              Prospective client assessment responses contain medical and biometric intake data. Only authorized Speed Fit performance trainers may inspect lead details.
            </p>
          </div>
        </div>
      )}

      {/* SYNC ERROR BANNER WITH RETRY */}
      {loadError && (
        <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-red-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <div>
              <span className="font-bold text-white">Pipeline Status: </span>
              <span>{loadError}</span>
            </div>
          </div>
          <button
            onClick={loadLeadsFromServer}
            className="px-3 py-1.5 bg-[#E10600] hover:bg-[#FF3B30] text-white text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
          >
            Retry Pipeline Sync
          </button>
        </div>
      )}

      {/* LEADS LIST / CARDS */}
      {loading ? (
        <div className="p-12 text-center bg-[#141417] border border-[#262630] rounded-2xl">
          <div className="w-8 h-8 border-2 border-[#E10600] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">Loading assessment records...</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="p-12 text-center bg-[#141417] border border-[#262630] rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1B1B20] border border-[#2D2D38] flex items-center justify-center mx-auto text-gray-500">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Leads Found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {searchQuery || selectedStatus !== 'all' || healthFlagsOnly
              ? 'No assessment submissions match your active search or pipeline filter.'
              : 'Direct prospective clients to your public assessment link to collect structured intake data.'}
          </p>
          <div className="pt-2">
            <Link
              to="/assessment"
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E10600] hover:bg-[#FF3B30] text-white text-xs font-semibold rounded-xl"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Public Assessment Form (/assessment)</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map(lead => {
            const hasFlags = Array.isArray(lead.healthFlags) && lead.healthFlags.length > 0;
            const followUpStr = lead.followUpAt ? lead.followUpAt.substring(0, 10) : '';
            const todayStr = new Date().toISOString().substring(0, 10);
            const isOverdue = followUpStr && followUpStr < todayStr && lead.status !== 'Won' && lead.status !== 'Not Now';

            return (
              <div
                key={lead.id}
                className="bg-[#141417] hover:bg-[#18181C] border border-[#262630] hover:border-[#383848] rounded-2xl p-4 sm:p-5 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white uppercase tracking-tight">
                        {lead.contact?.name || 'Speed Fit Recruit'}
                      </h3>
                      
                      {/* Status badge dropdown */}
                      <select
                        value={lead.status}
                        onChange={e => lead.id && handleStatusChange(lead.id, e.target.value as LeadStatus)}
                        className={`text-[10px] font-mono uppercase font-bold px-2.5 py-1 rounded-lg border outline-none cursor-pointer ${
                          lead.status === 'New' ? 'bg-sky-500/20 text-sky-400 border-sky-500/40' :
                          lead.status === 'Contacted' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                          lead.status === 'Qualified' ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' :
                          lead.status === 'Assessment Booked' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' :
                          lead.status === 'Won' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                          'bg-gray-500/20 text-gray-400 border-gray-500/40'
                        }`}
                      >
                        {PIPELINE_STATUSES.map(s => (
                          <option key={s} value={s} className="bg-[#1B1B20] text-white">
                            {s}
                          </option>
                        ))}
                      </select>

                      {/* Health flag pill */}
                      {hasFlags ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-red-950/60 border border-red-500/60 text-red-300 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                          <span>{lead.healthFlags.length} Health Flag(s)</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>PAR-Q Clear</span>
                        </span>
                      )}

                      {/* Overdue tag */}
                      {isOverdue && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-rose-950/70 text-rose-300 border border-rose-500/60 font-semibold">
                          Follow-up Overdue
                        </span>
                      )}
                    </div>

                    {/* Contact & Goal Row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300 pt-0.5">
                      <span className="flex items-center gap-1 font-mono text-white">
                        <Phone className="w-3.5 h-3.5 text-[#E10600]" />
                        {lead.contact?.whatsapp}
                      </span>
                      {lead.contact?.email && (
                        <span className="flex items-center gap-1 text-gray-400 font-mono">
                          <Mail className="w-3.5 h-3.5 text-gray-500" />
                          {lead.contact.email}
                        </span>
                      )}
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-300 font-semibold">
                        Goal: <strong className="text-white">{lead.goals?.primaryGoal}</strong>
                      </span>
                      {lead.goals?.timeline && (
                        <span className="text-gray-400 font-mono text-[11px]">
                          ({lead.goals.timeline})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Submission date & follow-up */}
                  <div className="text-right sm:shrink-0 text-xs font-mono text-gray-400">
                    <p className="text-[10px] uppercase text-gray-500">Submitted</p>
                    <p className="text-gray-300">
                      {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                    </p>
                    {followUpStr && (
                      <p className={`text-[10px] mt-0.5 ${isOverdue ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                        Follow-up: {followUpStr}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick details chips */}
                <div className="flex flex-wrap gap-2 text-[11px] font-mono pt-1 text-gray-300">
                  {lead.contact?.age && (
                    <span className="px-2.5 py-1 bg-[#1B1B20] border border-[#2D2D38] rounded-lg">
                      Age: {lead.contact.age} ({lead.contact.sex || 'M'})
                    </span>
                  )}
                  {lead.contact?.weight && lead.contact?.height && (
                    <span className="px-2.5 py-1 bg-[#1B1B20] border border-[#2D2D38] rounded-lg">
                      {lead.contact.height}cm / {lead.contact.weight}kg
                    </span>
                  )}
                  <span className="px-2.5 py-1 bg-[#1B1B20] border border-[#2D2D38] rounded-lg">
                    Level: {lead.assessment?.training?.experience || 'Beginner'}
                  </span>
                  <span className="px-2.5 py-1 bg-[#1B1B20] border border-[#2D2D38] rounded-lg">
                    Loc: {lead.assessment?.training?.location || 'Gym'}
                  </span>
                  <span className="px-2.5 py-1 bg-[#1B1B20] border border-[#2D2D38] rounded-lg">
                    {lead.assessment?.training?.sessionsPerWeek || '3'}x / week ({lead.assessment?.training?.sessionLength || '45m'})
                  </span>
                </div>

                {/* Health flags summary preview if present */}
                {hasFlags && (
                  <div className="bg-red-950/25 border border-red-800/40 rounded-xl p-2.5 text-xs text-red-200 space-y-1">
                    <p className="font-bold text-[10px] uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Identified Health Flags ({lead.healthFlags.length}):</span>
                    </p>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5 text-red-300">
                      {lead.healthFlags.slice(0, 2).map((flag, idx) => (
                        <li key={idx} className="truncate">{flag}</li>
                      ))}
                      {lead.healthFlags.length > 2 && (
                        <li className="text-[10px] text-red-400 italic">
                          +{lead.healthFlags.length - 2} more flag(s) in assessment detail
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#222228]">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Details */}
                    <button
                      onClick={() => setSelectedLead(lead)}
                      className="px-3 py-2 min-h-[40px] bg-[#1E1E24] hover:bg-[#2A2A32] text-gray-200 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-[#E10600]" />
                      <span>View Intake</span>
                    </button>

                    {/* WhatsApp Template Modal Trigger */}
                    <button
                      onClick={() => setWhatsAppModalLead(lead)}
                      className="px-3.5 py-2 min-h-[40px] bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Follow-Up</span>
                    </button>

                    {/* Convert to Client */}
                    {lead.status !== 'Won' && (
                      <button
                        onClick={() => setConvertingLead(lead)}
                        className="px-3.5 py-2 min-h-[40px] bg-[#E10600]/15 hover:bg-[#E10600]/25 border border-[#E10600]/40 text-red-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-[#E10600]" />
                        <span>Convert to Athlete</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {lead.id && (
                      <button
                        onClick={() => handleDeleteLead(lead.id!, lead.contact?.name || 'Recruit')}
                        title="Delete lead record"
                        aria-label="Delete lead record"
                        className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. LEAD DETAIL MODAL */}
      {/* ========================================================================= */}
      {selectedLead && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={() => setSelectedLead(null)}
        >
          <div 
            className="bg-[#141417] border border-[#262630] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 space-y-6 shadow-2xl relative custom-scrollbar"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#262630] pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#E10600] font-bold uppercase tracking-widest block mb-0.5">
                  Assessment Dossier
                </span>
                <h2 className="text-xl sm:text-2xl font-display font-black uppercase text-white">
                  {selectedLead.contact?.name}
                </h2>
                <p className="text-xs font-mono text-gray-400">
                  WhatsApp: {selectedLead.contact?.whatsapp} {selectedLead.contact?.email ? `• ${selectedLead.contact.email}` : ''}
                </p>
              </div>

              <button
                onClick={() => setSelectedLead(null)}
                aria-label="Close modal"
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#1E1E24]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Health Flags Notice if any */}
            {Array.isArray(selectedLead.healthFlags) && selectedLead.healthFlags.length > 0 ? (
              <div className="bg-red-950/40 border border-red-600/60 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Coach Health &amp; Risk Flags ({selectedLead.healthFlags.length})</span>
                </div>
                <ul className="text-xs text-red-200 space-y-1 pl-2">
                  {selectedLead.healthFlags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"></span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-amber-300 font-mono pt-1">
                  Physician clearance &amp; load modulation required prior to high-intensity training.
                </p>
              </div>
            ) : (
              <div className="bg-emerald-950/30 border border-emerald-600/40 rounded-2xl p-3 flex items-center gap-2 text-xs text-emerald-300 font-mono">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>PAR-Q responses clear of cardiovascular and acute orthopedic risk factors.</span>
              </div>
            )}

            {/* 5-Step Summary Tabs / Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              {/* Biometrics */}
              <div className="bg-[#1B1B20] border border-[#2D2D38] p-3.5 rounded-xl space-y-1.5">
                <p className="font-mono text-[10px] text-[#E10600] uppercase font-bold">1. Biometrics &amp; Contact</p>
                <p className="text-gray-300"><strong>Age/Sex:</strong> {selectedLead.contact?.age || 'N/A'} yrs ({selectedLead.contact?.sex || 'M'})</p>
                <p className="text-gray-300"><strong>Height / Weight:</strong> {selectedLead.contact?.height || 'N/A'} cm / {selectedLead.contact?.weight || 'N/A'} kg</p>
                {selectedLead.contact?.height && selectedLead.contact?.weight && (
                  <p className="text-gray-400 font-mono text-[11px]">
                    BMI: {(Number(selectedLead.contact.weight) / ((Number(selectedLead.contact.height) / 100) ** 2)).toFixed(1)}
                  </p>
                )}
              </div>

              {/* Goals */}
              <div className="bg-[#1B1B20] border border-[#2D2D38] p-3.5 rounded-xl space-y-1.5">
                <p className="font-mono text-[10px] text-[#E10600] uppercase font-bold">2. Primary Target</p>
                <p className="text-gray-300"><strong>Goal:</strong> {selectedLead.goals?.primaryGoal}</p>
                <p className="text-gray-300"><strong>Timeline:</strong> {selectedLead.goals?.timeline}</p>
                {selectedLead.goals?.targetWeight && (
                  <p className="text-gray-300"><strong>Target Weight:</strong> {selectedLead.goals.targetWeight} kg</p>
                )}
                {selectedLead.goals?.motivationNotes && (
                  <p className="text-gray-400 italic text-[11px]">"{selectedLead.goals.motivationNotes}"</p>
                )}
              </div>

              {/* Training */}
              <div className="bg-[#1B1B20] border border-[#2D2D38] p-3.5 rounded-xl space-y-1.5">
                <p className="font-mono text-[10px] text-[#E10600] uppercase font-bold">3. Training &amp; Logistics</p>
                <p className="text-gray-300"><strong>Experience:</strong> {selectedLead.assessment?.training?.experience}</p>
                <p className="text-gray-300"><strong>Activity:</strong> {selectedLead.assessment?.training?.currentActivity}</p>
                <p className="text-gray-300"><strong>Location:</strong> {selectedLead.assessment?.training?.location}</p>
                <p className="text-gray-300"><strong>Frequency:</strong> {selectedLead.assessment?.training?.sessionsPerWeek}x / wk ({selectedLead.assessment?.training?.sessionLength})</p>
                <p className="text-gray-400 text-[11px]">
                  <strong>Availability:</strong> {Array.isArray(selectedLead.assessment?.training?.availability) ? selectedLead.assessment.training.availability.join(', ') : 'Not specified'}
                </p>
              </div>

              {/* Daily Life */}
              <div className="bg-[#1B1B20] border border-[#2D2D38] p-3.5 rounded-xl space-y-1.5">
                <p className="font-mono text-[10px] text-[#E10600] uppercase font-bold">4. Lifestyle &amp; Recovery</p>
                <p className="text-gray-300"><strong>Sleep:</strong> {selectedLead.assessment?.dailyLife?.sleepHours || '7-8h'}</p>
                <p className="text-gray-300"><strong>Water:</strong> {selectedLead.assessment?.dailyLife?.waterIntakeLiters || '2-3L'}</p>
                <p className="text-gray-300"><strong>Stress:</strong> {selectedLead.assessment?.dailyLife?.stressLevel || 'Moderate'}</p>
                <p className="text-gray-300"><strong>Diet:</strong> {selectedLead.assessment?.dailyLife?.dietPreference || 'Non-Veg'}</p>
                <p className="text-gray-400 text-[11px]">
                  <strong>Habits:</strong> Tobacco ({selectedLead.assessment?.dailyLife?.tobaccoUse || 'None'}), Alcohol ({selectedLead.assessment?.dailyLife?.alcoholUse || 'None'})
                </p>
                {selectedLead.assessment?.dailyLife?.allergies && (
                  <p className="text-red-300 text-[11px]"><strong>Allergies:</strong> {selectedLead.assessment.dailyLife.allergies}</p>
                )}
              </div>
            </div>

            {/* Medical notes if present */}
            {selectedLead.assessment?.injuriesAndMedicalNotes && (
              <div className="bg-[#1B1B20] border border-[#2D2D38] p-3.5 rounded-xl text-xs space-y-1">
                <p className="font-mono text-[10px] text-[#E10600] uppercase font-bold">Stated Medical History &amp; Injury Notes</p>
                <p className="text-gray-200">{selectedLead.assessment.injuriesAndMedicalNotes}</p>
              </div>
            )}

            {/* Consent info */}
            <div className="bg-[#1B1B20] border border-[#2D2D38] p-3 rounded-xl text-[11px] font-mono text-gray-400 flex items-center justify-between">
              <span>Consent Verified: Yes (Acknowledged non-medical intake)</span>
              <span>{selectedLead.consent?.acceptedAt ? new Date(selectedLead.consent.acceptedAt).toLocaleDateString() : 'Recorded'}</span>
            </div>

            {/* Follow-up history if any */}
            {Array.isArray(selectedLead.followUpHistory) && selectedLead.followUpHistory.length > 0 && (
              <div className="space-y-1.5">
                <p className="font-mono text-[10px] text-gray-400 uppercase font-bold">Follow-Up History ({selectedLead.followUpHistory.length})</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedLead.followUpHistory.map((h, idx) => (
                    <div key={idx} className="p-2 bg-[#1B1B20] rounded-lg text-[11px] flex items-center justify-between">
                      <span className="text-white font-medium capitalize">{h.stage} stage via {h.channel}</span>
                      <span className="text-gray-500 font-mono">{new Date(h.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Internal Trainer Notes & Follow-Up Editor */}
            <div className="pt-3 border-t border-[#262630] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Next Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={leadFollowUpDate}
                    onChange={e => setLeadFollowUpDate(e.target.value)}
                    className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Pipeline Status
                  </label>
                  <select
                    value={selectedLead.status}
                    onChange={e => selectedLead.id && handleStatusChange(selectedLead.id, e.target.value as LeadStatus)}
                    className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                  >
                    {PIPELINE_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Private Trainer Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Record call notes, preferred workout times, package interest, medical precautions..."
                  value={leadNotes}
                  onChange={e => setLeadNotes(e.target.value)}
                  className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="px-4 py-2.5 min-h-[40px] bg-[#E10600] hover:bg-[#FF3B30] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSavingNotes ? 'Saving...' : 'Save Notes & Follow-Up'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWhatsAppModalLead(selectedLead);
                      setSelectedLead(null);
                    }}
                    className="px-4 py-2.5 min-h-[40px] bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold rounded-xl text-xs flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp Follow-Up</span>
                  </button>

                  {selectedLead.status !== 'Won' && (
                    <button
                      type="button"
                      onClick={() => {
                        setConvertingLead(selectedLead);
                        setSelectedLead(null);
                      }}
                      className="px-4 py-2.5 min-h-[40px] bg-[#1E1E24] hover:bg-[#2A2A32] border border-[#2D2D38] text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-[#E10600]" />
                      <span>Convert to Athlete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CLICK-TO-WHATSAPP FOLLOW-UP TEMPLATES MODAL */}
      {/* ========================================================================= */}
      {whatsAppModalLead && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={() => setWhatsAppModalLead(null)}
        >
          <div 
            className="bg-[#141417] border border-[#262630] rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-5 shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#262630] pb-3">
              <div>
                <span className="text-[10px] font-mono text-[#25D366] font-bold uppercase tracking-widest block">
                  Click-to-WhatsApp Dispatch
                </span>
                <h3 className="text-lg font-bold text-white">
                  Follow-Up with {whatsAppModalLead.contact?.name}
                </h3>
                <p className="text-xs font-mono text-gray-400">
                  Phone: {whatsAppModalLead.contact?.whatsapp}
                </p>
              </div>

              <button
                onClick={() => setWhatsAppModalLead(null)}
                aria-label="Close modal"
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1E1E24]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Stage Tabs */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-300">
                Choose Follow-Up Sequence:
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  { id: 'immediate', label: 'Immediate' },
                  { id: 'day1', label: 'Day 1' },
                  { id: 'day3', label: 'Day 3' },
                  { id: 'day7', label: 'Day 7' },
                  { id: 'day14', label: 'Day 14' },
                  { id: 'custom', label: 'Custom' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTemplateStage(item.id as any)}
                    className={`py-2 px-1 text-[11px] font-mono rounded-xl border text-center transition-all ${
                      activeTemplateStage === item.id
                        ? 'bg-[#25D366] text-black font-bold border-[#25D366]'
                        : 'bg-[#1B1B20] text-gray-400 border-[#2D2D38] hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Preview Box */}
            <div className="bg-[#1B1B20] border border-[#2D2D38] rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                <span>Message Preview</span>
                <span className="text-[#25D366] font-semibold capitalize">{activeTemplateStage} stage</span>
              </div>

              {activeTemplateStage === 'custom' ? (
                <textarea
                  rows={4}
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  placeholder="Type your custom WhatsApp follow-up message..."
                  className="w-full bg-[#141417] border border-[#2D2D38] rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none"
                />
              ) : (
                <div className="bg-[#141417] border border-[#222228] rounded-xl p-3 text-xs text-gray-200 leading-relaxed font-sans select-all whitespace-pre-wrap">
                  {getWhatsAppMessage(whatsAppModalLead, activeTemplateStage)}
                </div>
              )}
            </div>

            <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
              💡 <em>Clicking "Open in WhatsApp" or "Copy Message" will update this lead's status to <strong>Contacted</strong> and record the event in history.</em>
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-[#262630]">
              <button
                type="button"
                onClick={() => handleCopyWhatsApp(whatsAppModalLead, activeTemplateStage)}
                className="flex-1 px-4 py-3 min-h-[44px] bg-[#1E1E24] hover:bg-[#2A2A32] border border-[#2D2D38] text-gray-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedStage === activeTemplateStage ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Message</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleOpenWhatsApp(whatsAppModalLead, activeTemplateStage)}
                className="flex-1 px-4 py-3 min-h-[44px] bg-[#25D366] hover:bg-[#20bd5a] text-black rounded-xl text-xs font-bold transition-all shadow-[0_4px_12px_rgba(37,211,102,0.3)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open in WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SAFE ATHLETE CONVERSION MODAL */}
      {/* ========================================================================= */}
      {convertingLead && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={() => !isConverting && setConvertingLead(null)}
        >
          <div 
            className="bg-[#141417] border border-[#262630] rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#262630] pb-3">
              <div>
                <span className="text-[10px] font-mono text-[#E10600] font-bold uppercase tracking-widest block">
                  Athlete Conversion
                </span>
                <h3 className="text-lg font-bold text-white">
                  Convert {convertingLead.contact?.name}
                </h3>
              </div>
              {!isConverting && (
                <button
                  onClick={() => setConvertingLead(null)}
                  aria-label="Close conversion modal"
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1E1E24]"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {conversionResult ? (
              <div className="space-y-4 text-center py-2 animate-in fade-in-50">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-white">
                  {conversionResult.isExisting ? 'Existing Client Linked!' : 'Athlete Account Created!'}
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {conversionResult.message}
                </p>

                {!conversionResult.isExisting && conversionResult.temporaryPassword && (
                  <div className="bg-[#1B1B20] border border-[#2D2D38] p-3.5 rounded-xl text-left text-xs font-mono space-y-1">
                    <p className="text-gray-400 text-[10px] uppercase font-bold text-[#E10600]">One-Time Login Credentials</p>
                    <p className="text-white">Email: <strong>{conversionResult.clientEmail}</strong></p>
                    <p className="text-white">Temporary Password: <strong className="text-emerald-400 select-all">{conversionResult.temporaryPassword}</strong></p>
                    <p className="text-[10px] text-gray-500 pt-1">Please share this password with the athlete via WhatsApp.</p>
                  </div>
                )}

                <button
                  onClick={() => {
                    setConversionResult(null);
                    setConvertingLead(null);
                  }}
                  className="w-full py-3 bg-[#E10600] hover:bg-[#FF3B30] text-white rounded-xl text-xs font-bold transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-gray-300 leading-relaxed">
                  This will convert <strong className="text-white">{convertingLead.contact?.name}</strong> into an active athlete account and set their status to <strong className="text-emerald-400">Won</strong>.
                </p>

                <div className="bg-[#1B1B20] border border-[#2D2D38] p-3.5 rounded-xl text-xs space-y-2">
                  <p className="font-mono text-[10px] text-[#E10600] uppercase font-bold">Safety &amp; Deduplication Guarantee</p>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    The server checks for existing accounts by email and WhatsApp. If this athlete already exists, their assessment will be linked directly to their profile <strong>without creating duplicate records</strong>.
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isConverting}
                    onClick={() => setConvertingLead(null)}
                    className="flex-1 py-3 bg-[#1E1E24] hover:bg-[#2A2A32] text-gray-300 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isConverting}
                    onClick={() => handleConvertLead(convertingLead)}
                    className="flex-1 py-3 bg-[#E10600] hover:bg-[#FF3B30] disabled:bg-gray-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {isConverting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Converting...</span>
                      </>
                    ) : (
                      <span>Confirm Conversion</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. GOOGLE SHEETS SETUP GUIDE MODAL */}
      {/* ========================================================================= */}
      {showSheetsGuide && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={() => setShowSheetsGuide(false)}
        >
          <div 
            className="bg-[#141417] border border-[#262630] rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#262630] pb-3">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Google Sheets Integration Guide</h3>
                  <p className="text-[11px] font-mono text-gray-400">Step-by-step connection for your existing Sheet</p>
                </div>
              </div>
              <button
                onClick={() => setShowSheetsGuide(false)}
                aria-label="Close sheets guide modal"
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1E1E24]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-gray-300 leading-relaxed">
              <p>
                To sync your Speed Fit lead assessments into the Google Sheet you already use without exposing credentials:
              </p>

              <div className="space-y-2.5 bg-[#1B1B20] border border-[#2D2D38] p-4 rounded-xl">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#E10600] text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Click <strong>Export CSV</strong> above to download the latest UTF-8 assessment ledger.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#E10600] text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>In your existing Google Sheet, click <strong>File &gt; Import &gt; Upload</strong> and select the downloaded CSV.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#E10600] text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Select <strong>"Append to current sheet"</strong> (or create a new tab named "Speed Fit Leads") to keep your existing formulas and columns intact.</span>
                </div>
              </div>

              <div className="bg-[#1B1B20] border border-[#2D2D38] p-3 rounded-xl space-y-1 font-mono text-[11px]">
                <p className="text-emerald-400 font-bold">Standard Column Mapping:</p>
                <p className="text-gray-400 text-[10px]">
                  Date, Name, WhatsApp, Email, Age, Sex, Height, Weight, Primary Goal, Target Weight, Timeline, Experience, Location, Sessions/Wk, PAR-Q Flags, Health Flags Detail, Status, Follow-Up Due, Notes.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#262630]">
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex-1 py-3 bg-[#E10600] hover:bg-[#FF3B30] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV Now</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSheetsGuide(false)}
                className="px-5 py-3 bg-[#1E1E24] hover:bg-[#2A2A32] text-gray-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerLeadsView;
