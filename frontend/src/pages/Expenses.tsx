import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  CreditCard,
  Plus,
  Coins,
  Calculator,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  Gauge
} from "lucide-react";

export const Expenses: React.FC = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cost calculation widget state
  const [selectedCalcVehicleId, setSelectedCalcVehicleId] = useState("");
  const [calcResult, setCalcResult] = useState<any | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  // Modals state
  const [isFuelOpen, setIsFuelOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);

  // Form states (Fuel)
  const [fuelVehicleId, setFuelVehicleId] = useState("");
  const [liters, setLiters] = useState(0);
  const [fuelCost, setFuelCost] = useState(0);
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split("T")[0]);
  const [fuelError, setFuelError] = useState<string | null>(null);

  // Form states (Expense)
  const [expVehicleId, setExpVehicleId] = useState("");
  const [category, setCategory] = useState("Toll");
  const [amount, setAmount] = useState(0);
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [expError, setExpError] = useState<string | null>(null);

  const canWrite = user && ["fleet_manager", "driver_role"].includes(user.role);

  const fetchCostBreakdown = async (vehicleId: string) => {
    if (!vehicleId) {
      setCalcResult(null);
      return;
    }
    setCalcLoading(true);
    try {
      const data = await api.getVehicleOperationalCost(vehicleId);
      setCalcResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCalcLoading(false);
    }
  };

  const fetchExpensesData = async () => {
    setLoading(true);
    try {
      const vList = await api.getVehicles();
      setVehicles(vList.filter((v) => v.status !== "Retired"));
      const fLogs = await api.getFuelLogs();
      setFuelLogs(fLogs);
      const exps = await api.getExpenses();
      setExpenses(exps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpensesData();
  }, []);

  useEffect(() => {
    if (selectedCalcVehicleId) {
      fetchCostBreakdown(selectedCalcVehicleId);
    }
  }, [selectedCalcVehicleId]);

  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFuelError(null);

    const payload = {
      vehicle_id: fuelVehicleId,
      liters: Number(liters),
      cost: Number(fuelCost),
      log_date: fuelDate,
    };

    try {
      await api.createFuelLog(payload);
      setIsFuelOpen(false);
      fetchExpensesData();
      if (fuelVehicleId === selectedCalcVehicleId) fetchCostBreakdown(selectedCalcVehicleId);
    } catch (err: any) {
      setFuelError(err.message || "Failed to create fuel log.");
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpError(null);

    const payload = {
      vehicle_id: expVehicleId,
      category: category,
      amount: Number(amount),
      expense_date: expDate,
      notes: notes || null,
    };

    try {
      await api.createExpense(payload);
      setIsExpenseOpen(false);
      fetchExpensesData();
      if (expVehicleId === selectedCalcVehicleId) fetchCostBreakdown(selectedCalcVehicleId);
    } catch (err: any) {
      setExpError(err.message || "Failed to create expense entry.");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-mesh p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-5 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-white tracking-wide">
            Fuel & Expenses
          </h1>
          <p className="text-slate-400 text-xs mt-1">Audit fuel efficiency, miscellaneous tolls, and operational margins</p>
        </div>

        {canWrite && (
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <button
              onClick={() => {
                setFuelVehicleId("");
                setLiters(0);
                setFuelCost(0);
                setFuelError(null);
                setIsFuelOpen(true);
              }}
              className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-4 py-2.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>Log Fuel Receipt</span>
            </button>

            <button
              onClick={() => {
                setExpVehicleId("");
                setCategory("Toll");
                setAmount(0);
                setNotes("");
                setExpError(null);
                setIsExpenseOpen(true);
              }}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>Log Operational Expense</span>
            </button>
          </div>
        )}
      </div>

      {/* Widget and Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Cost Calculator Widget */}
        <div className="lg:col-span-1 rounded-xl glass-card p-6 border border-slate-850 h-fit">
          <div className="flex items-center space-x-2 text-white mb-4">
            <Calculator className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-bold font-outfit">Asset Cost Summary</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Select Fleet Asset
              </label>
              <select
                value={selectedCalcVehicleId}
                onChange={(e) => setSelectedCalcVehicleId(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Choose registration number</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} - {v.name_model}
                  </option>
                ))}
              </select>
            </div>

            {calcLoading ? (
              <div className="text-center py-6 text-xs text-slate-500">Computing breakdowns...</div>
            ) : calcResult ? (
              <div className="space-y-3.5 border-t border-slate-800/80 pt-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Fuel Expenses:</span>
                  <span className="font-semibold text-slate-200">INR {calcResult.fuel_cost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Maintenance Expenses:</span>
                  <span className="font-semibold text-slate-200">INR {calcResult.maintenance_cost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Toll & Miscellaneous:</span>
                  <span className="font-semibold text-slate-200">INR {calcResult.other_expenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-3 text-sm">
                  <span className="text-indigo-400 font-bold uppercase tracking-wider text-[10px] mt-0.5">Total Opex:</span>
                  <span className="font-bold text-indigo-400">INR {calcResult.total_operational_cost.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-600 font-medium">
                Choose an asset above to verify active operational expenses.
              </div>
            )}
          </div>
        </div>

        {/* Expenses List */}
        <div className="lg:col-span-2 rounded-xl glass-card p-6 border border-slate-850">
          <div className="flex items-center space-x-2 text-white mb-6">
            <Coins className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-bold font-outfit">Expense Logs</h2>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-600 text-xs">Loading logs...</div>
          ) : expenses.length > 0 ? (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 uppercase tracking-wider text-slate-400 text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-900/30">
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            exp.category === "Toll"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : exp.category === "Maintenance"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-slate-850 text-slate-400 border border-slate-800"
                          }`}
                        >
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">INR {exp.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-400">{exp.expense_date}</td>
                      <td className="px-4 py-3 text-slate-500 truncate max-w-xs">{exp.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-600 text-xs font-medium">No logged miscellaneous expenses found.</div>
          )}
        </div>
      </div>

      {/* Fuel logs Modal */}
      {isFuelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl glass-card border border-slate-850 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold font-outfit text-white">Log Fuel Receipt</h2>
              <button
                onClick={() => setIsFuelOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {fuelError && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg">
                <span>{fuelError}</span>
              </div>
            )}

            <form onSubmit={handleFuelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Select Vehicle
                </label>
                <select
                  required
                  value={fuelVehicleId}
                  onChange={(e) => setFuelVehicleId(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} - {v.name_model}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Liters Filled
                  </label>
                  <input
                    type="number"
                    required
                    min={0.1}
                    step="any"
                    value={liters}
                    onChange={(e) => setLiters(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Total Cost (INR)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={fuelCost}
                    onChange={(e) => setFuelCost(Number(e.target.value))}
                    placeholder="Enter 0 to use local index"
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Date of Fueling
                </label>
                <input
                  type="date"
                  required
                  value={fuelDate}
                  onChange={(e) => setFuelDate(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 py-3 text-xs font-semibold text-white shadow-lg active:scale-[0.99] transition-transform duration-200 mt-6"
              >
                Log Receipt
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl glass-card border border-slate-850 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold font-outfit text-white">Log Operational Expense</h2>
              <button
                onClick={() => setIsExpenseOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {expError && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg">
                <span>{expError}</span>
              </div>
            )}

            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Select Vehicle
                </label>
                <select
                  required
                  value={expVehicleId}
                  onChange={(e) => setExpVehicleId(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} - {v.name_model}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Toll">Toll</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Cost Amount (INR)
                  </label>
                  <input
                    type="number"
                    required
                    min={0.1}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. NH-4 Toll fee receipt"
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 py-3 text-xs font-semibold text-white shadow-lg active:scale-[0.99] transition-transform duration-200 mt-6"
              >
                Log Expense
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
