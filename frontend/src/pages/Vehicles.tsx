import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Truck,
  Plus,
  Trash2,
  Edit,
  Search,
  SlidersHorizontal,
  X,
  FileSpreadsheet
} from "lucide-react";

export const Vehicles: React.FC = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortField, setSortField] = useState("registration_number");
  const [sortOrder, setSortOrder] = useState("asc");
  
  // Documents state
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [docType, setDocType] = useState("Insurance");
  const [docNumber, setDocNumber] = useState("");
  const [docExpiry, setDocExpiry] = useState("");
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);

  // Form states
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [nameModel, setNameModel] = useState("");
  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const [odometer, setOdometer] = useState(0);
  const [acquisitionCost, setAcquisitionCost] = useState(0);
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState("Available");
  const [error, setError] = useState<string | null>(null);

  const isFleetManager = user?.role === "fleet_manager";

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const data = await api.getVehicles();
      setVehicles(data);
      const catData = await api.getCatalogVehicleTypes();
      setCatalog(catData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // Handle template selection from catalog
  useEffect(() => {
    if (selectedCatalogId && catalog.length > 0) {
      const template = catalog.find((c) => c.id === selectedCatalogId);
      if (template) {
        setNameModel(`${template.brand} ${template.model}`);
      }
    }
  }, [selectedCatalogId, catalog]);

  const openCreateModal = () => {
    setEditingVehicle(null);
    setRegistrationNumber("");
    setNameModel("");
    setSelectedCatalogId("");
    setOdometer(0);
    setAcquisitionCost(0);
    setRegion("");
    setStatus("Available");
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setRegistrationNumber(vehicle.registration_number);
    setNameModel(vehicle.name_model);
    // Try to match catalog
    const matched = catalog.find((c) => `${c.brand} ${c.model}` === vehicle.name_model || c.vehicle_type === vehicle.type);
    setSelectedCatalogId(matched ? matched.id : "");
    setOdometer(vehicle.odometer);
    setAcquisitionCost(vehicle.acquisition_cost);
    setRegion(vehicle.region || "");
    setStatus(vehicle.status);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const template = catalog.find((c) => c.id === selectedCatalogId);
    if (!template && !editingVehicle) {
      setError("Please select a valid vehicle catalog template.");
      return;
    }

    const payload = {
      registration_number: registrationNumber,
      name_model: nameModel,
      type: template ? template.vehicle_type : (editingVehicle ? editingVehicle.type : ""),
      max_load_capacity: template ? template.typical_max_load_capacity_kg : (editingVehicle ? editingVehicle.max_load_capacity : 0),
      odometer: Number(odometer),
      acquisition_cost: Number(acquisitionCost),
      region: region || null,
      status: editingVehicle ? status : "Available",
    };

    try {
      if (editingVehicle) {
        await api.updateVehicle(editingVehicle.id, payload);
      } else {
        await api.createVehicle(payload);
      }
      setIsModalOpen(false);
      fetchVehicles();
    } catch (err: any) {
      setError(err.message || "Failed to save vehicle registry log.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to retire this vehicle? It will be removed from active dispatch options.")) {
      try {
        await api.retireVehicle(id);
        fetchVehicles();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const openDocsModal = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setDocType("Insurance");
    setDocNumber("");
    setDocExpiry("");
    setDocModalOpen(true);
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    const newDoc = {
      type: docType,
      document_number: docNumber,
      expiry_date: docExpiry,
      created_at: new Date().toISOString()
    };

    const updatedDocs = [...(selectedVehicle.documents || []), newDoc];
    
    try {
      const updatedVehicle = await api.updateVehicle(selectedVehicle.id, {
        documents: updatedDocs
      });
      setSelectedVehicle(updatedVehicle);
      setDocNumber("");
      setDocExpiry("");
      fetchVehicles();
    } catch (err) {
      console.error("Failed to add document", err);
      alert("Failed to add document");
    }
  };

  const handleDeleteDocument = async (index: number) => {
    if (!selectedVehicle) return;
    if (!window.confirm("Are you sure you want to delete this document?")) return;

    const updatedDocs = (selectedVehicle.documents || []).filter((_: any, i: number) => i !== index);

    try {
      const updatedVehicle = await api.updateVehicle(selectedVehicle.id, {
        documents: updatedDocs
      });
      setSelectedVehicle(updatedVehicle);
      fetchVehicles();
    } catch (err) {
      console.error("Failed to delete document", err);
      alert("Failed to delete document");
    }
  };

  const filteredVehicles = vehicles
    .filter((v) => {
      const matchesSearch =
        v.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.name_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "All" || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-mesh p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-5 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-white tracking-wide">
            Vehicle Registry
          </h1>
          <p className="text-slate-400 text-xs mt-1">Manage transport carriers, cargo limits, and status states</p>
        </div>

        {isFleetManager && (
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all duration-200 mt-4 md:mt-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Vehicle</span>
          </button>
        )}
      </div>

      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by registration, model, type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg bg-slate-900/60 border border-slate-800 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 text-xs font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg bg-slate-900/60 border border-slate-850 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="On Trip">On Trip</option>
              <option value="In Shop">In Shop</option>
              <option value="Retired">Retired</option>
            </select>
          </div>

          {/* Sort Field */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 text-xs font-semibold">Sort By:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="rounded-lg bg-slate-900/60 border border-slate-855 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="registration_number">Reg Number</option>
              <option value="name_model">Model</option>
              <option value="odometer">Odometer</option>
              <option value="acquisition_cost">Acquisition Cost</option>
            </select>
          </div>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
            className="rounded-lg bg-slate-900/60 border border-slate-800 px-3.5 py-2 text-xs text-white font-medium hover:bg-slate-800 active:scale-[0.98] transition-all cursor-pointer"
          >
            {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
          </button>
        </div>
      </div>

      {/* Main Grid / List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-600">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mr-2"></span>
          <span>Loading vehicle records...</span>
        </div>
      ) : filteredVehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className={`rounded-xl glass-card p-6 border ${
                vehicle.status === "Retired" ? "border-slate-900 opacity-60" : "border-slate-850"
              } hover-scale flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded bg-slate-850 border border-slate-800 text-[10px] font-bold text-slate-300 font-outfit uppercase tracking-wider">
                    {vehicle.registration_number}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                      vehicle.status === "Available"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : vehicle.status === "On Trip"
                        ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        : vehicle.status === "In Shop"
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {vehicle.status}
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="text-lg font-bold text-white font-outfit">{vehicle.name_model}</h3>
                  <p className="text-slate-400 text-xs mt-0.5 capitalize">{vehicle.type}</p>
                </div>

                <div className="mt-5 space-y-2 border-t border-slate-800/80 pt-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Max Capacity:</span>
                    <span className="font-semibold text-slate-200">{vehicle.max_load_capacity} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Odometer:</span>
                    <span className="font-semibold text-slate-200">{vehicle.odometer} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Acquisition:</span>
                    <span className="font-semibold text-slate-200">INR {vehicle.acquisition_cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Operating Region:</span>
                    <span className="font-semibold text-slate-200">{vehicle.region || "Unassigned"}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-800/50">
                <button
                  onClick={() => openDocsModal(vehicle)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-indigo-400 hover:text-indigo-300 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Docs ({vehicle.documents?.length || 0})</span>
                </button>

                {isFleetManager && vehicle.status !== "Retired" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(vehicle)}
                      className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(vehicle.id)}
                      className="p-1.5 rounded bg-rose-950/20 border border-rose-900/30 text-rose-400 hover:bg-rose-900/30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-600 text-xs">No registered vehicles found matching search criteria.</div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl glass-card border border-slate-850 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold font-outfit text-white">
                {editingVehicle ? "Edit Vehicle Config" : "Register Cargo Vehicle"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg flex items-center">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    required
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="MH-01-AB-1234"
                    disabled={!!editingVehicle}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Catalog Template Model
                  </label>
                  <select
                    required={!editingVehicle}
                    value={selectedCatalogId}
                    onChange={(e) => setSelectedCatalogId(e.target.value)}
                    disabled={!!editingVehicle}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select template specs</option>
                    {catalog.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.brand} {c.model} ({c.vehicle_type} - {c.typical_max_load_capacity_kg}kg)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Vehicle Name / Custom Label
                </label>
                <input
                  type="text"
                  required
                  value={nameModel}
                  onChange={(e) => setNameModel(e.target.value)}
                  placeholder="e.g. Mini Truck Gold"
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Current Odometer (km)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={odometer}
                    onChange={(e) => setOdometer(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Acquisition Cost (INR)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={acquisitionCost}
                    onChange={(e) => setAcquisitionCost(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Operating State/Region
                  </label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="Maharashtra"
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {editingVehicle && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Asset Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Available">Available</option>
                      <option value="In Shop">In Shop</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 py-3 text-xs font-semibold text-white shadow-lg active:scale-[0.99] transition-transform duration-200 mt-6"
              >
                {editingVehicle ? "Update Registry" : "Complete Registration"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Document Management Modal */}
      {docModalOpen && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl rounded-2xl glass-card border border-slate-850 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold font-outfit text-white">
                  Vehicle Document Registry
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Reg No: <span className="font-bold text-slate-200">{selectedVehicle.registration_number}</span> | Model: {selectedVehicle.name_model}
                </p>
              </div>
              <button
                onClick={() => setDocModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Document Listing */}
            <div className="mb-6 max-h-48 overflow-y-auto space-y-3 pr-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Registered Certificates</h3>
              {(!selectedVehicle.documents || selectedVehicle.documents.length === 0) ? (
                <p className="text-xs text-slate-500 italic py-2">No documents uploaded for this vehicle.</p>
              ) : (
                selectedVehicle.documents.map((doc: any, index: number) => {
                  const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
                  return (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white font-outfit">{doc.type}</span>
                          <span className="text-slate-500">|</span>
                          <span className="text-slate-400">{doc.document_number}</span>
                        </div>
                        <div className="mt-1 flex items-center space-x-2 text-[10px]">
                          <span className="text-slate-500">Expires:</span>
                          <span className={isExpired ? "text-rose-400 font-bold" : "text-slate-300"}>
                            {doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : "Never"}
                          </span>
                          {isExpired && <span className="text-rose-500 font-bold">(EXPIRED)</span>}
                        </div>
                      </div>
                      
                      {isFleetManager && (
                        <button
                          onClick={() => handleDeleteDocument(index)}
                          className="p-1 rounded bg-rose-950/20 text-rose-400 hover:bg-rose-900/30 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Document Form (Fleet Manager Only) */}
            {isFleetManager ? (
              <form onSubmit={handleAddDocument} className="border-t border-slate-800/80 pt-4 space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Register New Document</h3>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1 mb-1.5 uppercase tracking-wider">
                      Doc Type
                    </label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Insurance">Insurance</option>
                      <option value="Pollution (PUC)">Pollution (PUC)</option>
                      <option value="Fitness Cert">Fitness Cert</option>
                      <option value="Road Permit">Road Permit</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1 mb-1.5 uppercase tracking-wider">
                      Certificate No
                    </label>
                    <input
                      type="text"
                      required
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      placeholder="e.g. INS-987654"
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1 mb-1.5 uppercase tracking-wider">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      required
                      value={docExpiry}
                      onChange={(e) => setDocExpiry(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-semibold text-white shadow-lg active:scale-[0.99] transition-transform cursor-pointer"
                >
                  Register Document
                </button>
              </form>
            ) : (
              <div className="border-t border-slate-800/80 pt-4 text-center text-slate-500 text-xs italic">
                Only Fleet Managers can upload or edit vehicle compliance documents.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
