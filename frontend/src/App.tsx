import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider, useWebSocket } from './context/WebSocketContext';
import { LanguageProvider } from './context/LanguageContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { OdishaMap } from './components/OdishaMap';
import { CaseForm } from './pages/CaseForm';
import { DiseaseDB } from './pages/DiseaseDB';
import { AIForecast } from './pages/AIForecast';
import { ReportsHub } from './pages/ReportsHub';
import { DistrictDetail } from './pages/DistrictDetail';
import { AIChatbot } from './components/AIChatbot';

const MainAppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { liveCases } = useWebSocket();
  const [activeTab, setActiveTab] = useState('map');
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-t-govsaffron border-slate-800 animate-spin"></div>
        <span className="text-xs text-slate-400 font-sans">Connecting State Databases...</span>
      </div>
    );
  }



  const handleDistrictClick = (districtName: string) => {
    setSelectedDistrict(districtName);
  };

  const handleCaseSubmitted = () => {
    // Redirection or quick alert popup is managed by CaseForm
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="space-y-6">
        
        {/* Main tabs layout */}
        {activeTab === 'dashboard' && (
          <Dashboard onDistrictSelect={(d) => { setSelectedDistrict(d); setActiveTab('map'); }} />
        )}

        {activeTab === 'map' && (
          <div className="space-y-6">
            <div className="h-[550px] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden p-1 shadow-xl">
              <OdishaMap 
                onDistrictClick={handleDistrictClick} 
                selectedDistrict={selectedDistrict}
                liveCases={liveCases}
              />
            </div>
            
            {/* Show detailed district drawer/sheet when selected */}
            {selectedDistrict && (
              <div className="animate-pulse-slow">
                <DistrictDetail 
                  districtName={selectedDistrict} 
                  onClose={() => setSelectedDistrict(null)}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'report-case' && (
          <CaseForm onCaseSubmitted={handleCaseSubmitted} />
        )}

        {activeTab === 'diseases' && (
          <DiseaseDB />
        )}

        {activeTab === 'ai-outbreaks' && (
          <AIForecast />
        )}

        {activeTab === 'reports' && (
          <ReportsHub />
        )}

      </div>

      {/* Global Floating AI assistant chatbot */}
      <AIChatbot />
    </Layout>
  );
};

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <WebSocketProvider>
          <MainAppContent />
        </WebSocketProvider>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
