import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import { Zap, Loader2, ChevronRight, ChevronLeft, Check, ExternalLink, Upload, FileText, X, Briefcase, GraduationCap, Sparkles, RefreshCw, Target } from 'lucide-react';
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

const OUTREACH_PURPOSES = [
  { id: 'internship_job', label: 'Internship / Job Search', icon: '💼' },
  { id: 'coffee_chat', label: 'Coffee Chats / Informational Interviews', icon: '☕' },
  { id: 'mentorship', label: 'Mentorship', icon: '🧭' },
  { id: 'industry_research', label: 'Industry Research / Learning', icon: '🔬' },
  { id: 'startup_collab', label: 'Startup / Project Collaboration', icon: '🚀' },
  { id: 'alumni_network', label: 'Alumni Networking', icon: '🤝' },
];

const STEPS = ['Your Background', 'Outreach Goals', 'Email Signature', 'Hunter.io Key', 'All Set!'];

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

  const [workExperience, setWorkExperience] = useState(user?.workExperience || []);
  const [education, setEducation] = useState(user?.education || []);
  const [skills, setSkills] = useState(user?.skillsInterests || []);
  const [skillInput, setSkillInput] = useState('');
  const [generatedBio, setGeneratedBio] = useState(user?.generatedBio || user?.background || '');

  const [selectedPurposes, setSelectedPurposes] = useState(user?.outreachPurposes || []);
  const [outreachContext, setOutreachContext] = useState(user?.outreachContext || '');

  const [resumeFile, setResumeFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const fileInputRef = useRef(null);

  const displayName = preferredName && usePreferredName ? preferredName : firstName;
  const sigDisplayName = (usePreferredName && preferredName) ? `${preferredName} ${lastName}`.trim() : `${firstName} ${lastName}`.trim();

  const defaultSig = `<p>Best,<br>${sigDisplayName || ''}<br>${user?.school || ''}<br>University of Pennsylvania</p>`;
  const [emailSignature, setEmailSignature] = useState(
    user?.emailSignature || defaultSig
  );
  const [hunterApiKey, setHunterApiKey] = useState('');

  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0] || e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
      handleParseResume(file);
    } else if (file) {
      setError('Please upload a PDF file');
    }
  };

  const handleParseResume = async (file) => {
    setParsing(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const { parsed } = await api.upload('/api/user/parse-resume', formData);

      if (parsed.firstName && !firstName) setFirstName(parsed.firstName);
      if (parsed.lastName && !lastName) setLastName(parsed.lastName);
      if (parsed.workExperience?.length) setWorkExperience(parsed.workExperience);
      if (parsed.education?.length) setEducation(parsed.education);
      if (parsed.skills?.length) setSkills(parsed.skills);
      if (parsed.interests?.length) {
        setSkills(prev => {
          const combined = [...new Set([...prev, ...parsed.interests])];
          return combined;
        });
      }
    } catch (err) {
      setError('Failed to parse resume. You can fill in the fields manually.');
    } finally {
      setParsing(false);
    }
  };

  const handleGenerateBio = async () => {
    setGeneratingBio(true);
    setError('');
    try {
      const result = await api.post('/api/user/generate-bio', {
        firstName,
        lastName,
        workExperience,
        education,
        skills,
        interests: skills,
      });
      if (result.bio) {
        setGeneratedBio(result.bio);
      }
    } catch (err) {
      setError('Failed to generate bio. You can write one manually.');
    } finally {
      setGeneratingBio(false);
    }
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  const removeSkill = (index) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const updateWorkExp = (index, field, value) => {
    const updated = [...workExperience];
    updated[index] = { ...updated[index], [field]: value };
    setWorkExperience(updated);
  };

  const removeWorkExp = (index) => {
    setWorkExperience(workExperience.filter((_, i) => i !== index));
  };

  const addWorkExp = () => {
    setWorkExperience([...workExperience, { company: '', role: '', years: '', description: '' }]);
  };

  const updateEdu = (index, field, value) => {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: value };
    setEducation(updated);
  };

  const removeEdu = (index) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  const addEdu = () => {
    setEducation([...education, { institution: '', degree: '', year: '' }]);
  };

  const togglePurpose = (purposeId) => {
    setSelectedPurposes(prev =>
      prev.includes(purposeId) ? prev.filter(p => p !== purposeId) : [...prev, purposeId]
    );
  };

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
      const background = generatedBio;
      const interests = skills.join(', ');
      const profileData = {
        firstName,
        lastName,
        preferredName: usePreferredName ? preferredName : '',
        school,
        background,
        interests,
        generatedBio,
        workExperience,
        education,
        skillsInterests: skills,
      };
      await api.put('/api/user/profile', profileData);
      updateUser({ ...profileData, displayName: (usePreferredName && preferredName) ? preferredName : firstName });
      const sigName = (usePreferredName && preferredName) ? preferredName : firstName;
      setEmailSignature(`<p>Best,<br>${sigName} ${lastName}<br>${school}<br>University of Pennsylvania</p>`);
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
      await api.put('/api/user/profile', { outreachPurposes: selectedPurposes, outreachContext });
      updateUser({ outreachPurposes: selectedPurposes, outreachContext });
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async () => {
    setError('');
    setLoading(true);
    try {
      await api.put('/api/user/profile', { emailSignature });
      updateUser({ emailSignature });
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStep4 = async (skip = false) => {
    setError('');
    setLoading(true);
    try {
      if (!skip && hunterApiKey) {
        await api.put('/api/user/settings', { hunterApiKey });
      }
      setStep(5);
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
              <p className="text-sm text-slate-500">Upload your resume to auto-fill, or enter details manually.</p>

              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                  parsing ? 'border-primary bg-primary/5' : resumeFile ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-primary hover:bg-slate-50'
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => !parsing && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setResumeFile(file);
                      handleParseResume(file);
                    }
                  }}
                />
                {parsing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-primary font-medium">Parsing your resume...</p>
                  </div>
                ) : resumeFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-8 h-8 text-green-600" />
                    <p className="text-sm text-green-700 font-medium">{resumeFile.name}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setResumeFile(null);
                      }}
                      className="text-xs text-slate-500 hover:text-red-500 transition-colors"
                    >
                      Remove & upload different file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-slate-400" />
                    <p className="text-sm text-slate-600 font-medium">Drop your resume PDF here, or click to browse</p>
                    <p className="text-xs text-slate-400">PDF up to 10MB</p>
                  </div>
                )}
              </div>

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
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Work Experience
                </label>
                {workExperience.length === 0 && (
                  <p className="text-xs text-slate-400 mb-2">Upload a resume to auto-fill, or add entries manually.</p>
                )}
                <div className="space-y-3">
                  {workExperience.map((exp, i) => (
                    <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2 relative">
                      <button
                        onClick={() => removeWorkExp(i)}
                        className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => updateWorkExp(i, 'company', e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                          placeholder="Company"
                        />
                        <input
                          type="text"
                          value={exp.role}
                          onChange={(e) => updateWorkExp(i, 'role', e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                          placeholder="Role"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={exp.years}
                          onChange={(e) => updateWorkExp(i, 'years', e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                          placeholder="Years (e.g., 2019-2023)"
                        />
                        <input
                          type="text"
                          value={exp.description}
                          onChange={(e) => updateWorkExp(i, 'description', e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                          placeholder="Brief description"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addWorkExp}
                  className="mt-2 text-sm text-primary hover:text-primary-dark font-medium"
                >
                  + Add work experience
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" /> Education
                </label>
                <div className="space-y-3">
                  {education.map((edu, i) => (
                    <div key={i} className="border border-slate-200 rounded-lg p-3 relative">
                      <button
                        onClick={() => removeEdu(i)}
                        className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={edu.institution}
                          onChange={(e) => updateEdu(i, 'institution', e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                          placeholder="Institution"
                        />
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => updateEdu(i, 'degree', e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                          placeholder="Degree"
                        />
                        <input
                          type="text"
                          value={edu.year}
                          onChange={(e) => updateEdu(i, 'year', e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                          placeholder="Year"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addEdu}
                  className="mt-2 text-sm text-primary hover:text-primary-dark font-medium"
                >
                  + Add education
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Skills & Interests</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {skills.map((skill, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-sm rounded-full"
                    >
                      {skill}
                      <button onClick={() => removeSkill(i)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                    placeholder="Type a skill or interest and press Enter"
                  />
                  <button
                    onClick={addSkill}
                    className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Your Bio
                  </label>
                  <button
                    onClick={handleGenerateBio}
                    disabled={generatingBio || (!firstName && !workExperience.length)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    {generatingBio ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    {generatingBio ? 'Generating...' : 'Auto-generate bio'}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-2">This bio will be used to personalize your outreach emails. You can edit it freely.</p>
                <textarea
                  value={generatedBio}
                  onChange={(e) => setGeneratedBio(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none text-sm"
                  placeholder="Your professional bio will appear here after uploading a resume or clicking auto-generate..."
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
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5" /> What kind of outreach are you doing?
              </h2>
              <p className="text-sm text-slate-500">Select all that apply. This helps AI tailor your emails to the right tone and purpose.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {OUTREACH_PURPOSES.map((purpose) => (
                  <button
                    key={purpose.id}
                    onClick={() => togglePurpose(purpose.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                      selectedPurposes.includes(purpose.id)
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xl">{purpose.icon}</span>
                    <span className={`text-sm font-medium ${selectedPurposes.includes(purpose.id) ? 'text-primary' : 'text-slate-700'}`}>
                      {purpose.label}
                    </span>
                    {selectedPurposes.includes(purpose.id) && (
                      <Check className="w-4 h-4 text-primary ml-auto" />
                    )}
                  </button>
                ))}
              </div>

              {selectedPurposes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tell us more about what you're looking for (optional)
                  </label>
                  <textarea
                    value={outreachContext}
                    onChange={(e) => setOutreachContext(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none text-sm"
                    placeholder="e.g., Looking for summer internships in fintech, specifically in payments or lending..."
                  />
                </div>
              )}

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
              <h2 className="text-xl font-semibold text-slate-900">Email Signature</h2>
              <p className="text-sm text-slate-500">This will be appended to your outreach emails. Use the toolbar to format text.</p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Signature</label>
                <SignatureEditor value={emailSignature} onChange={setEmailSignature} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preview</label>
                <div
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(emailSignature) }}
                />
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleStep3}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next <ChevronRight className="w-4 h-4" /></>}
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
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
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleStep4(true)}
                    disabled={loading}
                    className="px-4 py-2.5 text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => handleStep4(false)}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save & Continue <ChevronRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
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
