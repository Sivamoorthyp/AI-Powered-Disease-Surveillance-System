import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  LayoutDashboard, 
  Map, 
  FileSpreadsheet, 
  Database, 
  PlusCircle, 
  LogOut, 
  Moon, 
  Sun, 
  Radio,
  FileCheck
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const { isConnected, alerts } = useWebSocket();
  const { language, setLanguage, t } = useLanguage();
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Setup initial theme class
  React.useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const navItems = [
    { id: 'map', labelKey: 'gis_map', icon: Map, roles: ['*'] },
    { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard, roles: ['*'] },
    { id: 'diseases', labelKey: 'disease_register', icon: Database, roles: ['*'] },
    { id: 'report-case', labelKey: 'report_case', icon: PlusCircle, roles: ['ASHA Worker', 'Doctor', 'Hospital Administrator', 'Super Admin'] },
    { id: 'ai-outbreaks', labelKey: 'ai_forecast', icon: FileCheck, roles: ['State Health Officer', 'District Health Officer', 'Super Admin'] },
    { id: 'reports', labelKey: 'reports_hub', icon: FileSpreadsheet, roles: ['Super Admin', 'State Health Officer', 'District Health Officer', 'Hospital Administrator'] },
  ];

  const allowedNavItems = navItems.filter(item => 
    item.roles.includes('*') || (user && item.roles.includes(user.role))
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 font-sans">
      {/* Top Header Panel (Single Row Header matching request layout) */}
      <header className="h-16 px-6 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800/80 backdrop-blur-md flex items-center justify-between shrink-0">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-govsaffron flex items-center justify-center text-white text-base font-bold shadow-md shadow-govsaffron/30 shrink-0">
            OD
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xs leading-none text-slate-900 dark:text-white">{t('gov_title')}</span>
            <span className="text-[9px] text-slate-500 mt-0.5">{t('gov_sub')}</span>
          </div>
        </div>

        {/* Center: Menu Navigation (Horizontal tabs with active pill styling) */}
        <nav className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900/30 p-1 border border-slate-200 dark:border-slate-900/60 rounded-full shadow-sm dark:shadow-none">
          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-all duration-200 ${
                  isActive 
                    ? 'bg-govsaffron/10 dark:bg-govsaffron/15 text-govsaffron dark:text-govsaffron-light border border-govsaffron/25 dark:border-govsaffron/20 font-bold shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon size={13} />
                <span>{t(item.labelKey)}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Pill Styled Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Language Selector Dropdown (Pill Style) */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-[11px] font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
            <span>🌐</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent border-none text-slate-900 dark:text-white text-[11px] font-semibold focus:outline-none cursor-pointer"
            >
              <option value="en" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">English</option>
              <option value="or" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">ଓଡ଼ିଆ</option>
              <option value="ta" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">தமிழ்</option>
            </select>
          </div>

          {/* Connection Status & Health Alerts (Pill Style) */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-[11px] font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
            <span>🛡️</span>
            <span>{t('portal_title')}</span>
            {alerts.length > 0 && (
              <span className="px-1.5 py-0.2 text-[8px] bg-rose-600 text-white rounded font-bold animate-pulse">
                {alerts.length}
              </span>
            )}
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-md shadow-emerald-500/50 animate-pulse' : 'bg-rose-500 animate-pulse'}`} />
          </div>

          {/* Dark Mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-1.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center justify-center shadow-sm"

            title="Toggle Theme"
          >
            {isDarkMode ? <Sun size={13} /> : <Moon size={13} />}
          </button>


        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-900 p-6">
        {children}
      </main>
    </div>
  );
};
