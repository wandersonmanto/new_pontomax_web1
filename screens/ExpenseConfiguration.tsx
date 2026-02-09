import React, { useState } from 'react';
import { read, utils } from 'xlsx';

interface ExpenseConfigurationProps {
    onNavigateToAnalysis: (data: any[]) => void;
}

const ExpenseConfiguration: React.FC<ExpenseConfigurationProps> = ({ onNavigateToAnalysis }) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setLoading(true);

        try {
            const data = await selectedFile.arrayBuffer();
            const workbook = read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = utils.sheet_to_json(worksheet, { header: 1 });

            // Preview logic
             if (jsonData.length > 1) {
                const headers = jsonData[0] as string[];
                const rows = jsonData.slice(1).map((row: any) => {
                    const obj: any = {};
                    headers.forEach((header, index) => {
                        obj[header] = row[index];
                    });
                    return obj;
                });
                setPreviewData(rows.slice(0, 5));
            }
        } catch (error) {
            console.error("Error reading file:", error);
            alert("Erro ao ler arquivo. Certifique-se que é um Excel válido.");
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = async () => {
        if (!file) {
            alert("Por favor, selecione um arquivo de despesas.");
            return;
        }

        setLoading(true);
        try {
             const data = await file.arrayBuffer();
             const workbook = read(data);
             const sheetName = workbook.SheetNames[0];
             const worksheet = workbook.Sheets[sheetName];
             const jsonData = utils.sheet_to_json(worksheet); // Read whole file
             
             // Normalize keys here if needed (smart mapping) - for now pass raw
             onNavigateToAnalysis(jsonData);
        } catch (error) {
            console.error(error);
            alert("Erro ao processar.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-6 md:p-8">
            <div className="max-w-4xl mx-auto w-full">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Configuração de Despesas</h1>
                <p className="text-slate-500 mb-8">Importe o relatório de despesas (Excel/CSV) para gerar a análise.</p>

                {/* Upload Section */}
                <div className="bg-white p-8 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary transition-colors cursor-pointer relative flex flex-col items-center justify-center mb-8 shadow-sm">
                    <div className="size-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-primary">
                        <span className="material-symbols-outlined text-3xl">upload_file</span>
                    </div>
                    <h3 className="font-semibold text-slate-800 text-lg mb-1">Upload do Relatório</h3>
                    <p className="text-slate-500 text-sm mb-4">Arraste e solte ou clique para selecionar</p>
                    {file && (
                         <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            {file.name}
                        </div>
                    )}
                    <input 
                        type="file" 
                        accept=".xlsx, .xls, .csv" 
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                </div>

                {/* Preview Section */}
                 {previewData.length > 0 && (
                    <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden mb-8">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="font-semibold text-slate-700">Prévia dos Dados</h3>
                            <span className="text-xs font-semibold bg-white border border-gray-200 px-2 py-1 rounded text-slate-500">
                                5 linhas de exemplo
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="bg-gray-50 text-slate-500 font-medium">
                                    <tr>
                                        {Object.keys(previewData[0]).map(header => (
                                            <th key={header} className="px-6 py-3">{header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-slate-600">
                                    {previewData.map((row, idx) => (
                                        <tr key={idx}>
                                            {Object.values(row).map((val: any, i) => (
                                                <td key={i} className="px-6 py-3">{val}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end pt-4">
                    <button 
                        onClick={handleProcess}
                        disabled={!file || loading}
                        className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                         {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">analytics</span>}
                        {loading ? 'Processando...' : 'Gerar Análise'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExpenseConfiguration;
