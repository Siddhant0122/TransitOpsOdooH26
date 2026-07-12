import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Route,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  Search,
  SlidersHorizontal,
  X,
  Compass,
  FileSpreadsheet
} from "lucide-react";

export const Trips: React.FC = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);

  // Form states (Create Trip)
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [cargoWeight, setCargoWeight] = useState(0);
  const [plannedDistance, setPlannedDistance] = useState(0);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states (Complete Trip)
  const [finalOdometer, setFinalOdometer] = useState(0);
  const [fuelConsumed, setFuelConsumed] = useState(0);

  const canManage = user && ["fleet_manager", "driver_role"].includes(user.role);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const data = await api.getTrips();
      setTrips(data);
      const vPool = await api.getVehicleDispatchPool();
      setAvailableVehicles(vPool);
      const dPool = await api.getDriverDispatchPool();
      // Since drivers are encrypted, we can fetch driver compliance list to decode them for UI display
      // But for simplicity, we can load all drivers to match names
      const allDrivers = await api.getDrivers();
      setAvailableDrivers(allDrivers.filter(d => d.status === "Available"));
      
      const locData = await api.getCatalogLocations();
      setLocations(locData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  // Auto-calculate distance when source and destination pincodes are set
  useEffect(() => {
    async function getDistance() {
      if (source.length >= 6 && destination.length >= 6) {
        setDistanceLoading(true);
        setError(null);
        try {
          const distance = await api.calculateDistance(source, destination);
          setPlannedDistance(distance);
        } catch (err: any) {
          setError(err.message || "Failed to calculate distance for these pincodes.");
        } finally {
          setDistanceLoading(false);
        }
      }
    }
    getDistance();
  }, [source, destination]);

  const openCreateModal = () => {
    setSource("");
    setDestination("");
    setVehicleId("");
    setDriverId("");
    setCargoWeight(0);
    setPlannedDistance(0);
    setError(null);
    setIsCreateOpen(true);
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      source,
      destination,
      vehicle_id: vehicleId,
      driver_id: driverId,
      cargo_weight: Number(cargoWeight),
      planned_distance: Number(plannedDistance),
    };

    try {
      await api.createTrip(payload);
      setIsCreateOpen(false);
      fetchTrips();
    } catch (err: any) {
      setError(err.message || "Failed to create trip.");
    }
  };

  const handleDispatch = async (id: string) => {
    try {
      await api.dispatchTrip(id);
      fetchTrips();
    } catch (err: any) {
      alert(err.message || "Failed to dispatch trip.");
    }
  };

  const openCompleteModal = (trip: any) => {
    setSelectedTrip(trip);
    setFinalOdometer(trip.vehicle?.odometer || 0);
    setFuelConsumed(0);
    setError(null);
    setIsCompleteOpen(true);
  };

  const handleCompleteTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedTrip) return;

    try {
      await api.completeTrip(selectedTrip.id, {
        final_odometer: Number(finalOdometer),
        fuel_consumed: Number(fuelConsumed),
      });
      setIsCompleteOpen(false);
      fetchTrips();
    } catch (err: any) {
      setError(err.message || "Failed to complete trip.");
    }
  };

  const handleCancel = async (id: string) => {
    if (window.confirm("Are you sure you want to cancel this trip?")) {
      try {
        await api.cancelTrip(id);
        fetchTrips();
      } catch (err: any) {
        alert(err.message || "Failed to cancel trip.");
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-mesh p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-5 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-white tracking-wide">
            Trip Logs
          </h1>
          <p className="text-slate-400 text-xs mt-1">Dispatch routes, complete odometer logs, and tracking states</p>
        </div>

        {canManage && (
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all duration-200 mt-4 md:mt-0"
          >
            <Plus className="h-4 w-4" />
            <span>Create Draft Trip</span>
          </button>
        )}
      </div>

      {/* Trips Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-600">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mr-2"></span>
          <span>Loading trip records...</span>
        </div>
      ) : trips.length > 0 ? (
        <div className="rounded-xl glass-card border border-slate-850 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 uppercase tracking-wider text-slate-400 text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Source Pincode</th>
                  <th className="px-6 py-4">Destination Pincode</th>
                  <th className="px-6 py-4">Cargo Weight</th>
                  <th className="px-6 py-4">Planned Dist</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {trips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">{trip.source}</td>
                    <td className="px-6 py-4 font-semibold text-white">{trip.destination}</td>
                    <td className="px-6 py-4 text-slate-400">{trip.cargo_weight} kg</td>
                    <td className="px-6 py-4 text-slate-400">{trip.planned_distance} km</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                          trip.status === "Draft"
                            ? "bg-slate-800 text-slate-400 border border-slate-700"
                            : trip.status === "Dispatched"
                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                            : trip.status === "Completed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {trip.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {canManage && trip.status === "Draft" && (
                        <>
                          <button
                            onClick={() => handleDispatch(trip.id)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
                          >
                            <Play className="h-3 w-3" />
                            <span>Dispatch</span>
                          </button>
                          <button
                            onClick={() => handleCancel(trip.id)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
                          >
                            <XCircle className="h-3 w-3" />
                            <span>Cancel</span>
                          </button>
                        </>
                      )}

                      {canManage && trip.status === "Dispatched" && (
                        <>
                          <button
                            onClick={() => openCompleteModal(trip)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Complete</span>
                          </button>
                          <button
                            onClick={() => handleCancel(trip.id)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
                          >
                            <XCircle className="h-3 w-3" />
                            <span>Cancel</span>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-600 text-xs">No transport logs registered.</div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl glass-card border border-slate-850 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold font-outfit text-white">Create Draft Trip</h2>
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

            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Source Pincode
                  </label>
                  <input
                    type="text"
                    required
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="400001"
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Destination Pincode
                  </label>
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="110001"
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    <option value="">Choose available asset</option>
                    {availableVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registration_number} - {v.name_model} (Max {v.max_load_capacity}kg)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Select Driver
                  </label>
                  <select
                    required
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Choose on-duty driver</option>
                    {availableDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.license_category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Cargo Weight (kg)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={cargoWeight}
                    onChange={(e) => setCargoWeight(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center">
                    Planned Distance (km)
                    {distanceLoading && (
                      <span className="ml-2 h-3.5 w-3.5 animate-spin rounded-full border border-indigo-500 border-t-transparent"></span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={0.1}
                      step="any"
                      value={plannedDistance}
                      onChange={(e) => setPlannedDistance(Number(e.target.value))}
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 pr-8 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <Compass className="absolute right-2.5 top-3 h-3.5 w-3.5 text-indigo-400" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 py-3 text-xs font-semibold text-white shadow-lg active:scale-[0.99] transition-transform duration-200 mt-6"
              >
                Create Trip
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {isCompleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl glass-card border border-slate-850 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold font-outfit text-white">Complete Delivery</h2>
              <button
                onClick={() => setIsCompleteOpen(false)}
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

            <form onSubmit={handleCompleteTrip} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Final Odometer Reading (km)
                </label>
                <input
                  type="number"
                  required
                  min={selectedTrip?.vehicle?.odometer || 0}
                  value={finalOdometer}
                  onChange={(e) => setFinalOdometer(Number(e.target.value))}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Current vehicle odometer: {selectedTrip?.vehicle?.odometer || 0} km
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Fuel Consumed (liters)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step="any"
                  value={fuelConsumed}
                  onChange={(e) => setFuelConsumed(Number(e.target.value))}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-semibold text-white shadow-lg active:scale-[0.99] transition-transform duration-200 mt-6"
              >
                Log Completion
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
