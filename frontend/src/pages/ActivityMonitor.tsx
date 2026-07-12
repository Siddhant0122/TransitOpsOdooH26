import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  History,
  FileSpreadsheet,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  User,
  ShieldAlert,
  Search
} from "lucide-react";

export const ActivityMonitor: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);

  // Filters
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterUserId, setFilterUserId] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getActivityLogs({
        user_id: filterUserId || undefined,
        entity_type: entityType || undefined,
        action: action || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page: page,
        limit: limit,
      });
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, entityType, action, startDate, endDate, filterUserId]);

  const handleExportCSV = () => {
    const csvUrl = api.getExportActivityCSVUrl({
      user_id: filterUserId || undefined,
      entity_type: entityType || undefined,
      action: action || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    });
    window.open(csvUrl, "_blank");
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page * limit < total) setPage(page + 1);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const roleLabels: Record<string, string> = {
    fleet_manager: "Manager",
    driver_role: "Driver",
    safety_officer: "Safety",
    financial_analyst: "Finance",
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-mesh p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-5 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-white tracking-wide flex items-center">
            <History className="h-8 w-8 text-indigo-500 mr-2" />
            Activity Monitor
          </h1>
          <p className="text-slate-400 text-xs mt-1">Audit append-only records of all state modifications and session logins</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all duration-200 mt-4 md:mt-0"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Advanced Filters */}
      <div className="rounded-xl glass-card p-5 border border-slate-850 mb-6 space-y-4">
        <div className="flex items-center space-x-2 text-white text-xs font-bold uppercase tracking-wider pb-3 border-b border-slate-800">
          <SlidersHorizontal className="h-4 w-4 text-indigo-400" />
          <span>Search & Filter Audits</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1.5">Action Code</label>
            <input
              type="text"
              placeholder="e.g. USER_LOGGED_IN"
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
              className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1.5">Entity Target</label>
            <select
              value={entityType}
              onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
              className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-slate-300 focus:outline-none"
            >
              <option value="">All Entities</option>
              <option value="user">User</option>
              <option value="vehicle">Vehicle</option>
              <option value="driver">Driver</option>
              <option value="trip">Trip</option>
              <option value="maintenance">Maintenance</option>
              <option value="fuel_log">Fuel Log</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1.5">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1.5">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1.5">User GUID</label>
            <input
              type="text"
              placeholder="e.g. user_uuid"
              value={filterUserId}
              onChange={(e) => { setFilterUserId(e.target.value); setPage(1); }}
              className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-600">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mr-2"></span>
          <span>Loading activity monitor...</span>
        </div>
      ) : logs.length > 0 ? (
        <div className="space-y-4">
          <div className="rounded-xl glass-card border border-slate-850 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 uppercase tracking-wider text-slate-400 text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Timestamp (UTC)</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">User Role</th>
                    <th className="px-6 py-4">IP Address</th>
                    <th className="px-6 py-4">Entity Type</th>
                    <th className="px-6 py-4">Target ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-indigo-400 uppercase tracking-wide">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 capitalize font-semibold text-slate-200">
                        {roleLabels[log.user_role] || log.user_role || "System"}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono">{log.ip_address || "Localhost"}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 capitalize">
                          {log.entity_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono truncate max-w-[120px]" title={log.entity_id}>
                        {log.entity_id || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-2 text-xs">
            <span className="text-slate-500">
              Showing page <span className="text-slate-300 font-semibold">{page}</span> of{" "}
              <span className="text-slate-300 font-semibold">{totalPages}</span> (Total {total} entries)
            </span>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevPage}
                disabled={page === 1}
                className="flex items-center justify-center p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNextPage}
                disabled={page * limit >= total}
                className="flex items-center justify-center p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-600 text-xs">No audit logs match current filters.</div>
      )}
    </div>
  );
};
