import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Phone, UserCheck, Key, Lock, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, error: authError } = useAuth();
  const [loginType, setLoginType] = useState<'email' | 'phone' | 'emp_id'>('email');
  const [authMethod, setAuthMethod] = useState<'password' | 'otp'>('password');
  
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const payload: any = {};
    if (loginType === 'email') payload.email = email;
    if (loginType === 'phone') payload.phone = phone;
    if (loginType === 'emp_id') payload.emp_id = empId;

    if (authMethod === 'password') {
      payload.password = password;
    } else {
      payload.otp = otp;
    }

    const success = await login(payload);
    setIsSubmitting(false);
    
    if (!success) {
      setErrorMsg(authError || "Invalid credentials. Please verify Employee details.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans px-4 relative overflow-hidden">
      {/* Decorative abstract blur circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-govnavy/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-govsaffron/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main glass panel box */}
      <div className="w-full max-w-lg bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
        
        {/* Header Seal */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-govsaffron to-govnavy flex items-center justify-center text-white text-3xl shadow-xl shadow-govsaffron/10 mb-4 border border-slate-700/50">
            🛡️
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight uppercase">Government of Odisha</h1>
          <p className="text-xs text-slate-400 mt-1">Health & Family Welfare Outbreak Tracker Portal</p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1.5 rounded-xl mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => { setLoginType('email'); setErrorMsg(null); }}
            className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              loginType === 'email' ? 'bg-govsaffron text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail size={14} />
            <span>Email</span>
          </button>
          <button
            type="button"
            onClick={() => { setLoginType('phone'); setErrorMsg(null); }}
            className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              loginType === 'phone' ? 'bg-govsaffron text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Phone size={14} />
            <span>Mobile</span>
          </button>
          <button
            type="button"
            onClick={() => { setLoginType('emp_id'); setErrorMsg(null); }}
            className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              loginType === 'emp_id' ? 'bg-govsaffron text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck size={14} />
            <span>Employee ID</span>
          </button>
        </div>

        {/* Standard Errors */}
        {(errorMsg || authError) && (
          <div className="mb-5 p-3 rounded-lg bg-rose-950/20 border border-rose-800/50 text-rose-450 text-xs text-center font-medium">
            {errorMsg || authError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Login Input */}
          {loginType === 'email' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Official Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 text-slate-500" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. officer@odisha.gov.in"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-govsaffron transition-all"
                  required
                />
              </div>
            </div>
          )}

          {/* Phone Login Input */}
          {loginType === 'phone' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Registered Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 text-slate-500" size={16} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543214"
                  pattern="[0-9]{10}"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-govsaffron transition-all"
                  required
                />
              </div>
            </div>
          )}

          {/* Employee ID Login Input */}
          {loginType === 'emp_id' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Government Employee ID</label>
              <div className="relative">
                <UserCheck className="absolute left-3.5 top-3 text-slate-500" size={16} />
                <input
                  type="text"
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  placeholder="e.g. EMP-ASHA-05"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-govsaffron transition-all"
                  required
                />
              </div>
            </div>
          )}

          {/* Authentication Method Selection */}
          <div className="flex gap-4 items-center py-1">
            <label className="text-xs text-slate-400 font-semibold">Auth Mode:</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-350 cursor-pointer">
                <input
                  type="radio"
                  name="authMethod"
                  checked={authMethod === 'password'}
                  onChange={() => setAuthMethod('password')}
                  className="accent-govsaffron"
                />
                Password
              </label>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-350 cursor-pointer">
                <input
                  type="radio"
                  name="authMethod"
                  checked={authMethod === 'otp'}
                  onChange={() => setAuthMethod('otp')}
                  className="accent-govsaffron"
                />
                OTP Code
              </label>
            </div>
          </div>

          {/* Password Input */}
          {authMethod === 'password' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 text-slate-500" size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-govsaffron transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ) : (
            /* OTP Input */
            <div className="space-y-1.5 animate-pulse-slow">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-400">Enter OTP Code</label>
                <span className="text-[10px] text-govsaffron">Simulated OTP: Use 123456</span>
              </div>
              <div className="relative">
                <Key className="absolute left-3.5 top-3 text-slate-500" size={16} />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="e.g. 123456"
                  maxLength={6}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white tracking-widest focus:outline-none focus:border-govsaffron transition-all"
                  required
                />
              </div>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 bg-govsaffron hover:bg-govsaffron-dark text-white rounded-xl text-sm font-bold shadow-lg shadow-govsaffron/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all"
          >
            {isSubmitting ? "Authenticating security credentials..." : "Login to Health Portal"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-5 border-t border-slate-850 text-center text-[10px] text-slate-550 space-y-1">
          <p>© 2026 Department of Health & Family Welfare, Odisha.</p>
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck size={12} className="text-emerald-500" />
            Authorized Personnel Only. Actions are audited in logs.
          </p>
        </div>
      </div>
    </div>
  );
};
