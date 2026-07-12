import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { AlertTriangle, Bell, Key, Sun, Moon } from "lucide-react";

export const Navbar: React.FC = () => {
  const { user } = useAuth();
  const [expiringCount, setExpiringCount] = useState(0);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    async function fetchLicenseAlerts() {
      if (user && ["fleet_manager", "safety_officer"].includes(user.role)) {
        try {
          // Fetch driver licenses expiring within 30 days
          const data = await api.getExpiringLicenses(30);
          setExpiringCount(data.length);
        } catch (error) {
          console.error("Failed to fetch license alerts", error);
        }
      }
    }
    fetchLicenseAlerts();
  }, [user]);

  if (!user) return null;

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-900/40 px-8 backdrop-blur-md">
      <div className="flex items-center space-x-2">
        <Key className="h-4 w-4 text-indigo-400" />
        <span className="text-xs text-indigo-300 font-medium tracking-wide">
          End-to-End Encryption Key Active (In-Memory Only)
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notification alerts for Fleet Managers / Safety Officers */}
        {expiringCount > 0 && (
          <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold animate-pulse">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{expiringCount} Driver Licenses Expiring Soon</span>
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          title="Toggle Light/Dark Theme"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="relative cursor-pointer p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
          <Bell className="h-5 w-5" />
          {expiringCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500"></span>
          )}
        </div>

        <div className="h-8 w-px bg-slate-800"></div>

        <span className="text-sm font-medium text-slate-300">
          Welcome back, <span className="text-white font-semibold">{user.full_name.split(" ")[0]}</span>
        </span>
      </div>
    </header>
  );
};
