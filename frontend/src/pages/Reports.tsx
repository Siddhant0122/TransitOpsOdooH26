import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  BarChart3,
  FileSpreadsheet,
  SlidersHorizontal,
  RefreshCw,
  TrendingUp,
  Percent,
  Coins
} from "lucide-react";

export const Reports: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const data = await api.getVehicleSummaryReport(selectedRegion, selectedType);
      setReports(data);
    } catch (error) {
      console.error("Failed to load reports summary", error);
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
        console.error("Failed to load reports filters", error);
      }
    }
    loadFilters();
  }, []);

  useEffect(() => {
    fetchReportsData();
  }, [selectedRegion, selectedType]);

  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      await api.exportReportsCSV(selectedRegion || undefined, selectedType || undefined);
    } catch (err) {
      console.error("CSV export failed", err);
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-mesh p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-5 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-white tracking-wide">
            Reports & Analytics
          </h1>
          <p className="text-slate-400 text-xs mt-1">Export spreadsheets, verify asset returns, and inspect cost margins</p>
        </div>

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
            onClick={handleExportCSV}
            disabled={exporting}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all duration-200"
          >
            {exporting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            <span>{exporting ? "Exporting..." : "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* Reports Summary Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-600">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mr-2"></span>
          <span>Loading summary data...</span>
        </div>
      ) : reports.length > 0 ? (
        <div className="rounded-xl glass-card border border-slate-850 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 uppercase tracking-wider text-slate-400 text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Reg Number</th>
                  <th className="px-6 py-4">Model Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Fuel Efficiency</th>
                  <th className="px-6 py-4">Operational Cost</th>
                  <th className="px-6 py-4">Total Distance</th>
                  <th className="px-6 py-4 text-right">ROI Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {reports.map((report) => (
                  <tr key={report.vehicle_id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white uppercase">{report.registration_number}</td>
                    <td className="px-6 py-4 font-semibold text-slate-200">{report.name_model}</td>
                    <td className="px-6 py-4 text-slate-400 capitalize">{report.type}</td>
                    <td className="px-6 py-4 text-slate-400">{report.fuel_efficiency_km_per_l} km/l</td>
                    <td className="px-6 py-4 text-slate-400">INR {report.operational_cost.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-400">{report.distance_travelled_km} km</td>
                    <td className={`px-6 py-4 text-right font-bold ${report.roi >= 0.05 ? "text-emerald-400" : report.roi >= 0 ? "text-slate-300" : "text-rose-400"}`}>
                      {(report.roi * 100).toFixed(2)} %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-600 text-xs">No reports data available for the chosen filters.</div>
      )}
    </div>
  );
};
