import React from 'react';
import { View } from '../types';

interface HeaderProps {
  currentView: View;
}

const Header: React.FC<HeaderProps> = ({ currentView }) => {
  const getBreadcrumb = () => {
    switch (currentView) {
      case View.GOALS_CONFIG:
        return 'Home / Metas / Configuração';
      case View.GOALS_HIERARCHY:
        return 'Home / Metas / Gestão Hierárquica';
      case View.GOALS_HISTORY:
        return 'Home / Metas / Histórico';
      default:
        return 'Home / Dashboard';
    }
  };

  return (
    <header className="hidden lg:flex items-center justify-between h-16 px-8 bg-slate-900 text-white shadow-md shrink-0 z-10">
      <div className="flex items-center gap-4 opacity-80">
        <span className="material-symbols-outlined">menu_open</span>
        <div className="text-sm font-medium text-slate-300">{getBreadcrumb()}</div>
      </div>
      <div className="flex items-center gap-6">
        <button className="relative text-slate-300 hover:text-white transition-colors">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-0 right-0 size-2 bg-red-500 rounded-full border-2 border-slate-900"></span>
        </button>
        <div className="flex items-center gap-3 pl-6 border-l border-slate-700">
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold">Admin User</span>
            <span className="text-xs text-slate-400">Gerente Regional</span>
          </div>
          <div className="size-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
            AD
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
