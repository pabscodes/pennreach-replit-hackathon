import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { ArrowLeft, Loader2, Sparkles, Mail, Building2, Briefcase, Link2, User } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'email_found', label: 'Email Found' },
  { value: 'draft_created', label: 'Draft Created' },
  { value: 'sent', label: 'Sent' },
  { value: 'followed_up', label: 'Followed Up' },
  { value: 'responded', label: 'Responded' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled' },
];

const STATUS_COLORS = {
  new: 'bg-slate-100 text-slate-700',
  email_found: 'bg-blue-100 text-blue-700',
  draft_created: 'bg-yellow-100 text-yellow-700',
  sent: 'bg-purple-100 text-purple-700',
  followed_up: 'bg-orange-100 text-orange-700',
  responded: 'bg-green-100 text-green-700',
  meeting_scheduled: 'bg-emerald-100 text-emerald-700',
};

export default function ContactDetail() {
  const { id } = useParams();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchContact();
  }, [id]);

  const fetchContact = async () => {
    try {
      const data = await api.get(`/api/contacts/${id}`);
      setContact(data.contact || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await api.put(`/api/contacts/${id}/status`, { status: newStatus });
      setContact((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleGenerateDraft = async () => {
    setGenerating(true);
    setError('');
    try {
      const data = await api.post(`/api/contacts/${id}/draft`, {
        outreachGoal: contact.outreachGoal || 'coffee_chat',
        goalDetail: contact.goalDetail || '',
      });
      setContact((prev) => {
        if (!prev) return prev;
        const drafts = [...(prev.drafts || []), data.draft];
        return { ...prev, drafts };
      });
      setSuccess('New draft generated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const hooks = contact?.hooks
    ? (typeof contact.hooks === 'string'
        ? (() => { try { return JSON.parse(contact.hooks); } catch { return [contact.hooks]; } })()
        : contact.hooks)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Contact not found.</p>
        <Link to="/dashboard" className="text-primary hover:underline mt-2 inline-block">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-2xl font-bold text-slate-900">
            {contact.firstName} {contact.lastName}
          </h1>
          <div className="flex items-center gap-2">
            <select
              value={contact.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border-0 cursor-pointer ${STATUS_COLORS[contact.status] || STATUS_COLORS.new}`}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>{contact.company || 'No company'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Briefcase className="w-4 h-4 text-slate-400" />
            <span>{contact.role || 'No role'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Mail className="w-4 h-4 text-slate-400" />
            <span>{contact.workEmail || 'No email'}</span>
          </div>
          {contact.linkedinUrl && (
            <div className="flex items-center gap-2 text-slate-600">
              <Link2 className="w-4 h-4 text-slate-400" />
              <a href={contact.linkedinUrl.startsWith('http') ? contact.linkedinUrl : `https://${contact.linkedinUrl}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                LinkedIn Profile
              </a>
            </div>
          )}
        </div>

        {contact.profileSummary && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-4 h-4" /> Profile Summary
            </h3>
            <p className="text-sm text-slate-600">{contact.profileSummary}</p>
          </div>
        )}

        {hooks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Conversation Hooks</h3>
            <div className="flex flex-wrap gap-2">
              {hooks.map((hook, i) => (
                <span key={i} className="inline-flex items-center px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  {hook}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Email Drafts</h2>
          <button
            onClick={handleGenerateDraft}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate New Draft
          </button>
        </div>

        {(!contact.drafts || contact.drafts.length === 0) ? (
          <p className="text-sm text-slate-500 py-4 text-center">No drafts yet. Click "Generate New Draft" to create one.</p>
        ) : (
          <div className="space-y-4">
            {[...contact.drafts].reverse().map((draft) => (
              <div key={draft.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400 uppercase">Version {draft.version}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(draft.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <div className="mb-2">
                  <span className="text-sm font-medium text-slate-700">Subject: </span>
                  <span className="text-sm text-slate-900">{draft.subject}</span>
                </div>
                <div className="text-sm text-slate-600 whitespace-pre-wrap font-mono bg-slate-50 rounded-lg p-3">
                  {draft.body}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
