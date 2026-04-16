import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import { WORKOUT_TYPES } from '../constants/workoutTypes';

export default function EditWorkout() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [acceptedParticipants, setAcceptedParticipants] = useState([]);
  const [userMemberships, setUserMemberships] = useState([]);
  const [creatorJoins, setCreatorJoins] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    workout_type: 'Easy Run',
    workout_date: '',
    workout_time: '',
    location: '',
    lat: null,
    lng: null,
    distance: '',
    pace: '',
    description: '',
    max_participants: '',
    visibility: 'public',
    club_id: '',
    host_type: 'user',
    image_url: '',
  });

  useEffect(() => {
    fetchWorkout();
    fetchUserClubs();
  }, [id]);

  const fetchUserClubs = async () => {
    const { data } = await supabase
      .from('club_members')
      .select(`club_id, role, clubs (id, name, workout_creation)`)
      .eq('user_id', user.id)
      .eq('status', 'approved');
    if (data) setUserMemberships(data);
  };

  const fetchWorkout = async () => {
    setLoading(true);

    const { data: workout, error: fetchError } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !workout) {
      setError('Workout not found.');
      setLoading(false);
      return;
    }

    if (workout.creator_id !== user.id) {
      navigate(`/workout/${id}`);
      return;
    }

    const date = new Date(workout.workout_date);

    const data = {
      name: workout.name || '',
      workout_type: workout.workout_type || 'Easy Run',
      workout_date: format(date, 'yyyy-MM-dd'),
      workout_time: format(date, 'HH:mm'),
      location: workout.location || '',
      lat: workout.lat,
      lng: workout.lng,
      distance: workout.distance ?? '',
      pace: workout.pace || '',
      description: workout.description || '',
      max_participants: workout.max_participants ?? '',
      visibility: workout.visibility || 'public',
      club_id: workout.club_id || '',
      host_type: workout.host_type || 'user',
      image_url: workout.image_url || '',
    };

    setFormData(data);
    setOriginalData(data);
    if (workout.image_url) setImagePreview(workout.image_url);

    // Fetch accepted participants for notification
    const { data: participants } = await supabase
      .from('workout_participants')
      .select('user_id')
      .eq('workout_id', id)
      .eq('status', 'accepted');

    setAcceptedParticipants(participants || []);
    // Check if creator is already a participant (for club-hosted workouts)
    const creatorIsParticipant = (participants || []).some(p => p.user_id === user.id);
    setCreatorJoins(creatorIsParticipant);
    setLoading(false);
  };

  const handleLocationChange = useCallback(({ address, lat, lng }) => {
    setFormData((prev) => ({ ...prev, location: address, lat, lng }));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'club_id') next.host_type = 'user';
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      let image_url = formData.image_url;

      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('workout-images')
          .upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('workout-images')
          .getPublicUrl(filePath);
        image_url = urlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('workouts')
        .update({
          name: formData.name || null,
          workout_type: formData.workout_type,
          workout_date: new Date(`${formData.workout_date}T${formData.workout_time}`).toISOString(),
          location: formData.location,
          lat: formData.lat,
          lng: formData.lng,
          address: formData.location,
          distance: formData.distance ? parseFloat(formData.distance) : null,
          pace: formData.pace || null,
          description: formData.description,
          max_participants: formData.max_participants
            ? parseInt(formData.max_participants)
            : null,
          visibility: formData.visibility,
          club_id: formData.club_id || null,
          host_type: formData.club_id ? formData.host_type : 'user',
          image_url,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Notify accepted participants about the update
      if (acceptedParticipants.length > 0) {
        const notifications = acceptedParticipants
          .filter((p) => p.user_id !== user.id)
          .map((p) => ({
            user_id: p.user_id,
            type: 'workout_updated',
            workout_id: id,
            from_user_id: user.id,
          }));

        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }
      }

      // Handle creator participation for club-hosted workouts
      const isClubHosted = (formData.club_id ? formData.host_type : 'user') === 'club' && formData.club_id;
      const wasParticipant = acceptedParticipants.some(p => p.user_id === user.id);

      if (isClubHosted && creatorJoins && !wasParticipant) {
        await supabase.from('workout_participants').insert([{
          workout_id: id,
          user_id: user.id,
          status: 'accepted',
        }]);
      } else if ((!isClubHosted || !creatorJoins) && wasParticipant) {
        await supabase.from('workout_participants')
          .delete()
          .eq('workout_id', id)
          .eq('user_id', user.id);
      }

      navigate(`/workout/${id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-[13px] text-fg-secondary">Loading workout...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="font-sans text-[26px] font-normal tracking-[-0.01em] mb-2">
          Edit Workout
        </h1>
        <p className="font-sans text-[13px] text-fg-secondary mb-8">
          Update your workout details.
          {acceptedParticipants.filter((p) => p.user_id !== user.id).length > 0 && (
            <span className="text-accent">
              {' '}Joined participants will be notified of changes.
            </span>
          )}
        </p>

        <form onSubmit={handleSubmit} className="border border-border bg-surface p-6">
          {error && (
            <div className="border border-[#EF4444] text-[#EF4444] font-mono text-[12px] px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="form-label">
                Workout Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Tuesday Morning Intervals"
              />
            </div>

            <div>
              <label className="form-label">Workout Type *</label>
              <div className="flex flex-wrap gap-2">
                {WORKOUT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, workout_type: type }))
                    }
                    className={`font-mono text-[11px] uppercase tracking-[0.06em] px-3 py-2 border transition-colors ${
                      formData.workout_type === type
                        ? 'bg-accent text-[#0A0A0A] border-accent'
                        : 'bg-transparent text-fg-secondary border-border hover:border-border-strong'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="workout_date" className="form-label">
                  Date *
                </label>
                <input
                  id="workout_date"
                  name="workout_date"
                  type="date"
                  required
                  value={formData.workout_date}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor="workout_time" className="form-label">
                  Time *
                </label>
                <input
                  id="workout_time"
                  name="workout_time"
                  type="time"
                  required
                  value={formData.workout_time}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="location" className="form-label">
                Location *
              </label>
              {formData.location && (
                <p className="font-mono text-[11px] text-fg-muted mb-1.5">
                  Current: {formData.location}
                </p>
              )}
              <PlacesAutocomplete
                telemetryName="EditWorkout"
                value={formData.location}
                onChange={handleLocationChange}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="distance" className="form-label">
                  Distance (km)
                </label>
                <input
                  id="distance"
                  name="distance"
                  type="number"
                  step="0.1"
                  value={formData.distance}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., 10"
                />
              </div>
              <div>
                <label htmlFor="pace" className="form-label">
                  Target Pace (min/km)
                </label>
                <input
                  id="pace"
                  name="pace"
                  type="text"
                  value={formData.pace}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., 5:30"
                />
              </div>
            </div>

            <div>
              <label htmlFor="max_participants" className="form-label">
                Max Participants
              </label>
              <input
                id="max_participants"
                name="max_participants"
                type="number"
                min="2"
                value={formData.max_participants}
                onChange={handleChange}
                className="input-field"
                placeholder="Leave empty for unlimited"
              />
            </div>

            <div>
              <label htmlFor="visibility" className="form-label">
                Visibility
              </label>
              <select
                id="visibility"
                name="visibility"
                value={formData.visibility}
                onChange={handleChange}
                className="input-field"
              >
                <option value="public">Public</option>
                <option value="club">Club</option>
                <option value="private">Private</option>
              </select>
            </div>

            {userMemberships.length > 0 && (
              <div>
                <label htmlFor="club_id" className="form-label">
                  Club{formData.visibility === 'club' ? ' *' : ''}
                </label>
                <select
                  id="club_id"
                  name="club_id"
                  value={formData.club_id}
                  onChange={handleChange}
                  className="input-field"
                  required={formData.visibility === 'club'}
                >
                  <option value="">{formData.visibility === 'club' ? 'Select a club' : 'None'}</option>
                  {userMemberships.map(m => (
                    <option key={m.clubs.id} value={m.clubs.id}>{m.clubs.name}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.club_id && (() => {
              const membership = userMemberships.find(m => m.club_id === formData.club_id);
              if (!membership || !['owner', 'admin'].includes(membership.role)) return null;
              const clubName = membership.clubs?.name || 'Club';
              return (
                <div>
                  <label className="form-label">Host as</label>
                  <div className="flex border border-border">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, host_type: 'user' }))}
                      className={`flex-1 font-mono text-[11px] uppercase tracking-[0.06em] px-4 py-2.5 transition-colors ${
                        formData.host_type === 'user'
                          ? 'bg-accent text-[#0A0A0A]'
                          : 'bg-transparent text-fg-secondary hover:text-fg'
                      }`}
                    >
                      Myself
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, host_type: 'club' }))}
                      className={`flex-1 font-mono text-[11px] uppercase tracking-[0.06em] px-4 py-2.5 border-l border-border transition-colors ${
                        formData.host_type === 'club'
                          ? 'bg-accent text-[#0A0A0A]'
                          : 'bg-transparent text-fg-secondary hover:text-fg'
                      }`}
                    >
                      {clubName}
                    </button>
                  </div>
                </div>
              );
            })()}

            {formData.host_type === 'club' && formData.club_id && (
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={creatorJoins}
                    onChange={(e) => setCreatorJoins(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-border peer-checked:bg-accent relative transition-colors">
                    <div className={`absolute top-0.5 w-3 h-3 bg-surface transition-all ${creatorJoins ? 'left-[18px]' : 'left-0.5'}`} />
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-fg-secondary">
                    I'm joining this workout
                  </span>
                </label>
              </div>
            )}

            <div>
              <label htmlFor="description" className="form-label">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows="4"
                value={formData.description}
                onChange={handleChange}
                className="input-field"
                placeholder="Add any additional details about the workout, meeting point, etc."
              />
            </div>

            <div>
              <label className="form-label">Cover Image</label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-24 h-16 object-cover border border-border"
                  />
                ) : (
                  <div className="w-24 h-16 bg-surface-secondary border border-border flex items-center justify-center">
                    <span className="font-mono text-[11px] text-fg-muted">
                      No image
                    </span>
                  </div>
                )}
                <label className="btn-secondary text-[11px] px-4 py-1.5 cursor-pointer">
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }}
                    className="hidden"
                  />
                </label>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      setFormData((prev) => ({ ...prev, image_url: '' }));
                    }}
                    className="font-mono text-[11px] text-fg-muted hover:text-fg transition-colors underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              type="submit"
              disabled={saving}
              className="btn-accent flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/workout/${id}`)}
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
