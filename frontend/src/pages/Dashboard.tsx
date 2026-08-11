import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  TrendingUp, 
  Heart, 
  Skull, 
  AlertOctagon, 
  MapPin, 
  BellRing,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell, PieChart, Pie
} from 'recharts';

const diseaseColors: Record<string, string> = {
  'Dengue': '#f26419',
  'Malaria': '#3b82f6',
  'Cholera': '#10b981',
  'COVID-19': '#ef4444',
  'Typhoid': '#eab308',
};

const getDiseaseColor = (diseaseName: string) => {
  if (diseaseColors[diseaseName]) {
    return diseaseColors[diseaseName];
  }
  const fallbackColors = [
    '#a855f7', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e', 
    '#6366f1', '#84cc16', '#d946ef', '#f97316', '#22c55e'
  ];
  let hash = 0;
  for (let i = 0; i < diseaseName.length; i++) {
    hash = diseaseName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % fallbackColors.length;
  return fallbackColors[idx];
};

interface DashboardProps {
  onDistrictSelect: (district: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onDistrictSelect }) => {
  const { liveCases, alerts } = useWebSocket();
  const { t } = useLanguage();
  const [summary, setSummary] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [hoveredDisease, setHoveredDisease] = useState<string | null>(null);

  const diseaseNames = React.useMemo(() => {
    const keys = new Set<string>();
    historicalData.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'name') {
          keys.add(key);
        }
      });
    });
    return Array.from(keys);
  }, [historicalData]);

  useEffect(() => {
    // Read local registered cases from localStorage
    const existingStr = localStorage.getItem('registered_forecasting_cases');
    const registered = existingStr ? JSON.parse(existingStr) : [];
    
    const todayStr = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    let regToday = 0;
    let regWeek = 0;
    let regMonth = 0;

    registered.forEach((c: any) => {
      const cDate = new Date(c.registeredAt);
      const cDateStr = c.registeredAt.split('T')[0];
      if (cDateStr === todayStr) {
        regToday += c.count;
      }
      if (cDate >= oneWeekAgo) {
        regWeek += c.count;
      }
      if (cDate >= oneMonthAgo) {
        regMonth += c.count;
      }
    });

    // Calculate dynamic risk levels based on counts
    const districts = ["Khordha", "Cuttack", "Ganjam", "Puri", "Balasore", "Mayurbhanj", "Sambalpur", "Sundargarh"];
    const districtCounts: Record<string, number> = {};
    districts.forEach(d => {
      districtCounts[d] = 0;
    });

    registered.forEach((c: any) => {
      const distName = districts.find(d => d.toLowerCase() === c.place.toLowerCase());
      if (distName) {
        districtCounts[distName] += c.count;
      }
    });

    liveCases.forEach((c: any) => {
      const distName = districts.find(d => d.toLowerCase() === c.district.toLowerCase());
      if (distName) {
        districtCounts[distName] += 1;
      }
    });

    const highRisk: string[] = [];
    const mediumRisk: string[] = [];
    const lowRisk: string[] = [];

    districts.forEach(d => {
      const count = districtCounts[d];
      if (count >= 10) {
        highRisk.push(d);
      } else if (count >= 2) {
        mediumRisk.push(d);
      } else {
        lowRisk.push(d);
      }
    });

    // Fetch Summary statistics
    fetch('http://localhost:8000/api/v1/summary')
      .then(res => res.json())
      .then(data => {
        setSummary({
          ...data,
          total_cases_today: (data.total_cases_today || 0) + regToday,
          total_cases_week: (data.total_cases_week || 0) + regWeek,
          total_cases_month: (data.total_cases_month || 0) + regMonth,
          high_risk_areas: highRisk,
          medium_risk_areas: mediumRisk,
          low_risk_areas: lowRisk,
        });
      })
      .catch(() => {
        // Fallback mock database summary
        setSummary({
          total_cases_today: 0 + regToday + liveCases.filter(c => c.report_date === todayStr).length,
          total_cases_week: 0 + regWeek + liveCases.length,
          total_cases_month: 0 + regMonth + liveCases.length,
          active_outbreaks: highRisk.length,
          recovered: 0,
          deaths: 0,
          high_risk_areas: highRisk,
          medium_risk_areas: mediumRisk,
          low_risk_areas: lowRisk,
          top_diseases: [],
          most_affected_district: highRisk[0] || "-"
        });
      });

    // Compute dynamic trend line data based on registered case dates
    const today = new Date();
    const d4 = new Date(); d4.setDate(today.getDate() - 7);
    const d3 = new Date(); d3.setDate(today.getDate() - 14);
    const d2 = new Date(); d2.setDate(today.getDate() - 21);

    // Gather all unique diseases from both registered cases and liveCases to ensure they are tracked
    const uniqueDiseases = new Set<string>(['Dengue', 'Malaria', 'Cholera', 'COVID-19', 'Typhoid']);
    registered.forEach((c: any) => {
      if (c.disease) {
        uniqueDiseases.add(c.disease);
      }
    });
    liveCases.forEach((c: any) => {
      if (c.disease_name) {
        uniqueDiseases.add(c.disease_name);
      }
    });

    const weeksData = [
      { name: 'Week 1' },
      { name: 'Week 2' },
      { name: 'Week 3' },
      { name: 'Week 4' },
    ].map(w => {
      const item: any = { name: w.name };
      uniqueDiseases.forEach(d => {
        item[d] = 0;
      });
      return item;
    });

    registered.forEach((c: any) => {
      const cDate = new Date(c.registeredAt || new Date());
      const diseaseName = c.disease;
      
      let weekIdx = 0; // Default oldest Week 1
      if (cDate >= d4) {
        weekIdx = 3; // Week 4
      } else if (cDate >= d3) {
        weekIdx = 2; // Week 3
      } else if (cDate >= d2) {
        weekIdx = 1; // Week 2
      }
      
      const wk = weeksData[weekIdx];
      if (wk && diseaseName) {
        wk[diseaseName] += c.count;
      }
    });

    liveCases.forEach((c: any) => {
      const cDate = new Date(c.report_date || new Date());
      const diseaseName = c.disease_name;
      
      let weekIdx = 0;
      if (cDate >= d4) {
        weekIdx = 3;
      } else if (cDate >= d3) {
        weekIdx = 2;
      } else if (cDate >= d2) {
        weekIdx = 1;
      }
      
      const wk = weeksData[weekIdx];
      if (wk && diseaseName) {
        wk[diseaseName] += 1; // WebSocket cases represent single reports
      }
    });

    setHistoricalData(weeksData);
  }, [liveCases]);

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-t-govsaffron border-slate-800 animate-spin"></div>
        <span className="text-xs text-slate-400">Loading Surveillance Dashboard...</span>
      </div>
    );
  }

  // Read local registered cases from localStorage to compute alert notifications
  const localStr = localStorage.getItem('registered_forecasting_cases');
  const localReg = localStr ? JSON.parse(localStr) : [];

  // Compile severity distribution dynamically
  let lowCount = 0;
  let mediumCount = 0;
  let highCount = 0;

  localReg.forEach((c: any) => {
    if (c.count >= 50) {
      highCount += c.count;
    } else if (c.count >= 10) {
      mediumCount += c.count;
    } else {
      lowCount += c.count;
    }
  });

  liveCases.forEach((c: any) => {
    if (c.severity === 'High') {
      highCount += 1;
    } else if (c.severity === 'Medium') {
      mediumCount += 1;
    } else {
      lowCount += 1;
    }
  });

  const severityColors = ['#15803d', '#f26419', '#b91c1c'];
  const severityData = (lowCount + mediumCount + highCount === 0) ? [
    { name: 'Low Risk', value: 1 },
    { name: 'Medium Alert', value: 0 },
    { name: 'High Outbreak', value: 0 }
  ] : [
    { name: 'Low Risk', value: lowCount },
    { name: 'Medium Alert', value: mediumCount },
    { name: 'High Outbreak', value: highCount }
  ];
  
  // Compare all diseases to find the one with the maximum count of cases
  const diseaseCountsMap: Record<string, number> = {};
  localReg.forEach((c: any) => {
    if (c.disease) {
      diseaseCountsMap[c.disease] = (diseaseCountsMap[c.disease] || 0) + c.count;
    }
  });

  liveCases.forEach((c: any) => {
    if (c.disease_name) {
      diseaseCountsMap[c.disease_name] = (diseaseCountsMap[c.disease_name] || 0) + 1;
    }
  });

  let maxDisease = "";
  let maxCount = 0;
  Object.keys(diseaseCountsMap).forEach(d => {
    if (diseaseCountsMap[d] > maxCount) {
      maxCount = diseaseCountsMap[d];
      maxDisease = d;
    }
  });

  const generatedAlerts: any[] = [];
  if (maxDisease && maxCount > 0) {
    if (maxCount >= 10) {
      generatedAlerts.push({
        level: 'Red',
        message: `Red Alert: Critical outbreak threshold crossed for ${maxDisease} (${maxCount} cases). Mobilize emergency containment response teams, isolate symptomatic individuals, and initiate sanitization protocols immediately.`,
        created_at: new Date().toISOString()
      });
    } else if (maxCount >= 2) {
      generatedAlerts.push({
        level: 'Orange',
        message: `Orange Alert: Elevating surveillance for ${maxDisease} (${maxCount} cases). Distribute protection resources, implement contact tracing, and deploy health workers for regular inspections.`,
        created_at: new Date().toISOString()
      });
    }
  }

  const displayAlerts = [...generatedAlerts, ...alerts];

  return (
    <div className="space-y-6 font-sans">
      
      {/* Dynamic Alert Banner if RED alerts exist */}
      {displayAlerts.length > 0 && displayAlerts.some(al => al.level === 'Red') && (
        <div className="p-4 bg-red-950/30 border border-red-800 rounded-2xl flex items-center gap-3 animate-pulse">
          <AlertOctagon className="text-red-500 shrink-0" size={24} />
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">CRITICAL OUTBREAK DETECTED</h4>
            <p className="text-xs text-red-300 mt-0.5">{displayAlerts.find(al => al.level === 'Red')?.message}</p>
          </div>
        </div>
      )}

      {/* Aggregate Counters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* Cases Today */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">{t('cases_today')}</span>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-bold text-white font-mono">{summary.total_cases_today}</h3>
            <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-0.5">
              <TrendingUp size={12} />
              +12%
            </span>
          </div>
        </div>

        {/* Weekly Counts */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">{t('cases_week')}</span>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-bold text-white font-mono">{summary.total_cases_week}</h3>
            <span className="text-[10px] text-slate-400 font-semibold">7 Days</span>
          </div>
        </div>

        {/* Monthly Counts */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">{t('cases_month')}</span>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-bold text-white font-mono">{summary.total_cases_month}</h3>
            <span className="text-[10px] text-slate-400 font-semibold">30 Days</span>
          </div>
        </div>

        {/* Active Outbreaks */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">{t('active_outbreaks')}</span>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-bold text-govsaffron font-mono">{summary.active_outbreaks}</h3>
            <span className="w-2 h-2 rounded-full bg-govsaffron animate-ping"></span>
          </div>
        </div>

        {/* Recoveries */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">{t('recovered_cases')}</span>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-bold text-emerald-500 font-mono">{summary.recovered}</h3>
            <Heart size={14} className="text-emerald-500" />
          </div>
        </div>

        {/* Deaths */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">{t('mortalities')}</span>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-bold text-rose-500 font-mono">{summary.deaths}</h3>
            <Skull size={14} className="text-rose-500" />
          </div>
        </div>

      </div>

      {/* Grid Layout for Charts & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Trend Area Chart */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('disease_progression')}</h3>
              <p className="text-[10px] text-slate-400">Weekly aggregates of active pathogens</p>
            </div>
            <Calendar className="text-slate-500" size={16} />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalData}>
                <defs>
                  {diseaseNames.map(d => {
                    const color = getDiseaseColor(d);
                    const idSafe = d.replace(/[^a-zA-Z0-9]/g, '');
                    return (
                      <linearGradient key={d} id={`color${idSafe}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" style={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #334155' }} />
                <Legend 
                  wrapperStyle={{ fontSize: 11 }} 
                  onMouseEnter={(o) => o && o.dataKey && setHoveredDisease(o.dataKey as string)}
                  onMouseLeave={() => setHoveredDisease(null)}
                />
                {diseaseNames.map(d => {
                  const color = getDiseaseColor(d);
                  const idSafe = d.replace(/[^a-zA-Z0-9]/g, '');
                  const isHovered = hoveredDisease === d;
                  const isAnyHovered = hoveredDisease !== null;

                  // Highlight the hovered disease, fade the others
                  const strokeOpacity = !isAnyHovered || isHovered ? 1 : 0.15;
                  const fillOpacity = !isAnyHovered ? 0.4 : (isHovered ? 0.6 : 0.03);

                  return (
                    <Area 
                      key={d}
                      type="monotone" 
                      dataKey={d} 
                      stroke={color} 
                      strokeOpacity={strokeOpacity}
                      fillOpacity={fillOpacity} 
                      fill={`url(#color${idSafe})`} 
                      onMouseEnter={() => setHoveredDisease(d)}
                      onMouseLeave={() => setHoveredDisease(null)}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Radial Breakdown */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('risk_breakdown')}</h3>
          <div className="h-48 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={severityColors[index % severityColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #334155' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-slate-400">Total Analyzed</span>
              <span className="text-lg font-bold text-white font-mono">{summary.total_cases_week}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
            {severityData.map((d, i) => (
              <div key={i} className="flex flex-col">
                <span className="font-semibold" style={{ color: severityColors[i] }}>{d.name}</span>
                <span className="text-slate-400 font-mono">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Grid for Risk Aggregates & Live Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* District Alert Zones */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={16} className="text-govsaffron" />
              {t('regional_alerts')}
            </h3>
            
            <div className="space-y-3">
              {/* High Risk */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Containment (Red Alert)</span>
                <div className="flex flex-wrap gap-1.5">
                  {summary.high_risk_areas.map((d: string) => (
                    <button
                      key={d}
                      onClick={() => onDistrictSelect(d)}
                      className="px-3 py-1.5 rounded-lg bg-red-950/20 border border-red-800/50 hover:border-red-650 hover:bg-red-950/40 text-red-400 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <span>{d}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Medium Risk */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Surveillance (Orange Alert)</span>
                <div className="flex flex-wrap gap-1.5">
                  {summary.medium_risk_areas.map((d: string) => (
                    <button
                      key={d}
                      onClick={() => onDistrictSelect(d)}
                      className="px-3 py-1.5 rounded-lg bg-orange-950/20 border border-orange-800/50 hover:border-orange-650 hover:bg-orange-950/40 text-orange-400 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <span>{d}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Low Risk */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Stable Operations (Yellow Alert)</span>
                <div className="flex flex-wrap gap-1.5">
                  {summary.low_risk_areas.map((d: string) => (
                    <button
                      key={d}
                      onClick={() => onDistrictSelect(d)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-350 text-xs font-semibold transition"
                    >
                      <span>{d}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-855 text-[10px] text-slate-500 italic">
            {t('click_bed_info')}
          </div>
        </div>

        {/* Live Warning Notification Panel */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <BellRing size={16} className="text-govsaffron animate-pulse" />
              {t('live_containment')}
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Real-time update</span>
          </div>

          <div className="h-64 overflow-y-auto pr-1 space-y-3">
            {displayAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-550 gap-2">
                <AlertTriangle size={24} />
                <span className="text-xs">No warning bulletins dispatched recently.</span>
              </div>
            ) : (
              displayAlerts.map((al, idx) => (
                <div
                  key={idx}
                  className={`p-3 border rounded-xl flex items-start gap-3 transition-all duration-300 hover:scale-[1.005] ${
                    al.level === 'Red' 
                      ? 'bg-red-950/20 border-red-900/60 text-red-300' 
                      : al.level === 'Orange'
                      ? 'bg-orange-950/20 border-orange-900/60 text-orange-300'
                      : 'bg-yellow-950/20 border-yellow-900/60 text-yellow-300'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                    al.level === 'Red' ? 'bg-red-500 animate-ping' : al.level === 'Orange' ? 'bg-orange-500' : 'bg-yellow-500'
                  }`} />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider">{al.level} Containment Directive</span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {new Date(al.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs font-medium leading-relaxed">{al.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
export default Dashboard;
