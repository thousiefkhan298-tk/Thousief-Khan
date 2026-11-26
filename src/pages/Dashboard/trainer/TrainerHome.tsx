import { useState } from 'react';
import { ArrowRight, CheckSquare, CreditCard, Dumbbell, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { User } from '../../../types';

interface TrainerHomeProps {
  clients: User[];
  clientsLoading: boolean;
  attendanceToRecord: number | null;
  clientsWithFeesDue: number | null;
  workoutCount: number | null;
}

export default function TrainerHome({
  clients, clientsLoading, attendanceToRecord, clientsWithFeesDue, workoutCount,
}: TrainerHomeProps) {
  const [selectedId, setSelectedId] = useState('');
  const selectedClient = clients.find(client => client.id === selectedId);
  const cards = [
    { label: 'Total clients', value: clientsLoading ? null : clients.length, icon: Users, to: '/dashboard?tab=clients' },
    { label: 'Attendance to record today', value: attendanceToRecord, icon: CheckSquare, to: '/dashboard?tab=attendance' },
    { label: 'Clients with fees due', value: clientsWithFeesDue, icon: CreditCard, to: '/dashboard?tab=payments' },
    { label: 'Workout entries', value: workoutCount, icon: Dumbbell, to: '/workout-logs?view=journal' },
  ];
  const panel = 'rounded-2xl border border-[#32323a] bg-[#1b1b22] p-4 sm:p-5';

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 font-sans">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Trainer Dashboard</h2>
        <p className="mt-1 text-sm text-[#b5b5c0]">Manage your clients, sessions, and payments.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, to }) => (
          <Link key={label} to={to} className={`${panel} flex flex-col gap-2 hover:border-[#f33542] focus-visible:outline-2 focus-visible:outline-[#f33542]`}>
            <Icon size={21} className="text-[#ff5864]" aria-hidden="true" />
            <strong className="text-2xl font-bold tabular-nums text-white">
              {value ?? <span aria-label="Loading">–</span>}
            </strong>
            <span className="text-xs font-medium text-[#c1c1ca]">{label}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className={panel}>
          <h3 className="mb-4 text-base font-semibold text-white">Quick client access</h3>
          <label htmlFor="trainer-home-client" className="block text-sm text-[#c1c1ca]">Choose a client</label>
          <select
            id="trainer-home-client"
            value={selectedClient?.id ?? ''}
            onChange={event => setSelectedId(event.target.value)}
            disabled={clientsLoading || clients.length === 0}
            className="mt-2 min-h-11 w-full rounded-xl border px-3 text-sm"
          >
            <option value="">
              {clientsLoading ? 'Loading clients…' : clients.length ? 'Select a client' : 'No client profiles yet'}
            </option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.clientDetails?.fullName || client.name || client.email || client.id}
              </option>
            ))}
          </select>
          <Link
            to={selectedClient ? `/client/${encodeURIComponent(selectedClient.id)}` : '/dashboard?tab=clients'}
            className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#be2433] px-4 text-sm font-semibold text-white hover:bg-[#a91e2b] focus-visible:outline-2 focus-visible:outline-white"
          >
            {selectedClient ? 'Open client profile' : 'View clients'}
          </Link>
        </section>

        <section className={panel}>
          <h3 className="mb-2 text-base font-semibold text-white">Daily work</h3>
          <div className="divide-y divide-[#32323a]">
            {[
              ['Record attendance', '/dashboard?tab=attendance'],
              ['Log a completed workout', '/workout-logs?view=journal'],
              ['Record a payment', '/dashboard?tab=payments'],
              ['Review workout and diet plans', '/dashboard?tab=workouts'],
              ['Open reports and alerts', '/dashboard?tab=analytics'],
            ].map(([label, to]) => (
              <Link key={label} to={to} className="flex min-h-11 items-center justify-between gap-2 text-sm text-[#dedee5] hover:text-white focus-visible:outline-2 focus-visible:outline-[#f33542]">
                {label}
                <ArrowRight size={15} className="shrink-0 text-[#ff5864]" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
