import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  Upload, FileText, Loader2, Search, Sparkles, Copy, RefreshCw,
  Save, CheckCircle, AlertCircle, X
} from 'lucide-react';

const GOALS = [
  { value: 'job', label: 'Job Interest' },
  { value: 'coffee_chat', label: 'Coffee Chat' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'industry_info', label: 'Industry Info' },
];

export default function NewContact() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profileText, setProfileText] = useState('');
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [contact, setContact] = useState(null);

  const [findingEmail, setFindingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState(null);

  const [outreachGoal, setOutreachGoal] = useState('coffee_chat');
  const [goalDetail, setGoalDetail] = useState('');
  const [availability, setAvailability] = useState('');

  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState(null);

  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleParse = async () => {
    if (!profileText.trim() && !file) {
      setError('Please paste profile text or upload a file');
      return;
    }

    setError('');
    setParsing(true);
    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      if (profileText.trim()) formData.append('text', profileText);

      const data = await api.upload('/api/contacts/parse', formData);
      setContact(data.contact);
      setSuccess('Profile parsed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleFindEmail = async () => {
    if (!contact) return;
    setFindingEmail(true);
    setError('');
    try {
      const data = await api.post(`/api/contacts/${contact.id}/find-email`);
      setEmailResult(data);
      if (data.email) {
        setContact((prev) => ({ ...prev, workEmail: data.email }));
        setSuccess(`Email found: ${data.email} (${data.confidence}% confidence)`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setFindingEmail(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!contact) return;
    setGenerating(true);
    setError('');
    try {
      const data = await api.post(`/api/contacts/${contact.id}/draft`, {
        outreachGoal,
        goalDetail,
        availability,
      });
      setDraft(data.draft);
      setSuccess('Draft generated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!draft) return;
    const text = `Subject: ${draft.subject}\n\n${draft.body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (contact) {
        await api.put(`/api/contacts/${contact.id}`, {
          firstName: contact.firstName,
          lastName: contact.lastName,
          company: contact.company,
          role: contact.role,
          linkedinUrl: contact.linkedinUrl,
          profileSummary: contact.profileSummary,
          hooks: contact.hooks,
        });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateContactField = (field, value) => {
    setContact((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const hooksArray = contact?.hooks
    ? (typeof contact.hooks === 'string'
        ? (() => { try { return JSON.parse(contact.hooks); } catch { return contact.hooks.split(',').map(h => h.trim()); } })()
        : contact.hooks)
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">New Contact</h1>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>
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
          <Upload className="w-5 h-5 text-primary" />
          Upload Profile
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Paste Profile Text</label>
            <textarea
              value={profileText}
              onChange={(e) => setProfileText(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none text-sm"
              placeholder="Paste LinkedIn profile text, company bio, or any professional profile..."
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Or Upload File (PDF/Image)</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
                    <FileText className="w-4 h-4" />
                    {file.name}
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-slate-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">
                    <Upload className="w-5 h-5 mx-auto mb-1" />
                    Click to browse
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </div>
          </div>

          <button
            onClick={handleParse}
            disabled={parsing || (!profileText.trim() && !file)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Parse Profile
          </button>
        </div>
      </div>

      {contact && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Contact Card</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={contact.firstName || ''}
                  onChange={(e) => updateContactField('firstName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={contact.lastName || ''}
                  onChange={(e) => updateContactField('lastName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                <input
                  type="text"
                  value={contact.company || ''}
                  onChange={(e) => updateContactField('company', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <input
                  type="text"
                  value={contact.role || ''}
                  onChange={(e) => updateContactField('role', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn URL</label>
                <input
                  type="text"
                  value={contact.linkedinUrl || ''}
                  onChange={(e) => updateContactField('linkedinUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Profile Summary</label>
                <textarea
                  value={contact.profileSummary || ''}
                  onChange={(e) => updateContactField('profileSummary', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Conversation Hooks</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {hooksArray.map((hook, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                      {hook}
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={Array.isArray(hooksArray) ? hooksArray.join(', ') : ''}
                  onChange={(e) => updateContactField('hooks', e.target.value.split(',').map(h => h.trim()).filter(Boolean))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                  placeholder="Comma-separated hooks"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleFindEmail}
                disabled={findingEmail}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 text-sm"
              >
                {findingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Find Email
              </button>
              {contact.workEmail && (
                <span className="text-sm text-slate-600">
                  📧 {contact.workEmail}
                  {emailResult?.confidence && (
                    <span className="ml-1 text-xs text-slate-400">({emailResult.confidence}% confidence)</span>
                  )}
                </span>
              )}
              {emailResult && !emailResult.email && (
                <span className="text-sm text-orange-600">Email not found. Try adding it manually.</span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Outreach Goal
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Goal</label>
                <select
                  value={outreachGoal}
                  onChange={(e) => setOutreachGoal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white text-sm"
                >
                  {GOALS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Specific Context</label>
                <textarea
                  value={goalDetail}
                  onChange={(e) => setGoalDetail(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none text-sm"
                  placeholder="e.g., Interested in their fintech coverage and path from Lazard to GS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Availability</label>
                <textarea
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none text-sm"
                  placeholder="e.g., Tue 2-4 PM, Thu 10-12 PM EST"
                />
              </div>
              <button
                onClick={handleGenerateDraft}
                disabled={generating}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate Draft
              </button>
            </div>
          </div>

          {draft && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Email Draft</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={draft.subject}
                    onChange={(e) => setDraft((prev) => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Body</label>
                  <textarea
                    value={draft.body}
                    onChange={(e) => setDraft((prev) => ({ ...prev, body: e.target.value }))}
                    rows={12}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none text-sm font-mono"
                  />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleGenerateDraft}
                    disabled={generating}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors disabled:opacity-50 text-sm"
                  >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Regenerate
                  </button>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors text-sm"
                  >
                    {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
