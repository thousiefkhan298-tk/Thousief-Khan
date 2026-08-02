import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
  trend?: string;
}

export const TrainerDashboardCard = ({ title, value, icon, className, trend }: Props) => {
  return (
    <Card className={cn("rounded-2xl border-[#2A2A2A] bg-[#1F1F1F] text-white shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {trend && <p className="text-xs text-gray-400 mt-1">{trend}</p>}
      </CardContent>
    </Card>
  );
};
