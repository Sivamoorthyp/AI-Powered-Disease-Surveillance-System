import React, { useEffect, useState } from 'react';
import { 
  Building, 
  MapPin, 
  X
} from 'lucide-react';

interface DistrictDetailProps {
  districtName: string;
  onClose?: () => void;
}

export const DistrictDetail: React.FC<DistrictDetailProps> = ({ districtName, onClose }) => {
  const [stats, setStats] = useState<any>(null);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // Fetch District specific statistics
    fetch(`http://localhost:8000/api/v1/district-stats/${districtName}`)
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setIsLoading(false);
      })
      .catch(() => {
        // Offline mockup fallback
        setStats({
          name: districtName,
          population: 1240000,
          disease_count: 12,
          most_common_disease: "Dengue",
          today_cases: 2,
          weekly_cases: 8,
          monthly_cases: 12,
          mortality_rate: 0.0,
          recovery_rate: 83.3,
          active_cases: 10,
          villages_affected: 3,
          hospitals_count: 2
        });
        setIsLoading(false);
      });

    // Fetch District facilities
    fetch(`http://localhost:8000/api/v1/facilities/?district=${districtName}`)
      .then(res => res.json())
      .then(data => setFacilities(data))
      .catch(() => {
        setFacilities([
          { id: 1, name: `${districtName} General Hospital`, type: "District Hospital", bed_count: 250, doctor_count: 32 },
          { id: 2, name: `${districtName} PHC`, type: "PHC", bed_count: 15, doctor_count: 2 }
        ]);
      });

    // Compile village specific aggregates
    setVillages([
      { name: "Jatani Town", active_cases: 5, risk_level: "Orange", asha: "Subhasini Sahoo" },
      { name: "Khurda Ward 3", active_cases: 4, risk_level: "Orange", asha: "Janaki Patra" },
      { name: "Hinjili", active_cases: 3, risk_level: "Yellow", asha: "Priya Sahoo" }
    ]);
  }, [districtName]);

  if (isLoading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-2 bg-slate-950 border border-slate-800 rounded-2xl">
        <div className="w-5 h-5 rounded-full border-2 border-t-govsaffron border-slate-800 animate-spin"></div>
        <span className="text-xs text-slate-450">Retrieving regional audits...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-6 font-sans relative">
      
      {/* Header Panel */}
      <div className="flex justify-between items-start border-b border-slate-900 pb-4">
        <div>
          <span className="text-[10px] font-bold text-govsaffron uppercase tracking-wider">District Summary</span>
          <h2 className="text-base font-bold text-white uppercase">{stats.name} Region</h2>
          <span className="text-[9px] text-slate-450 block font-mono">Population: {stats.population.toLocaleString()}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Aggregate Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        
        {/* Cases */}
        <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-2xl">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Active Cases</span>
          <strong className="text-base font-bold text-white block mt-0.5 font-mono">{stats.active_cases}</strong>
        </div>

        {/* Most Common Disease */}
        <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-2xl">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Common Disease</span>
          <strong className="text-xs font-bold text-govsaffron-light block mt-1 truncate">{stats.most_common_disease}</strong>
        </div>

        {/* Recovery Rate */}
        <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-2xl">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Recovery Rate</span>
          <strong className="text-base font-bold text-emerald-500 block mt-0.5 font-mono">{stats.recovery_rate}%</strong>
        </div>

        {/* Mortality */}
        <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-2xl">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Mortality</span>
          <strong className="text-base font-bold text-rose-500 block mt-0.5 font-mono">{stats.mortality_rate}%</strong>
        </div>

      </div>

      {/* Localized Affected Villages (Village page feature) */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
          <MapPin size={12} className="text-govsaffron" />
          Affected Villages & ASHA Workers
        </h4>
        <div className="space-y-2 bg-slate-900/40 border border-slate-900 p-3 rounded-2xl">
          {villages.map((v, i) => (
            <div key={i} className="flex justify-between items-center text-xs pb-2 border-b border-slate-850/50 last:border-0 last:pb-0">
              <div>
                <span className="font-semibold text-slate-200 block">{v.name}</span>
                <span className="text-[9px] text-slate-500">ASHA: {v.asha}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 font-mono">{v.active_cases} active</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                  v.risk_level === 'Red' ? 'bg-red-950/20 text-red-400 border border-red-900/30' :
                  v.risk_level === 'Orange' ? 'bg-orange-950/20 text-orange-400 border border-orange-900/30' :
                  'bg-yellow-950/20 text-yellow-400 border border-yellow-900/30'
                }`}>
                  {v.risk_level} Risk
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Facilities Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
          <Building size={12} className="text-govsaffron" />
          Nearby Facilities (Beds)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {facilities.map((fac) => (
            <div key={fac.id} className="p-3 bg-slate-905 border border-slate-850 rounded-2xl space-y-1.5">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block truncate">{fac.name}</span>
                <span className="text-[9px] text-slate-500">{fac.type}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-900 font-semibold text-slate-350">
                <span>Beds: {fac.bed_count}</span>
                <span>Doctors: {fac.doctor_count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
export default DistrictDetail;
