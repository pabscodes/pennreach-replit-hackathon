import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import { Loader2, Save, Key, User, Mail, Clock, CheckCircle, Calendar, ExternalLink, X, Trash2, Edit3, Shield } from 'lucide-react';
import SignatureEditor from '../components/SignatureEditor';
import DOMPurify from 'dompurify';

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
  const [editingHunterKey, setEditingHunterKey] = useState(!user?.hasHunterKey);
  const [deletingHunterKey, setDeletingHunterKey] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [workingHoursStart, setWorkingHoursStart] = useState(user?.workingHoursStart ?? 10);
  const [workingHoursEnd, setWorkingHoursEnd] = useState(user?.workingHoursEnd ?? 17);
  const [timezone, setTimezone] = useState(user?.timezone || 'America/New_York');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [gmailStatus, setGmailStatus] = useState({ configured: false, connected: false, email: null });
  const [calendarStatus, setCalendarStatus] = useState({ configured: false, connected: false });
  const [loadingGmail, setLoadingGmail] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const fetchGmailStatus = useCallback(async () => {
    try {
      const data = await api.get('/api/gmail/status');
      setGmailStatus(data);
    } catch (e) {
      // ignore
    }
  }, []);

  const fetchCalendarStatus = useCallback(async () => {
    try {
      const data = await api.get('/api/calendar/status');
      setCalendarStatus(data);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchGmailStatus(), fetchCalendarStatus()]).finally(() => setLoadingGmail(false));
  }, [fetchGmailStatus, fetchCalendarStatus]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        fetchGmailStatus();
        fetchCalendarStatus();
        showSuccess('Google account connected successfully!');
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        setError(event.data.error || 'Failed to connect Google account');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchGmailStatus, fetchCalendarStatus]);

  const handleConnectGoogle = async () => {
    try {
      const data = await api.get('/api/gmail/auth-url');
      if (!data.configured) {
        setError('Google OAuth is not configured. Please add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to your environment variables.');
        return;
      }
      window.open(data.url, 'google-auth', 'width=500,height=700,left=200,top=100');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDisconnectGoogle = async () => {
    setDisconnecting(true);
    try {
      await api.post('/api/gmail/disconnect');
      setGmailStatus({ configured: true, connected: false, email: null });
      setCalendarStatus({ configured: true, connected: false });
      showSuccess('Google account disconnected');
    } catch (err) {
      setError(err.message);
    } finally {
      setDisconnecting(false);
    }
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
    if (!hunterApiKey.trim()) {
      setError('Please enter an API key');
      return;
    }
    setSavingKeys(true);
    setError('');
    try {
      await api.put('/api/user/settings', { hunterApiKey });
      updateUser({ hasHunterKey: true, hunterKeyMasked: '••••••••' + hunterApiKey.slice(-4) });
      showSuccess('API key saved successfully!');
      setHunterApiKey('');
      setEditingHunterKey(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingKeys(false);
    }
  };

  const handleDeleteHunterKey = async () => {
    setDeletingHunterKey(true);
    setError('');
    try {
      await api.delete('/api/user/settings/hunter-key');
      updateUser({ hasHunterKey: false, hunterKeyMasked: null });
      showSuccess('API key deleted');
      setShowDeleteConfirm(false);
      setEditingHunterKey(true);
      setHunterApiKey('');
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingHunterKey(false);
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
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
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
            <label className="block text-sm font-medium text-slate-700 mb-2">Email Signature</label>
            <SignatureEditor value={emailSignature} onChange={setEmailSignature} />
            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-500 mb-1">Preview</label>
              <div
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(emailSignature) }}
              />
            </div>
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

          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">Hunter.io API Key</span>
                {user?.hasHunterKey && !editingHunterKey && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    <Shield className="w-3 h-3" /> Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                <a href="https://hunter.io/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Get a free key</a> — 25 lookups/month
              </p>
            </div>

            {user?.hasHunterKey && !editingHunterKey ? (
              <div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg mb-3">
                  <code className="text-sm text-slate-600 font-mono">{user.hunterKeyMasked}</code>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingHunterKey(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Update
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="password"
                  value={hunterApiKey}
                  onChange={(e) => setHunterApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm mb-3"
                  placeholder="Enter your Hunter.io API key"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveKeys}
                    disabled={savingKeys || !hunterApiKey.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
                  >
                    {savingKeys ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                  {user?.hasHunterKey && (
                    <button
                      onClick={() => { setEditingHunterKey(false); setHunterApiKey(''); }}
                      className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Delete API Key?</h3>
              <p className="text-sm text-slate-600">
                Are you sure? This will disable email lookup functionality until you add a new key.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteHunterKey}
                  disabled={deletingHunterKey}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 text-sm"
                >
                  {deletingHunterKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete Key
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" /> Gmail Integration
        </h2>
        <p className="text-sm text-slate-500 mb-4">Connect your Gmail to create drafts and send emails directly from PennReach.</p>

        {loadingGmail ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking connection...
          </div>
        ) : gmailStatus.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">
                Connected{gmailStatus.email ? ` as ${gmailStatus.email}` : ''}
              </span>
            </div>
            <button
              onClick={handleDisconnectGoogle}
              disabled={disconnecting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition-colors disabled:opacity-50 text-sm"
            >
              {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              Disconnect Gmail
            </button>
          </div>
        ) : gmailStatus.configured ? (
          <button
            onClick={handleConnectGoogle}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" /> Connect Gmail
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm">
              Google OAuth is not configured. To enable Gmail integration, add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to your environment variables.
            </div>
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-lg font-medium text-sm cursor-not-allowed"
            >
              Connect Gmail (Not Configured)
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> Google Calendar
        </h2>
        <p className="text-sm text-slate-500 mb-4">Connect Google Calendar to automatically find free meeting slots for outreach emails.</p>

        {loadingGmail ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking connection...
          </div>
        ) : calendarStatus.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">Google Calendar connected</span>
            </div>
            <p className="text-xs text-slate-500">Calendar is connected via the same Google account as Gmail. Disconnect Gmail above to disconnect Calendar.</p>
          </div>
        ) : calendarStatus.configured ? (
          <button
            onClick={handleConnectGoogle}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" /> Connect Google Calendar
          </button>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm">
            Google OAuth is not configured. Calendar integration shares the same Google OAuth setup as Gmail.
          </div>
        )}
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
