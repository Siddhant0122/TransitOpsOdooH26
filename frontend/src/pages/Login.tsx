import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldCheck, Mail, Lock, AlertCircle } from "lucide-react";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-mesh px-4">
      <div className="w-full max-w-md rounded-2xl glass-card p-8 neon-border-indigo hover-scale shadow-2xl shadow-indigo-950/20">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/30 mb-3 shadow-lg shadow-indigo-500/10">
            <ShieldCheck className="h-7 w-7 text-indigo-500" />
          </div>
          <h1 className="text-3xl font-bold font-outfit text-white tracking-wide">
            Transit<span className="text-indigo-500">Ops</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">Smart Transport Fleet Operations</p>
        </div>

        {error && (
          <div className="mb-6 flex items-start space-x-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3.5 text-rose-400 text-xs">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@transitops.dev"
                className="w-full rounded-lg bg-slate-900/60 border border-slate-800 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg bg-slate-900/60 border border-slate-800 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
          >
            {loading ? (
              <span className="flex items-center justify-center space-x-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                <span>Authenticating & Deriving Keys...</span>
              </span>
            ) : (
              "Secure Login"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
            This dashboard uses client-side encryption. Sensitive driver data is encrypted in your browser before database transmission.
          </p>
        </div>
      </div>
    </div>
  );
};
