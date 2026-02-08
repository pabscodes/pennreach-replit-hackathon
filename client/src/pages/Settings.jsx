import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import { Loader2, Save, Key, User, Mail, Clock, CheckCircle } from 'lucide-react';

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

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
];

export default function Settings() {
  const { user, updateUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [usePreferredName, setUsePreferredName] = useState(!!user?.preferredName);
  const [preferredName, setPreferredName] = useState(user?.preferredName || '');
  const [school, setSchool] = useState(user?.school || '');
  const [background, setBackground] = useState(user?.background || '');
  const [interests, setInterests] = useState(user?.interests || '');
  const [emailSignature, setEmailSignature] = useState(user?.emailSignature || '');

  const [hunterApiKey, setHunterApiKey] = useState('');

  const [workingHoursStart, setWorkingHoursStart] = useState(user?.workingHoursStart ?? 10);
  const [workingHoursEnd, setWorkingHoursEnd] = useState(user?.workingHoursEnd ?? 17);
  const [timezone, setTimezone] = useState(user?.timezone || 'America/New_York');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }
    if (!lastName.trim()) {
      setError('Last name is required');
      return;
    }
    setSavingProfile(true);
    setError('');
    try {
      const profileData = {
        firstName,
        lastName,
        preferredName: usePreferredName ? preferredName : '',
        school,
        background,
        interests,
        emailSignature,
      };
      await api.put('/api/user/profile', profileData);
      updateUser({ ...profileData, displayName: (usePreferredName && preferredName) ? preferredName : firstName });
      showSuccess('Profile saved successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveKeys = async () => {
    setSavingKeys(true);
    setError('');
    try {
      const settings = {};
      if (hunterApiKey) settings.hunterApiKey = hunterApiKey;
      await api.put('/api/user/settings', settings);
      showSuccess('API key saved successfully!');
      setHunterApiKey('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingKeys(false);
    }
  };

  const handleSaveCalendar = async () => {
    setSavingCalendar(true);
    setError('');
    try {
      await api.put('/api/user/profile', { workingHoursStart, workingHoursEnd, timezone });
      updateUser({ workingHoursStart, workingHoursEnd, timezone });
      showSuccess('Calendar settings saved!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCalendar(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />{success}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-primary" /> Profile
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                placeholder="Jane"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white text-sm"
            >
              <option value="">Select...</option>
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Interests</label>
            <textarea
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Signature</label>
            <textarea
              value={emailSignature}
              onChange={(e) => setEmailSignature(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none text-sm font-mono"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
            >
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" /> API Keys
        </h2>
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">
            AI-powered profile parsing and email drafting are built in — no API key needed!
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hunter.io API Key</label>
            <input
              type="password"
              value={hunterApiKey}
              onChange={(e) => setHunterApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
              placeholder={user?.hasHunterKey ? '••••••••••••••••' : 'Enter your Hunter.io API key'}
            />
            <p className="mt-1 text-xs text-slate-400">
              <a href="https://hunter.io/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Get a free Hunter.io key</a> — used for email lookups (free tier: 25/month)
            </p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveKeys}
              disabled={savingKeys || !hunterApiKey}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
            >
              {savingKeys ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save API Key
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" /> Gmail Integration
        </h2>
        <p className="text-sm text-slate-500 mb-4">Connect your Gmail to create drafts directly in your inbox.</p>
        <button
          disabled
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-lg font-medium text-sm cursor-not-allowed"
        >
          Connect Gmail (Coming Soon)
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" /> Calendar Settings
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Working Hours Start</label>
              <select
                value={workingHoursStart}
                onChange={(e) => setWorkingHoursStart(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Working Hours End</label>
              <select
                value={workingHoursEnd}
                onChange={(e) => setWorkingHoursEnd(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white text-sm"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveCalendar}
              disabled={savingCalendar}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
            >
              {savingCalendar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Calendar Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
