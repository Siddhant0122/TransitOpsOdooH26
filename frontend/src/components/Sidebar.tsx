import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Wrench,
  CreditCard,
  History,
  BarChart3,
  LogOut,
  ShieldCheck
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const roleLabels: Record<string, string> = {
    fleet_manager: "Fleet Manager",
    driver_role: "Driver",
    safety_officer: "Safety Officer",
    financial_analyst: "Financial Analyst",
  };

  const navItems = [
    {
      label: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
      roles: ["fleet_manager", "driver_role", "safety_officer", "financial_analyst"],
    },
    {
      label: "Vehicle Registry",
      path: "/vehicles",
      icon: Truck,
      roles: ["fleet_manager", "driver_role", "safety_officer", "financial_analyst"],
    },
    {
      label: "Drivers Management",
      path: "/drivers",
      icon: Users,
      roles: ["fleet_manager", "driver_role", "safety_officer", "financial_analyst"],
    },
    {
      label: "Trip Management",
      path: "/trips",
      icon: Route,
      roles: ["fleet_manager", "driver_role", "safety_officer", "financial_analyst"],
    },
    {
      label: "Maintenance Logs",
      path: "/maintenance",
      icon: Wrench,
      roles: ["fleet_manager"],
    },
    {
      label: "Fuel & Expenses",
      path: "/expenses",
      icon: CreditCard,
      roles: ["fleet_manager", "driver_role", "financial_analyst"],
    },
    {
      label: "Activity Monitor",
      path: "/activity",
      icon: History,
      roles: ["fleet_manager", "safety_officer"],
    },
    {
      label: "Reports & ROI",
      path: "/reports",
      icon: BarChart3,
      roles: ["fleet_manager", "safety_officer", "financial_analyst"],
    },
  ];

  const filteredItems = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex h-screen w-64 flex-col bg-slate-900 glass-panel border-r border-slate-800 text-slate-300">
      {/* Brand Header */}
      <div className="flex h-16 items-center px-6 border-b border-slate-800">
        <ShieldCheck className="h-7 w-7 text-indigo-500 mr-2" />
        <span className="text-xl font-bold font-outfit text-white tracking-wider">
          Transit<span className="text-indigo-500">Ops</span>
        </span>
      </div>

      {/* User Info Card */}
      <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/30">
        <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
        <div className="flex items-center mt-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
          <p className="text-xs text-indigo-400 font-medium tracking-wide capitalize">
            {roleLabels[user.role] || user.role}
          </p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon
                className={`mr-3 h-5 w-5 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout Action */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="flex w-full items-center px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:bg-rose-950/30 hover:text-rose-400 transition-all duration-200"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
};
