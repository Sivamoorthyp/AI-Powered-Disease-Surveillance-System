import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  FileText, 
  MapPin, 
  User, 
  Activity, 
  Calendar, 
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  Lock,
  Loader2
} from 'lucide-react';

interface CaseFormProps {
  onCaseSubmitted: () => void;
}

export const CaseForm: React.FC<CaseFormProps> = ({ onCaseSubmitted }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // Lists of options
  const [diseases, setDiseases] = useState<any[]>([]);
  const districts = ["Khordha", "Cuttack", "Ganjam", "Puri", "Balasore", "Mayurbhanj", "Sambalpur", "Sundargarh"];
  
  // Form State
  const [patientId, setPatientId] = useState(`PAT-${Math.floor(100000 + Math.random() * 900000)}`);
  const [patientCount, setPatientCount] = useState(1);
  const [diseaseId, setDiseaseId] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [village, setVillage] = useState(user?.village || '');
  const [gramPanchayat, setGramPanchayat] = useState('');
  const [block, setBlock] = useState(user?.block || '');
  const [district, setDistrict] = useState(user?.district || 'Khordha');
  const [latitude, setLatitude] = useState('20.2960');
  const [longitude, setLongitude] = useState('85.8240');
  const [status, setStatus] = useState('Suspected');
  const [clinicalStatus, setClinicalStatus] = useState('Home-Quarantine');
  const [isVaccinated, setIsVaccinated] = useState(false);
  const [travelHistory, setTravelHistory] = useState('');
  const ashaName = user?.name || '';
  const [doctorName, setDoctorName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [labFile, setLabFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Security Verification Modal states
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [confirmEmpId, setConfirmEmpId] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Load Diseases
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

  // Autofill coordinates based on district to keep GIS heatmaps accurate
  useEffect(() => {
    const coords: Record<string, { lat: string; lng: string }> = {
      Khordha: { lat: '20.2960', lng: '85.8240' },
      Cuttack: { lat: '20.4620', lng: '85.8820' },
      Ganjam: { lat: '19.3140', lng: '84.7940' },
      Puri: { lat: '19.8100', lng: '85.8310' },
      Balasore: { lat: '21.4930', lng: '86.9330' },
      Mayurbhanj: { lat: '21.9320', lng: '86.7510' },
      Sambalpur: { lat: '21.4660', lng: '83.9810' },
      Sundargarh: { lat: '22.2600', lng: '84.8510' }
    };
    
    if (coords[district]) {
      setLatitude(coords[district].lat);
      setLongitude(coords[district].lng);
    }
  }, [district]);

  // Request browser geolocation coordinate hook
  const handleAutoGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toFixed(4));
          setLongitude(position.coords.longitude.toFixed(4));
          setSuccessMsg("GPS coordinates set successfully from local device!");
          setTimeout(() => setSuccessMsg(null), 3000);
        },
        () => {
          setErrorMsg("Failed to auto-locate. Standard district centroids applied.");
          setTimeout(() => setErrorMsg(null), 3500);
        }
      );
    } else {
      setErrorMsg("Geolocation API is not supported by your browser.");
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setConfirmEmpId('');
    setConfirmPassword('');
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

      // Successful verification -> proceed with actual submission
      setIsSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      // Loop patientCount times to submit cases
      for (let i = 0; i < patientCount; i++) {
        // Add a tiny coordinates jitter so cases spread out naturally on the heatmap
        const jitterLat = (Math.random() - 0.5) * 0.008;
        const jitterLng = (Math.random() - 0.5) * 0.008;
        
        // Randomize gender if "Mixed" is selected
        let finalGender = gender;
        if (gender === 'Mixed') {
          finalGender = Math.random() > 0.5 ? 'Male' : 'Female';
        }
        
        // Randomize age slightly if patient count is large
        let finalAge = parseInt(age);
        if (isNaN(finalAge)) {
          finalAge = 30; // default backup
        }
        if (patientCount > 1) {
          finalAge = Math.max(1, finalAge + Math.floor((Math.random() - 0.5) * 10));
        }

        const payload = {
          patient_id: `PAT-${Math.floor(100000 + Math.random() * 900000)}`,
          disease_id: parseInt(diseaseId) || 1,
          symptoms,
          severity,
          age: finalAge,
          gender: finalGender,
          village,
          gram_panchayat: gramPanchayat || "GP-01",
          block,
          district,
          latitude: parseFloat(latitude) + (patientCount > 1 ? jitterLat : 0),
          longitude: parseFloat(longitude) + (patientCount > 1 ? jitterLng : 0),
          status,
          clinical_status: clinicalStatus,
          is_vaccinated: isVaccinated,
          travel_history: travelHistory,
          asha_name: ashaName,
          doctor_name: doctorName || (user?.role === 'Doctor' ? user.name : ''),
          hospital_name: hospitalName
        };

        const caseRes = await fetch('http://localhost:8000/api/v1/cases/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!caseRes.ok) {
          throw new Error("Failed to submit one of the case reports in the batch");
        }
      }

      setSuccessMsg(`Successfully registered ${patientCount} case reports in ${district}! Heatmaps updated dynamically.`);
      onCaseSubmitted();
      
      // Reset form variables
      setPatientId(`PAT-${Math.floor(100000 + Math.random() * 900000)}`);
      setSymptoms('');
      setAge('');
      setTravelHistory('');
      setGramPanchayat('');
      setDoctorName('');
      setHospitalName('');
      setPatientCount(1);
      setConfirmEmpId('');
      setConfirmPassword('');
      setShowSecurityModal(false);
    } catch (err: any) {
      setSecurityError(err.message || "Failed to authenticate security credentials.");
    } finally {
      setIsVerifying(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-slate-950 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-2xl font-sans">
      
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-5 mb-6">
        <div className="w-10 h-10 rounded-xl bg-govsaffron/20 text-govsaffron-light flex items-center justify-center">
          <FileText size={20} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white uppercase">{t('diagnose_case_title')}</h1>
          <p className="text-xs text-slate-400">{t('diagnose_case_sub')}</p>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/50 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/20 border border-rose-800/50 text-rose-450 text-xs flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Submission Form */}
      <form onSubmit={handleFormSubmit} className="space-y-6">
        
        {/* Row 1: Patient Details */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-450 flex items-center gap-1">
              <User size={12} /> {t('patient_id')}
            </label>
            <input
              type="text"
              value={patientCount === 1 ? patientId : 'PAT-BATCH-MULTI'}
              disabled
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-450 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">{t('daily_count')}</label>
            <input
              type="number"
              value={patientCount}
              onChange={(e) => setPatientCount(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={100}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-govsaffron transition"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">
              {patientCount === 1 ? t('age') : t('representative_age')}
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 28"
              min={0}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-govsaffron transition"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">{t('gender_distribution')}</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-govsaffron transition"
            >
              <option value="Male">{t('male_only')}</option>
              <option value="Female">{t('female_only')}</option>
              <option value="Other">{t('other')}</option>
              <option value="Mixed">{t('mixed_genders')}</option>
            </select>
          </div>
        </div>

        {/* Row 2: Disease Profile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Activity size={12} /> {t('diagnosed_disease')}
            </label>
            <select
              value={diseaseId}
              onChange={(e) => setDiseaseId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-govsaffron transition"
              required
            >
              <option value="">Select pathogen...</option>
              {diseases.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">{t('severity_assessment')}</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-govsaffron transition"
            >
              <option value="Low">{t('low_risk')}</option>
              <option value="Medium">{t('medium_alert')}</option>
              <option value="High">{t('high_outbreak')}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Calendar size={12} /> {t('immunization_status')}
            </label>
            <div className="h-10 flex items-center">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-350 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isVaccinated}
                  onChange={(e) => setIsVaccinated(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border border-slate-800 text-govsaffron focus:ring-0 accent-govsaffron"
                />
                {t('patient_vaccinated')}
              </label>
            </div>
          </div>
        </div>

        {/* Row 3: Geospatial Locations */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
          <div className="md:col-span-4 flex items-center justify-between pb-2 border-b border-slate-850">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={14} className="text-govsaffron" />
              {t('gis_coordinates')}
            </span>
            <button
              type="button"
              onClick={handleAutoGPS}
              className="text-[10px] bg-govsaffron/10 border border-govsaffron/30 hover:bg-govsaffron/20 text-govsaffron-light px-2.5 py-1 rounded-lg transition"
            >
              {t('auto_gps')}
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-450 uppercase">{t('district')}</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
            >
              {districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-450 uppercase">{t('block')}</label>
            <input
              type="text"
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              placeholder="e.g. Bhubaneswar"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-govsaffron transition"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-450 uppercase">{t('gram_panchayat')}</label>
            <input
              type="text"
              value={gramPanchayat}
              onChange={(e) => setGramPanchayat(e.target.value)}
              placeholder="e.g. Jatani GP"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-govsaffron transition"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-450 uppercase">{t('village_ward')}</label>
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="e.g. Jatani Town"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-govsaffron transition"
              required
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-450 uppercase">Latitude</label>
            <input
              type="text"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
              required
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-450 uppercase">Longitude</label>
            <input
              type="text"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Row 4: Status and Quarantine */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">{t('diagnosis_status')}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-govsaffron transition"
            >
              <option value="Suspected">{t('suspected')}</option>
              <option value="Confirmed">{t('confirmed')}</option>
              <option value="Recovered">{t('recovered')}</option>
              <option value="Death">{t('death')}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">{t('clinical_isolation')}</label>
            <select
              value={clinicalStatus}
              onChange={(e) => setClinicalStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-govsaffron transition"
            >
              <option value="Home-Quarantine">{t('home_quarantine')}</option>
              <option value="Isolation">{t('isolation')}</option>
              <option value="Hospitalized">{t('hospitalized')}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-450">{t('hospital_name')}</label>
            <input
              type="text"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              placeholder="e.g. Capital Hospital"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-govsaffron transition"
            />
          </div>
        </div>

        {/* Symptoms & Travel History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">{t('symptom_notes')}</label>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Describe clinical symptoms (e.g. joint pain, high fever)..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-govsaffron transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">{t('travel_history')}</label>
            <textarea
              value={travelHistory}
              onChange={(e) => setTravelHistory(e.target.value)}
              placeholder="Recent travel history outside block or district..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-govsaffron transition"
            />
          </div>
        </div>

        {/* File Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Patient Photo */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">Patient Diagnostic Image (Optional)</label>
            <div className="border border-dashed border-slate-800 bg-slate-900/40 rounded-2xl p-4 flex flex-col items-center justify-center hover:bg-slate-900/60 transition cursor-pointer relative">
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files ? e.target.files[0] : null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <UploadCloud className="text-slate-500 mb-2" size={24} />
              <span className="text-[10px] text-slate-400 text-center font-medium">
                {photoFile ? photoFile.name : "Drag & Drop or Click to upload patient photo"}
              </span>
            </div>
          </div>

          {/* Lab Report */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">Lab Diagnostic Report PDF (Optional)</label>
            <div className="border border-dashed border-slate-800 bg-slate-900/40 rounded-2xl p-4 flex flex-col items-center justify-center hover:bg-slate-900/60 transition cursor-pointer relative">
              <input 
                type="file" 
                accept=".pdf,.doc,.docx"
                onChange={(e) => setLabFile(e.target.files ? e.target.files[0] : null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <UploadCloud className="text-slate-500 mb-2" size={24} />
              <span className="text-[10px] text-slate-400 text-center font-medium">
                {labFile ? labFile.name : "Drag & Drop or Click to upload lab sheets"}
              </span>
            </div>
          </div>

        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-govsaffron hover:bg-govsaffron-dark text-white rounded-xl text-xs font-bold shadow-lg shadow-govsaffron/20 transition-all"
          >
            {isSubmitting ? "Submitting..." : t('submit_report')}
          </button>
        </div>

      </form>

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
                  Confirm credentials to submit this case report.
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
export default CaseForm;
