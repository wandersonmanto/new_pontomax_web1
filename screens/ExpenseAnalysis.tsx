import React, { useState, useMemo, useEffect } from 'react';
import { read, utils } from 'xlsx';
import { supabase } from '../lib/supabaseClient';

interface ExpenseAnalysisProps {
    onBack?: () => void;
    initialData?: any[];
}

interface ExpenseRow {
    id: string; // Internal ID or Supabase ID
    filial: string;
    grupo: string;
    subgrupo: string;
    centroCusto: string;
    planoContas: string;
    fornecedor: string;
    titulo: string; // Renamed from descricao
    data: string;
    valor: number;
    status: 'Pago' | 'Aberto';
    mes_referencia?: number;
    ano_referencia?: number;
    hash_id?: string;
    is_new?: boolean; // Flag to highlight new entries from file
}

const ExpenseAnalysis: React.FC<ExpenseAnalysisProps> = ({ onBack, initialData }) => {
    // --- State ---
    // Separate Display Data vs DB Data vs File Content
    const [dbData, setDbData] = useState<ExpenseRow[]>([]); // Data from Supabase
    const [rawDataFromFile, setRawDataFromFile] = useState<any[] | null>(null); // Raw JSON from file
    
    // The data actually shown (merged or DB only)
    const [displayData, setDisplayData] = useState<ExpenseRow[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [showModal, setShowModal] = useState(false);
    
    // Default to current month/year
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

    // Filters
    const [filters, setFilters] = useState({
        filial: '',
        grupo: '',
        subgrupo: '',
        centroCusto: '',
        planoContas: '',
        fornecedor: '',
        dateStart: '',
        dateEnd: ''
    });

    // --- Helpers ---
    const parseCurrency = (value: any): number => {
        if (typeof value === 'number') return value;
        if (!value) return 0;
        if (typeof value === 'string') {
            let clean = value.replace(/[R$\s]/g, '');
            if (clean.includes(',') && (!clean.includes('.') || clean.lastIndexOf(',') > clean.lastIndexOf('.'))) {
                clean = clean.replace(/\./g, '').replace(',', '.');
            }
            const num = parseFloat(clean);
            return isNaN(num) ? 0 : num;
        }
        return 0;
    };

    const findColumnValue = (row: any, keywords: string[]): any => {
        const keys = Object.keys(row);
        for (const kw of keywords) {
            const exact = keys.find(k => k.toLowerCase() === kw.toLowerCase());
            if (exact) return row[exact];
        }
        for (const kw of keywords) {
            const partial = keys.find(k => k.toLowerCase().includes(kw.toLowerCase()));
            if (partial) return row[partial];
        }
        return null;
    };

    // Generate a unique hash ID for deduplication
    const generateHashId = (row: ExpenseRow, mes: number, ano: number) => {
        // Create a unique string based on key fields
        const rawStr = `${row.filial}|${row.fornecedor}|${row.valor}|${row.data}|${row.titulo}|${mes}|${ano}`;
        return rawStr.replace(/\s/g, '').toLowerCase(); 
    };

    // --- Data Processing (Merges File + DB) ---
    // Re-run this whenever DB data changes OR file content changes OR date changes
    useEffect(() => {
        const mes = parseInt(selectedMonth);
        const ano = selectedYear;

        // 1. If we have raw file data, process it against the CURRENT dbData
        if (rawDataFromFile && rawDataFromFile.length > 0) {
            const mapped: ExpenseRow[] = rawDataFromFile.map((row, index) => {
                const filial = findColumnValue(row, ['Filial', 'Unidade', 'Loja']) || 'Desconhecido';
                const grupo = findColumnValue(row, ['Grupo', 'Group']) || '-';
                const subgrupo = findColumnValue(row, ['Subgrupo', 'Sub Group']) || '-';
                // Updated Mapping: Look for 'Centro' specifically as requested
                const centroCusto = findColumnValue(row, ['Centro', 'Centro de Custo', 'Cost Center', 'CC']) || '-'; 
                const planoContas = findColumnValue(row, ['Plano de Contas', 'Plano', 'Conta Contabil']) || '-';
                const fornecedor = findColumnValue(row, ['Fornecedor', 'Vendor', 'Participante']) || 'Indefinido';
                // Updated Mapping: Look for 'Titulo' specifically
                const titulo = findColumnValue(row, ['Titulo', 'Descrição', 'Historico', 'Item']) || `Item ${index}`;
                const rawDate = findColumnValue(row, ['Data', 'Vencimento', 'Pagamento', 'Emissao']); 
                const dataStr = rawDate ? String(rawDate) : '-';
                const valor = parseCurrency(findColumnValue(row, ['Valor', 'Total', 'Liquido', 'Pago', 'Vlr']));
                const statusRaw = findColumnValue(row, ['Status', 'Situacao']);
                
                let status: 'Pago' | 'Aberto' = 'Pago';
                if (statusRaw && String(statusRaw).toLowerCase().includes('aberto')) status = 'Aberto';
                if (statusRaw && String(statusRaw).toLowerCase().includes('pendente')) status = 'Aberto';
    
                return {
                    id: `temp-${index}`, // Temporary ID
                    filial,
                    grupo,
                    subgrupo,
                    centroCusto,
                    planoContas,
                    fornecedor,
                    titulo,
                    data: dataStr,
                    valor,
                    status,
                    is_new: true 
                };
            });

            // Calculate hashes using the SELECTED date
            const currentHashes = new Set(dbData.map(d => d.hash_id));
            
            const processed = mapped.map(row => {
                const hash = generateHashId(row, mes, ano);
                const exists = currentHashes.has(hash);
                return { ...row, hash_id: hash, is_new: !exists };
            });

            setDisplayData(processed);
        } else {
            // 2. If no file, just show DB data
            setDisplayData(dbData);
        }

    }, [dbData, rawDataFromFile, selectedMonth, selectedYear]);

    // --- Data Fetching ---
    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const { data: expenses, error } = await supabase
                .from('despesas')
                .select('*')
                .eq('mes_referencia', parseInt(selectedMonth))
                .eq('ano_referencia', selectedYear);
            
            if (error) throw error;

            if (expenses) {
                const mapped: ExpenseRow[] = expenses.map(e => ({
                    id: e.id,
                    filial: e.filial,
                    grupo: e.grupo,
                    subgrupo: e.subgrupo,
                    centroCusto: e.centro_custo,
                    planoContas: e.plano_contas,
                    fornecedor: e.fornecedor,
                    titulo: e.titulo, // Changed from descricao
                    data: e.data_despesa,
                    valor: e.valor,
                    status: e.status as 'Pago' | 'Aberto',
                    mes_referencia: e.mes_referencia,
                    ano_referencia: e.ano_referencia,
                    hash_id: e.hash_id,
                    is_new: false
                }));
                setDbData(mapped);
            } else {
                setDbData([]);
            }
        } catch (error) {
            console.error("Error fetching expenses:", error);
            // Don't alert here to avoid spamming if user cycles dates quickly
        } finally {
            setLoading(false);
        }
    };

    // Fetch when Date changes
    useEffect(() => {
        fetchExpenses();
    }, [selectedMonth, selectedYear]);

    // --- File Upload Logic ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setLoading(true);

        try {
            const buffer = await selectedFile.arrayBuffer();
            const workbook = read(buffer);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = utils.sheet_to_json(worksheet);
            setRawDataFromFile(jsonData); // Just store raw, let useEffect process it
        } catch (error) {
            console.error("Error reading file:", error);
            alert("Erro ao ler arquivo.");
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        if (!displayData.some(d => d.id.startsWith('temp-'))) {
            alert("Nenhum dado novo para sincronizar.");
            return;
        }

        setLoading(true);
        const newExpenses = displayData.filter(d => d.id.startsWith('temp-') && d.is_new); // Only insert new unique ones
        
        if (newExpenses.length === 0) {
            alert("Todos os dados do arquivo já existem no sistema.");
            setLoading(false);
            return;
        }

        try {
            const payload = newExpenses.map(d => ({
                filial: d.filial,
                grupo: d.grupo,
                subgrupo: d.subgrupo,
                centro_custo: d.centroCusto,
                plano_contas: d.planoContas,
                fornecedor: d.fornecedor,
                titulo: d.titulo,
                valor: d.valor,
                status: d.status,
                data_despesa: d.data, // store original string
                mes_referencia: parseInt(selectedMonth),
                ano_referencia: selectedYear,
                hash_id: d.hash_id
            }));

            const { error } = await supabase
                .from('despesas')
                .upsert(payload, { onConflict: 'hash_id', ignoreDuplicates: true });

            if (error) throw error;
            
            alert(`${newExpenses.length} despesas sincronizadas com sucesso!`);
            setFile(null);
            setRawDataFromFile(null); // Clear file data
            fetchExpenses(); // Refresh from DB -> will update dbData -> will update displayData
        } catch (error) {
            console.error("Error syncing:", error);
            alert("Erro ao sincronizar com Supabase.");
        } finally {
            setLoading(false);
        }
    };

    // --- Derived State (for rendering) ---
    // Use displayData for everything below
    const data = displayData;

    // Unique values for filters
    const uniqueFiliais = useMemo(() => Array.from(new Set(data.map(d => d.filial))).sort(), [data]);
    const uniqueGrupos = useMemo(() => Array.from(new Set(data.map(d => d.grupo))).filter(x => x !== '-').sort(), [data]);
    const uniqueSubgrupos = useMemo(() => Array.from(new Set(data.map(d => d.subgrupo))).filter(x => x !== '-').sort(), [data]);
    const uniqueCentros = useMemo(() => Array.from(new Set(data.map(d => d.centroCusto))).sort(), [data]);
    const uniquePlanos = useMemo(() => Array.from(new Set(data.map(d => d.planoContas))).filter(x => x !== '-').sort(), [data]);
    const uniqueFornecedores = useMemo(() => Array.from(new Set(data.map(d => d.fornecedor))).sort(), [data]);

    // Apply Filter
    const filteredData = useMemo(() => {
        return data.filter(item => {
            if (filters.filial && item.filial !== filters.filial) return false;
            if (filters.grupo && item.grupo !== filters.grupo) return false;
            if (filters.subgrupo && item.subgrupo !== filters.subgrupo) return false;
            if (filters.centroCusto && item.centroCusto !== filters.centroCusto) return false;
            if (filters.planoContas && item.planoContas !== filters.planoContas) return false;
            if (filters.fornecedor && item.fornecedor !== filters.fornecedor) return false;
            
            // Date Filter logic (simple string compare if format allows, else skip for now as data string varies)
            // Ideally convert d.data to Date objects
            return true;
        });
    }, [data, filters]);

    // Aggregates for Cards
    const aggregates = useMemo(() => {
        const totalPago = filteredData.filter(d => d.status === 'Pago').reduce((sum, item) => sum + item.valor, 0);
        const totalAberto = filteredData.filter(d => d.status === 'Aberto').reduce((sum, item) => sum + item.valor, 0);
        
        // Find single largest expense item
        const maxExpense = filteredData.reduce((max, item) => item.valor > max.valor ? item : max, { valor: 0, fornecedor: '-' } as ExpenseRow);
        
        // Find most expensive Plano de Contas
        const planoMap = new Map<string, number>();
        filteredData.forEach(item => {
            if(item.planoContas !== '-') planoMap.set(item.planoContas, (planoMap.get(item.planoContas) || 0) + item.valor);
        });
        let topPlano = { name: '-', value: 0 };
        planoMap.forEach((val, key) => {
            if(val > topPlano.value) topPlano = { name: key, value: val };
        });
        const total = totalPago + totalAberto;
        const topPlanoPct = total > 0 ? (topPlano.value / total) * 100 : 0;

        return { totalPago, totalAberto, maxExpense, topPlano, topPlanoPct };
    }, [filteredData]);

    // --- UI Helpers ---
    const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const recurringExpenses = filteredData.slice(0, 5); 
    const uniqueExpenses = filteredData.slice(5, 10);

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background-light font-sans text-slate-900">
            {/* Header */}
            <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-1">Análise de Despesas</h2>
                    <p className="text-slate-500">Importe seus dados e visualize a saúde financeira da sua filial.</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 text-sm font-semibold rounded-lg bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors inline-flex items-center gap-2 text-slate-700">
                        <span className="material-symbols-outlined text-sm">download</span> Exportar Relatório
                    </button>
                    {onBack && (
                         <button onClick={onBack} className="px-4 py-2 text-sm font-semibold rounded-lg bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors inline-flex items-center gap-2 text-slate-700">
                            Voltar
                        </button>
                    )}
                </div>
            </header>

            {/* Import Section */}
            <section className="mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50 hover:border-primary/50 transition-colors group cursor-pointer relative">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-primary">upload_file</span>
                            </div>
                            <h3 className="text-base font-bold text-slate-900 mb-1">Importação de Despesas</h3>
                            <p className="text-sm text-slate-500">Arraste o arquivo .xlsx ou clique para selecionar</p>
                            {file && <p className="text-xs font-bold text-emerald-600 mt-2">{file.name} carregado</p>}
                            <input 
                                type="file" 
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileUpload}
                            />
                        </div>
                        <div className="lg:w-96 flex flex-col justify-between">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mês de Referência</label>
                                    <select 
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary text-slate-700"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                    >
                                        <option value="1">Janeiro</option>
                                        <option value="2">Fevereiro</option>
                                        <option value="3">Março</option>
                                        <option value="4">Abril</option>
                                        <option value="5">Maio</option>
                                        <option value="6">Junho</option>
                                        <option value="7">Julho</option>
                                        <option value="8">Agosto</option>
                                        <option value="9">Setembro</option>
                                        <option value="10">Outubro</option>
                                        <option value="11">Novembro</option>
                                        <option value="12">Dezembro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ano</label>
                                    <input 
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary text-slate-700" 
                                        type="number" 
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={handleSync}
                                disabled={loading}
                                className={`w-full text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary hover:bg-primary/90 shadow-primary/20'}`}
                            >
                                <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>sync</span>
                                {loading ? 'Sincronizando...' : 'Sincronizar com Supabase'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Date Filters (RESTORED) */}
            <section className="mb-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">calendar_month</span> Filtros de Período
                </h3>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="w-full sm:w-48">
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Data Início</label>
                            <input 
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary text-slate-700" 
                                type="date"
                                value={filters.dateStart}
                                onChange={e => setFilters(prev => ({...prev, dateStart: e.target.value}))}
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Data Fim</label>
                            <input 
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary text-slate-700" 
                                type="date"
                                value={filters.dateEnd}
                                onChange={e => setFilters(prev => ({...prev, dateEnd: e.target.value}))}
                            />
                        </div>
                        <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg text-sm transition-colors h-[38px] flex items-center gap-2">
                            Aplicar Período
                        </button>
                    </div>
                </div>
            </section>

            {/* Search Filters (RESTORED) */}
            <section className="mb-8">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">filter_alt</span> Filtros de Pesquisa
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    {[
                        { label: 'Filial', key: 'filial', options: uniqueFiliais },
                        { label: 'Grupo', key: 'grupo', options: uniqueGrupos },
                        { label: 'SubGrupo', key: 'subgrupo', options: uniqueSubgrupos },
                        { label: 'Centro de Custo', key: 'centroCusto', options: uniqueCentros },
                        { label: 'Plano de Contas', key: 'planoContas', options: uniquePlanos },
                        { label: 'Fornecedor', key: 'fornecedor', options: uniqueFornecedores },
                    ].map((f) => (
                        <div key={f.key} className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase px-1">{f.label}</label>
                            <select 
                                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-primary focus:border-primary"
                                value={(filters as any)[f.key]}
                                onChange={e => setFilters(prev => ({...prev, [f.key]: e.target.value}))}
                            >
                                <option value="">Todos</option>
                                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
            </section>

             {/* KPIs */}
             <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Pago (R$)</p>
                    <h4 className="text-2xl font-black text-slate-900">{formatBRL(aggregates.totalPago)}</h4>
                    <div className="flex items-center gap-1 mt-2 text-emerald-600 text-xs font-bold">
                        <span className="material-symbols-outlined text-sm">trending_up</span> 12% vs mês ant.
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Aberto (R$)</p>
                    <h4 className="text-2xl font-black text-slate-900">{formatBRL(aggregates.totalAberto)}</h4>
                    <div className="flex items-center gap-1 mt-2 text-amber-600 text-xs font-bold">
                        <span className="material-symbols-outlined text-sm">schedule</span> 8 boletos pendentes
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Maior Despesa</p>
                    <h4 className="text-2xl font-black text-slate-900">{formatBRL(aggregates.maxExpense.valor)}</h4>
                    <p className="text-xs text-slate-400 mt-2 truncate font-medium">Fornecedor: {aggregates.maxExpense.fornecedor}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Plano mais Custo</p>
                    <h4 className="text-2xl font-black text-slate-900 line-clamp-1" title={aggregates.topPlano.name}>{aggregates.topPlano.name}</h4>
                    <p className="text-xs text-slate-400 mt-2 font-medium">{aggregates.topPlanoPct.toFixed(0)}% do total processado</p>
                </div>
            </section>

            {/* Evolution Chart (RESTORED) */}
            <section className="grid grid-cols-1 gap-6 mb-8">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">stacked_line_chart</span>
                            Evolução das Despesas
                        </h3>
                        {/* Legend */}
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-primary"></span>
                                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Realizado</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-slate-200"></span>
                                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Orçado</span>
                            </div>
                        </div>
                    </div>
                    {/* SVG Chart Placeholder - Dynamic would require Visx/Recharts */}
                    <div className="h-64 w-full relative mb-12">
                         <div className="absolute inset-0 flex flex-col justify-between">
                            {[1,2,3,4,5].map(i => <div key={i} className="border-t border-slate-100 w-full"></div>)}
                        </div>
                        <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 1000 200">
                             {/* Mock Path - In real app, generate 'd' from data */}
                            <path d="M0,180 L100,160 L200,170 L300,130 L400,140 L500,100 L600,110 L700,60 L800,80 L900,40 L1000,50" fill="none" stroke="#135bec" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"></path>
                            <path className="opacity-5 fill-primary" d="M0,180 L100,160 L200,170 L300,130 L400,140 L500,100 L600,110 L700,60 L800,80 L900,40 L1000,50 L1000,200 L0,200 Z"></path>
                             {/* Mock Dots */}
                            {[
                                {cx:0, cy:180}, {cx:100, cy:160}, {cx:200, cy:170}, 
                                {cx:300, cy:130}, {cx:400, cy:140}, {cx:500, cy:100},
                                {cx:600, cy:110}, {cx:700, cy:60}, {cx:800, cy:80},
                                {cx:900, cy:40}, {cx:1000, cy:50}
                            ].map((p, i) => (
                                <circle key={i} cx={p.cx} cy={p.cy} fill="white" r="4" stroke="#135bec" strokeWidth="2"></circle>
                            ))}
                        </svg>
                        <div className="absolute bottom-[-28px] w-full flex justify-between px-2">
                            {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out'].map(m => (
                                <span key={m} className="text-[10px] text-slate-400 font-bold uppercase">{m}</span>
                            ))}
                        </div>
                    </div>

                    {/* Monthly Table / Modal Trigger */}
                    <div className="mt-8 overflow-hidden rounded-xl border border-slate-100">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/80">
                                <tr>
                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px]">Período Selecionado</th>
                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px]">Total Pago (R$)</th>
                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px]">Total Aberto (R$)</th>
                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px]">Status</th>
                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px] text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr className="hover:bg-blue-50/50 cursor-pointer transition-colors group" onClick={() => setShowModal(true)}>
                                    <td className="px-6 py-4 font-semibold text-slate-900">
                                        {selectedMonth}/{selectedYear} 
                                        {rawDataFromFile && <span className="ml-2 text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">Modo Importação</span>}
                                    </td>
                                    <td className="px-6 py-4 text-slate-700">{formatBRL(aggregates.totalPago)}</td>
                                    <td className="px-6 py-4 text-slate-700">{formatBRL(aggregates.totalAberto)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${aggregates.totalAberto > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {aggregates.totalAberto > 0 ? 'Em Aberto' : 'Consolidado'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

             {/* Tables: Recurring vs Unique (RESTORED) */}
             <section className="grid grid-cols-1 xl:grid-cols-2 gap-8 pb-12">
                {/* Recurring Box */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2 text-slate-900">
                            <span className="material-symbols-outlined text-emerald-500">repeat</span> Despesas Recorrentes
                        </h3>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded font-bold uppercase">Fixas</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px]">Título</th>
                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px]">Vencimento</th>
                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px] text-right">Valor (R$)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recurringExpenses.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{row.titulo}</td>
                                        <td className="px-6 py-4 text-slate-600">{row.data}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-900">{formatBRL(row.valor)}</td>
                                    </tr>
                                ))}
                                {recurringExpenses.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-400">Sem dados</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Unique Box */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2 text-slate-900">
                            <span className="material-symbols-outlined text-blue-500">payments</span> Despesas Únicas
                        </h3>
                        <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded font-bold uppercase">Variáveis</span>
                    </div>
                    <div className="overflow-x-auto">
                         <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px]">Título</th>
                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px]">Data</th>
                                    <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px] text-right">Valor (R$)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {uniqueExpenses.map((row, i) => (
                                     <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{row.titulo}</td>
                                        <td className="px-6 py-4 text-slate-600">{row.data}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-900">{formatBRL(row.valor)}</td>
                                    </tr>
                                ))}
                                {uniqueExpenses.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-400">Sem dados</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-default" onClick={() => setShowModal(false)}></div>
                    <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Detalhamento de Despesas</h3>
                                <p className="text-sm text-slate-500">
                                    {rawDataFromFile ? 'Visualizando dados importados + existentes' : 'Dados do banco de dados'}
                                </p>
                            </div>
                            <button 
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400"
                                onClick={() => setShowModal(false)}
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        {/* Filters in Modal */}
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2">
                             {[
                                { label: 'Filial', key: 'filial', options: uniqueFiliais },
                                { label: 'Grupo', key: 'grupo', options: uniqueGrupos },
                                { label: 'Centro de Custo', key: 'centroCusto', options: uniqueCentros },
                                { label: 'Fornecedor', key: 'fornecedor', options: uniqueFornecedores },
                            ].map((f) => (
                                <select 
                                    key={f.key}
                                    className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 w-32"
                                    value={(filters as any)[f.key]}
                                    onChange={e => setFilters(prev => ({...prev, [f.key]: e.target.value}))}
                                >
                                    <option value="">{f.label}</option>
                                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            ))}
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto">
                             <table className="w-full text-left text-sm">
                                <thead className="bg-white sticky top-0 border-b border-slate-100 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px]">Filial</th>
                                        <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px]">Título</th>
                                        <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px]">Fornecedor</th>
                                        <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px]">Origem</th>
                                        <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px] text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredData.map((row, i) => (
                                        <tr key={i} className={`hover:bg-slate-50 ${row.is_new ? 'bg-emerald-50/50' : ''}`}>
                                            <td className="px-6 py-3 text-slate-600">{row.filial}</td>
                                            <td className="px-6 py-3 font-medium text-slate-900">{row.titulo}</td>
                                            <td className="px-6 py-3 text-slate-600">{row.fornecedor}</td>
                                            <td className="px-6 py-3 text-xs">
                                                {row.is_new ? (
                                                    <span className="text-emerald-600 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">NOVO</span>
                                                ) : (
                                                    <span className="text-slate-400">Salvo</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-slate-900 font-bold text-right">
                                                {formatBRL(row.valor)}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredData.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-400">Nenhum registro encontrado.</td>
                                        </tr>
                                    )}
                                </tbody>
                             </table>
                        </div>
                         <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white">
                            <button className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors" onClick={() => setShowModal(false)}>Fechar</button>
                            <button className="px-6 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90 shadow-md shadow-primary/20 transition-all flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">download</span> Baixar Detalhamento (.csv)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpenseAnalysis;
