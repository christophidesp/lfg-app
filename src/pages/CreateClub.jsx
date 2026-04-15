import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import PlacesAutocomplete from '../components/PlacesAutocomplete';

export default function CreateClub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    workout_creation: 'admins',
  });
  const [location, setLocation] = useState({ address: '', lat: null, lng: null });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let avatar_url = null;

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('club-avatars')
          .upload(filePath, avatarFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('club-avatars')
          .getPublicUrl(filePath);

        avatar_url = urlData.publicUrl;
      }

      const { data: club, error: insertError } = await supabase
        .from('clubs')
        .insert([{
          name: formData.name,
          description: formData.description || null,
          avatar_url,
          created_by: user.id,
          workout_creation: formData.workout_creation,
          address: location.address || null,
          lat: location.lat,
          lng: location.lng,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Auto-insert creator as owner + approved
      const { error: memberError } = await supabase
        .from('club_members')
        .insert([{
          club_id: club.id,
          user_id: user.id,
          role: 'owner',
          status: 'approved',
        }]);

      if (memberError) throw memberError;

      navigate(`/clubs/${club.id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="font-sans text-[26px] font-normal tracking-[-0.01em] mb-2">Create a Club</h1>
        <p className="font-sans text-[13px] text-fg-secondary mb-8">
          Start a running club and invite others to join.
        </p>

        <form onSubmit={handleSubmit} className="border border-border bg-surface p-6">
          {error && (
            <div className="border border-[#EF4444] text-[#EF4444] font-mono text-[12px] px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="form-label">Club Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Athens Morning Runners"
              />
            </div>

            <div>
              <label htmlFor="description" className="form-label">Description</label>
              <textarea
                id="description"
                name="description"
                rows="4"
                value={formData.description}
                onChange={handleChange}
                className="input-field"
                placeholder="What's your club about?"
              />
            </div>

            <div>
              <label className="form-label">Location</label>
              {location.address ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-fg-secondary flex-1 truncate">{location.address}</span>
                  <button
                    type="button"
                    onClick={() => setLocation({ address: '', lat: null, lng: null })}
                    className="btn-secondary text-[11px] px-3 py-1 flex-shrink-0"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <PlacesAutocomplete
                  telemetryName="CreateClub"
                  value=""
                  onChange={({ address, lat, lng }) => setLocation({ address, lat, lng })}
                />
              )}
              <p className="font-mono text-[10px] text-fg-muted mt-1">Optional — helps runners find your club by distance.</p>
            </div>

            <div>
              <label className="form-label">Club Avatar</label>
              <div className="flex items-center gap-4">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-16 h-16 object-cover border border-border" />
                ) : (
                  <div className="w-16 h-16 bg-surface-secondary border border-border flex items-center justify-center">
                    <span className="font-mono text-[18px] text-fg-muted">?</span>
                  </div>
                )}
                <label className="btn-secondary text-[11px] px-4 py-1.5 cursor-pointer">
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="form-label">Who can create workouts?</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="workout_creation"
                    value="admins"
                    checked={formData.workout_creation === 'admins'}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 border border-border-strong peer-checked:border-accent peer-checked:bg-accent flex items-center justify-center">
                    {formData.workout_creation === 'admins' && (
                      <div className="w-1.5 h-1.5 bg-[#0A0A0A]" />
                    )}
                  </div>
                  <span className="font-mono text-[12px] text-fg-secondary">Admins only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="workout_creation"
                    value="everyone"
                    checked={formData.workout_creation === 'everyone'}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 border border-border-strong peer-checked:border-accent peer-checked:bg-accent flex items-center justify-center">
                    {formData.workout_creation === 'everyone' && (
                      <div className="w-1.5 h-1.5 bg-[#0A0A0A]" />
                    )}
                  </div>
                  <span className="font-mono text-[12px] text-fg-secondary">Everyone</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              type="submit"
              disabled={loading}
              className="btn-accent flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Club'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/clubs')}
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
