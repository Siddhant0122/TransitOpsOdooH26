import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Wrench,
  Plus,
  CheckCircle,
  Clock,
  SlidersHorizontal,
  X,
  FileSpreadsheet
} from "lucide-react";

export const Maintenance: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [solutions, setSolutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Form states (Create Log)
  const [vehicleId, setVehicleId] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Form states (Close Log)
  const [selectedSolution, setSelectedSolution] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getMaintenanceLogs();
      setLogs(data);
      
      const vList = await api.getVehicles();
      // Filter out retired or on trip vehicles
      setVehicles(vList.filter((v) => v.status !== "Retired" && v.status !== "On Trip"));
      
      const iss = await api.getCatalogMaintenanceIssues();
      setIssues(iss);
      
      const sols = await api.getCatalogMaintenanceSolutions();
      setSolutions(sols);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const openCreateModal = () => {
    setVehicleId("");
    setMaintenanceType(issues.length > 0 ? issues[0].issue_type : "");
    setDescription("");
    setCost(0);
    setError(null);
    setIsCreateOpen(true);
  };

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      vehicle_id: vehicleId,
      maintenance_type: maintenanceType,
      description,
      cost: Number(cost),
    };

    try {
      await api.createMaintenanceLog(payload);
      setIsCreateOpen(false);
      fetchLogs();
    } catch (err: any) {
      setError(err.message || "Failed to log maintenance issue.");
    }
  };

  const openCloseModal = (log: any) => {
    setSelectedLog(log);
    setSelectedSolution(solutions.length > 0 ? solutions[0].solution : "");
    setError(null);
    setIsCloseOpen(true);
  };

  const handleCloseLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedLog) return;

    try {
      await api.closeMaintenanceLog(selectedLog.id, selectedSolution);
      setIsCloseOpen(false);
      fetchLogs();
    } catch (err: any) {
      setError(err.message || "Failed to close maintenance log.");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-mesh p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-5 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-white tracking-wide">
            Maintenance Workshop
          </h1>
          <p className="text-slate-400 text-xs mt-1">Open service tickets, log vehicle repairs, and manage down-times</p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all duration-200 mt-4 md:mt-0"
        >
          <Plus className="h-4 w-4" />
          <span>Open Service Log</span>
        </button>
      </div>

      {/* Maintenance Logs Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-600">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mr-2"></span>
          <span>Loading maintenance logs...</span>
        </div>
      ) : logs.length > 0 ? (
        <div className="rounded-xl glass-card border border-slate-850 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 uppercase tracking-wider text-slate-400 text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Vehicle ID</th>
                  <th className="px-6 py-4">Issue Category</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Est Cost</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white truncate max-w-[120px]">{log.vehicle_id}</td>
                    <td className="px-6 py-4 font-semibold text-white">{log.maintenance_type}</td>
                    <td className="px-6 py-4 text-slate-400 max-w-xs truncate">{log.description || "N/A"}</td>
                    <td className="px-6 py-4 text-slate-400">INR {log.cost.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                          log.status === "Open"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {log.status === "Open" ? (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            <span>Open</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            <span>Closed</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {log.status === "Open" && (
                        <button
                          onClick={() => openCloseModal(log)}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
                        >
                          <CheckCircle className="h-3 w-3" />
                          <span>Close Issue</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-600 text-xs">No active maintenance records.</div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl glass-card border border-slate-850 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold font-outfit text-white">Open Maintenance Ticket</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateLog} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Select Vehicle
                </label>
                <select
                  required
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select vehicle to service</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} - {v.name_model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Issue Classification
                </label>
                <select
                  required
                  value={maintenanceType}
                  onChange={(e) => setMaintenanceType(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select catalog category</option>
                  {issues.map((i) => (
                    <option key={i.id} value={i.issue_type}>
                      {i.issue_type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Detailed Issue Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Engine oil dark, filters clogged..."
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white h-24 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Estimated Repair Cost (INR)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={cost}
                  onChange={(e) => setCost(Number(e.target.value))}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 py-3 text-xs font-semibold text-white shadow-lg active:scale-[0.99] transition-transform duration-200 mt-6"
              >
                Log Ticket
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Close Modal */}
      {isCloseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl glass-card border border-slate-850 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold font-outfit text-white">Resolve Maintenance Ticket</h2>
              <button
                onClick={() => setIsCloseOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCloseLog} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Catalog Solution Resolution
                </label>
                <select
                  required
                  value={selectedSolution}
                  onChange={(e) => setSelectedSolution(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select solution catalog</option>
                  {solutions.map((sol) => (
                    <option key={sol.id} value={sol.solution}>
                      {sol.solution}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-semibold text-white shadow-lg active:scale-[0.99] transition-transform duration-200 mt-6"
              >
                Submit Resolution
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
