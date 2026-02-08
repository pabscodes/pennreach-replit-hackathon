import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import { Zap, Loader2, ChevronRight, ChevronLeft, Check, ExternalLink } from 'lucide-react';

const SCHOOLS = [
  'Wharton MBA 2027',
  'Wharton MBA 2026',
  'Penn Engineering MS 2027',
  'Penn Engineering MS 2026',
  'Penn Law JD 2027',
  'Penn Law JD 2026',
  'Penn Medicine MD 2027',
  'Penn Design MArch 2027',
  'Penn GSE MEd 2027',
  'Penn Arts & Sciences PhD',
  'Penn Undergrad 2027',
  'Penn Undergrad 2026',
  'Other',
];

const STEPS = ['Your Background', 'Email Signature', 'Hunter.io Key', 'All Set!'];

export default function Onboarding() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [usePreferredName, setUsePreferredName] = useState(!!user?.preferredName);
  const [preferredName, setPreferredName] = useState(user?.preferredName || '');
  const [school, setSchool] = useState(user?.school || '');
  const [background, setBackground] = useState(user?.background || '');
  const [interests, setInterests] = useState(user?.interests || '');

  const displayName = preferredName && usePreferredName ? preferredName : firstName;
  const sigDisplayName = (usePreferredName && preferredName) ? `${preferredName} ${lastName}`.trim() : `${firstName} ${lastName}`.trim();

  const [emailSignature, setEmailSignature] = useState(
    user?.emailSignature || `Best,\n${sigDisplayName || ''}\n${user?.school || ''}\nUniversity of Pennsylvania`
  );
  const [hunterApiKey, setHunterApiKey] = useState('');

  const handleStep1 = async () => {
    if (!firstName.trim()) {
      setError('Please enter your first name');
      return;
    }
    if (!lastName.trim()) {
      setError('Please enter your last name');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const profileData = {
        firstName,
        lastName,
        preferredName: usePreferredName ? preferredName : '',
        school,
        background,
        interests,
      };
      await api.put('/api/user/profile', profileData);
      updateUser({ ...profileData, displayName: (usePreferredName && preferredName) ? preferredName : firstName });
      const sigName = (usePreferredName && preferredName) ? preferredName : firstName;
      setEmailSignature(`Best,\n${sigName} ${lastName}\n${school}\nUniversity of Pennsylvania`);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    setError('');
    setLoading(true);
    try {
      await api.put('/api/user/profile', { emailSignature });
      updateUser({ emailSignature });
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async (skip = false) => {
    setError('');
    setLoading(true);
    try {
      if (!skip && hunterApiKey) {
        await api.put('/api/user/settings', { hunterApiKey });
      }
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setError('');
    setLoading(true);
    try {
      await api.put('/api/user/onboarding', { onboardingComplete: true });
      updateUser({ onboardingComplete: true });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-2xl font-bold text-primary mb-4">
            <Zap className="w-7 h-7" />
            PennReach
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i + 1 < step
                    ? 'bg-primary text-white'
                    : i + 1 === step
                    ? 'bg-primary text-white ring-4 ring-primary/20'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {i + 1 < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`hidden sm:inline text-sm ${i + 1 === step ? 'text-primary font-medium' : 'text-slate-400'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-slate-300" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-slate-900">Tell us about yourself</h2>
              <p className="text-sm text-slate-500">This helps the AI personalize your outreach emails.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePreferredName}
                    onChange={(e) => {
                      setUsePreferredName(e.target.checked);
                      if (!e.target.checked) setPreferredName('');
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/50"
                  />
                  <span className="text-sm text-slate-700">I go by a preferred name</span>
                </label>
                {usePreferredName && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={preferredName}
                      onChange={(e) => setPreferredName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      placeholder="What should people call you?"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">School & Program</label>
                <select
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
                >
                  <option value="">Select your program...</option>
                  {SCHOOLS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Background</label>
                <textarea
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                  placeholder="e.g., 4 years at Deloitte managing enterprise tech for gov clients"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Interests</label>
                <textarea
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                  placeholder="e.g., Fintech, payments, enterprise SaaS"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleStep1}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next <ChevronRight className="w-4 h-4" /></>}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-slate-900">Email Signature</h2>
              <p className="text-sm text-slate-500">This will be appended to your outreach emails.</p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Signature</label>
                <textarea
                  value={emailSignature}
                  onChange={(e) => setEmailSignature(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none font-mono text-sm"
                />
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleStep2}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next <ChevronRight className="w-4 h-4" /></>}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-slate-900">Email Lookup Setup</h2>
              <p className="text-sm text-slate-500">
                Optional — you can add this later in Settings. AI features are powered by Replit and work automatically.
              </p>

              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">
                AI-powered profile parsing and email drafting are built in — no API key needed!
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Hunter.io API Key
                  <a href="https://hunter.io/api-keys" target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline inline-flex items-center gap-1">
                    Get a free key <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <input
                  type="password"
                  value={hunterApiKey}
                  onChange={(e) => setHunterApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  placeholder="Enter your Hunter.io API key"
                />
                <p className="mt-1 text-xs text-slate-400">Used to find professional email addresses (free tier: 25 searches/month)</p>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleStep3(true)}
                    disabled={loading}
                    className="px-4 py-2.5 text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => handleStep3(false)}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save & Continue <ChevronRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">You're all set{displayName ? `, ${displayName}` : ''}!</h2>
                <p className="text-slate-500 mt-2">Start reaching out to alumni and build meaningful connections.</p>
              </div>
              <button
                onClick={handleFinish}
                disabled={loading}
                className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Go to Dashboard <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
