import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Avatar from '../components/Avatar';
import { GENDER_IDENTITIES, PRONOUN_PRESETS } from '../constants/identity';

export default function EditProfile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    pace_min: '',
    pace_sec: '',
    avatar_url: '',
    gender_identity: '',
    pronouns: '',
    display_gender_on_profile: true,
    display_pronouns_on_profile: true,
  });
  const [customPronouns, setCustomPronouns] = useState('');
  const [pronounMode, setPronounMode] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      const pronounsValue = data.pronouns || '';
      const isPreset = PRONOUN_PRESETS.some(p => p.value === pronounsValue && p.value !== 'custom');
      setFormData({
        full_name: data.full_name || '',
        bio: data.bio || '',
        pace_min: data.pace_min ?? '',
        pace_sec: data.pace_sec ?? '',
        avatar_url: data.avatar_url || '',
        gender_identity: data.gender_identity || '',
        pronouns: pronounsValue,
        display_gender_on_profile: data.display_gender_on_profile ?? true,
        display_pronouns_on_profile: data.display_pronouns_on_profile ?? true,
      });
      if (pronounsValue && !isPreset) {
        setPronounMode('custom');
        setCustomPronouns(pronounsValue);
      } else {
        setPronounMode(pronounsValue);
      }
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setError('Failed to upload avatar: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Append timestamp to bust cache
    const url = `${publicUrl}?t=${Date.now()}`;
    setFormData(prev => ({ ...prev, avatar_url: url }));
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const resolvedPronouns = pronounMode === 'custom' ? customPronouns.trim() : pronounMode;
    const updates = {
      full_name: formData.full_name,
      bio: formData.bio,
      pace_min: formData.pace_min !== '' ? parseInt(formData.pace_min) : null,
      pace_sec: formData.pace_sec !== '' ? parseInt(formData.pace_sec) : null,
      avatar_url: formData.avatar_url || null,
      gender_identity: formData.gender_identity || null,
      pronouns: resolvedPronouns || null,
      display_gender_on_profile: formData.display_gender_on_profile,
      display_pronouns_on_profile: formData.display_pronouns_on_profile,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    navigate(`/profile/${user.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-[13px] text-fg-secondary">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="font-sans text-[26px] font-normal tracking-[-0.01em] mb-2">Edit Profile</h1>
        <p className="font-sans text-[13px] text-fg-secondary mb-8">
          Update your profile information.
        </p>

        <form onSubmit={handleSubmit} className="border border-border bg-surface p-6">
          {error && (
            <div className="border border-[#EF4444] text-[#EF4444] font-mono text-[12px] px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Avatar */}
            <div>
              <p className="form-label">Avatar</p>
              <div className="flex items-center gap-4">
                <Avatar
                  name={formData.full_name}
                  avatarUrl={formData.avatar_url}
                  size="lg"
                  linked={false}
                />
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="btn-ghost text-[11px] px-3 py-1.5"
                  >
                    {uploading ? 'Uploading...' : 'Change Photo'}
                  </button>
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="form-label">Full Name</label>
              <input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="input-field"
                placeholder="Your full name"
              />
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="form-label">Bio</label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                rows="4"
                className="input-field"
                placeholder="Tell others about yourself and your running goals..."
              />
            </div>

            {/* Pace */}
            <div>
              <p className="form-label">Pace (per km)</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={formData.pace_min}
                  onChange={(e) => setFormData(prev => ({ ...prev, pace_min: e.target.value }))}
                  className="input-field w-20"
                  placeholder="min"
                />
                <span className="font-mono text-fg-secondary">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={formData.pace_sec}
                  onChange={(e) => setFormData(prev => ({ ...prev, pace_sec: e.target.value }))}
                  className="input-field w-20"
                  placeholder="sec"
                />
                <span className="font-mono text-[12px] text-fg-muted">/km</span>
              </div>
            </div>
          </div>

          {/* Identity section */}
          <div className="border-t border-border mt-8 pt-6">
            <p className="font-sans text-[17px] font-medium mb-1">Identity <span className="text-[13px] font-light text-fg-muted">(optional)</span></p>
            <p className="text-[12px] font-light text-fg-muted leading-relaxed mb-6">
              LFG uses this to build features that make group runs welcoming for everyone — like showing who's joined a workout, or creating spaces for women and non-binary runners. All fields are optional and you can change them anytime.
            </p>

            <div className="space-y-6">
              {/* Gender identity */}
              <div>
                <label htmlFor="gender_identity" className="form-label">Gender identity</label>
                <select
                  id="gender_identity"
                  value={formData.gender_identity}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender_identity: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Not set</option>
                  {GENDER_IDENTITIES.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>

              {/* Pronouns */}
              <div>
                <label htmlFor="pronouns" className="form-label">Pronouns</label>
                <select
                  id="pronouns"
                  value={pronounMode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPronounMode(val);
                    if (val !== 'custom') {
                      setFormData(prev => ({ ...prev, pronouns: val }));
                      setCustomPronouns('');
                    }
                  }}
                  className="input-field"
                >
                  <option value="">Not set</option>
                  {PRONOUN_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                {pronounMode === 'custom' && (
                  <input
                    type="text"
                    value={customPronouns}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, 30);
                      setCustomPronouns(val);
                      setFormData(prev => ({ ...prev, pronouns: val }));
                    }}
                    maxLength={30}
                    className="input-field mt-2"
                    placeholder="e.g. ze/zir"
                  />
                )}
              </div>

              {/* Display toggles */}
              {formData.gender_identity && formData.gender_identity !== 'prefer_not_to_say' && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.display_gender_on_profile}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_gender_on_profile: e.target.checked }))}
                    className="w-4 h-4 accent-accent"
                  />
                  <span className="text-[13px] text-fg-secondary font-light">Display gender on profile</span>
                </label>
              )}

              {(pronounMode && pronounMode !== '') && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.display_pronouns_on_profile}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_pronouns_on_profile: e.target.checked }))}
                    className="w-4 h-4 accent-accent"
                  />
                  <span className="text-[13px] text-fg-secondary font-light">Display pronouns on profile</span>
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              type="submit"
              disabled={saving}
              className="btn-accent flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/profile/${user.id}`)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Delete account */}
        <div className="border border-border mt-10 p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-secondary mb-3">
            Danger zone
          </p>
          <p className="text-[14px] font-medium mb-1">Delete your account</p>
          <p className="text-[13px] text-fg-secondary font-light leading-relaxed mb-4">
            This will permanently delete your account, profile, workouts, and all associated data. This action cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="font-mono text-[12px] uppercase tracking-[0.06em] text-[#EF4444] border border-[#EF4444] px-5 py-2.5 hover:bg-[#EF4444] hover:text-surface transition-colors"
            >
              Delete account
            </button>
          ) : (
            <div className="border border-[#EF4444] p-4">
              <p className="text-[13px] text-fg mb-3">
                Type <span className="font-mono font-medium">delete my account</span> to confirm.
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="delete my account"
                className="input-field mb-3"
              />
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    setDeleting(true);
                    setError('');
                    const { error: rpcError } = await supabase.rpc('delete_own_account');
                    if (rpcError) {
                      setError('Failed to delete account: ' + rpcError.message);
                      setDeleting(false);
                      return;
                    }
                    await signOut();
                    navigate('/');
                  }}
                  disabled={deleteConfirmText !== 'delete my account' || deleting}
                  className="font-mono text-[12px] uppercase tracking-[0.06em] bg-[#EF4444] text-white border border-[#EF4444] px-5 py-2.5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Permanently delete'}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  className="btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
