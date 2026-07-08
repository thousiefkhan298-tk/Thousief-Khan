import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase.js";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, 
  X, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Target, 
  Scale, 
  AlertCircle, 
  Filter, 
  TrendingUp, 
  ChevronRight, 
  DollarSign, 
  Shield 
} from "lucide-react";

// Matches exact schema required by client list
export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  plan: "Starter" | "Accelerate" | "Elite" | string;
  status: "active" | "paused" | "inactive" | string;
  startDate?: string;
  nextPaymentDate?: string;
  goal?: string;
  weight?: number | string;
  profilePhoto?: string;
}

export const ClientRoster: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("All");

  // Detail Drawer state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Firestore real-time synchronization with robust client-side index fallback
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // Primary Attempt: query by CLIENT role and order by name
    const qClientsOrdered = query(
      collection(db, "users"),
      where("role", "==", "CLIENT"),
      orderBy("name")
    );

    const unsubscribe = onSnapshot(
      qClientsOrdered,
      (snapshot) => {
        const fetched: Client[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "Unnamed Athlete",
            email: data.email || "",
            phone: data.phone || data.phoneNumber || "",
            plan: data.plan || "Starter",
            status: (data.status || "active").toLowerCase(),
            startDate: data.startDate || "",
            nextPaymentDate: data.nextPaymentDate || "",
            goal: data.goal || data.fitnessGoals || "General Fitness",
            weight: data.weight || data.currentWeight || "",
            profilePhoto: data.profilePhoto || data.photoURL || "",
          };
        });
        setClients(fetched);
        setIsLoading(false);
      },
      (err) => {
        console.warn(
          "Firestore query ordered by name failed (likely missing dynamic index on Firebase). Active graceful fallback to in-memory sorting...",
          err
        );

        // Fallback: Fetch all users and handle filtering/sorting on client-side
        const qFallback = query(collection(db, "users"));
        const unsubscribeFallback = onSnapshot(
          qFallback,
          (snap) => {
            const fetchedFallback: Client[] = snap.docs
              .map((doc) => {
                const data = doc.data();
                return {
                  id: doc.id,
                  name: data.name || "Unnamed Athlete",
                  email: data.email || "",
                  phone: data.phone || data.phoneNumber || "",
                  role: data.role || "",
                  plan: data.plan || "Starter",
                  status: (data.status || "active").toLowerCase(),
                  startDate: data.startDate || "",
                  nextPaymentDate: data.nextPaymentDate || "",
                  goal: data.goal || data.fitnessGoals || "General Fitness",
                  weight: data.weight || data.currentWeight || "",
                  profilePhoto: data.profilePhoto || data.photoURL || "",
                };
              })
              // Support either case variations ('CLIENT' vs 'client')
              .filter((u: any) => u.role && u.role.toLowerCase() === "client")
              // Sort client-side alphabetically by name
              .sort((a, b) => a.name.localeCompare(b.name));

            setClients(fetchedFallback);
            setIsLoading(false);
          },
          (secondErr) => {
            console.error("Firestore roster fetch failed completely: ", secondErr);
            setError("Roster database could not be loaded. Please verify database connection.");
            setIsLoading(false);
          }
        );

        return () => unsubscribeFallback();
      }
    );

    return () => unsubscribe();
  }, []);

  // Keyboard support to dismiss drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedClient(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Compute calculated metrics for Statistics Panel
  const totalActive = clients.filter((c) => c.status === "active").length;
  const totalPaused = clients.filter((c) => c.status === "paused").length;
  const totalInactive = clients.filter((c) => c.status === "inactive").length;
  const totalElite = clients.filter((c) => c.plan && c.plan.toLowerCase() === "elite").length;

  // Perform multi-criteria Client-Side Filtering
  const filteredClients = clients.filter((c) => {
    // Search query matches name or email (case-insensitive)
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());

    // Plan Filter
    const matchesPlan =
      selectedPlanFilter === "All" ||
      c.plan.toLowerCase() === selectedPlanFilter.toLowerCase();

    // Status Filter
    const matchesStatus =
      selectedStatusFilter === "All" ||
      c.status.toLowerCase() === selectedStatusFilter.toLowerCase();

    return matchesSearch && matchesPlan && matchesStatus;
  });

  // Initials generator helper
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <div id="speedfit-roster-container" className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10 font-sans">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-zinc-900 pb-6">
        <div>
          <span className="text-[10px] bg-red-600/10 text-red-500 font-mono py-1 px-3 rounded-full uppercase tracking-widest border border-red-500/20">
            Coach Operations Panel
          </span>
          <h1 className="text-4xl md:text-5xl font-display font-extrabold text-white mt-1 uppercase tracking-tight">
            ATHLETE <span className="text-[#FF0000]">ROSTER</span>
          </h1>
          <p className="text-zinc-400 text-xs mt-1 font-mono">
            Manage your high-performance clients, track plans, and oversee active subscription statuses.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
          <span>Roster Live-Synced</span>
        </div>
      </div>

      {/* 1. STATE STRIP / STATS BENTO PANEL */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Active Box */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex flex-col justify-between transition-all hover:border-green-500/30 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-green-400">Active</span>
            <div className="w-2 h-2 rounded-full bg-green-500 group-hover:scale-125 transition-all"></div>
          </div>
          <div className="mt-4">
            <span className="text-3xl md:text-4xl font-display font-black text-white">
              {isLoading ? "..." : totalActive}
            </span>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Under Active Training</p>
          </div>
        </div>

        {/* Paused Box */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex flex-col justify-between transition-all hover:border-amber-500/30 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">Paused</span>
            <div className="w-2 h-2 rounded-full bg-amber-500 group-hover:scale-125 transition-all"></div>
          </div>
          <div className="mt-4">
            <span className="text-3xl md:text-4xl font-display font-black text-white">
              {isLoading ? "..." : totalPaused}
            </span>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">On Short Hold</p>
          </div>
        </div>

        {/* Inactive Box */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex flex-col justify-between transition-all hover:border-zinc-700/50 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Inactive</span>
            <div className="w-2 h-2 rounded-full bg-zinc-650 group-hover:scale-125 transition-all"></div>
          </div>
          <div className="mt-4">
            <span className="text-3xl md:text-4xl font-display font-black text-white">
              {isLoading ? "..." : totalInactive}
            </span>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Expired Memberships</p>
          </div>
        </div>

        {/* Elite Plan Box */}
        <div className="bg-zinc-950 border border-red-950/40 rounded-2xl p-4 flex flex-col justify-between transition-all hover:border-red-500/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-600/5 blur-xl group-hover:bg-red-600/10 transition-all rounded-full"></div>
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-500 flex items-center gap-1">
              <Shield className="w-3 h-3 text-red-500" /> Elite Tier
            </span>
            <span className="text-[8px] bg-red-950 text-red-400 px-2 py-0.5 rounded font-mono font-bold">PREMIUM</span>
          </div>
          <div className="mt-4 relative z-10">
            <span className="text-3xl md:text-4xl font-display font-black text-white">
              {isLoading ? "..." : totalElite}
            </span>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">VIP Strength Coaching</p>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & FILTERS CONTROLS */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 mb-8 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search bar inputs */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search athlete roster by full name or email address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/60 border border-zinc-800 placeholder-zinc-500 text-sm text-white pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:border-red-650 focus:ring-1 focus:ring-red-650 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Clean Clear Buttons */}
          {(selectedPlanFilter !== "All" || selectedStatusFilter !== "All" || searchQuery) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedPlanFilter("All");
                setSelectedStatusFilter("All");
              }}
              className="text-xs font-mono text-zinc-400 hover:text-red-500 transition-all border border-zinc-800 px-4 py-3 rounded-xl hover:bg-zinc-900 text-center"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Dynamic Filter Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-zinc-900/60">
          {/* Plan filter row */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">
              Filter by EMS Subscription Plan
            </label>
            <div className="flex flex-wrap gap-2">
              {["All", "Starter", "Accelerate", "Elite"].map((plan) => (
                <button
                  key={plan}
                  onClick={() => setSelectedPlanFilter(plan)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-tight transition-all uppercase ${
                    selectedPlanFilter.toLowerCase() === plan.toLowerCase()
                      ? "bg-red-650 text-white border border-red-500"
                      : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-805 border border-transparent"
                  }`}
                >
                  {plan}
                </button>
              ))}
            </div>
          </div>

          {/* Status filter row */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">
              Filter by Athlete Status
            </label>
            <div className="flex flex-wrap gap-2">
              {["All", "Active", "Paused", "Inactive"].map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-tight transition-all uppercase ${
                    selectedStatusFilter.toLowerCase() === status.toLowerCase()
                      ? status === "Active" && selectedStatusFilter === "Active"
                        ? "bg-green-600/20 text-green-400 border border-green-500/30"
                        : status === "Paused" && selectedStatusFilter === "Paused"
                        ? "bg-amber-600/20 text-amber-400 border border-amber-500/30"
                        : status === "Inactive" && selectedStatusFilter === "Inactive"
                        ? "bg-zinc-800 text-zinc-300 border border-zinc-650"
                        : "bg-red-650 text-white border border-red-500"
                      : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-805 border border-transparent"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. CORE CLIENTS LIST / LOADING STATES */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-zinc-800 border-t-red-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-xs font-mono text-zinc-400">Fetching live client roster dossier...</p>
        </div>
      ) : error ? (
        <div className="bg-red-950/20 border border-red-900 p-6 rounded-2xl flex items-start gap-4 max-w-xl mx-auto">
          <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-red-450">Data Loading Block</h3>
            <p className="text-xs text-zinc-400 mt-1">{error}</p>
          </div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl py-20 px-4 text-center">
          <Target className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h2 className="text-lg font-bold">No Clients Matching Filter</h2>
          <p className="text-zinc-500 text-xs font-mono mt-1 max-w-md mx-auto">
            We couldn't locate any active roster entries matching the search keyword or filter parameters. Try clearing queries to reset.
          </p>
        </div>
      ) : (
        /* Real clients grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredClients.map((client) => {
            const planLower = client.plan.toLowerCase();
            const isElite = planLower === "elite";
            const isAccelerate = planLower === "accelerate";

            return (
              <div
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className="bg-zinc-950 border border-zinc-900/80 hover:border-red-650 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[0_10px_20px_-10px_rgba(255,0,0,0.15)] group relative overflow-hidden"
              >
                {/* Visual Accent Corner for VIP clients */}
                {isElite && (
                  <div className="absolute top-0 right-0 w-2 h-12 bg-red-600"></div>
                )}

                <div>
                  {/* Top Header Card */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="relative">
                      {client.profilePhoto ? (
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900">
                          <img
                            src={client.profilePhoto}
                            alt={client.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-red-500 text-sm font-bold tracking-tighter">
                          {getInitials(client.name)}
                        </div>
                      )}

                      {/* Status Dot */}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 ${
                          client.status === "active"
                            ? "bg-green-500"
                            : client.status === "paused"
                            ? "bg-amber-500"
                            : "bg-zinc-650"
                        }`}
                      ></span>
                    </div>

                    {/* Quick Badge */}
                    <div className="flex flex-col items-end gap-1.5">
                      {/* Subscription badge style */}
                      <span
                        className={`text-[9px] font-mono uppercase font-black px-2.5 py-0.5 rounded-md ${
                          isElite
                            ? "bg-red-950 text-red-400 border border-red-800/20"
                            : isAccelerate
                            ? "bg-amber-950/40 text-amber-400 border border-amber-800/10"
                            : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                        }`}
                      >
                        {client.plan}
                      </span>

                      {/* Status Badges */}
                      <span
                        className={`text-[8px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          client.status === "active"
                            ? "bg-green-950/30 text-green-400"
                            : client.status === "paused"
                            ? "bg-amber-950/30 text-amber-400"
                            : "bg-zinc-900 text-zinc-500"
                        }`}
                      >
                        {client.status}
                      </span>
                    </div>
                  </div>

                  {/* Client Bio */}
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white group-hover:text-red-500 transition-colors line-clamp-1">
                      {client.name}
                    </h3>
                    <p className="text-[11px] font-mono text-zinc-500 line-clamp-1">{client.email}</p>
                    {client.phone && (
                      <p className="text-[10px] font-mono text-zinc-600 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-zinc-700" /> {client.phone}
                      </p>
                    )}
                  </div>

                  {/* Goal section */}
                  <div className="mt-4 pt-3 border-t border-zinc-900/60">
                    <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <Target className="w-3 h-3 text-red-500" /> Targeted Goal
                    </p>
                    <p className="text-xs text-zinc-300 mt-0.5 line-clamp-2 leading-relaxed">
                      {client.goal || "Not updated"}
                    </p>
                  </div>
                </div>

                {/* Card footer date indicator */}
                <div className="mt-4 pt-3 border-t border-zinc-900/60 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Due Renewal
                  </span>
                  <span className="text-zinc-300 font-bold">
                    {client.nextPaymentDate || "No schedule record"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. DETAIL SIDE DRAWER (Framer Motion Slide-in) */}
      <AnimatePresence>
        {selectedClient && (
          <>
            {/* Backdrop Blur overlay click to dismiss */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedClient(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 cursor-zoom-out"
            />

            {/* Side sheet detail container */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full sm:max-w-md bg-zinc-950 border-l border-zinc-905 z-50 shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              {/* Header section with cover backdrop */}
              <div>
                <div className="relative h-28 bg-[#0a0a0a] border-b border-zinc-900 flex items-center px-6">
                  {/* Absolute backdrop pattern */}
                  <div className="absolute inset-0 bg-radial-gradient from-red-950/20 to-transparent pointer-events-none"></div>

                  <button
                    onClick={() => setSelectedClient(null)}
                    type="button"
                    className="absolute top-4 right-4 p-2 bg-zinc-900 hover:bg-zinc-850 hover:text-red-500 text-zinc-400 rounded-full transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-4 relative z-10 mt-4">
                    {selectedClient.profilePhoto ? (
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-red-650 bg-zinc-900 shadow-lg shadow-red-500/10">
                        <img
                          src={selectedClient.profilePhoto}
                          alt={selectedClient.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-zinc-900 border-2 border-red-650 flex items-center justify-center text-red-500 text-xl font-bold tracking-tighter shadow-lg shadow-red-500/10">
                        {getInitials(selectedClient.name)}
                      </div>
                    )}

                    <div className="space-y-1">
                      <h2 className="text-lg font-display font-extrabold tracking-wide uppercase text-white leading-none">
                        {selectedClient.name}
                      </h2>
                      <div className="flex items-center gap-2">
                        {/* Status tag */}
                        <span
                          className={`text-[8px] font-mono tracking-wider font-bold uppercase px-2 py-0.5 rounded ${
                            selectedClient.status === "active"
                              ? "bg-green-950 text-green-400 border border-green-900/30"
                              : selectedClient.status === "paused"
                              ? "bg-amber-950 text-amber-400 border border-amber-900/30"
                              : "bg-zinc-905 text-zinc-500"
                          }`}
                        >
                          {selectedClient.status}
                        </span>
                        {/* Plan Badge */}
                        <span className="text-[8px] font-mono tracking-wider bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded border border-zinc-805">
                          {selectedClient.plan} Plan
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Client Details Readouts */}
                <div className="p-6 space-y-6">
                  {/* Stats Grid Profile Section */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-900/40 border border-zinc-900/80 p-3 rounded-xl flex items-center gap-3">
                      <Scale className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <div>
                        <p className="text-[9px] font-mono uppercase text-zinc-500 leading-none">Weight</p>
                        <p className="text-sm font-bold mt-1 text-white">
                          {selectedClient.weight ? `${selectedClient.weight} kg` : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="bg-zinc-900/40 border border-zinc-900/80 p-3 rounded-xl flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <div>
                        <p className="text-[9px] font-mono uppercase text-zinc-500 leading-none">Target Goal</p>
                        <p className="text-xs font-bold mt-1 text-zinc-200 line-clamp-1">
                          {selectedClient.goal || "Build Muscle"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Complete Bio Information panel */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-2 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-red-500" /> Athlete Credentials
                    </h3>

                    <div className="space-y-3 font-mono text-xs">
                      {/* Name Entry */}
                      <div className="flex items-center justify-between py-1 border-b border-zinc-900/30">
                        <span className="text-zinc-500">Full Name</span>
                        <span className="text-zinc-250 font-bold">{selectedClient.name}</span>
                      </div>

                      {/* Phone Entry */}
                      <div className="flex items-center justify-between py-1 border-b border-zinc-900/30">
                        <span className="text-zinc-500">Contact Number</span>
                        <span className="text-zinc-250 flex items-center gap-1 text-right">
                          {selectedClient.phone || "No phone uploaded"}
                        </span>
                      </div>

                      {/* Email Entry */}
                      <div className="flex items-center justify-between py-1 border-b border-zinc-900/30">
                        <span className="text-zinc-500">Primary Email</span>
                        <span className="text-zinc-250 break-all text-right">{selectedClient.email}</span>
                      </div>

                      {/* Id Entry */}
                      <div className="flex items-center justify-between py-1 border-b border-zinc-900/30">
                        <span className="text-zinc-500">Athlete System ID</span>
                        <span className="text-zinc-400 uppercase text-[9px] font-mono break-all">{selectedClient.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Billing Details panel */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-2 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-red-500" /> Subscription Ledger
                    </h3>

                    <div className="space-y-3 font-mono text-xs">
                      {/* Sub Plan */}
                      <div className="flex items-center justify-between py-1 border-b border-zinc-900/30">
                        <span className="text-zinc-500">Enrolled Core Plan</span>
                        <span className="text-red-500 font-extrabold uppercase">{selectedClient.plan} Plan</span>
                      </div>

                      {/* Date Joined */}
                      <div className="flex items-center justify-between py-1 border-b border-zinc-900/30">
                        <span className="text-zinc-500">Onboarding Start Date</span>
                        <span className="text-zinc-300">
                          {selectedClient.startDate || "Pending cycle launch"}
                        </span>
                      </div>

                      {/* Renewal Threshold */}
                      <div className="flex items-center justify-between py-1 border-b border-zinc-900/30">
                        <span className="text-zinc-500">Next Renewal Threshold</span>
                        <span className="text-zinc-300 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-zinc-500" />
                          {selectedClient.nextPaymentDate || "No payments recorded"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Goal Paragraph Block */}
                  {selectedClient.goal && (
                    <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl space-y-1.5">
                      <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Athletic Assessment Notes</p>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">{selectedClient.goal}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Back actions panel buttons */}
              <div className="p-6 border-t border-zinc-900 bg-zinc-950 flex gap-3 relative z-10">
                <a
                  href={`mailto:${selectedClient.email}?subject=SpeedFit Coaching Session`}
                  className="flex-1 bg-red-650 hover:bg-red-700 active:scale-95 text-xs text-white text-center font-bold uppercase py-3 rounded-xl flex items-center justify-center gap-1.5 tracking-wider transition-all"
                >
                  <Mail className="w-4 h-4" /> Message Athlete
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="px-4 py-3 border border-zinc-800 hover:bg-zinc-900 active:scale-95 text-xs text-zinc-400 font-bold uppercase rounded-xl tracking-wider transition-all"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
