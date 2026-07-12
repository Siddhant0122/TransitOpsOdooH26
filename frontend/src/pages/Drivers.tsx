import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { encryptText, decryptText } from "../services/cryptoService";
import {
  Users,
  Plus,
  Lock,
  Edit,
  Trash2,
  AlertTriangle,
  Search,
  CheckCircle,
  X,
  FileKey
} from "lucide-react";

export const Drivers: React.FC = () => {
  const { user, encryptionKey } = useAuth();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [licenseCategories, setLicenseCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseCategory, setLicenseCategory] = useState("LMV-TR");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [safetyScore, setSafetyScore] = useState(100);
  const [status, setStatus] = useState("Available");
  const [error, setError] = useState<string | null>(null);

  const canWrite = user && ["fleet_manager", "safety_officer"].includes(user.role);
  const canSuspend = user?.role === "safety_officer";

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const data = await api.getDrivers();
      const cats = await api.getCatalogLicenseCategories();
      setLicenseCategories(cats);

      // Decrypt PII fields in-memory locally if encryptionKey is loaded
      const decrypted = await Promise.all(
        data.map(async (d) => {
          let decLicense = d.license_number;
          let decContact = d.contact_number;
          
          if (encryptionKey) {
            decLicense = await decryptText(d.license_number, encryptionKey);
            decContact = await decryptText(d.contact_number, encryptionKey);
          } else {
            decLicense = "[Encrypted - Decrypt Key Not Active]";
            decContact = "[Encrypted - Decrypt Key Not Active]";
          }

          return {
            ...d,
            license_number_dec: decLicense,
            contact_number_dec: decContact,
          };
        })
      );
      setDrivers(decrypted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [encryptionKey]);

  const openCreateModal = () => {
    setEditingDriver(null);
    setName("");
    setLicenseNumber("");
    setLicenseCategory("LMV-TR");
    setLicenseExpiry("");
    setContactNumber("");
    setSafetyScore(100);
    setStatus("Available");
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (driver: any) => {
    setEditingDriver(driver);
    setName(driver.name);
    setLicenseNumber(driver.license_number_dec);
    setLicenseCategory(driver.license_category);
    setLicenseExpiry(driver.license_expiry);
    setContactNumber(driver.contact_number_dec);
    setSafetyScore(driver.safety_score);
    setStatus(driver.status);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!encryptionKey) {
      setError("Encryption key is not loaded. Cannot encrypt driver records.");
      return;
    }

    try {
      // Encrypt sensitive PII fields locally before sending
      const encLicense = await encryptText(licenseNumber, encryptionKey);
      const encContact = await encryptText(contactNumber, encryptionKey);

      const payload = {
        name,
        license_number: encLicense,
        license_category: licenseCategory,
        license_expiry: licenseExpiry,
        contact_number: encContact,
        safety_score: Number(safetyScore),
        status: editingDriver ? status : "Available",
      };

      if (editingDriver) {
        await api.updateDriver(editingDriver.id, payload);
      } else {
        await api.createDriver(payload);
      }

      setIsModalOpen(false);
      fetchDrivers();
    } catch (err: any) {
      setError(err.message || "Failed to save driver log.");
    }
  };

  const handleSuspend = async (id: string) => {
    if (window.confirm("Are you sure you want to suspend this driver? They cannot be assigned to trips.")) {
      try {
        await api.suspendDriver(id);
        fetchDrivers();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredDrivers = drivers.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.license_number_dec.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.license_category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-mesh p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-5 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-white tracking-wide">
            Drivers Compliance
          </h1>
          <p className="text-slate-400 text-xs mt-1">Verify license categories, safety rankings, and PII datasets</p>
        </div>

        {canWrite && (
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all duration-200 mt-4 md:mt-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Driver</span>
          </button>
        )}
      </div>

      {/* Search and Encryption Key Banner */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, license category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg bg-slate-900/60 border border-slate-800 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 bg-indigo-500/5 border border-indigo-500/10 px-4 py-2.5 rounded-lg text-xs text-indigo-400 w-full md:w-auto justify-center">
          <Lock className="h-4 w-4" />
          <span>Zero-Knowledge Encryption Active</span>
        </div>
      </div>

      {/* Drivers Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-600">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mr-2"></span>
          <span>Loading driver logs...</span>
        </div>
      ) : filteredDrivers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrivers.map((driver) => {
            const isLicenseExpired = new Date(driver.license_expiry) < new Date();
            return (
              <div
                key={driver.id}
                className={`rounded-xl glass-card p-6 border ${
                  driver.status === "Suspended" ? "border-slate-900 opacity-60" : "border-slate-850"
                } hover-scale flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded bg-slate-850 border border-slate-800 text-[10px] font-bold text-slate-300 font-outfit uppercase tracking-wider">
                      License Category: {driver.license_category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                        driver.status === "Available"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : driver.status === "On Trip"
                          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          : driver.status === "Suspended"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {driver.status}
                    </span>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-lg font-bold text-white font-outfit">{driver.name}</h3>
                    <div className="flex items-center mt-2 space-x-1 text-slate-400 text-xs">
                      <Lock className="h-3 w-3 text-indigo-400 shrink-0" />
                      <span className="font-mono truncate" title="Decrypted local representation">
                        Lic: {driver.license_number_dec}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2 border-t border-slate-800/80 pt-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contact Number:</span>
                      <div className="flex items-center space-x-1">
                        <Lock className="h-3 w-3 text-indigo-400 shrink-0" />
                        <span className="font-mono text-slate-200">{driver.contact_number_dec}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Safety Score:</span>
                      <span
                        className={`font-semibold ${
                          driver.safety_score >= 85
                            ? "text-emerald-400"
                            : driver.safety_score >= 60
                            ? "text-amber-400"
                            : "text-rose-400"
                        }`}
                      >
                        {driver.safety_score} / 100
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">License Expiry:</span>
                      <span className={`font-semibold ${isLicenseExpired ? "text-rose-400 animate-pulse" : "text-slate-200"}`}>
                        {driver.license_expiry} {isLicenseExpired && "(Expired)"}
                      </span>
                    </div>
                  </div>
                </div>

                {canWrite && driver.status !== "Suspended" && (
                  <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-800/50">
                    <button
                      onClick={() => openEditModal(driver)}
                      className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    {canSuspend && (
                      <button
                        onClick={() => handleSuspend(driver.id)}
                        className="p-2 rounded bg-rose-950/20 border border-rose-900/30 text-rose-400 hover:bg-rose-900/30 transition-colors"
                        title="Suspend Driver"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-600 text-xs font-medium">No driver compliance logs registered.</div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl glass-card border border-slate-850 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold font-outfit text-white">
                {editingDriver ? "Modify Driver Record" : "Enroll Fleet Driver"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Smith"
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    License Category
                  </label>
                  <select
                    value={licenseCategory}
                    onChange={(e) => setLicenseCategory(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    {licenseCategories.map((cat) => (
                      <option key={cat.category_code} value={cat.category_code}>
                        {cat.category_code} ({cat.description})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    License Number (Sensitive PII)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="DL-1420110068956"
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 pr-8 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <Lock className="absolute right-2.5 top-3 h-3.5 w-3.5 text-indigo-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    License Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={licenseExpiry}
                    onChange={(e) => setLicenseExpiry(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Contact Number (Sensitive PII)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 pr-8 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <Lock className="absolute right-2.5 top-3 h-3.5 w-3.5 text-indigo-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Safety Score (0-100)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={safetyScore}
                    onChange={(e) => setSafetyScore(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {editingDriver && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Driver Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Available">Available</option>
                    <option value="Off Duty">Off Duty</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 py-3 text-xs font-semibold text-white shadow-lg active:scale-[0.99] transition-transform duration-200 mt-6"
              >
                {editingDriver ? "Save Changes" : "Register Driver"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
