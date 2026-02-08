import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  Upload, FileText, Loader2, Search, Sparkles, Copy, RefreshCw,
  Save, CheckCircle, AlertCircle, X, Image, Mail, Send, Calendar
} from 'lucide-react';

const GOALS = [
  { value: 'job', label: 'Job Interest' },
  { value: 'coffee_chat', label: 'Coffee Chat' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'industry_info', label: 'Industry Info' },
];

function getFileIcon(file) {
  if (file.type === 'application/pdf') return FileText;
  if (file.type.startsWith('image/')) return Image;
  return FileText;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function NewContact() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profileText, setProfileText] = useState('');
  const [files, setFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
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

  const [gmailStatus, setGmailStatus] = useState({ configured: false, connected: false });
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [gmailDraftId, setGmailDraftId] = useState(null);

  const [calendarSlots, setCalendarSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    api.get('/api/gmail/status').then(setGmailStatus).catch(() => {});
  }, []);

  const loadCalendarSlots = async () => {
    setLoadingSlots(true);
    try {
      const data = await api.get('/api/calendar/free-slots?days=7');
      if (data.slots) {
        setCalendarSlots(data.slots);
      }
    } catch (err) {
      // silently fail
    } finally {
      setLoadingSlots(false);
    }
  };

  const addFiles = useCallback((newFiles) => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const validFiles = Array.from(newFiles).filter(f => validTypes.includes(f.type));
    if (validFiles.length < newFiles.length) {
      setError('Some files were skipped — only PDF and image files are accepted');
      setTimeout(() => setError(''), 3000);
    }
    setFiles(prev => [...prev, ...validFiles]);
  }, []);

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleFileSelect = (e) => {
    if (e.target.files?.length > 0) {
      addFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleParse = async () => {
    if (!profileText.trim() && files.length === 0) {
      setError('Please paste profile text or upload a file');
      return;
    }

    setError('');
    setParsing(true);
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }
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
      setGmailDraftId(null);
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

  const handleCreateGmailDraft = async () => {
    if (!draft) return;
    setCreatingDraft(true);
    setError('');
    try {
      const data = await api.post('/api/gmail/create-draft', {
        to: contact?.workEmail || '',
        subject: draft.subject,
        body: draft.body,
      });
      setGmailDraftId(data.draftId);
      setSuccess('Gmail draft created! Check your Drafts folder.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingDraft(false);
    }
  };

  const handleSendViaGmail = async () => {
    if (!draft) return;
    if (!contact?.workEmail) {
      setError('Recipient email is required to send. Find the email first.');
      return;
    }
    setSendingEmail(true);
    setError('');
    try {
      if (gmailDraftId) {
        await api.post('/api/gmail/send', { draftId: gmailDraftId });
      } else {
        await api.post('/api/gmail/send', {
          to: contact.workEmail,
          subject: draft.subject,
          body: draft.body,
        });
      }
      setSuccess('Email sent via Gmail!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingEmail(false);
    }
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

  const insertSlot = (slotLabel) => {
    setAvailability(prev => prev ? prev + ', ' + slotLabel : slotLabel);
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Or Upload Files (PDF/Image)</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                  : 'border-slate-300 hover:border-primary hover:bg-primary/5'
              }`}
            >
              <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragOver ? 'text-primary' : 'text-slate-400'}`} />
              <p className={`text-sm font-medium ${isDragOver ? 'text-primary' : 'text-slate-600'}`}>
                {isDragOver ? 'Drop files here' : 'Drag & drop files here, or click to browse'}
              </p>
              <p className="text-xs text-slate-400 mt-1">PDF, PNG, JPEG, WebP — multiple files supported</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">{files.length} file{files.length > 1 ? 's' : ''} selected</p>
              {files.map((file, index) => {
                const IconComp = getFileIcon(file);
                return (
                  <div key={index} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <IconComp className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-sm text-slate-700 truncate">{file.name}</span>
                      <span className="text-xs text-slate-400 shrink-0">{formatFileSize(file.size)}</span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-slate-400 hover:text-red-500 transition-colors shrink-0 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={handleParse}
            disabled={parsing || (!profileText.trim() && files.length === 0)}
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
                  <Mail className="w-3.5 h-3.5 inline mr-1" />
                  {contact.workEmail}
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Availability</label>
                  {gmailStatus.connected && (
                    <button
                      onClick={loadCalendarSlots}
                      disabled={loadingSlots}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-medium"
                    >
                      {loadingSlots ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calendar className="w-3 h-3" />}
                      Load from Calendar
                    </button>
                  )}
                </div>
                <textarea
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none text-sm"
                  placeholder="e.g., Tue 2-4 PM, Thu 10-12 PM EST"
                />
                {calendarSlots.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-500 mb-1">Click a slot to add it:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {calendarSlots.slice(0, 12).map((slot, i) => (
                        <button
                          key={i}
                          onClick={() => insertSlot(slot.label)}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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

                  {gmailStatus.connected && (
                    <>
                      <button
                        onClick={handleCreateGmailDraft}
                        disabled={creatingDraft}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 text-sm"
                      >
                        {creatingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                        Create Gmail Draft
                      </button>
                      <button
                        onClick={handleSendViaGmail}
                        disabled={sendingEmail || !contact?.workEmail}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100 transition-colors disabled:opacity-50 text-sm"
                        title={!contact?.workEmail ? 'Find recipient email first' : ''}
                      >
                        {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send via Gmail
                      </button>
                    </>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                </div>
                {gmailDraftId && (
                  <p className="text-xs text-green-600">Gmail draft created (ID: {gmailDraftId})</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
