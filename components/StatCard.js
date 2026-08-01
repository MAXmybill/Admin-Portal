"use client";

export default function StatCard({ title, value, icon: Icon, change, changeType = "increase", subtext = "", color = "indigo" }) {
  const colorMap = {
    indigo: "from-[#4455DF] to-indigo-600 text-white shadow-indigo-500/20",
    orange: "from-[#F07C23] to-amber-500 text-white shadow-orange-500/20",
    emerald: "from-emerald-500 to-teal-600 text-white shadow-emerald-500/20",
    rose: "from-rose-500 to-pink-600 text-white shadow-rose-500/20",
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <h3 className="text-2xl font-black text-slate-800 mt-2 tracking-tight">{value}</h3>
          {(change || subtext) && (
            <p
              className={`text-xs font-semibold mt-2 flex items-center space-x-1 ${
                changeType === "increase" ? "text-emerald-600" : changeType === "decrease" ? "text-rose-600" : "text-slate-600"
              }`}
            >
              {change && <span>{changeType === "increase" ? "↑" : changeType === "decrease" ? "↓" : "•"}</span>}
              {change && <span>{change}</span>}
              {subtext && <span className="text-slate-400 font-normal ml-1">{subtext}</span>}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${colorMap[color]} flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
