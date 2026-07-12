import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  Truck,
  Route,
  Activity,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  Percent,
  RefreshCw,
  SlidersHorizontal
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

export const Dashboard: React.FC = () => {
  const [kpis, setKpis] = useState<any>({
    active_vehicles: 0,
    available_vehicles: 0,
    vehicles_in_maintenance: 0,
    active_trips: 0,
    pending_trips: 0,
    drivers_on_duty: 0,
    fleet_utilization_pct: 0,
  });
  
  const [regions, setRegions] = useState<string[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [reportsData, setReportsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const kpiData = await api.getKPIs(selectedRegion, selectedType);
      setKpis(kpiData);

      const rData = await api.getVehicleSummaryReport(selectedRegion, selectedType);
      setReportsData(rData);
    } catch (error) {
      console.error("Failed to load dashboard KPIs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadFilters() {
      try {
        const reg = await api.getRegions();
        setRegions(reg);
        const types = await api.getCatalogVehicleTypes();
        setVehicleTypes(types);
      } catch (error) {
        console.error("Failed to load dashboard filters", error);
      }
    }
    loadFilters();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedRegion, selectedType]);

  const cards = [
    {
      title: "Fleet Utilization",
      value: `${kpis.fleet_utilization_pct}%`,
      icon: Percent,
      color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
      description: "Percentage of active vehicles on trip",
    },
    {
      title: "Active Vehicles",
      value: kpis.active_vehicles,
      icon: Truck,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      description: "Total registered active cargo vehicles",
    },
    {
      title: "Available Fleet",
      value: kpis.available_vehicles,
      icon: CheckCircle,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      description: "Vehicles ready for dispatch selection",
    },
    {
      title: "In Shop (Service)",
      value: kpis.vehicles_in_maintenance,
      icon: AlertTriangle,
      color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
      description: "Vehicles undergoing repairs",
    },
    {
      title: "Active Deliveries",
      value: kpis.active_trips,
      icon: Route,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      description: "Trips currently in transit state",
    },
    {
      title: "Pending Dispatches",
      value: kpis.pending_trips,
      icon: Activity,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
      description: "Trips logged in draft status",
    },
    {
      title: "Drivers On Duty",
      value: kpis.drivers_on_duty,
      icon: UserCheck,
      color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
      description: "Drivers currently operating vehicles",
    },
  ];

  // Pie chart data distributions
  const pieData = [
    { name: "Available", value: kpis.available_vehicles, color: "#10b981" },
    { name: "On Trip", value: kpis.active_trips, color: "#6366f1" },
    { name: "In Shop", value: kpis.vehicles_in_maintenance, color: "#f43f5e" },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-mesh p-8">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-5 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-white tracking-wide">
            Operational Overview
          </h1>
          <p className="text-slate-400 text-xs mt-1">Live fleet status, cargo capacities, and trip analytics</p>
        </div>
        
        {/* Dynamic Filters */}
        <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
          <div className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="font-semibold uppercase tracking-wider">Filters:</span>
          </div>

          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="rounded-lg bg-slate-900 border border-slate-800 px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Regions</option>
            {regions.map((reg) => (
              <option key={reg} value={reg}>{reg}</option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg bg-slate-900 border border-slate-800 px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Vehicle Types</option>
            {Array.from(new Set(vehicleTypes.map((t) => t.vehicle_type))).map((type: any) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <button
            onClick={fetchDashboardData}
            className="flex items-center justify-center p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="rounded-xl glass-card p-6 border border-slate-850 hover-scale flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-400 font-outfit">{card.title}</span>
                <div className={`rounded-lg p-2 border ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold text-white font-outfit tracking-wide">{card.value}</span>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{card.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ROI Breakdown Chart */}
        <div className="lg:col-span-2 rounded-xl glass-card p-6 border border-slate-850">
          <h2 className="text-lg font-bold text-white font-outfit mb-4">Vehicle ROI Breakdown (Revenue vs. Costs)</h2>
          <div className="h-72 w-full">
            {reportsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="registration_number" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }}
                    labelClassName="text-white font-semibold text-xs"
                  />
                  <Bar dataKey="operational_cost" name="Operational Cost" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="roi" name="ROI Score" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-600 text-xs">
                No vehicle summary reports data available
              </div>
            )}
          </div>
        </div>

        {/* Fleet Distribution Status (Pie Chart) */}
        <div className="rounded-xl glass-card p-6 border border-slate-850">
          <h2 className="text-lg font-bold text-white font-outfit mb-4">Fleet Allocation</h2>
          <div className="h-56 w-full flex items-center justify-center">
            {kpis.active_vehicles > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData.filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-600 text-xs">No allocations to display</div>
            )}
          </div>

          {/* Pie Legends */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            {pieData.map((item) => (
              <div key={item.name} className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500">{item.name}</span>
                <span className="font-semibold mt-1" style={{ color: item.color }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
