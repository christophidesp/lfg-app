import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    bio: ''
  });
  const [saving, setSaving] = useState(false);

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
      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        bio: data.bio || ''
      });
    }

    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        bio: formData.bio,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (!error) {
      fetchProfile();
      setEditing(false);
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-[13px] text-gray-600">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="font-sans text-[26px] font-normal tracking-[-0.01em] mb-8">Profile</h1>

        <div className="card">
          {!editing ? (
            <div>
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-mono text-[14px] font-medium">
                    {(profile?.full_name || 'R').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-sans text-[19px] font-medium">{profile?.full_name || 'Runner'}</h2>
                    <p className="font-mono text-[12px] text-gray-600">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditing(true)}
                  className="btn-secondary"
                >
                  Edit Profile
                </button>
              </div>

              <div className="p-5">
                {profile?.bio && (
                  <div className="mb-6">
                    <p className="mono-label mb-2">Bio</p>
                    <p className="text-[13px] font-light text-gray-600 leading-relaxed">{profile.bio}</p>
                  </div>
                )}

                <div>
                  <p className="mono-label mb-2">Account</p>
                  <p className="font-mono text-[13px] text-gray-600">
                    Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="p-6">
              <div className="space-y-5">
                <div>
                  <label htmlFor="full_name" className="form-label">Full Name</label>
                  <input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="input-field"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label htmlFor="bio" className="form-label">Bio</label>
                  <textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows="4"
                    className="input-field"
                    placeholder="Tell others about yourself and your running goals..."
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      full_name: profile?.full_name || '',
                      bio: profile?.bio || ''
                    });
                  }}
                  className="btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
