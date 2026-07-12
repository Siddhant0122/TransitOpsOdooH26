import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export const Unauthorized: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-mesh p-8 text-center">
      <div className="max-w-md p-8 rounded-2xl glass-card border border-rose-950/20 shadow-2xl flex flex-col items-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-rose-600/10 border border-rose-500/20 text-rose-500 mb-6 animate-pulse">
          <ShieldAlert className="h-9 w-9" />
        </div>
        
        <h1 className="text-2xl font-bold font-outfit text-white tracking-wide mb-3">
          Access Restricted
        </h1>
        
        <p className="text-slate-400 text-xs leading-relaxed mb-8">
          Your authenticated role scope does not possess permissions to view this secure partition. Please contact the Fleet Administrator.
        </p>
        
        <Link
          to="/"
          className="flex items-center space-x-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-5 py-3 rounded-lg text-xs font-semibold shadow-lg active:scale-[0.98] transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Safety</span>
        </Link>
      </div>
    </div>
  );
};
