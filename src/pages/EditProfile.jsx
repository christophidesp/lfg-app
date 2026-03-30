import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Avatar from '../components/Avatar';

export default function EditProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    pace_min: '',
    pace_sec: '',
    avatar_url: '',
  });

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
      setFormData({
        full_name: data.full_name || '',
        bio: data.bio || '',
        pace_min: data.pace_min ?? '',
        pace_sec: data.pace_sec ?? '',
        avatar_url: data.avatar_url || '',
      });
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

    const updates = {
      full_name: formData.full_name,
      bio: formData.bio,
      pace_min: formData.pace_min !== '' ? parseInt(formData.pace_min) : null,
      pace_sec: formData.pace_sec !== '' ? parseInt(formData.pace_sec) : null,
      avatar_url: formData.avatar_url || null,
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
      </div>
    </div>
  );
}
