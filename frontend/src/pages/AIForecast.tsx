import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  Bot, 
  MapPin, 
  CheckCircle,
  BrainCircuit,
  CornerDownRight
} from 'lucide-react';

const translateDirective = (d: string, district: string, t: any) => {
  if (d.startsWith("Enforce active surveillance within a 2km radius of reported cases in")) {
    return `${t("enforce_active_surveillance_prefix")} ${district}.`;
  }
  return t(d);
};

const districtCentroids: Record<string, [number, number]> = {
  Khordha: [20.18, 85.62],
  Cuttack: [20.46, 85.88],
  Ganjam: [19.31, 84.79],
  Puri: [19.81, 85.83],
  Balasore: [21.49, 86.93],
  Mayurbhanj: [21.93, 86.75],
  Sambalpur: [21.47, 83.97],
  Sundargarh: [22.12, 84.50],
};

const getClusterDistrict = (lat: number, lng: number): string => {
  let closestDistrict = "Khordha";
  let minDistance = Infinity;
  Object.entries(districtCentroids).forEach(([district, coords]) => {
    const dist = Math.pow(lat - coords[0], 2) + Math.pow(lng - coords[1], 2);
    if (dist < minDistance) {
      minDistance = dist;
      closestDistrict = district;
    }
  });
  return closestDistrict;
};

const diseaseDirectives: Record<string, string[]> = {
  Dengue: [
    "Eliminate standing water containers and conduct focal insecticide fogging.",
    "Distribute LLIN mosquito bed nets to households in affected blocks.",
    "Ensure local primary health centers have adequate stocks of paracetamol and diagnostic kits."
  ],
  Malaria: [
    "Conduct Indoor Residual Spraying (IRS) in households within a 2km radius.",
    "Distribute LLIN mosquito nets and run community vector awareness campaigns.",
    "Stock local health facilities with ACT (Artesunate-Sulfadoxine-Pyrimethamine) therapy."
  ],
  Cholera: [
    "Establish emergency water purification points and distribute halogen tablets.",
    "Enforce super-chlorination of local drinking water wells and municipal reservoirs.",
    "Deploy quarantine isolation units and stock facilities with Doxycycline and ORS."
  ],
  "COVID-19": [
    "Mandate face masks in public and establish immediate contact tracing for the patient ID.",
    "Enforce localized containment quarantine zones around the active residences.",
    "Deploy ASHA workers for daily door-to-door temperature audits and symptom logging."
  ],
  Typhoid: [
    "Enforce chlorination of local community drinking water wells.",
    "Conduct food safety sanitation audits at public food stalls and markets.",
    "Ensure local PHCs have adequate stocks of Ceftriaxone and Azithromycin."
  ]
};

export const AIForecast: React.FC = () => {
  const { t } = useLanguage();
  const [backendClusters, setBackendClusters] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('Khordha');
  const [forecast, setForecast] = useState<any>(null);
  const [isLoadingCluster, setIsLoadingCluster] = useState(true);
  const [isLoadingForecast, setIsLoadingForecast] = useState(true);
  const [registeredCases, setRegisteredCases] = useState<any[]>([]);
  const [filterYear, setFilterYear] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');

  const months = [
    { value: 'all', label: t('all_months') },
    { value: '0', label: t('january') },
    { value: '1', label: t('february') },
    { value: '2', label: t('march') },
    { value: '3', label: t('april') },
    { value: '4', label: t('may') },
    { value: '5', label: t('june') },
    { value: '6', label: t('july') },
    { value: '7', label: t('august') },
    { value: '8', label: t('september') },
    { value: '9', label: t('october') },
    { value: '10', label: t('november') },
    { value: '11', label: t('december') }
  ];

  const districts = ["Khordha", "Cuttack", "Ganjam", "Puri", "Balasore", "Mayurbhanj", "Sambalpur", "Sundargarh"];

  const fetchClusters = () => {
    setIsLoadingCluster(true);
    fetch('http://localhost:8000/api/v1/cases/clusters')
      .then(res => res.json())
      .then(data => {
        setBackendClusters(data);
        setIsLoadingCluster(false);
      })
      .catch(() => {
        // Fallback mock DBSCAN clusters
        setBackendClusters([
          { cluster_id: 0, center_lat: 20.296, center_lng: 85.824, radius_km: 2.4, case_count: 12, primary_disease: "Dengue", risk_score: 85 },
          { cluster_id: 1, center_lat: 20.462, center_lng: 85.882, radius_km: 1.8, case_count: 7, primary_disease: "Cholera", risk_score: 65 },
          { cluster_id: 2, center_lat: 19.314, center_lng: 84.794, radius_km: 3.1, case_count: 9, primary_disease: "Malaria", risk_score: 55 }
        ]);
        setIsLoadingCluster(false);
      });
  };

  const fetchForecast = (district: string) => {
    setIsLoadingForecast(true);

    // Read local registered cases from localStorage
    const localStr = localStorage.getItem('registered_forecasting_cases');
    const localCases = localStr ? JSON.parse(localStr) : [];
    
    // Filter local cases by selected district
    const districtLocalCases = localCases.filter((c: any) => c.place.toLowerCase() === district.toLowerCase());
    
    // Sum counts of local cases
    const localCount = districtLocalCases.reduce((sum: number, c: any) => sum + (c.count || 0), 0);

    // Find the most prominent disease registered in this district
    const diseaseCounts: Record<string, number> = {};
    districtLocalCases.forEach((c: any) => {
      diseaseCounts[c.disease] = (diseaseCounts[c.disease] || 0) + c.count;
    });

    let topDisease = "";
    let maxCount = 0;
    Object.keys(diseaseCounts).forEach(disease => {
      if (diseaseCounts[disease] > maxCount) {
        maxCount = diseaseCounts[disease];
        topDisease = disease;
      }
    });

    fetch(`http://localhost:8000/api/v1/cases/forecast/${district}`)
      .then(res => res.json())
      .then(data => {
        const mergedActive = (data.current_active_cases || 0) + localCount;
        const mergedPredicted = (data.predicted_cases_next_week || 0) + Math.round(localCount * 1.25);
        const mergedRisk = Math.min(100, (data.risk_score || 0) + Math.round(localCount > 0 ? (15 + (localCount / 10) * 8) : 0));
        const mergedTrend = localCount > 0 ? (localCount > 20 ? "increasing" : "stable") : data.growth_rate_trend;

        // Dynamic containment directives
        let directives = data.suggested_containment_zones || [];
        if (mergedActive === 0) {
          directives = [
            "Standard surveillance active. No high-risk outbreak triggers detected.",
            "Monitor local ASHA health logs for abnormal spike indicators."
          ];
        } else if (topDisease && diseaseDirectives[topDisease]) {
          directives = diseaseDirectives[topDisease];
        } else if (localCount > 0) {
          directives = [
            `Enforce active surveillance within a 2km radius of reported cases in ${district}.`,
            "Deploy ASHA workers for daily door-to-door temperature and symptom audits.",
            "Ensure local PHCs have adequate stocks of standard treatment protocols."
          ];
        }

        setForecast({
          ...data,
          current_active_cases: mergedActive,
          predicted_cases_next_week: mergedPredicted,
          risk_score: mergedRisk,
          growth_rate_trend: mergedTrend,
          suggested_containment_zones: directives
        });
        setIsLoadingForecast(false);
      })
      .catch(() => {
        // Fallback mock forecasts
        const mockForecasts: Record<string, any> = {
          Khordha: { current_active_cases: 12, predicted_cases_next_week: 16, growth_rate_trend: "increasing", confidence_level: "High", risk_score: 85, suggested_containment_zones: ["Enforce active surveillance within a 2km radius of positive cases.", "Deploy ASHA workers for daily door-to-door temperature and symptom audits.", "Ensure local PHCs have adequate stocks of Dengue diagnostic kits."] },
          Cuttack: { current_active_cases: 7, predicted_cases_next_week: 5, growth_rate_trend: "stable", confidence_level: "Medium", risk_score: 65, suggested_containment_zones: ["Enforce active surveillance within a 2km radius.", "Perform targeted water chlorination and bleach distribution.", "Ensure SCB medical college has stocked ORS sachets."] },
          Ganjam: { current_active_cases: 9, predicted_cases_next_week: 10, growth_rate_trend: "stable", confidence_level: "High", risk_score: 55, suggested_containment_zones: ["ASHA workers to distribute mosquito nets in Hinjilicut.", "Conduct indoor residual spraying."] }
        };
        
        const baseForecast = mockForecasts[district] || {
          current_active_cases: 0,
          predicted_cases_next_week: 0,
          growth_rate_trend: "stable",
          confidence_level: "Low",
          risk_score: 5,
          suggested_containment_zones: ["Standard surveillance", "Monitor local ASHA health logs."]
        };

        const mergedActive = baseForecast.current_active_cases + localCount;
        const mergedPredicted = baseForecast.predicted_cases_next_week + Math.round(localCount * 1.25);
        const mergedRisk = Math.min(100, baseForecast.risk_score + Math.round(localCount > 0 ? (15 + (localCount / 10) * 8) : 0));
        const mergedTrend = localCount > 0 ? (localCount > 20 ? "increasing" : "stable") : baseForecast.growth_rate_trend;

        // Dynamic containment directives
        let directives = baseForecast.suggested_containment_zones;
        if (mergedActive === 0) {
          directives = [
            "Standard surveillance active. No high-risk outbreak triggers detected.",
            "Monitor local ASHA health logs for abnormal spike indicators."
          ];
        } else if (topDisease && diseaseDirectives[topDisease]) {
          directives = diseaseDirectives[topDisease];
        } else if (localCount > 0) {
          directives = [
            `Enforce active surveillance within a 2km radius of reported cases in ${district}.`,
            "Deploy ASHA workers for daily door-to-door temperature and symptom audits.",
            "Ensure local PHCs have adequate stocks of standard treatment protocols."
          ];
        }

        setForecast({
          ...baseForecast,
          current_active_cases: mergedActive,
          predicted_cases_next_week: mergedPredicted,
          risk_score: mergedRisk,
          growth_rate_trend: mergedTrend,
          suggested_containment_zones: directives
        });
        setIsLoadingForecast(false);
      });
  };

  useEffect(() => {
    fetchClusters();
    const existingStr = localStorage.getItem('registered_forecasting_cases');
    if (existingStr) {
      setRegisteredCases(JSON.parse(existingStr));
    }
  }, []);

  useEffect(() => {
    fetchForecast(selectedDistrict);
  }, [selectedDistrict]);

  // Recalculate clusters dynamically filtered by selected district and merged with local cases
  useEffect(() => {
    const localStr = localStorage.getItem('registered_forecasting_cases');
    const localCases = localStr ? JSON.parse(localStr) : [];
    
    const districtLocalCases = localCases.filter((c: any) => c.place.toLowerCase() === selectedDistrict.toLowerCase());
    const localCount = districtLocalCases.reduce((sum: number, c: any) => sum + (c.count || 0), 0);
    
    const diseaseCounts: Record<string, number> = {};
    districtLocalCases.forEach((c: any) => {
      diseaseCounts[c.disease] = (diseaseCounts[c.disease] || 0) + c.count;
    });
    
    let topDisease = "Dengue";
    let maxCount = 0;
    Object.keys(diseaseCounts).forEach(disease => {
      if (diseaseCounts[disease] > maxCount) {
        maxCount = diseaseCounts[disease];
        topDisease = disease;
      }
    });

    const districtBackendClusters = backendClusters.filter(c => {
      const dist = getClusterDistrict(c.center_lat, c.center_lng);
      return dist.toLowerCase() === selectedDistrict.toLowerCase();
    });

    const localClusters: any[] = [];
    if (localCount >= 3) {
      const coords = districtCentroids[selectedDistrict] || [20.296, 85.824];
      localClusters.push({
        cluster_id: 99,
        center_lat: coords[0] + 0.012,
        center_lng: coords[1] - 0.008,
        radius_km: 1.5,
        case_count: localCount,
        primary_disease: topDisease,
        risk_score: Math.min(100, localCount * 6 + 20)
      });
    }

    setClusters([...districtBackendClusters, ...localClusters]);
  }, [selectedDistrict, backendClusters, registeredCases]);

  const filteredCases = registeredCases.filter((c: any) => {
    const cDate = new Date(c.registeredAt);
    const matchesYear = filterYear === 'all' || cDate.getFullYear().toString() === filterYear;
    const matchesMonth = filterMonth === 'all' || cDate.getMonth().toString() === filterMonth;
    return matchesYear && matchesMonth;
  });

  const totalFilteredCount = filteredCases.reduce((sum, c) => sum + (c.count || 0), 0);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
        <div className="w-10 h-10 rounded-xl bg-govsaffron/20 text-govsaffron-light flex items-center justify-center">
          <BrainCircuit size={20} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white uppercase">{t('ai_containment_forecasts')}</h1>
          <p className="text-xs text-slate-400">{t('heuristics_engine_sub')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('predictive_growth_modeling')}</h3>
                <p className="text-[10px] text-slate-450">{t('trend_calculations_sub')}</p>
              </div>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-govsaffron transition"
              >
                {districts.map(d => (
                  <option key={d} value={d}>{d} {t('district')}</option>
                ))}
              </select>
            </div>

            {isLoadingForecast ? (
              <div className="flex flex-col items-center justify-center h-48">
                <div className="w-6 h-6 rounded-full border-2 border-t-govsaffron border-slate-800 animate-spin"></div>
              </div>
            ) : forecast ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-850">
                    <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider">{t('active_cases')}</span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-1 block">{forecast.current_active_cases}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-850">
                    <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider">{t('forecast_7d')}</span>
                    <span className="text-2xl font-bold text-govsaffron font-mono mt-1 block">{forecast.predicted_cases_next_week}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-850">
                    <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider">{t('growth_slope')}</span>
                    <span className={`text-xs font-bold uppercase mt-2.5 block ${
                      forecast.growth_rate_trend === 'increasing' ? 'text-rose-500' : 'text-emerald-500'
                    }`}>
                      {forecast.growth_rate_trend === 'increasing' ? `📈 ${t('increasing')}` : `📉 ${t('stable')}`}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-850">
                    <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider">{t('risk_score')}</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{forecast.risk_score}</span>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400">/ 100</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Bot size={14} className="text-govsaffron" />
                    {t('ai_action_directives')} {selectedDistrict}
                  </h4>
                  <div className="space-y-2 bg-slate-50/80 dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-slate-850 rounded-2xl">
                    {forecast.suggested_containment_zones.map((g: string, i: number) => (
                      <div key={i} className="flex gap-2.5 text-xs text-slate-700 dark:text-slate-300 items-start leading-relaxed">
                        <CornerDownRight size={14} className="text-govsaffron shrink-0 mt-0.5" />
                        <p>{t(g)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="pt-4 border-t border-slate-900 text-[10px] text-slate-550 flex items-center gap-1">
            <CheckCircle size={12} className="text-emerald-500" />
            <span>{t('confidence_index_text')}</span>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={16} className="text-govsaffron" />
              {t('density_hotspots')}
            </h3>
            <p className="text-[10px] text-slate-450">{t('identified_coordinates')}</p>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[350px] pr-1">
            {isLoadingCluster ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 rounded-full border-2 border-t-govsaffron border-slate-800 animate-spin"></div>
              </div>
            ) : clusters.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-8">
                {t('no_clusters_detected')}
              </div>
            ) : (
              clusters.map((c) => (
                <div key={c.cluster_id} className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-850 rounded-2xl space-y-3 shadow-sm dark:shadow-none">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-900 dark:text-white">{t('cluster_centroid')} #{c.cluster_id + 1}</span>
                    <span className="px-2 py-0.5 bg-red-950/20 text-red-400 border border-red-900/35 text-[9px] font-bold rounded-lg uppercase">
                      {t('risk')}: {c.risk_score}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                    <div>
                      <span className="block text-slate-550 uppercase">{t('primary_pathogen')}</span>
                      <strong className="text-slate-900 dark:text-white text-xs block mt-0.5">{t(c.primary_disease)}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-550 uppercase">{t('cases_in_cluster')}</span>
                      <strong className="text-slate-900 dark:text-white text-xs block mt-0.5">{c.case_count} {t('reported')}</strong>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-slate-550 uppercase">{t('location_centroid')}</span>
                      <strong className="text-slate-800 dark:text-slate-200 block mt-0.5 font-mono">
                        {c.center_lat.toFixed(3)}°N, {c.center_lng.toFixed(3)}°E (~{c.radius_km}km)
                      </strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Bot size={16} className="text-govsaffron" />
              {t('registered_surveillance_hub')}
            </h3>
            <p className="text-[10px] text-slate-450">{t('active_sub_registry')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">{t('year')}:</span>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-govsaffron transition cursor-pointer"
              >
                <option value="all">{t('all_years')}</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">{t('month')}:</span>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-govsaffron transition cursor-pointer"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="px-3 py-1.5 bg-govsaffron/10 border border-govsaffron/30 rounded-xl text-govsaffron-light text-xs font-bold flex items-center gap-1">
              <span>{t('total_cases')}:</span>
              <span className="font-mono bg-govsaffron/20 px-1.5 py-0.5 rounded text-white">{totalFilteredCount}</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {filteredCases.length === 0 ? (
            <div className="text-center text-xs text-slate-500 py-8">
              {t('no_registered_cases_matching')}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-450 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">{t('patient_name_id')}</th>
                  <th className="py-3 px-4">{t('disease_pathogen')}</th>
                  <th className="py-3 px-4">{t('place_district')}</th>
                  <th className="py-3 px-4 text-center">{t('affected_persons_count')}</th>
                  <th className="py-3 px-4 text-right">{t('registration_date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredCases.map((c: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-900/40 text-slate-300">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-white">{c.name}</span>
                      <span className="block text-[10px] text-slate-500 font-mono mt-0.5">{c.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        c.disease === 'Dengue' ? 'bg-orange-950/20 text-orange-400 border border-orange-900/50' :
                        c.disease === 'Malaria' ? 'bg-sky-950/20 text-sky-400 border border-sky-900/50' :
                        'bg-emerald-950/20 text-emerald-400 border border-emerald-900/50'
                      }`}>
                        {t(c.disease)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">{c.place}</td>
                    <td className="py-3 px-4 text-center font-bold text-white font-mono text-sm">{c.count}</td>
                    <td className="py-3 px-4 text-right text-slate-500 font-mono">
                      {new Date(c.registeredAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
export default AIForecast;
