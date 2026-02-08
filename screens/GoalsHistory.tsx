import React from 'react';
import { GoalHistoryItem } from '../types';

interface GoalsHistoryProps {
  onCreateNew: () => void;
}

const historyData: GoalHistoryItem[] = [
  {
    id: '1',
    title: 'Metas Janeiro 2026',
    date: '14 Jan, 2026',
    baseComparison: 'Jan/24, Fev/24 vs Jan/25',
    projectedGrowth: 12.5,
    status: 'Rascunho',
  },
  {
    id: '2',
    title: 'Metas Dezembro 2025',
    date: '20 Nov, 2025',
    baseComparison: 'Dez/23, Dez/24',
    projectedGrowth: 15.0,
    status: 'Publicada',
  },
  {
    id: '3',
    title: 'Black Friday 2025',
    date: '15 Out, 2025',
    baseComparison: 'Nov/23, Nov/24',
    projectedGrowth: 25.0,
    status: 'Publicada',
  },
  {
    id: '4',
    title: 'Metas Outubro 2025',
    date: '01 Out, 2025',
    baseComparison: 'Out/23, Out/24',
    projectedGrowth: 8.0,
    status: 'Arquivada',
  },
];

const GoalsHistory: React.FC<GoalsHistoryProps> = ({ onCreateNew }) => {
  return (
    <div className="flex-1 overflow-y-auto bg-background-light p-6 md:p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {/* Page Intro */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-slate-900 text-3xl font-black tracking-tight">Histórico de Metas</h2>
            <button
              onClick={onCreateNew}
              className="bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Nova Configuração
            </button>
          </div>
          <p className="text-slate-500 text-base max-w-2xl">
            Gerencie configurações de metas anteriores, visualize o status de publicação e acesse
            períodos comparativos passados.
          </p>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-gray-400">search</span>
            </div>
            <input
              className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg bg-background-light text-slate-800 placeholder-gray-500 focus:ring-2 focus:ring-primary/50 text-sm transition-all"
              placeholder="Buscar por título ou período..."
              type="text"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-slate-800 hover:bg-gray-50 whitespace-nowrap transition-colors">
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              Últimos 6 meses
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-slate-800 hover:bg-gray-50 whitespace-nowrap transition-colors">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              Status: Todos
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {historyData.map((item) => {
            let statusColor = '';
            let statusBg = '';
            if (item.status === 'Rascunho') {
              statusBg = 'bg-yellow-100';
              statusColor = 'text-yellow-700';
            } else if (item.status === 'Publicada') {
              statusBg = 'bg-green-100';
              statusColor = 'text-green-700';
            } else {
              statusBg = 'bg-gray-100';
              statusColor = 'text-gray-600';
            }

            return (
              <div
                key={item.id}
                className={`group bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col h-full ${
                  item.status === 'Arquivada' ? 'opacity-75 hover:opacity-100' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div
                    className={`${statusBg} ${statusColor} text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wide`}
                  >
                    {item.status}
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-500 mb-6">Criado em {item.date}</p>
                <div className="flex-1 space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background-light/50">
                    <span className="material-symbols-outlined text-gray-400 text-[20px] mt-0.5">
                      date_range
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 uppercase font-semibold">
                        Base de Comparação
                      </span>
                      <span className="text-sm font-medium text-slate-800">
                        {item.baseComparison}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background-light/50">
                    <span className="material-symbols-outlined text-gray-400 text-[20px] mt-0.5">
                      trending_up
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 uppercase font-semibold">
                        Crescimento Projetado
                      </span>
                      <span className="text-sm font-medium text-slate-800">
                        +{item.projectedGrowth.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3 pt-4 border-t border-gray-100">
                  {item.status === 'Rascunho' ? (
                    <button className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                      Continuar Editando
                    </button>
                  ) : item.status === 'Arquivada' ? (
                    <button className="flex-1 bg-white border border-gray-200 text-slate-800 hover:bg-gray-50 py-2 rounded-lg text-sm font-medium transition-colors">
                      Restaurar
                    </button>
                  ) : (
                    <button className="flex-1 bg-white border border-gray-200 text-slate-800 hover:bg-gray-50 py-2 rounded-lg text-sm font-medium transition-colors">
                      Visualizar
                    </button>
                  )}
                  <button className="size-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100">
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="h-20"></div>
      </div>
    </div>
  );
};

export default GoalsHistory;
