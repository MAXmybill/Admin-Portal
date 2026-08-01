"use client";

import { useMemo, useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const PLAN_COLORS = {
  Free: "#94A3B8",
  Basic: "#4455DF",
  Pro: "#F07C23",
  Premium: "#10B981",
  Enterprise: "#8B5CF6",
};

export function StoreGrowthChart({ stores = [] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Aggregate real stores by creation month
  const chartData = useMemo(() => {
    if (!stores || stores.length === 0) {
      return [
        { month: "Current", stores: 0 }
      ];
    }

    const monthCounts = {};
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "short" });
      monthCounts[label] = 0;
    }

    stores.forEach((store) => {
      let storeDate;
      if (store.createdAt?.toDate) {
        storeDate = store.createdAt.toDate();
      } else if (store.createdAt?.seconds) {
        storeDate = new Date(store.createdAt.seconds * 1000);
      } else if (store.createdAt) {
        storeDate = new Date(store.createdAt);
      }

      if (storeDate && !isNaN(storeDate.getTime())) {
        const label = storeDate.toLocaleString("default", { month: "short" });
        if (monthCounts.hasOwnProperty(label)) {
          monthCounts[label] += 1;
        }
      } else {
        const currentMonthLabel = now.toLocaleString("default", { month: "short" });
        if (monthCounts.hasOwnProperty(currentMonthLabel)) {
          monthCounts[currentMonthLabel] += 1;
        }
      }
    });

    return Object.keys(monthCounts).map((month) => ({
      month,
      stores: monthCounts[month],
    }));
  }, [stores]);

  if (!mounted) {
    return <div className="h-72 w-full bg-slate-50 rounded-2xl animate-pulse flex items-center justify-center text-xs text-slate-400">Loading chart...</div>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="storeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4455DF" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#4455DF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="month" stroke="#64748B" fontSize={12} tickLine={false} />
          <YAxis stroke="#64748B" fontSize={12} tickLine={false} allowDecimals={false} />
          <Tooltip
            formatter={(value) => [`${value} Stores`, "Registrations"]}
            contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
          />
          <Area type="monotone" dataKey="stores" stroke="#4455DF" strokeWidth={3} fillOpacity={1} fill="url(#storeGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PlanDistributionChart({ stores = [] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chartData = useMemo(() => {
    if (!stores || stores.length === 0) {
      return [{ name: "No Stores", value: 1, color: "#CBD5E1" }];
    }

    const planCounts = {};
    stores.forEach((store) => {
      const planName = store.plan || "Free";
      planCounts[planName] = (planCounts[planName] || 0) + 1;
    });

    return Object.keys(planCounts).map((planName) => ({
      name: planName,
      value: planCounts[planName],
      color: PLAN_COLORS[planName] || "#64748B",
    }));
  }, [stores]);

  if (!mounted) {
    return <div className="h-72 w-full bg-slate-50 rounded-2xl animate-pulse flex items-center justify-center text-xs text-slate-400">Loading chart...</div>;
  }

  return (
    <div className="h-72 w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(val) => [`${val} Stores`, "Total"]} />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
