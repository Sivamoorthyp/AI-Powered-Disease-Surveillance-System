import React, { useEffect, useRef, useState } from 'react';
import type { CaseData } from './OdishaMap';

interface GoogleHeatmapProps {
  cases: CaseData[];
}

// Google Maps Dark Theme styling configuration
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#020617' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#020617' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e293b' }]
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#475569' }]
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#020617' }]
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#0f172a' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#475569' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#0f172a' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e293b' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#475569' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0b1329' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#334155' }]
  }
];

export const GoogleHeatmap: React.FC<GoogleHeatmapProps> = ({ cases }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Heatmap configuration states
  const [heatmapRadius, setHeatmapRadius] = useState<number>(30);
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.75);

  const heatmapLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const activeInfoWindowRef = useRef<any>(null);

  // 1. Dynamic Script Loader for Google Maps JS API
  useEffect(() => {
    const apiKey = 'AIzaSyAObuayXapymcBjAWUvrRTkpj1SnUhnyc0';
    const scriptId = 'google-maps-script';

    // Register global auth/billing failure callback
    (window as any).gm_authFailure = () => {
      setApiError('Google Maps API Billing Error: The API key provided does not have billing enabled on its Google Cloud project. Please enable billing on your Google Cloud Console or switch to the "Leaflet Heatmap" view in the top right.');
    };

    const checkGoogleLoaded = () => {
      return (window as any).google && (window as any).google.maps && (window as any).google.maps.visualization;
    };

    // If google object is already defined globally and visualization library is ready
    if (checkGoogleLoaded()) {
      setScriptLoaded(true);
      return;
    }

    // Check if script tag is already attached
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization&v=3.64`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        const checkInterval = setInterval(() => {
          if (checkGoogleLoaded()) {
            setScriptLoaded(true);
            clearInterval(checkInterval);
          }
        }, 50);
      };

      script.onerror = () => {
        setApiError('Failed to load Google Maps API script. Please check your network connection and API key.');
      };

      document.head.appendChild(script);
    } else {
      // If script tags exists, wait for load or check global object
      const interval = setInterval(() => {
        if (checkGoogleLoaded()) {
          setScriptLoaded(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  // 2. Initialize the Map Canvas
  useEffect(() => {
    if (!scriptLoaded || !mapRef.current || map) return;

    try {
      const google = (window as any).google;
      const initialMap = new google.maps.Map(mapRef.current, {
        center: { lat: 20.25, lng: 84.50 }, // Odisha center
        zoom: 7,
        styles: document.documentElement.classList.contains('dark') ? darkMapStyle : [],
        mapTypeId: 'roadmap',
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#020617' : '#ffffff'
      });

      setMap(initialMap);
    } catch (err: any) {
      console.error('Failed to initialize Google Maps:', err);
      setApiError('Error initializing Google Maps. Detailed log in console.');
    }
  }, [scriptLoaded, map]);

  // 3. Render Heatmap Layer and Case Markers
  useEffect(() => {
    if (!map) return;

    const google = (window as any).google;

    // Clear previous Heatmap Layer if exists
    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.setMap(null);
      heatmapLayerRef.current = null;
    }

    // Clear previous Markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (cases.length === 0) return;

    // Create Heatmap Data Points
    const heatPoints = cases.map((c) => {
      // Weight can be proportional to severity: High = 3.5, Medium = 2, Low = 1
      const weight = c.severity === 'High' ? 3.5 : c.severity === 'Medium' ? 2 : 1;
      return {
        location: new google.maps.LatLng(c.latitude, c.longitude),
        weight: weight
      };
    });

    // Create Heatmap Layer
    const heatmap = new google.maps.visualization.HeatmapLayer({
      data: heatPoints,
      map: map,
      radius: heatmapRadius,
      opacity: heatmapOpacity,
      gradient: [
        'rgba(34, 197, 94, 0)',      // Transparent Green (Safe / No cases)
        'rgba(34, 197, 94, 0.3)',    // Soft Green
        'rgba(34, 197, 94, 0.6)',    // Green
        'rgba(101, 163, 13, 0.8)',   // Olive/Yellow-Green
        'rgba(234, 179, 8, 0.9)',    // Yellow
        'rgba(249, 115, 22, 0.95)',  // Orange
        'rgba(239, 68, 68, 1)',      // Red
        'rgba(185, 28, 28, 1)'       // Deep Red
      ]
    });
    heatmapLayerRef.current = heatmap;

    // Calculate case count for each district to determine marker colors
    const getDistrictCount = (districtName: string) => {
      return cases.filter(x => x.district.toLowerCase() === districtName.toLowerCase()).length;
    };

    // Create Markers
    if (showMarkers) {
      cases.forEach((c) => {
        const count = getDistrictCount(c.district);
        const markerColor = count >= 10 ? '#ef4444' : count >= 5 ? '#f97316' : '#eab308';
        const markerScale = count >= 10 ? 8 : count >= 5 ? 6 : 4.5;
        
        const marker = new google.maps.Marker({
          position: { lat: c.latitude, lng: c.longitude },
          map: map,
          title: `${c.disease?.name || 'Disease'} Case`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: markerColor,
            fillOpacity: 0.95,
            scale: markerScale,
            strokeColor: '#ffffff',
            strokeWeight: 1.5,
          }
        });

        // Setup custom styled HTML content inside the InfoWindow
        const infoWindowContent = `
          <div style="font-family: 'Outfit', 'Inter', sans-serif; color: #0f172a; padding: 10px; min-width: 220px; line-height: 1.4;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${markerColor}; letter-spacing: 0.05em;">
                ${c.severity} RISK CASE
              </span>
              <span style="font-size: 9px; color: #64748b; margin-left: auto;">ID: ${c.patient_id || c.id}</span>
            </div>
            <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #1e293b;">
              Disease: <span style="color: #0f172a;">${c.disease?.name}</span>
            </p>
            <p style="margin: 0 0 2px 0; font-size: 11px; color: #475569;">
              <strong>Location:</strong> GP ${c.village}, ${c.block} Block
            </p>
            <p style="margin: 0 0 2px 0; font-size: 11px; color: #475569;">
              <strong>District:</strong> ${c.district}
            </p>
            <p style="margin: 0 0 8px 0; font-size: 11px; color: #475569;">
              <strong>Reported:</strong> ${c.report_date}
            </p>
            <div style="display: flex; gap: 4px; align-items: center; margin-top: 4px;">
              <span style="font-size: 9px; padding: 2px 6px; border-radius: 4px; background-color: #f1f5f9; color: #475569; font-weight: 600;">
                Status: ${c.status || 'Active'}
              </span>
            </div>
          </div>
        `;

        const infoWindow = new google.maps.InfoWindow({
          content: infoWindowContent,
        });

        marker.addListener('click', () => {
          if (activeInfoWindowRef.current) {
            activeInfoWindowRef.current.close();
          }
          infoWindow.open(map, marker);
          activeInfoWindowRef.current = infoWindow;
        });

        markersRef.current.push(marker);
      });
    }

  }, [cases, map, heatmapRadius, heatmapOpacity, showMarkers]);

  // Handle errors or loading screens
  if (apiError) {
    return (
      <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-950/40 border border-red-800 flex items-center justify-center text-red-500 text-xl font-bold">
          ⚠️
        </div>
        <p className="text-sm font-semibold max-w-md">{apiError}</p>
      </div>
    );
  }

  if (!scriptLoaded) {
    return (
      <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-t-govsaffron border-slate-800 animate-spin"></div>
        <span className="text-xs text-slate-400 font-sans">Connecting Google GIS Servers...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative min-h-[450px]" style={{ minHeight: '450px' }}>
      {/* Map Container Canvas */}
      <div ref={mapRef} className="w-full h-full min-h-[450px]" style={{ width: '100%', height: '100%', minHeight: '450px' }} />

      {/* Control Widgets (Floating Glassmorphism controls overlay) */}
      <div className="absolute bottom-6 left-6 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 max-w-[280px] z-[999] transition-all duration-300">
        <div className="border-b border-slate-800 pb-2">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Heatmap Settings</h4>
        </div>
        
        {/* Radius control */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-400 font-semibold">Heat Glow Radius</span>
            <span className="text-govsaffron-light font-bold font-mono">{heatmapRadius}px</span>
          </div>
          <input
            type="range"
            min="10"
            max="60"
            value={heatmapRadius}
            onChange={(e) => setHeatmapRadius(Number(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-govsaffron"
          />
        </div>

        {/* Opacity control */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-400 font-semibold">Heat Intensity Opacity</span>
            <span className="text-govsaffron-light font-bold font-mono">{(heatmapOpacity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1.0"
            step="0.05"
            value={heatmapOpacity}
            onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-govsaffron"
          />
        </div>

        {/* Toggle markers checkbox */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-slate-400 font-semibold">Display Case Markers</span>
          <button
            onClick={() => setShowMarkers(!showMarkers)}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-250 ${
              showMarkers ? 'bg-govsaffron' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-250 ${
                showMarkers ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleHeatmap;
