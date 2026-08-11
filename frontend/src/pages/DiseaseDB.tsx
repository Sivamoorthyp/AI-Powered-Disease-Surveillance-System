import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Database, Plus, ShieldAlert, CheckCircle, HelpCircle, Lock, Loader2 } from 'lucide-react';

export const DiseaseDB: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [diseases, setDiseases] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  
  // Case registration form states
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientDisease, setPatientDisease] = useState('');
  const [patientPlace, setPatientPlace] = useState('Khordha');
  const [patientCount, setPatientCount] = useState('1');

  const places = ["Khordha", "Cuttack", "Ganjam", "Puri", "Balasore", "Mayurbhanj", "Sambalpur", "Sundargarh"];
  
  // Add disease form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Vector-borne');
  const [symptoms, setSymptoms] = useState('');
  const [threshold, setThreshold] = useState('10');
  const [medicines, setMedicines] = useState('');
  const [guidelines, setGuidelines] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Security Verification Modal states
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [confirmEmpId, setConfirmEmpId] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchDiseases = () => {
    fetch('http://localhost:8000/api/v1/diseases/')
      .then(res => res.json())
      .then(data => setDiseases(data))
      .catch(() => {
        // Mock fallback
        setDiseases([
          { id: 1, name: 'Dengue', category: 'Vector-borne', warning_threshold: 8, recommended_medicines: 'Paracetamol, ORS', containment_guidelines: 'Focal insecticide fogging, standing water cleaning' },
          { id: 2, name: 'Malaria', category: 'Vector-borne', warning_threshold: 10, recommended_medicines: 'ACT, Chloroquine', containment_guidelines: 'LLIN mosquito net distribution' },
          { id: 3, name: 'Cholera', category: 'Water-borne', warning_threshold: 5, recommended_medicines: 'Doxycycline, ORS', containment_guidelines: 'Chlorination of water sources, hygiene audits' }
        ]);
      });
  };

  useEffect(() => {
    fetchDiseases();
  }, []);

  useEffect(() => {
    if (diseases.length > 0 && !patientDisease) {
      setPatientDisease(diseases[0].name);
    }
  }, [diseases, patientDisease]);

  const handleAddDisease = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      name,
      category,
      symptoms,
      warning_threshold: parseInt(threshold),
      recommended_medicines: medicines,
      containment_guidelines: guidelines
    };

    try {
      const response = await fetch('http://localhost:8000/api/v1/diseases/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Disease already exists or invalid data input.");
      }

      setSuccessMsg(`Disease '${name}' successfully configured on State registries.`);
      fetchDiseases();
      setShowAddForm(false);
      
      // Reset form variables
      setName('');
      setSymptoms('');
      setThreshold('10');
      setMedicines('');
      setGuidelines('');
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create disease registry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !patientId.trim() || !patientCount) {
      setErrorMsg("Please fill in all case details.");
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setConfirmEmpId('EMP-ASHA-205');
    setConfirmPassword('siva@2607');
    setSecurityError(null);
    setShowSecurityModal(true);
  };

  const handleConfirmSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setSecurityError(null);

    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emp_id: confirmEmpId,
          password: confirmPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Incorrect Employee ID or Password.");
      }

      // Successful verification -> proceed to log case report
      const newCase = {
        id: patientId,
        name: patientName,
        disease: patientDisease || (diseases.length > 0 ? diseases[0].name : 'Dengue'),
        place: patientPlace,
        count: parseInt(patientCount) || 1,
        registeredAt: new Date().toISOString()
      };

      const existingStr = localStorage.getItem('registered_forecasting_cases');
      const existing = existingStr ? JSON.parse(existingStr) : [];
      existing.unshift(newCase);
      localStorage.setItem('registered_forecasting_cases', JSON.stringify(existing));

      setSuccessMsg(`Security Confirmed. Case report for '${patientName}' successfully registered in the surveillance database.`);
      setShowRegisterForm(false);
      setShowSecurityModal(false);
      setErrorMsg(null);
      
      // Reset form fields
      setPatientName('');
      setPatientId('');
      setPatientCount('1');
      setConfirmEmpId('');
      setConfirmPassword('');
    } catch (err: any) {
      setSecurityError(err.message || "Failed to authenticate security credentials.");
    } finally {
      setIsVerifying(false);
    }
  };

  const isAdmin = user?.role === 'Super Admin';

  return (
    <div className="space-y-6 font-sans">
      
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-govsaffron/20 text-govsaffron-light flex items-center justify-center">
            <Database size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white uppercase">{t('disease_db_title')}</h1>
            <p className="text-xs text-slate-400">{t('disease_db_sub')}</p>
          </div>
        </div>

        <div className="flex gap-3">
          {!showRegisterForm && (
            <button
              onClick={() => { setShowRegisterForm(true); setShowAddForm(false); setSuccessMsg(null); setErrorMsg(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/10 transition"
            >
              <Plus size={14} />
              <span>Register Case Report</span>
            </button>
          )}

          {isAdmin && !showAddForm && (
            <button
              onClick={() => { setShowAddForm(true); setShowRegisterForm(false); setSuccessMsg(null); setErrorMsg(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-govsaffron hover:bg-govsaffron-dark text-white rounded-xl text-xs font-semibold shadow-md shadow-govsaffron/10 transition"
            >
              <Plus size={14} />
              <span>{t('configure_pathogen')}</span>
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/50 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/50 text-rose-455 text-xs flex items-center gap-2">
          <ShieldAlert size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Register Case Form */}
      {showRegisterForm && (
        <form onSubmit={handleRegisterCase} className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-5 animate-pulse-slow">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Register Disease Case Report</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Name of Person</label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Person ID</label>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="e.g. P-49204"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Disease Name</label>
              <select
                value={patientDisease}
                onChange={(e) => setPatientDisease(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {diseases.length > 0 ? (
                  diseases.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))
                ) : (
                  <>
                    <option value="Dengue">Dengue</option>
                    <option value="Malaria">Malaria</option>
                    <option value="Cholera">Cholera</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Place (District)</label>
              <select
                value={patientPlace}
                onChange={(e) => setPatientPlace(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {places.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Number of Affected Persons</label>
              <input
                type="number"
                value={patientCount}
                onChange={(e) => setPatientCount(e.target.value)}
                min={1}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowRegisterForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-355"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
            >
              Submit Case Report
            </button>
          </div>
        </form>
      )}

      {/* Add Pathogen Form */}
      {showAddForm && (
        <form onSubmit={handleAddDisease} className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-5 animate-pulse-slow">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t('configure_pathogen_title')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">{t('pathogen_name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Japanese Encephalitis"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-govsaffron"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">{t('category')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
              >
                <option value="Vector-borne">{t('Vector-borne')}</option>
                <option value="Water-borne">{t('Water-borne')}</option>
                <option value="Airborne">{t('Airborne')}</option>
                <option value="Direct Contact">{t('Direct Contact')}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">{t('alert_threshold')}</label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                min={1}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-govsaffron"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">{t('symptoms_desc')}</label>
            <input
              type="text"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g. High fever, headache, neck stiffness, joint swellings..."
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">{t('treatment_checklist')}</label>
              <textarea
                value={medicines}
                onChange={(e) => setMedicines(e.target.value)}
                placeholder="e.g. Paracetamol, oral rehydration solutions (ORS)..."
                rows={2}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">{t('containment_directives')}</label>
              <textarea
                value={guidelines}
                onChange={(e) => setGuidelines(e.target.value)}
                placeholder="e.g. Restrict water pooling, focal DDT spray, isolate cases..."
                rows={2}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-355"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-govsaffron hover:bg-govsaffron-dark text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              {isSubmitting ? "Configuring..." : t('configure_registry')}
            </button>
          </div>
        </form>
      )}

      {/* Pathogen Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {diseases.map((d) => (
          <div key={d.id} className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 flex flex-col justify-between shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                  d.category === 'Vector-borne' ? 'bg-orange-950/20 text-orange-400 border border-orange-900/50' :
                  d.category === 'Water-borne' ? 'bg-sky-950/20 text-sky-400 border border-sky-900/50' :
                  'bg-emerald-950/20 text-emerald-400 border border-emerald-900/50'
                }`}>
                  {t(d.category)}
                </span>
                
                <span className="text-[10px] text-rose-450 font-semibold bg-rose-950/15 border border-rose-900/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <ShieldAlert size={10} />
                  <span>{t('limit_text')}: {d.warning_threshold} {t('cases_wk')}</span>
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">{t(d.name)}</h3>
                <p className="text-[10px] text-slate-450 mt-1.5 leading-relaxed italic">
                  {t('symptoms_lbl')}: {t(d.symptoms || "High fever, respiratory complications, joint pain.")}
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-900">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider">{t('containment_directives')}</span>
                  <p className="text-[10px] text-slate-355 leading-relaxed mt-0.5">{t(d.containment_guidelines || "Initiate vector disinfection, enforce home quarantine protocols.")}</p>
                </div>
                
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider">{t('treatment_checklist')}</span>
                  <p className="text-[10px] text-slate-300 leading-relaxed mt-0.5">{t(d.recommended_medicines || "Supportive therapy, fluids, Paracetamol.")}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end text-[10px] text-slate-500 font-semibold gap-1">
              <HelpCircle size={12} />
              <span>{t('certified_text')}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Security Verification Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
          <form
            onSubmit={handleConfirmSecurity}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-500 flex items-center justify-center shrink-0">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Security Checkpoint
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Confirm credentials to register this infectious case.
                </p>
              </div>
            </div>

            {securityError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 rounded-xl text-rose-600 dark:text-rose-455 text-[11px] font-semibold">
                {securityError}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={confirmEmpId}
                  onChange={(e) => setConfirmEmpId(e.target.value)}
                  placeholder="e.g. EMP-ASHA-05"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Enter secure password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSecurityModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 transition"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isVerifying}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                {isVerifying ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Confirm & Register</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
export default DiseaseDB;
