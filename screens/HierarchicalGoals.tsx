import React, { useState, useEffect, useMemo } from 'react';
import { HierarchyRow } from '../types';

interface HierarchicalGoalsProps {
  onBack: () => void;
  initialData?: any[];
}

const mockData: HierarchyRow[] = [
  {
    id: '1',
    branch: 'Filial 01 - Centro',
    sector: 'Eletrônicos',
    department: 'TV e Vídeo',
    section: 'Televisores LED',
    salesMonthMinus2: 125000,
    salesMonthMinus1: 138000,
    salesRefMonth: 145200,
    growth: 12.0,
    projectedGoal: 162624,
  },
  {
    id: '2',
    branch: 'Filial 01 - Centro',
    sector: 'Informática',
    department: 'Computadores',
    section: 'Notebooks Gamer',
    salesMonthMinus2: 82000,
    salesMonthMinus1: 86000,
    salesRefMonth: 89450,
    growth: 5.5,
    projectedGoal: 94369,
  },
  {
    id: '3',
    branch: 'Filial 02 - Norte',
    sector: 'Móveis',
    department: 'Sala de Estar',
    section: 'Sofás Retráteis',
    salesMonthMinus2: 72000,
    salesMonthMinus1: 70500,
    salesRefMonth: 67890,
    growth: -2.4,
    projectedGoal: 66260,
  },
  {
    id: '4',
    branch: 'Filial 03 - Sul',
    sector: 'Eletrodomésticos',
    department: 'Refrigeração',
    section: 'Geladeiras Frost Free',
    salesMonthMinus2: 180000,
    salesMonthMinus1: 195000,
    salesRefMonth: 210100,
    growth: 15.0,
    projectedGoal: 241615,
  },
  {
    id: '5',
    branch: 'Filial 03 - Sul',
    sector: 'Decoração',
    department: 'Têxtil',
    section: 'Cortinas Blackout',
    salesMonthMinus2: 28000,
    salesMonthMinus1: 30200,
    salesRefMonth: 32500,
    growth: 8.0,
    projectedGoal: 35100,
  },
  {
    id: '6',
    branch: 'Filial 02 - Norte',
    sector: 'Telefonia',
    department: 'Smartphones',
    section: 'Linha Mid-Range',
    salesMonthMinus2: 195000,
    salesMonthMinus1: 190000,
    salesRefMonth: 180000,
    growth: -5.0,
    projectedGoal: 171000,
  },
];

const HierarchicalGoals: React.FC<HierarchicalGoalsProps> = ({ onBack, initialData }) => {
  // State for data and filters
  const [data, setData] = useState<HierarchyRow[]>([]);
  const [filters, setFilters] = useState({
    filial: '',
    setor: '',
    departamento: '',
  });
  const [additionalPct, setAdditionalPct] = useState<number>(0);

  // Helper: robust currency parser
  const parseCurrency = (value: any): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    if (typeof value === 'string') {
      // Remove R$, spaces
      let clean = value.replace(/[R$\s]/g, '');
      // Handle PT-BR format (1.000,00) -> 1000.00
      // Heuristic: if it has comma and dot, and comma is last, or just comma
      if (clean.includes(',') && (!clean.includes('.') || clean.lastIndexOf(',') > clean.lastIndexOf('.'))) {
         clean = clean.replace(/\./g, '').replace(',', '.');
      }
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  // Helper: Smart Column Mapper
  const findColumnValue = (row: any, keywords: string[]): any => {
    const keys = Object.keys(row);
    // Try exact match first (case insensitive)
    for (const kw of keywords) {
        const exact = keys.find(k => k.toLowerCase() === kw.toLowerCase());
        if (exact) return row[exact];
    }
    // Try partial match
    for (const kw of keywords) {
        const partial = keys.find(k => k.toLowerCase().includes(kw.toLowerCase()));
        if (partial) return row[partial];
    }
    return null;
  };

  // Initialize data
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      console.log("Initial Data Sample Keys:", Object.keys(initialData[0])); // Debug log

      const mappedData: HierarchyRow[] = initialData.map((row, index) => {
        const branch = findColumnValue(row, ['Filial', 'Unidade', 'Loja']) || 'Desconhecido';
        const sector = findColumnValue(row, ['Setor', 'Categoria']) || '-';
        const department = findColumnValue(row, ['Departamento', 'Depto']) || '-';
        const section = findColumnValue(row, ['Seção', 'Secao', 'Item', 'Produto']) || String(index);
        
        const salesRef = parseCurrency(findColumnValue(row, ['Venda Mês Ref', 'Venda Mes Ref', 'Venda Atual', 'Current', 'Ref']));
        const salesMinus1 = parseCurrency(findColumnValue(row, ['Venda Mês Ant. 1', 'Month -1', 'Ant 1', 'Anterior']));
        const salesMinus2 = parseCurrency(findColumnValue(row, ['Venda Mês Ant. 2', 'Month -2', 'Ant 2']));

        console.log(`Row ${index}:`, { branch, salesRef, salesMinus1 }); // Debug log

        return {
          id: String(index),
          branch,
          sector,
          department,
          section,
          salesMonthMinus2: salesMinus2,
          salesMonthMinus1: salesMinus1,
          salesRefMonth: salesRef,
          growth: 0,
          projectedGoal: salesRef, // Default goal = Ref
        };
      });
      setData(mappedData);
    } else {
      setData(mockData);
    }
  }, [initialData]);

  // Derived State: Filters options
  const uniqueFiliais = useMemo(() => Array.from(new Set(data.map(d => d.branch))).sort(), [data]);
  
  const uniqueSetores = useMemo(() => {
    return Array.from(new Set(
      data.filter(d => !filters.filial || d.branch === filters.filial)
          .map(d => d.sector)
    )).sort();
  }, [data, filters.filial]);

  const uniqueDepartamentos = useMemo(() => {
    return Array.from(new Set(
    data.filter(d => (!filters.filial || d.branch === filters.filial) && (!filters.setor || d.sector === filters.setor))
        .map(d => d.department)
    )).sort();
  }, [data, filters.filial, filters.setor]);

  // Derived State: Filtered Data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchFilial = !filters.filial || item.branch === filters.filial;
      const matchSetor = !filters.setor || item.sector === filters.setor;
      const matchDept = !filters.departamento || item.department === filters.departamento;
      return matchFilial && matchSetor && matchDept;
    });
  }, [data, filters]);

  // Derived State: Aggregations
  const aggregates = useMemo(() => {
    const totalSalesRef = filteredData.reduce((sum, item) => sum + item.salesRefMonth, 0);
    const totalSalesMinus1 = filteredData.reduce((sum, item) => sum + item.salesMonthMinus1, 0); // New for comparison
    const totalProjected = filteredData.reduce((sum, item) => sum + item.projectedGoal, 0);
    const avgGrowth = totalSalesRef > 0 ? ((totalProjected / totalSalesRef) - 1) * 100 : 0; 
    
    // Comparison vs Month -1 (assuming Month-1 is "Mês Anterior" in this context)
    const growthVsMinus1 = totalSalesMinus1 > 0 ? ((totalProjected / totalSalesMinus1) - 1) * 100 : 0;

    // Find Best/Worst performers
    let bestPerformer = null;
    let worstPerformer = null;
    
    if (filteredData.length > 0) {
        bestPerformer = filteredData.reduce((prev, current) => (prev.growth > current.growth) ? prev : current);
        worstPerformer = filteredData.reduce((prev, current) => (prev.growth < current.growth) ? prev : current);
    }

    return {
      totalSalesRef,
      totalProjected,
      avgGrowth,
      growthVsMinus1,
      bestPerformer,
      worstPerformer
    };
  }, [filteredData]);

  // Handlers
  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      // Reset dependent filters
      if (key === 'filial') {
        newFilters.setor = '';
        newFilters.departamento = '';
      } else if (key === 'setor') {
        newFilters.departamento = '';
      }
      return newFilters;
    });
  };

  const handleGrowthChange = (id: string, newGrowth: number) => {
    setData(prev => prev.map(item => {
      if (item.id === id) {
        const newGoal = item.salesRefMonth * (1 + newGrowth / 100);
        return { ...item, growth: newGrowth, projectedGoal: newGoal };
      }
      return item;
    }));
  };

  const handleGoalChange = (id: string, newGoalStr: string) => {
    // Remove formatting
    const newGoal = Number(newGoalStr.replace(/[^0-9,-]+/g, '').replace(',', '.'));
    if (isNaN(newGoal)) return;

    setData(prev => prev.map(item => {
      if (item.id === id) {
        const newGrowth = item.salesRefMonth > 0 ? ((newGoal / item.salesRefMonth) - 1) * 100 : 0;
        return { ...item, projectedGoal: newGoal, growth: newGrowth };
      }
      return item;
    }));
  };

  const applyAdditionalPct = () => {
    if (additionalPct === 0) return;
    
    // Apply additional percentage to ALL visible rows
    // It says "add or subtract the percentage". Assuming additive to the current growth.
    // E.g. Current Growth 10%, Additional +5% -> New Growth 15%
    setData(prev => prev.map(item => {
        // Check if item is in filtered list
        const isVisible = filteredData.some(f => f.id === item.id);
        if (isVisible) {
            const newGrowth = item.growth + additionalPct;
            const newGoal = item.salesRefMonth * (1 + newGrowth / 100);
            return { ...item, growth: newGrowth, projectedGoal: newGoal };
        }
        return item;
    }));
    
    // Reset the additional input after applying? Or keep it?
    // User convention usually expects it to be an action. Let's reset it to 0 after apply to avoid confusion of double application.
    setAdditionalPct(0);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const currentLevelLabel = () => {
      if (filters.departamento) return `Departamento ${filters.departamento}`;
      if (filters.setor) return `Setor ${filters.setor}`;
      if (filters.filial) return `Filial ${filters.filial}`;
      return 'Grupo';
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background-light p-6 md:p-8">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Gestão Hierárquica de Metas
            </h1>
            <p className="text-slate-500 text-sm md:text-base">
              Ajuste fino de projeções e filtragem multinível para definição de metas.
            </p>
          </div>
          <div className="flex gap-2">
             <button 
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-600 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50"
             >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Voltar
             </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-primary text-xs font-semibold rounded-full border border-blue-100">
              <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
              Dados Processados
            </div>
          </div>
        </div>

        {/* Aggregation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {/* Card 1: Total Projected */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-card flex flex-col justify-between relative overflow-hidden group hover:shadow-lg transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-6xl text-primary">bar_chart</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total de Vendas Projetadas</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900">{formatCurrency(aggregates.totalProjected)}</h3>
            </div>
            <div className={`mt-4 flex items-center gap-2 text-sm font-medium ${aggregates.growthVsMinus1 >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
               <span className="material-symbols-outlined text-lg">
                  {aggregates.growthVsMinus1 >= 0 ? 'arrow_upward' : 'arrow_downward'}
               </span>
               <span>{Math.abs(aggregates.growthVsMinus1).toFixed(1)}% vs Mês Anterior</span>
            </div>
          </div>

          {/* Card 2: Avg Growth */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-card flex flex-col justify-between relative overflow-hidden group hover:shadow-lg transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-6xl text-primary">trending_up</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">
                Crescimento Médio Estipulado
              </p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900">{aggregates.avgGrowth.toFixed(1)}%</h3>
            </div>
             <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <span>{aggregates.avgGrowth > 10 ? 'Meta agressiva para Q3' : 'Meta conservadora'}</span>
            </div>
          </div>
          
           {/* Card 3: Best Performer */}
           <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-card flex flex-col justify-between relative overflow-hidden border-l-4 border-l-emerald-500">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <span className="material-symbols-outlined text-6xl text-emerald-500">stars</span>
            </div>
             <div>
                 <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-emerald-500">verified</span>
                    <p className="text-sm font-medium text-slate-500">Destaque de Crescimento</p>
                  </div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    {aggregates.bestPerformer ? aggregates.bestPerformer.branch : '-'}
                </h3>
                 <p className="text-sm font-medium text-slate-600">
                    {aggregates.bestPerformer ? aggregates.bestPerformer.section : '-'}
                 </p>
             </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600 font-bold bg-emerald-50 w-fit px-2 py-1 rounded">
                <span className="material-symbols-outlined text-lg">trending_up</span>
                <span>{aggregates.bestPerformer ? `+${aggregates.bestPerformer.growth.toFixed(1)}% Crescimento` : '-'}</span>
              </div>
          </div>

          {/* Card 4: Worst Performer */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-card flex flex-col justify-between relative overflow-hidden border-l-4 border-l-rose-500">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <span className="material-symbols-outlined text-6xl text-rose-500">warning</span>
             </div>
              <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-rose-500">error</span>
                    <p className="text-sm font-medium text-slate-500">Ponto de Atenção</p>
                  </div>
                   <h3 className="text-lg font-bold text-slate-900 leading-tight">
                        {aggregates.worstPerformer ? aggregates.worstPerformer.branch : '-'}
                   </h3>
                   <p className="text-sm font-medium text-slate-600">
                       {aggregates.worstPerformer ? aggregates.worstPerformer.section : '-'}
                   </p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-rose-600 font-bold bg-rose-50 w-fit px-2 py-1 rounded">
                   <span className="material-symbols-outlined text-lg">trending_down</span>
                   <span>{aggregates.worstPerformer ? `${aggregates.worstPerformer.growth.toFixed(1)}% Declínio` : '-'}</span>
              </div>
          </div>

        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6 mb-8 flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-1/3">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">
              Filial
            </label>
            <select
              className="w-full rounded-lg border-gray-200 text-sm focus:ring-primary focus:border-primary"
              value={filters.filial}
              onChange={(e) => handleFilterChange('filial', e.target.value)}
            >
              <option value="">Todas as Filiais</option>
              {uniqueFiliais.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="w-full md:w-1/3">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">
              Setor
            </label>
            <select
              className="w-full rounded-lg border-gray-200 text-sm focus:ring-primary focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
              value={filters.setor}
              onChange={(e) => handleFilterChange('setor', e.target.value)}
              disabled={!filters.filial && uniqueSetores.length > 10} // Optional UX choice
            >
              <option value="">{filters.filial ? 'Todos os Setores' : 'Selecione uma Filial'}</option>
              {uniqueSetores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="w-full md:w-1/3">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">
              Departamento
            </label>
            <select
              className="w-full rounded-lg border-gray-200 text-sm focus:ring-primary focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
              value={filters.departamento}
              onChange={(e) => handleFilterChange('departamento', e.target.value)}
            >
              <option value="">Todos os Departamentos</option>
              {uniqueDepartamentos.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Global Summary Strip & Bulk Edit */}
        <div className="bg-slate-900 rounded-xl shadow-lg mb-8 text-white overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 divide-x divide-slate-700/50">
            <div className="p-4 flex flex-col justify-center">
              <span className="text-xs text-slate-400 mb-1">Meta Grupo</span>
              <span className="text-lg font-bold">
                  {formatCurrency(data.reduce((acc, curr) => acc + curr.projectedGoal, 0))}
              </span>
            </div>
            <div className="p-4 flex flex-col justify-center">
              <span className="text-xs text-slate-400 mb-1">Meta Filial</span>
              <span className="text-lg font-bold text-slate-300">
                  {filters.filial 
                    ? formatCurrency(data.filter(d => d.branch === filters.filial).reduce((acc, c) => acc + c.projectedGoal, 0))
                    : '-'}
              </span>
            </div>
            <div className="p-4 flex flex-col justify-center bg-slate-800/50">
              <span className="text-xs text-slate-400 mb-1">Meta Setor</span>
              <span className="text-lg font-bold text-slate-500 italic">
                  {filters.setor
                     ? formatCurrency(data.filter(d => d.branch === filters.filial && d.sector === filters.setor).reduce((acc, c) => acc + c.projectedGoal, 0))
                     : 'N/A'}
              </span>
            </div>
            <div className="p-4 flex flex-col justify-center bg-slate-800/50">
              <span className="text-xs text-slate-400 mb-1">Meta Depto</span>
              <span className="text-lg font-bold text-slate-500 italic">
                  {filters.departamento
                      ? formatCurrency(data.filter(d => d.branch === filters.filial && d.sector === filters.setor && d.department === filters.departamento).reduce((acc, c) => acc + c.projectedGoal, 0))
                      : 'N/A'}
              </span>
            </div>
            <div className="p-4 flex flex-col justify-center">
              <span className="text-xs text-emerald-400 mb-1">Cresc. Médio Filterado (%)</span>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-emerald-400">
                  trending_up
                </span>
                <span className="text-lg font-bold">{aggregates.avgGrowth.toFixed(1)}%</span>
              </div>
            </div>
            <div className="p-4 flex flex-col justify-center bg-primary/20 relative group cursor-pointer transition-colors hover:bg-primary/30">
              <label
                className="text-xs text-blue-200 mb-1 flex items-center gap-1"
                htmlFor="percentual-adicional"
              >
                Percentual Adicional (%)
                <span className="material-symbols-outlined text-[14px]">edit</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="percentual-adicional"
                  type="number"
                  step="0.1"
                  value={additionalPct}
                  onChange={(e) => setAdditionalPct(Number(e.target.value))}
                  onKeyDown={(e) => e.key === 'Enter' && applyAdditionalPct()}
                  className="bg-transparent border-0 border-b border-blue-400 text-white font-bold text-lg w-full p-0 focus:ring-0 focus:border-white placeholder-blue-300/50"
                />
                 <button 
                    onClick={applyAdditionalPct}
                    className="text-xs bg-white/10 hover:bg-white/20 rounded px-2 py-1 uppercase"
                 >OK</button>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden flex flex-col mb-8">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="font-bold text-lg text-slate-800">Detalhamento por Seção</h2>
             {/* Simple search input could be kept for additional client-side filtering logic if needed */}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/80 text-slate-500 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Filial</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Setor</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Departamento</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Seção</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">Venda Mês Ref.</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-center w-32">Crescimento (%)</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right w-40">Meta Projetada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-slate-600">
                {filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-3 font-medium text-slate-800">{row.branch}</td>
                    <td className="px-6 py-3">{row.sector}</td>
                    <td className="px-6 py-3">{row.department}</td>
                    <td className="px-6 py-3 text-slate-500">{row.section}</td>
                    <td className="px-6 py-3 text-right font-mono text-slate-600 font-medium">
                      {formatCurrency(row.salesRefMonth)}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="number"
                          step="0.1"
                          value={row.growth.toFixed(1)}
                          onChange={(e) => handleGrowthChange(row.id, Number(e.target.value))}
                          className={`w-20 pl-2 pr-1 py-1 text-center text-xs font-bold rounded focus:outline-none focus:ring-1 ${
                            row.growth >= 0
                              ? 'text-emerald-700 bg-emerald-100 border-transparent focus:border-emerald-500 focus:ring-emerald-500'
                              : 'text-rose-700 bg-rose-100 border-transparent focus:border-rose-500 focus:ring-rose-500'
                          }`}
                        />
                        <span className={`absolute right-7 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none ${row.growth >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                       <input
                          type="text"
                          value={new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(row.projectedGoal)}
                          onChange={(e) => handleGoalChange(row.id, e.target.value)}
                          className="w-32 pl-6 pr-2 py-1 text-right font-mono font-bold text-primary bg-white border border-gray-200 rounded focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none hover:border-gray-300 transition-colors"
                        />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
           {/* Pagination... (simplified for now as we don't have large data handling in mock yet) */}
           <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">Mostrando {filteredData.length} registros</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-6 border-t border-gray-200 pb-12">
           {/* ... actions ... */}
           <button className="w-full sm:w-auto px-6 py-3 rounded-lg bg-white border border-gray-200 text-slate-700 font-medium hover:bg-gray-50 hover:text-slate-900 transition-colors shadow-sm flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-lg">download</span>
            Exportar PDF/Excel
          </button>
          <button className="w-full sm:w-auto bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">publish</span>
            Salvar e Publicar Metas
          </button>
        </div>
        <div className="h-20"></div>
      </div>
    </div>
  );
};

export default HierarchicalGoals;
