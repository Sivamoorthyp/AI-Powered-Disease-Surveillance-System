import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Filter, RotateCcw, AlertTriangle } from 'lucide-react';
import { GoogleHeatmap } from './GoogleHeatmap';

export interface CaseData {
  id: number;
  latitude: number;
  longitude: number;
  disease?: { name: string };
  disease_name?: string;
  patient_id?: string;
  severity: string;
  district: string;
  block: string;
  village: string;
  status: string;
  report_date: string;
}

interface OdishaMapProps {
  onDistrictClick: (districtName: string) => void;
  selectedDistrict: string | null;
  liveCases: CaseData[];
}

// Adjust leaflet icons paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to dynamically fit map boundaries
const RecenterMap: React.FC<{ coords: [number, number]; zoom: number }> = ({ coords, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, zoom);
  }, [coords, zoom, map]);
  return null;
};

// Leaflet Heatmap Layer helper component
const LeafletHeatLayer: React.FC<{ cases: CaseData[] }> = ({ cases }) => {
  const map = useMap();

  useEffect(() => {
    const scriptId = 'leaflet-heat-script';
    
    const initializeHeatmap = () => {
      if (!(L as any).heatLayer) return null;
      
      const points = cases.map(c => [
        c.latitude, 
        c.longitude, 
        c.severity === 'High' ? 1.0 : c.severity === 'Medium' ? 0.65 : 0.35
      ]);
      
      const heat = (L as any).heatLayer(points, {
        radius: 28,
        blur: 18,
        maxZoom: 18,
        gradient: {
          0.2: '#22c55e', // Green for low intensity
          0.4: '#84cc16', // Light Green
          0.6: '#eab308', // Yellow
          0.8: '#f97316', // Orange
          1.0: '#ef4444'  // Red for high intensity
        }
      }).addTo(map);

      return heat;
    };

    let heatInstance: any;

    if ((L as any).heatLayer) {
      heatInstance = initializeHeatmap();
    } else {
      let script = document.getElementById(scriptId) as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js';
        script.async = true;
        
        script.onload = () => {
          heatInstance = initializeHeatmap();
        };
        
        document.head.appendChild(script);
      } else {
        const interval = setInterval(() => {
          if ((L as any).heatLayer) {
            heatInstance = initializeHeatmap();
            clearInterval(interval);
          }
        }, 100);
        return () => clearInterval(interval);
      }
    }

    return () => {
      if (heatInstance && map) {
        map.removeLayer(heatInstance);
      }
    };
  }, [cases, map]);

  return null;
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

export const OdishaMap: React.FC<OdishaMapProps> = ({ onDistrictClick, selectedDistrict, liveCases }) => {
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [cases, setCases] = useState<CaseData[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapProvider, setMapProvider] = useState<'leaflet' | 'google' | 'leaflet-heat'>('leaflet-heat');

  // Filter States
  const [selectedDisease, setSelectedDisease] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');

  // Fetch GeoJSON Boundaries
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/gh/udit-001/india-maps-data@main/geojson/states/odisha.geojson')
      .then(res => res.json())
      .then(data => {
        setGeoJsonData(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load Odisha GeoJSON from CDN:", err);
        setIsLoading(false);
      });
  }, []);

  // Fetch Diseases for filtering dropdown
  useEffect(() => {
    fetch('http://localhost:8000/api/v1/diseases/')
      .then(res => res.json())
      .then(data => setDiseases(data))
      .catch(() => {
        setDiseases([
          { id: 1, name: 'Dengue' },
          { id: 2, name: 'Malaria' },
          { id: 3, name: 'Cholera' },
          { id: 4, name: 'COVID-19' }
        ]);
      });
  }, []);

  // Fetch Cases with applied filters
  const fetchFilteredCases = () => {
    // Read local registered cases from localStorage
    const localStr = localStorage.getItem('registered_forecasting_cases');
    const localCases = localStr ? JSON.parse(localStr) : [];
    
    // Find selected disease name from the diseases dropdown list for local filtering
    const selectedDiseaseName = diseases.find(d => d.id.toString() === selectedDisease)?.name;

    const formattedLocalCases: CaseData[] = [];
    localCases.forEach((lc: any) => {
      // Filter by disease if selected
      if (selectedDisease && lc.disease !== selectedDiseaseName) {
        return;
      }
      
      const coords = districtCentroids[lc.place] || [20.296, 85.824];
      
      // Generate 'count' number of coordinates slightly jittered
      for (let i = 0; i < lc.count; i++) {
        // slightly jitter coordinates so they look like a spread cluster on heatmap
        const jitterLat = coords[0] + (Math.random() - 0.5) * 0.08;
        const jitterLng = coords[1] + (Math.random() - 0.5) * 0.08;
        
        formattedLocalCases.push({
          id: Math.random(),
          latitude: jitterLat,
          longitude: jitterLng,
          disease_name: lc.disease,
          disease: { name: lc.disease },
          severity: 'Medium',
          district: lc.place,
          block: 'Bhubaneswar',
          village: 'Local Area',
          status: 'Confirmed',
          report_date: lc.registeredAt ? lc.registeredAt.split('T')[0] : new Date().toISOString().split('T')[0]
        });
      }
    });

    let url = 'http://localhost:8000/api/v1/cases/?';
    if (selectedDisease) url += `disease_id=${selectedDisease}&`;
    if (selectedSeverity) url += `severity=${selectedSeverity}&`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setCases([...data, ...formattedLocalCases]);
      })
      .catch(() => {
        // Fallback mockup
        setCases([...liveCases, ...formattedLocalCases]);
      });
  };

  useEffect(() => {
    fetchFilteredCases();
  }, [selectedDisease, selectedSeverity, liveCases, diseases]);

  const handleResetFilters = () => {
    setSelectedDisease('');
    setSelectedSeverity('');
  };

  // Compile active cases count per district
  const getDistrictCaseCount = (districtName: string) => {
    return cases.filter(c => c.district.toLowerCase() === districtName.toLowerCase()).length;
  };

  // Map coloration thresholds based on counts
  const getDistrictColor = (count: number) => {
    if (count >= 10) return '#b91c1c'; // Dark Red (Outbreak)
    if (count >= 5) return '#ea580c';  // Orange (Medium Risk)
    if (count >= 1) return '#eab308';  // Yellow (Low Risk)
    return '#15803d';                 // Green (No Cases / Safe)
  };

  // GeoJSON styling rules
  const districtStyle = (feature: any) => {
    const districtName = feature.properties.district || feature.properties.NAME_2 || '';
    const count = getDistrictCaseCount(districtName);
    const isSelected = selectedDistrict && selectedDistrict.toLowerCase() === districtName.toLowerCase();
    
    return {
      fillColor: getDistrictColor(count),
      weight: isSelected ? 3 : 1.5,
      opacity: 1,
      color: isSelected ? '#ffd700' : '#1e293b',
      fillOpacity: isSelected ? 0.85 : 0.6,
      dashArray: isSelected ? '4' : '0'
    };
  };

  // Interactivity for each district polygon
  const onEachDistrict = (feature: any, layer: any) => {
    const districtName = feature.properties.district || feature.properties.NAME_2 || 'Odisha District';
    const count = getDistrictCaseCount(districtName);
    
    layer.on({
      mouseover: (e: any) => {
        const l = e.target;
        l.setStyle({ fillOpacity: 0.8 });
      },
      mouseout: (e: any) => {
        const l = e.target;
        l.setStyle({ fillOpacity: 0.6 });
      },
      click: () => {
        onDistrictClick(districtName);
      }
    });

    layer.bindTooltip(
      `<div class="text-xs">
        <strong class="text-white block uppercase mb-0.5">${districtName}</strong>
        <span class="text-slate-350 block">Active Cases: <strong class="text-govsaffron-light">${count}</strong></span>
        <span class="text-slate-400 block text-[9px] mt-0.5">Click to inspect facilities</span>
       </div>`,
      { permanent: false, direction: 'center', className: 'district-tooltip' }
    );
  };

  return (
    <div className="h-full flex gap-4 font-sans">
      {/* Sidebar Filter Widget */}
      <div className="w-80 bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-start gap-6 shrink-0 shadow-xl">
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Filter size={16} className="text-govsaffron" />
              GIS Heatmap Filters
            </h3>
            <button
              onClick={handleResetFilters}
              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition"
            >
              <RotateCcw size={10} />
              Reset
            </button>
          </div>

          {/* Disease Category */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">Pathogen / Disease</label>
            <select
              value={selectedDisease}
              onChange={(e) => setSelectedDisease(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-govsaffron transition"
            >
              <option value="">All Pathogens</option>
              {diseases.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Severity Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">Outbreak Severity</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-govsaffron transition"
            >
              <option value="">All Severities</option>
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Alert</option>
              <option value="High">High Outbreak</option>
            </select>
          </div>

        </div>

        {/* Legend */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Outbreak Levels</h4>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-emerald-700 block"></span>
              <span>Safe (0 cases)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-yellow-500 block"></span>
              <span>Low (1-4 cases)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-orange-600 block"></span>
              <span>Medium (5-9)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-red-700 block"></span>
              <span>Outbreak (10+)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl relative min-h-[450px]">
        {/* Map Type Toggle Controller */}
        <div className="absolute top-4 right-4 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-2xl flex gap-1 z-[1000]">
          <button
            onClick={() => setMapProvider('leaflet-heat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              mapProvider === 'leaflet-heat'
                ? 'bg-govsaffron text-white shadow-md shadow-govsaffron/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🔥 Leaflet Heatmap
          </button>
          <button
            onClick={() => setMapProvider('google')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              mapProvider === 'google'
                ? 'bg-govsaffron text-white shadow-md shadow-govsaffron/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🗺️ Google Heatmap
          </button>
          <button
            onClick={() => setMapProvider('leaflet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              mapProvider === 'leaflet'
                ? 'bg-govsaffron text-white shadow-md shadow-govsaffron/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🌐 District Boundaries
          </button>
        </div>

        {mapProvider === 'google' ? (
          <GoogleHeatmap cases={cases} />
        ) : isLoading ? (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-50">
            <div className="w-10 h-10 rounded-full border-2 border-t-govsaffron border-slate-800 animate-spin"></div>
            <span className="text-xs text-slate-400">Compiling Odisha GIS Boundaries...</span>
          </div>
        ) : geoJsonData ? (
          <MapContainer
            center={[20.25, 84.50]}
            zoom={7}
            className="w-full h-full"
            zoomControl={true}
          >
            {/* Dark/Light Premium GIS Tiles */}
            <TileLayer
              url={document.documentElement.classList.contains('dark')
                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              }
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            
            {/* GeoJSON Districts Boundary Overlay */}
            {mapProvider === 'leaflet' && (
              <GeoJSON
                data={geoJsonData}
                style={districtStyle}
                onEachFeature={onEachDistrict}
              />
            )}

            {/* Dynamic Leaflet Heatmap Layer */}
            {mapProvider === 'leaflet-heat' && (
              <LeafletHeatLayer cases={cases} />
            )}

            {/* Individual Cases Coordinates Markers */}
            {cases.map((c) => (
              <CircleMarker
                key={c.id}
                center={[c.latitude, c.longitude]}
                radius={c.severity === 'High' ? 8 : c.severity === 'Medium' ? 6 : 4}
                pathOptions={{
                  color: c.severity === 'High' ? '#ef4444' : c.severity === 'Medium' ? '#f97316' : '#eab308',
                  fillColor: c.severity === 'High' ? '#ef4444' : c.severity === 'Medium' ? '#f97316' : '#eab308',
                  fillOpacity: 0.8,
                  weight: 1
                }}
              >
                <Popup>
                  <div className="text-xs font-sans text-slate-900 leading-normal p-1">
                    <strong className="block text-govsaffron uppercase text-[9px] tracking-wider mb-1">
                      Case Alert: {c.patient_id || c.id}
                    </strong>
                    <p className="font-semibold text-slate-800 text-xs mb-0.5">Disease: {c.disease?.name || c.disease_name}</p>
                    <p className="text-slate-650 mb-0.5">Location: GP {c.village}, {c.block} Block</p>
                    <p className="text-slate-600 mb-0.5">Date: {c.report_date}</p>
                    <span className={`inline-block px-1.5 py-0.5 mt-1 rounded text-[8px] font-bold uppercase ${
                      c.severity === 'High' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {c.severity} Severity
                    </span>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* If a district has been clicked, auto center layout */}
            {selectedDistrict && (
              <RecenterMap coords={[20.25, 84.50]} zoom={7.2} />
            )}
          </MapContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center text-slate-400">
            <AlertTriangle className="text-govsaffron-light" size={32} />
            <p className="text-xs font-medium">Failed to retrieve GIS maps. Connecting offline vector layout.</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default OdishaMap;
