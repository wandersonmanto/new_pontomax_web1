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
    
    // IMPORT State (Single Month)
    const [importMonth, setImportMonth] = useState<string>(String(currentDate.getMonth() + 1));
    const [importYear, setImportYear] = useState<number>(currentDate.getFullYear());

    // VIEW State (Start Range)
    const [viewStartMonth, setViewStartMonth] = useState<string>(String(currentDate.getMonth() + 1));
    const [viewStartYear, setViewStartYear] = useState<number>(currentDate.getFullYear());

    // VIEW State (End Range)
    const [viewEndMonth, setViewEndMonth] = useState<string>(String(currentDate.getMonth() + 1));
    const [viewEndYear, setViewEndYear] = useState<number>(currentDate.getFullYear());

    // Filters
    const [filters, setFilters] = useState({
        filial: '',
        grupo: '',
        subgrupo: '',
        centroCusto: '',
        planoContas: '',
        fornecedor: '',
    });

    // Expand state for Monthly List
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

    const toggleMonth = (key: string) => {
        setExpandedMonths(prev => ({...prev, [key]: !prev[key]}));
    };

    // --- Helpers ---


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

    const getMonthName = (month: number) => {
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        return months[month - 1] || '';
    };

    const parseExcelDate = (val: any) => {
        if (!val) return '';
        if (typeof val === 'number') {
            const date = new Date(Math.round((val - 25569) * 86400 * 1000));
            return date.toLocaleDateString('pt-BR');
        }
        return String(val);
    };

    const parseCurrency = (val: any) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        let str = String(val).replace('R$', '').trim();
        if (str.includes(',') && str.includes('.')) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else if (str.includes(',')) {
            str = str.replace(',', '.');
        }
        return parseFloat(str) || 0;
    };

    // --- Data Processing (Merges File + DB) ---
    // Re-run this whenever DB data changes OR file content changes OR IMPORT date changes (for duplicate check context)
    useEffect(() => {
        const mes = parseInt(importMonth);
        const ano = importYear;

        // 1. If we have raw file data, process it against the CURRENT dbData
        // NOTE: We only compare against DB data if the View Date matches the Import Date, 
        // otherwise deduplcation might be weird. But typically user imports for X, and views X.
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
                
                let status = 'Pago';
                 // ... mapping ... (omitted for brevity, assume standard mapping)
                 return {
                    id: `temp-${index}`,
                    filial: String(findColumnValue(row, ['Filial', 'Unidade', 'Loja']) || 'Desconhecido'),
                    grupo: String(findColumnValue(row, ['Grupo', 'Group']) || '-'),
                    subgrupo: String(findColumnValue(row, ['Subgrupo', 'Sub Group']) || '-'),
                    centroCusto: String(findColumnValue(row, ['Centro', 'Centro de Custo', 'Cost Center', 'CC']) || '-'), // Mapped correctly now
                    planoContas: String(findColumnValue(row, ['Plano de Contas', 'Plano', 'Conta Contabil']) || '-'),
                    fornecedor: String(findColumnValue(row, ['Fornecedor', 'Vendor', 'Participante']) || 'Indefinido'),
                    titulo: String(findColumnValue(row, ['Titulo', 'Descrição', 'Historico', 'Item']) || `Item ${index}`), 
                    data: parseExcelDate(findColumnValue(row, ['Data', 'Vencimento', 'Pagamento', 'Emissao'])),
                    valor: parseCurrency(findColumnValue(row, ['Valor', 'Total', 'Liquido', 'Pago', 'Vlr'])),
                    status: 'Pago',
                    mes_referencia: mes,
                    ano_referencia: ano,
                    hash_id: '', // calculated below
                    is_new: true 
                };
            });

            // Calculate hashes using the IMPORT date (to match what we are about to save)
            // But we need to compare against DB data. 
            // We use ALL fetched DB data to check for duplicates, ensuring we don't re-insert same hash.
            const currentHashes = new Set(dbData.map(d => d.hash_id));
            
            const processed = mapped.map(row => {
                const hash = generateHashId(row, mes, ano);
                const exists = currentHashes.has(hash);
                // Ensure we carry over the import date context to the row object for filtering
                return { 
                    ...row, 
                    hash_id: hash, 
                    is_new: !exists,
                    mes_referencia: mes,
                    ano_referencia: ano
                };
            });

            // Merge:
            const combined = [...dbData];
            processed.forEach(p => {
                if (p.is_new) combined.push(p);
            });
            
            // Filter combined by View Range
            // CONSTANTS MUST BE NUMBERS for comparison
            const startVal = viewStartYear * 100 + parseInt(viewStartMonth);
            const endVal = viewEndYear * 100 + parseInt(viewEndMonth);

            const finalDisplay = combined.filter(d => {
                // Safely handle types
                const m = d.mes_referencia ? Number(d.mes_referencia) : 0;
                const y = d.ano_referencia ? Number(d.ano_referencia) : 0;
                const val = y * 100 + m;
                return val >= startVal && val <= endVal;
            });

            setDisplayData(finalDisplay);

        } else {
            // If NO file data, we rely on duplicate filtering done in fetchExpenses
            // BUT fetchExpenses might fetch a WIDER range (whole years).
            // So we MUST filter by month range here as well to be sure.
             const startVal = viewStartYear * 100 + parseInt(viewStartMonth);
             const endVal = viewEndYear * 100 + parseInt(viewEndMonth);

             console.log(`[Effect] Filtering Display Data. Range: ${startVal} - ${endVal}`);
             
             const finalDisplay = dbData.filter(d => {
                 const m = d.mes_referencia ? Number(d.mes_referencia) : 0;
                 const y = d.ano_referencia ? Number(d.ano_referencia) : 0;
                 const val = y * 100 + m;
                 return val >= startVal && val <= endVal;
            });
            setDisplayData(finalDisplay);
        }

    }, [dbData, rawDataFromFile, importMonth, importYear, viewStartMonth, viewStartYear, viewEndMonth, viewEndYear]);

    // --- Data Fetching ---
    // Uses VIEW state range
    const fetchExpenses = async (overrideStartM?: string, overrideStartY?: number, overrideEndM?: string, overrideEndY?: number) => {
        setLoading(true);
        
        // Use arguments if provided, otherwise use State (which might be strings!)
        const sm = overrideStartM ? parseInt(overrideStartM) : parseInt(viewStartMonth);
        const sy = overrideStartY ? overrideStartY : viewStartYear;
        const em = overrideEndM ? parseInt(overrideEndM) : parseInt(viewEndMonth);
        const ey = overrideEndY ? overrideEndY : viewEndYear;

        // Construct range query based on year
        
        try {
            console.log(`[Fetch] Querying Supabase for years: ${sy} - ${ey}`);
            
            let allExpenses: any[] = [];
            let page = 0;
            const pageSize = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data: expenses, error } = await supabase
                    .from('despesas')
                    .select('*')
                    .gte('ano_referencia', sy)
                    .lte('ano_referencia', ey)
                    .range(page * pageSize, (page + 1) * pageSize - 1);
                
                if (error) throw error;

                if (expenses && expenses.length > 0) {
                    allExpenses = [...allExpenses, ...expenses];
                    if (expenses.length < pageSize) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                } else {
                    hasMore = false;
                }
            }

            if (allExpenses.length > 0) {
                // Filter by month logic locally
                // Ensure we handle year boundaries correctly (e.g. 2025/01 to 2026/01)
                const startVal = sy * 100 + sm;
                const endVal = ey * 100 + em;

                console.log(`[Fetch] Range: ${sy}/${sm} - ${ey}/${em}. StartVal: ${startVal}, EndVal: ${endVal}`);
                console.log(`[Fetch] Total Raw Expenses from DB: ${allExpenses.length}`);

                const filtered = allExpenses.filter(e => {
                    const m = e.mes_referencia ? Number(e.mes_referencia) : 0;
                    const y = e.ano_referencia ? Number(e.ano_referencia) : 0;
                    const val = y * 100 + m;
                    const keep = val >= startVal && val <= endVal;
                    return keep;
                });
                
                console.log(`[Fetch] Filtered Expenses: ${filtered.length}`);

                const mapped: ExpenseRow[] = filtered.map(e => ({
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
                    // Ensure numbers
                    mes_referencia: Number(e.mes_referencia),
                    ano_referencia: Number(e.ano_referencia),
                    hash_id: e.hash_id,
                    is_new: false
                }));
                // Sort by date/year/month descending
                mapped.sort((a, b) => {
                    const valA = (a.ano_referencia || 0) * 100 + (a.mes_referencia || 0);
                    const valB = (b.ano_referencia || 0) * 100 + (b.mes_referencia || 0);
                    return valB - valA;
                });
                setDbData(mapped);
            } else {
                setDbData([]);
            }

        } catch (error) {
            console.error("Error fetching expenses:", error);
            alert("Erro ao buscar dados. Verifique sua conexão.");
        } finally {
            setLoading(false);
        }
    };

    // Initial Load Only
    useEffect(() => {
        fetchExpenses();
    }, []);

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
            setRawDataFromFile(jsonData); 
            
            // Auto-switch view filters to match import filters (Start=End=Import)
            setViewStartMonth(importMonth);
            setViewStartYear(importYear);
            setViewEndMonth(importMonth);
            setViewEndYear(importYear);
            
            // Fetch DB data for this new period to dedupe correctly
            fetchExpenses(importMonth, importYear, importMonth, importYear); 

        } catch (error) {
            console.error("Error reading file:", error);
            alert("Erro ao ler arquivo.");
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        // Filter displayData for only new items (temp-) that are marked is_new
        const newExpenses = displayData.filter(d => d.id.startsWith('temp-') && d.is_new); 
        
        if (newExpenses.length === 0) {
            alert("Nenhum dado novo para sincronizar.");
            return;
        }

        setLoading(true);

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
                mes_referencia: parseInt(importMonth),
                ano_referencia: importYear,
                hash_id: d.hash_id
            }));

            const { error } = await supabase
                .from('despesas')
                .upsert(payload, { onConflict: 'hash_id', ignoreDuplicates: true });

            if (error) throw error;
            
            alert(`${newExpenses.length} despesas sincronizadas com sucesso!`);
            setFile(null);
            setRawDataFromFile(null); // Clear file data
            
            // Update View to match the data we just imported
            setViewStartMonth(importMonth);
            setViewStartYear(importYear);
            setViewEndMonth(importMonth);
            setViewEndYear(importYear);

            fetchExpenses(importMonth, importYear, importMonth, importYear);

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

    // Helper for Month Options
    const renderMonthOptions = () => (
        <>
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
        </>
    );



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
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mês de Importação</label>
                                    <select 
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary text-slate-700"
                                        value={importMonth}
                                        onChange={(e) => setImportMonth(e.target.value)}
                                    >
                                        {renderMonthOptions()}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ano</label>
                                    <input 
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary text-slate-700" 
                                        type="number" 
                                        value={importYear}
                                        onChange={(e) => setImportYear(parseInt(e.target.value))}
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

            {/* Date Filters (Refined Range) */}
            <section className="mb-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">calendar_month</span> Filtros de Período (Visualização)
                </h3>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
                    <div className="flex flex-col xl:flex-row xl:items-end gap-6">
                        {/* Start Period */}
                        <div className="flex gap-2 items-end">
                            <div className="w-32">
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">De: Mês</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary text-slate-700"
                                    value={viewStartMonth}
                                    onChange={(e) => setViewStartMonth(e.target.value)}
                                >
                                    {renderMonthOptions()}
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Ano</label>
                                <input 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary text-slate-700" 
                                    type="number"
                                    value={viewStartYear}
                                    onChange={e => setViewStartYear(parseInt(e.target.value))}
                                />
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="hidden xl:block pb-3 text-slate-300">
                             <span className="material-symbols-outlined">arrow_right_alt</span>
                        </div>

                        {/* End Period */}
                        <div className="flex gap-2 items-end">
                             <div className="w-32">
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Até: Mês</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary text-slate-700"
                                    value={viewEndMonth}
                                    onChange={(e) => setViewEndMonth(e.target.value)}
                                >
                                    {renderMonthOptions()}
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Ano</label>
                                <input 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary text-slate-700" 
                                    type="number"
                                    value={viewEndYear}
                                    onChange={e => setViewEndYear(parseInt(e.target.value))}
                                />
                            </div>
                        </div>

                        {/* Apply Button */}
                        <div className="flex-1 flex justify-end">
                            <button 
                                onClick={() => fetchExpenses()} /* Manual Trigger */
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-6 rounded-lg text-sm transition-colors h-[38px] flex items-center gap-2 w-full xl:w-auto justify-center xl:justify-start"
                            >
                                <span className="material-symbols-outlined text-lg">filter_list</span>
                                Aplicar Período
                            </button>
                        </div>
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
                    {/* SVG Chart Dynamic */}
                    <div className="h-64 w-full relative mb-12">
                         <div className="absolute inset-0 flex flex-col justify-between">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="border-t border-slate-100 w-full"></div>)}
                        </div>
                        {(() => {
                            // 1. Group data by Month/Year
                            const startM = parseInt(viewStartMonth);
                            const startY = viewStartYear;
                            const endM = parseInt(viewEndMonth);
                            const endY = viewEndYear;

                            const startVal = startY * 100 + startM;
                            const endVal = endY * 100 + endM;

                            // Generate Labels & Placeholders
                            const chartData = [];
                            let currY = startY;
                            let currM = startM;
                            
                            while (currY * 100 + currM <= endVal) {
                                const k = `${currY}-${currM}`;
                                // Sum values for this month from filteredData
                                const monthTotal = filteredData
                                    .filter(d => (d.ano_referencia || 0) === currY && (d.mes_referencia || 0) === currM && d.status === 'Pago')
                                    .reduce((sum, d) => sum + d.valor, 0);

                                chartData.push({
                                    label: `${getMonthName(currM).substring(0,3)}/${String(currY).substring(2)}`,
                                    value: monthTotal,
                                    key: k
                                });

                                currM++;
                                if(currM > 12) { currM = 1; currY++; }
                            }

                            if (chartData.length === 0) return <div className="absolute inset-0 flex items-center justify-center text-slate-400">Sem dados para período</div>;

                            // 2. Normalize Data for SVG (0 to 1000 width, 0 to 200 height)
                            const maxVal = Math.max(...chartData.map(d => d.value)) * 1.1 || 100; // 10% buffering
                            const width = 1000;
                            const height = 200;
                            
                            const points = chartData.map((d, i) => {
                                const x = (i / (chartData.length - 1 || 1)) * width;
                                const y = height - ((d.value / maxVal) * height);
                                return { x, y, ...d };
                            });

                            const pathD = points.length > 1 
                                ? `M${points[0].x},${points[0].y} ` + points.map(p => `L${p.x},${p.y}`).join(' ')
                                : `M0,${height} L${width},${height}`; // Flat line if single point

                            const fillD = points.length > 1
                                ? pathD + ` L${width},${height} L0,${height} Z`
                                : '';

                            return (
                                <>
                                    <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
                                        <defs>
                                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#135bec" stopOpacity="0.2"/>
                                                <stop offset="100%" stopColor="#135bec" stopOpacity="0"/>
                                            </linearGradient>
                                        </defs>

                                        {/* Area Fill */}
                                        <path d={fillD} fill="url(#chartGradient)" />
                                        
                                        {/* Line */}
                                        <path d={pathD} fill="none" stroke="#135bec" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />

                                        {/* Dots & Tooltips */}
                                        {points.map((p, i) => (
                                            <g key={i} className="group">
                                                <circle cx={p.x} cy={p.y} fill="white" r="4" stroke="#135bec" strokeWidth="2" className="cursor-pointer hover:r-6 transition-all" />
                                                
                                                {/* Tooltip */}
                                                <foreignObject x={p.x - 50} y={p.y - 45} width="100" height="40" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                     <div className="bg-slate-900 text-white text-[10px] rounded py-1 px-2 text-center shadow-lg">
                                                        {formatBRL(p.value)}
                                                     </div>
                                                </foreignObject>
                                            </g>
                                        ))}
                                    </svg>

                                    {/* X-Axis Labels */}
                                    <div className="absolute bottom-[-28px] w-full flex justify-between px-0">
                                        {points.map((p, i) => (
                                           <div key={i} className="text-[10px] text-slate-400 font-bold uppercase text-center" style={{ position: 'absolute', left: `${(i / (chartData.length - 1 || 1)) * 100}%`, transform: 'translateX(-50%)' }}>
                                                {p.label}
                                           </div>
                                        ))}
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    {/* Monthly List / Modal Trigger */}
                    <div className="mt-8 overflow-hidden rounded-xl border border-slate-100">
                        {(() => {
                            // Re-calculate months list for the table (same logic as chart)
                             const startM = parseInt(viewStartMonth);
                             const startY = viewStartYear;
                             const endM = parseInt(viewEndMonth);
                             const endY = viewEndYear;
                             const endVal = endY * 100 + endM;
 
                             const monthsList = [];
                             let currY = startY;
                             let currM = startM;
                             
                             while (currY * 100 + currM <= endVal) {
                                 const k = `${currY}-${currM}`;
                                 // Filter data for this specific month
                                 const monthData = filteredData.filter(d => (d.ano_referencia || 0) === currY && (d.mes_referencia || 0) === currM);
                                 
                                 const monthPago = monthData.filter(d => d.status === 'Pago').reduce((sum, d) => sum + d.valor, 0);
                                 const monthAberto = monthData.filter(d => d.status === 'Aberto').reduce((sum, d) => sum + d.valor, 0);
                                 
                                 monthsList.push({
                                     key: k,
                                     label: `${getMonthName(currM)}/${currY}`,
                                     totalPago: monthPago,
                                     totalAberto: monthAberto,
                                     data: monthData
                                 });
 
                                 currM++;
                                 if(currM > 12) { currM = 1; currY++; }
                             }

                            return (
                                <div className="divide-y divide-slate-100">
                                    {/* Header Row */}
                                    <div className="grid grid-cols-12 gap-4 bg-slate-50/80 px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">
                                        <div className="col-span-4">Período</div>
                                        <div className="col-span-3">Total Pago</div>
                                        <div className="col-span-3">Total Aberto</div>
                                        <div className="col-span-2 text-right">Ação</div>
                                    </div>

                                    {monthsList.length === 0 && <div className="p-6 text-center text-slate-400 text-sm">Nenhum dado encontrado para o período selecionado.</div>}

                                    {monthsList.map(m => {
                                        const isExpanded = expandedMonths[m.key];
                                        return (
                                            <div key={m.key} className="group bg-white transition-colors hover:bg-slate-50">
                                                {/* Summary Row */}
                                                <div 
                                                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer"
                                                    onClick={() => toggleMonth(m.key)}
                                                >
                                                    <div className="col-span-4 font-semibold text-slate-900 flex items-center gap-2">
                                                        <span className={`material-symbols-outlined text-slate-400 transition-transform ${isExpanded ? 'rotate-90 text-primary' : ''}`}>chevron_right</span>
                                                        {m.label}
                                                    </div>
                                                    <div className="col-span-3 text-slate-700 font-medium">{formatBRL(m.totalPago)}</div>
                                                    <div className="col-span-3">
                                                         {m.totalAberto > 0 ? (
                                                            <span className="text-amber-600 font-bold text-xs bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                                                                {formatBRL(m.totalAberto)}
                                                            </span>
                                                         ) : (
                                                            <span className="text-slate-400 text-xs">-</span>
                                                         )}
                                                    </div>
                                                    <div className="col-span-2 text-right">
                                                        <button 
                                                            className="text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleMonth(m.key);
                                                            }}
                                                        >
                                                            {isExpanded ? 'Ocultar' : 'Detalhes'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Expanded Details */}
                                                {isExpanded && (
                                                    <div className="px-6 pb-6 pt-2 bg-slate-50/50 border-t border-slate-100">
                                                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                                            <table className="w-full text-left text-xs">
                                                                <thead className="bg-slate-100/50">
                                                                    <tr>
                                                                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Dia</th>
                                                                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Despesa</th>
                                                                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Fornecedor</th>
                                                                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Centro Custo</th>
                                                                        <th className="px-4 py-2 font-bold text-slate-500 uppercase text-right">Valor</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {m.data.length === 0 ? (
                                                                         <tr><td colSpan={5} className="p-4 text-center text-slate-400">Sem lançamentos neste mês.</td></tr>
                                                                    ) : (
                                                                        m.data.sort((a,b) => b.valor - a.valor).slice(0, 50).map(row => (
                                                                            <tr key={row.id || Math.random()} className="hover:bg-blue-50/30">
                                                                                <td className="px-4 py-2 text-slate-600">{row.data}</td>
                                                                                <td className="px-4 py-2 font-medium text-slate-800">{row.titulo}</td>
                                                                                <td className="px-4 py-2 text-slate-600">{row.fornecedor}</td>
                                                                                <td className="px-4 py-2 text-slate-500">{row.centroCusto}</td>
                                                                                <td className="px-4 py-2 text-right font-bold text-slate-700">{formatBRL(row.valor)}</td>
                                                                            </tr>
                                                                        ))
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                            {m.data.length > 50 && (
                                                                <div className="p-2 text-center text-[10px] text-slate-400 bg-slate-50 border-t border-slate-100">
                                                                    Exibindo as 50 maiores despesas de {m.data.length} registros.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>

                </div>
            </section>

             {/* Pivot Table: Plano de Contas */}
             <section className="mb-12">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h3 className="font-bold flex items-center gap-2 text-slate-900 text-lg">
                                <span className="material-symbols-outlined text-primary">pivot_table_chart</span> 
                                Análise por Plano de Contas
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Visão matricial de despesas por categoria ao longo do período.</p>
                        </div>
                        <button className="text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">download</span> Exportar
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                        {(() => {
                            // 1. Build Columns (Months in Range)
                            const startM = parseInt(viewStartMonth);
                            const startY = viewStartYear;
                            const endM = parseInt(viewEndMonth);
                            const endY = viewEndYear;
                            const endVal = endY * 100 + endM;
            
                            const columns = [];
                            let currY = startY;
                            let currM = startM;
                            
                            while (currY * 100 + currM <= endVal) {
                                columns.push({
                                    key: `${currY}-${currM}`,
                                    label: `${getMonthName(currM).substring(0,3)}/${String(currY).substring(2)}`,
                                    month: currM,
                                    year: currY
                                });
                                currM++;
                                if(currM > 12) { currM = 1; currY++; }
                            }
            
                            // 2. Identify Unique Planos & Initialize Structures
                            const uniquePlanosSet = new Set<string>();
                            filteredData.forEach(d => {
                                if (d.planoContas && d.planoContas !== '-') uniquePlanosSet.add(d.planoContas);
                            });
                            
                            const tempRows = Array.from(uniquePlanosSet);
                            const matrix: Record<string, Record<string, number>> = {};
                            const rowTotals: Record<string, number> = {};
                            const columnTotals: Record<string, number> = {};

                            // 3. Calculate Values & Totals
                            tempRows.forEach(plano => {
                                matrix[plano] = {};
                                let rTotal = 0;
                                
                                columns.forEach(col => {
                                    const val = filteredData
                                        .filter(d => d.planoContas === plano && d.ano_referencia === col.year && d.mes_referencia === col.month)
                                        .reduce((sum, d) => sum + d.valor, 0);
                                    
                                    matrix[plano][col.key] = val;
                                    rTotal += val;
                                    columnTotals[col.key] = (columnTotals[col.key] || 0) + val;
                                });
                                rowTotals[plano] = rTotal;
                            });

                            // 4. Sort Rows by Total (Descending)
                            const rows = tempRows.sort((a, b) => rowTotals[b] - rowTotals[a]);
            
                            if (rows.length === 0) return <div className="p-8 text-center text-slate-400">Sem dados para exibir nesta visão.</div>;
            
                            return (
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 box-border border-r border-slate-200 min-w-[200px]">
                                                Plano de Contas
                                            </th>
                                            {columns.map(col => (
                                                <th key={col.key} className="px-4 py-3 font-bold text-slate-500 uppercase text-right tracking-wider min-w-[100px]">
                                                    {col.label}
                                                </th>
                                            ))}
                                            <th className="px-4 py-3 font-bold text-slate-700 uppercase text-right tracking-wider bg-slate-100/50 min-w-[120px]">
                                                Total
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rows.map(plano => {
                                            const rowTotal = rowTotals[plano];
                                            return (
                                                <tr key={plano} className="hover:bg-blue-50/30 transition-colors group">
                                                    <td className="px-4 py-3 font-medium text-slate-700 sticky left-0 bg-white group-hover:bg-blue-50/30 border-r border-slate-100 truncate max-w-[200px]" title={plano}>
                                                        {plano}
                                                    </td>
                                                    {columns.map(col => {
                                                        const val = matrix[plano][col.key];
                                                        return (
                                                            <td key={col.key} className="px-4 py-3 text-right text-slate-600">
                                                                {val > 0 ? (
                                                                    <span className="group-hover:text-primary transition-colors">{val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                ) : (
                                                                    <span className="text-slate-200">-</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-4 py-3 text-right font-bold text-slate-800 bg-slate-50/30">
                                                        {formatBRL(rowTotal)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                                        <tr>
                                            <td className="px-4 py-3 text-slate-800 uppercase text-[10px] tracking-wider sticky left-0 bg-slate-50 border-r border-slate-200">
                                                Totais do Período
                                            </td>
                                            {columns.map(col => (
                                                <td key={col.key} className="px-4 py-3 text-right text-slate-900">
                                                    {formatBRL(columnTotals[col.key] || 0)}
                                                </td>
                                            ))}
                                            <td className="px-4 py-3 text-right text-white bg-slate-800">
                                                {formatBRL(columns.reduce((sum, col) => sum + (columnTotals[col.key] || 0), 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            );
                        })()}
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
                                        <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px]">Período</th>
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
                                            <td className="px-6 py-3 text-slate-500 font-medium">{(row.mes_referencia || 0).toString().padStart(2, '0')}/{row.ano_referencia}</td>
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
