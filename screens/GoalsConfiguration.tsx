import React, { useState } from 'react';
import { read, utils } from 'xlsx';

interface GoalsConfigurationProps {
  onHistoryClick: () => void;
  onNavigateToHierarchy: () => void;
  onProcessGoals: (data: any[]) => void;
}

const GoalsConfiguration: React.FC<GoalsConfigurationProps> = ({ onHistoryClick, onNavigateToHierarchy, onProcessGoals }) => {
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [files, setFiles] = useState<{ [key: number]: File }>({});

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFiles(prev => ({ ...prev, [index]: file }));
    console.log(`File uploaded to slot ${index}: ${file.name} (${file.size} bytes)`);

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = utils.sheet_to_json(worksheet, { header: 1 });
      console.log(jsonData.length);
      
      // Process data for preview (assuming first row is header)
      if (jsonData.length > 1) {
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1).map((row: any) => {
              const obj: any = {};
              headers.forEach((header, index) => {
                  obj[header] = row[index];
              });
              return obj;
          });
          // For now, we just show the preview of the LARGEST or LAST file, or validation logic?
          // The prompt implies we process *one* merged set later, but for now just log sizes.
          // Let's keep the verify preview logic as "current upload overwrites preview" for simplicity 
          // unless we want to merge.
          setPreviewData(rows.slice(0, 5)); 
      }
    } catch (error) {
      console.error("Error reading file:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessClick = async () => {
    // 1. Validate all files are present
    const missingFiles = [0, 1, 2].filter(i => !files[i]);
    if (missingFiles.length > 0) {
      alert("Por favor, importe os 3 arquivos (Mês Anterior 1, Mês Anterior 2 e Mês Atual) para continuar.");
      return;
    }

    setLoading(true);
    try {
      console.log("--- Iniciando Processamento Completo ---");
      
      const filePromises = [0, 1, 2].map(async (idx) => {
        const file = files[idx];
        const data = await file.arrayBuffer();
        const workbook = read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return utils.sheet_to_json(worksheet); // Read all rows
      });

      const [dataMonthMinus2, dataMonthMinus1, dataCurrent] = await Promise.all(filePromises); // Slot 0, 1, 2

      console.log(`Linhas lidas: Slot 0: ${dataMonthMinus2.length}, Slot 1: ${dataMonthMinus1.length}, Slot 2: ${dataCurrent.length}`);

      // Helper to generate key
      const genKey = (row: any) => {
         // Smart key finder similar to HierarchicalGoals but simpler string concat
         const find = (keys: string[]) => {
            for(const k of keys) {
                const found = Object.keys(row).find(rk => rk.toLowerCase().includes(k.toLowerCase()));
                if(found) return row[found];
            }
            return '';
         };
         
         const b = find(['Filial', 'Unidade']);
         const s = find(['Setor', 'Categoria']);
         const d = find(['Departamento', 'Depto']);
         const sec = find(['Seção', 'Secao', 'Item']);
         return `${b}|${s}|${d}|${sec}`;
      };

      // Helper to find value
      const findVal = (row: any, keys: string[]) => {
          for(const k of keys) {
                const found = Object.keys(row).find(rk => rk.toLowerCase().includes(k.toLowerCase()) && !rk.toLowerCase().includes('data')); // avoid dates if possible
                if(found) return row[found];
            }
            return 0;
      };

      // Merge Strategy: Use Current Month (Slot 2) as base, or union of all?
      // Assuming Current Month definition defines the targets.
      const mergedMap = new Map();

      // Function to process a dataset and populate/update map
      const processDataset = (dataset: any[], suffix: string) => {
          dataset.forEach((row: any) => {
              const key = genKey(row);
              if (!key || key === '|||') return; // Skip empty rows

              if (!mergedMap.has(key)) {
                  // Initialize with dimension data
                   const find = (keys: string[]) => {
                        for(const k of keys) {
                            const found = Object.keys(row).find(rk => rk.toLowerCase().includes(k.toLowerCase()));
                            if(found) return row[found];
                        }
                        return '';
                    };
                  mergedMap.set(key, {
                      'Filial': find(['Filial', 'Unidade']),
                      'Setor': find(['Setor']),
                      'Departamento': find(['Departamento']),
                      'Seção': find(['Seção', 'Secao', 'Item']),
                      'Venda Mês Ant. 2': 0,
                      'Venda Mês Ant. 1': 0,
                      'Venda Mês Ref.': 0
                  });
              }
              
              const entry = mergedMap.get(key);
              // Extract value based on dataset type. 
              // We accept 'Venda', 'Total', 'Valor' etc.
              const val = findVal(row, ['Venda', 'Total', 'Valor', 'Realizado', 'Liquido']);
              
              if (suffix === 'minus2') entry['Venda Mês Ant. 2'] = val;
              if (suffix === 'minus1') entry['Venda Mês Ant. 1'] = val;
              if (suffix === 'current') entry['Venda Mês Ref.'] = val;
          });
      };

      // Process in order - Slot 0 (Minus 2), Slot 1 (Minus 1), Slot 2 (Ref)
      // Note: Slot 0 title was 'Mês Anterior 1' (Desc 2 months ago) -> implied Minus 2
      processDataset(dataMonthMinus2 as any[], 'minus2');
      processDataset(dataMonthMinus1 as any[], 'minus1');
      processDataset(dataCurrent as any[], 'current');

      const finalData = Array.from(mergedMap.values());
      console.log(`Total merged rows: ${finalData.length}`);
      
      onProcessGoals(finalData);

    } catch (error) {
       console.error("Erro ao processar arquivos:", error);
       alert("Erro ao processar arquivos. Verifique se estão no formato correto.");
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background-light p-6 md:p-8">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Configuração de Metas
            </h1>
            <p className="text-slate-500 text-sm md:text-base">
              Importe planilhas de vendas passadas para projetar as metas do mês atual.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onHistoryClick}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-primary transition shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">history</span>
              Histórico
            </button>
          </div>
        </div>

        {/* Step 1 */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center size-8 rounded-full bg-primary text-white font-bold text-sm shadow-md shadow-blue-200">
              1
            </div>
            <h2 className="text-lg font-bold text-slate-800">Importar Dados Históricos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                title: 'Mês Anterior 1',
                desc: 'Arraste a planilha de vendas de 2 meses atrás (CSV/XLSX)',
                icon: 'upload_file',
              },
              {
                title: 'Mês Anterior 2',
                desc: 'Arraste a planilha de vendas do mês passado (CSV/XLSX)',
                icon: 'upload_file',
              },
              {
                title: 'Mês Atual (Projeção)',
                desc: 'Arraste a planilha parcial ou vazia do mês corrente',
                icon: 'bar_chart',
              },
            ].map((card, idx) => (
              <div
                key={idx}
                className="group relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl bg-white hover:border-primary hover:bg-blue-50/30 transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="size-14 rounded-full bg-blue-50 flex items-center justify-center text-primary mb-4 group-hover:scale-110 group-hover:bg-blue-100 transition-all">
                  <span className="material-symbols-outlined text-2xl">{card.icon}</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{card.title}</h3>
                <p className="text-xs text-center text-slate-500 px-4 leading-relaxed">
                  {card.desc}
                </p>
                {files[idx] && (
                    <div className="mt-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        {files[idx].name}
                    </div>
                )}
                <input
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => handleFileUpload(e, idx)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Step 2 (Previously Step 3) */}
        <section className="flex flex-col mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-8 rounded-full bg-primary text-white font-bold text-sm shadow-md shadow-blue-200">
                2
              </div>
              <h2 className="text-lg font-bold text-slate-800">Prévia dos Dados</h2>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-white border border-gray-200 px-2 py-1 rounded-md shadow-sm">
                {previewData.length > 0 ? `${previewData.length} Linhas Exibidas` : 'Nenhum dado'}
            </span>
          </div>
          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden flex flex-col min-h-[200px]">
            <div className="overflow-x-auto">
              {loading ? (
                  <div className="flex items-center justify-center h-40 text-slate-500">
                      <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
                      Carregando...
                  </div>
              ) : previewData.length > 0 ? (
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50/80 text-slate-500 border-b border-gray-100">
                      <tr>
                        {Object.keys(previewData[0]).map((key) => (
                            <th key={key} className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">
                                {key}
                            </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-slate-600">
                      {previewData.map((row, i) => (
                        <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                            {Object.values(row).map((val: any, idx) => (
                                <td key={idx} className="px-6 py-3">{val}</td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
              ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                      <span className="material-symbols-outlined text-4xl mb-2">table_view</span>
                      <p>Nenhuma planilha importada. Faça o upload acima para visualizar.</p>
                  </div>
              )}
            </div>
          </div>
        </section>

        {/* Footer Actions */}
        <div className="flex items-center justify-end pt-6 border-t border-gray-200">
          <button className="mr-4 px-6 py-3 rounded-lg text-slate-600 font-medium hover:bg-gray-100 hover:text-slate-900 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleProcessClick}
            className="bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined">auto_awesome</span>
            Processar e Gerar Metas
          </button>
        </div>
        <div className="h-20"></div>
      </div>
    </div>
  );
};

export default GoalsConfiguration;
