import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
  trend?: string;
  onClick?: () => void;
}

export const TrainerDashboardCard = ({ title, value, icon, className, trend, onClick }: Props) => {
  return (
    <Card 
      onClick={onClick}
      className={cn(
        "rounded-2xl border-[#26262B] bg-[#141417] text-white shadow-sm transition-all", 
        onClick && "cursor-pointer hover:border-[#DC2626]/60 hover:bg-[#1A1A20] active:scale-[0.98]",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white tabular-nums font-display tracking-tight">{value}</div>
        {trend && <p className="text-xs text-slate-400 mt-1 font-mono">{trend}</p>}
      </CardContent>
    </Card>
  );
};
