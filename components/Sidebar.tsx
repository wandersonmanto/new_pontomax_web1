import React from 'react';
import { View, NavItem } from '../types';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
  isDashboard: boolean;
}

const navItems: NavItem[] = [
  { id: View.DASHBOARD, label: 'Dashboard', icon: 'dashboard' },
  { id: View.GOALS_CONFIG, label: 'Metas', icon: 'flag' }, // Config is the entry for "Metas" in the mock
  { id: View.GOALS_HIERARCHY, label: 'Vendas', icon: 'trending_up' },
  { id: View.GOALS_HISTORY, label: 'Histórico', icon: 'history' },
];

// Additional items for visual completeness based on screenshots
const extraItems = [
  { label: 'Estoque', icon: 'inventory_2' },
  { label: 'Funcionários', icon: 'group' },
  { label: 'Configurações', icon: 'settings' },
];

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isDashboard }) => {
  return (
    <div className={`hidden lg:flex w-72 flex-col border-r border-gray-200 bg-white h-full shrink-0 z-20 transition-all duration-300 ${isDashboard ? 'bg-surface-light dark:bg-surface-dark' : ''}`}>
      <div className="flex h-full flex-col justify-between p-4">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 px-2 py-2 cursor-pointer" onClick={() => onChangeView(View.DASHBOARD)}>
            <div
              className="bg-center bg-no-repeat bg-cover rounded-lg size-10 border border-gray-100 shadow-sm"
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAlUEvPxV0b7AS_6fMdHJzHZLPWmQLJSGfc4elCk1TZdvCY6SB9j-LCoPJDoSfbJESkYtuYcCnEKPDLITnGDMJsEY8MQuz8FFnkrIaHHrgGb5RNTs-sS8t2IXIdQKtJtsgeK4DijntfNSEhV1DUi2OcUu8lBCMRt447aqRVeezTrJol7BYRljo88q97OkKii5vL2raxeBHiRh1Pj2xs-IX-bBCx6smTKiIlnEB7x-4tdcUZ1ajMNL2qC9BcslG19yBlNhqH6DopTA")' }}
            ></div>
            <div className="flex flex-col">
              <h1 className="text-slate-900 text-lg font-bold leading-tight">PontoMax</h1>
              <p className="text-slate-500 text-xs font-medium">Gestão de Varejo</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              // Special handling for "Metas" group mapping
              // In the screenshot "Metas" is active for Goals Config.
              // "Vendas" is active for Hierarchy.
              // "Histórico" is active for History.

              return (
                <div
                  key={item.id}
                  onClick={() => onChangeView(item.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/10 shadow-sm'
                      : 'text-slate-600 hover:bg-gray-50 hover:text-slate-900'
                  }`}
                >
                  <span className={`material-symbols-outlined text-xl ${isActive ? 'fill-1' : ''}`}>
                    {item.icon}
                  </span>
                  <p className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'} leading-normal`}>
                    {item.label}
                  </p>
                </div>
              );
            })}

            {/* Extra items just for show */}
            {extraItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-gray-50 hover:text-slate-900 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <p className="text-sm font-medium leading-normal">{item.label}</p>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-primary cursor-pointer transition-colors">
          <span className="material-symbols-outlined text-xl">help</span>
          <p className="text-sm font-medium">Ajuda e Suporte</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
