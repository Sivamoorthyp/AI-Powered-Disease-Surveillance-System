import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  FileText, 
  Table, 
  AlertTriangle,
  FileArchive,
  Printer
} from 'lucide-react';

export const ReportsHub: React.FC = () => {
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const districts = ["Khordha", "Cuttack", "Ganjam", "Puri", "Balasore", "Mayurbhanj", "Sambalpur", "Sundargarh"];

  const handleDownload = async (format: 'pdf' | 'csv' | 'excel') => {
    let endpoint = `http://localhost:8000/api/v1/reports/export/${format}`;
    
    // Read instant data from local storage
    const localStr = localStorage.getItem('registered_forecasting_cases');
    const localCases = localStr ? JSON.parse(localStr) : [];
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          district: selectedDistrict || null,
          local_cases: localCases
        })
      });
      
      if (!response.ok) {
        console.error('Failed to generate report');
        return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Determine file extension
      const ext = format === 'excel' ? 'xlsx' : format;
      a.download = `odisha_disease_surveillance_report.${ext}`;
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-slate-950 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-2xl font-sans space-y-6">
      
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
        <div className="w-10 h-10 rounded-xl bg-govsaffron/20 text-govsaffron-light flex items-center justify-center">
          <FileSpreadsheet size={20} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white uppercase">Health Audit & Reports Center</h1>
          <p className="text-xs text-slate-400">Download formatted disease aggregates, district case matrices, and containment summaries.</p>
        </div>
      </div>

      {/* Select District Filter */}
      <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl space-y-2">
        <label className="text-xs font-semibold text-slate-400">District Filter (Optional)</label>
        <div className="flex gap-4">
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-govsaffron transition-all"
          >
            <option value="">All Odisha Districts</option>
            {districts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <span className="text-[10px] text-slate-500 self-center">
            {selectedDistrict ? `Compiling filters for ${selectedDistrict} district.` : 'Compiling state-wide records.'}
          </span>
        </div>
      </div>

      {/* Audit Export Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* PDF Document */}
        <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="space-y-3">
            <div className="w-9 h-9 rounded-lg bg-red-950/20 text-red-400 flex items-center justify-center">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Outbreak Report (PDF)</h3>
              <p className="text-[10px] text-slate-450 mt-1 leading-relaxed">Official formatted executive surveillance summary including outbreak zones, mortality ratios and recommendations.</p>
            </div>
          </div>
          <button
            onClick={() => handleDownload('pdf')}
            className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <Printer size={12} />
            <span>Generate PDF</span>
          </button>
        </div>

        {/* Excel Spreadsheet */}
        <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="space-y-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-950/20 text-emerald-400 flex items-center justify-center">
              <Table size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Case Matrix (XLSX)</h3>
              <p className="text-[10px] text-slate-450 mt-1 leading-relaxed">Raw audit spreadsheet matching patient demographics, symptom categories, block IDs, and geographical coordinates.</p>
            </div>
          </div>
          <button
            onClick={() => handleDownload('excel')}
            className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <Download size={12} />
            <span>Export Excel</span>
          </button>
        </div>

        {/* CSV File */}
        <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="space-y-3">
            <div className="w-9 h-9 rounded-lg bg-blue-950/20 text-blue-400 flex items-center justify-center">
              <FileArchive size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Data Stream (CSV)</h3>
              <p className="text-[10px] text-slate-450 mt-1 leading-relaxed">Comma-separated flat file format for GIS database migration, integration, or custom tabular analysis.</p>
            </div>
          </div>
          <button
            onClick={() => handleDownload('csv')}
            className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <Download size={12} />
            <span>Download CSV</span>
          </button>
        </div>

      </div>

      {/* Compliance Note */}
      <div className="p-4 bg-slate-900/20 border border-slate-800/80 rounded-2xl flex gap-3 text-[10px] text-slate-500 italic">
        <AlertTriangle className="text-govsaffron shrink-0" size={14} />
        <p className="leading-relaxed">
          Surveillance data compilations conform to the National Health Information Standards. All files contain logs tracking downloader IDs, employee codes, and download timestamp signatures.
        </p>
      </div>

    </div>
  );
};
export default ReportsHub;
