import React from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Home, Bot, Sprout, Leaf } from "lucide-react";
import MonitoringStatus from "./MonitoringStatus";
import ExperimentManager from "./ExperimentManager";

const NAV = [
  { to: "/inicio", label: "Início", icon: Home },
  { to: "/previsoes", label: "IA", icon: Bot },
  { to: "/cultura", label: "Cultura", icon: Sprout },
];

export default function Layout() {
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      {/* topo */}
      <header className="sticky top-0 z-30 bg-[#FAFAF7]/85 backdrop-blur-md border-b border-stone-100">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <NavLink to="/inicio" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <Leaf size={18} />
            </span>
            <span className="font-bold text-stone-800 tracking-tight">
              PlantCare<span className="text-emerald-500"> AI</span>
            </span>
          </NavLink>
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-stone-500 hover:text-stone-800"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 pb-28 sm:pb-12 pt-4">
        <MonitoringStatus />
        <ExperimentManager />
        <Outlet />
      </main>

      {/* navegação inferior mobile */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-stone-100">
        <div className="flex items-center justify-around h-16">
          {NAV.map((n) => {
            const active = loc.pathname === n.to;
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                className="flex flex-col items-center gap-0.5 px-4 py-1.5"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                    active ? "bg-emerald-500 text-white" : "text-stone-400"
                  }`}
                >
                  <Icon size={18} />
                </span>
                <span
                  className={`text-[10px] font-medium ${active ? "text-emerald-600" : "text-stone-400"}`}
                >
                  {n.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
