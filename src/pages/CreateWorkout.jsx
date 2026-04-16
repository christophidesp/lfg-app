import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import { WORKOUT_TYPES } from '../constants/workoutTypes';

export default function CreateWorkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userClubs, setUserClubs] = useState([]);
  const [userMemberships, setUserMemberships] = useState([]);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [creatorJoins, setCreatorJoins] = useState(true);

  const [formData, setFormData] = useState({
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
    name: '',
    race_id: '',
    host_type: 'user',
  });

  // Race search state
  const [raceSearch, setRaceSearch] = useState('');
  const [raceResults, setRaceResults] = useState([]);
  const [selectedRace, setSelectedRace] = useState(null);
  const [raceDropdownOpen, setRaceDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchUserClubs = async () => {
      const { data } = await supabase
        .from('club_members')
        .select(`
          club_id,
          role,
          clubs (id, name, workout_creation)
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved');

      if (data) {
        setUserMemberships(data);
        setUserClubs(data.map(m => m.clubs));
      }
    };
    fetchUserClubs();
  }, [user.id]);

  const handleLocationChange = useCallback(({ address, lat, lng }) => {
    setFormData(prev => ({ ...prev, location: address, lat, lng }));
  }, []);

  // Search races when input changes
  useEffect(() => {
    if (formData.workout_type !== 'Race') return;
    if (raceSearch.length < 1) {
      // Show all races when search is empty
      const fetchAll = async () => {
        const { data } = await supabase
          .from('races')
          .select('*')
          .order('date', { ascending: true })
          .limit(20);
        setRaceResults(data || []);
      };
      fetchAll();
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('races')
        .select('*')
        .ilike('name', `%${raceSearch}%`)
        .order('date', { ascending: true })
        .limit(10);
      setRaceResults(data || []);
    }, 200);
    return () => clearTimeout(timer);
  }, [raceSearch, formData.workout_type]);

  const handleSelectRace = (race) => {
    setSelectedRace(race);
    setFormData(prev => ({
      ...prev,
      race_id: race.id,
      distance: race.distance_km ? String(race.distance_km) : prev.distance,
    }));
    setRaceSearch(race.name);
    setRaceDropdownOpen(false);
  };

  const handleClearRace = () => {
    setSelectedRace(null);
    setFormData(prev => ({ ...prev, race_id: '' }));
    setRaceSearch('');
    setRaceDropdownOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      // Reset host_type when changing clubs or clearing club
      if (name === 'club_id') {
        next.host_type = 'user';
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let image_url = null;
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

      // Validate club workout creation permission
      if (formData.visibility === 'club' && formData.club_id) {
        const membership = userMemberships.find(m => m.club_id === formData.club_id);
        const club = membership?.clubs;
        if (club?.workout_creation === 'admins' && !['owner', 'admin'].includes(membership?.role)) {
          throw new Error('Only admins and owners can create workouts for this club.');
        }
      }

      const { data, error: insertError } = await supabase
        .from('workouts')
        .insert([
          {
            creator_id: user.id,
            workout_type: formData.workout_type,
            workout_date: new Date(`${formData.workout_date}T${formData.workout_time}`).toISOString(),
            location: formData.location,
            lat: formData.lat,
            lng: formData.lng,
            address: formData.location,
            distance: formData.distance ? parseFloat(formData.distance) : null,
            pace: formData.pace || null,
            description: formData.description,
            max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
            visibility: formData.visibility,
            club_id: formData.club_id || null,
            host_type: formData.club_id ? formData.host_type : 'user',
            name: formData.name || null,
            race_id: formData.race_id || null,
            image_url,
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      // If club-hosted and creator wants to join, add them as participant
      if (formData.host_type === 'club' && formData.club_id && creatorJoins) {
        await supabase.from('workout_participants').insert([{
          workout_id: data.id,
          user_id: user.id,
          status: 'accepted',
        }]);
      }

      navigate(`/workout/${data.id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="font-sans text-[26px] font-normal tracking-[-0.01em] mb-2">Create a Workout</h1>
        <p className="font-sans text-[13px] text-fg-secondary mb-8">
          Post a new running session and find training partners.
        </p>

        <form onSubmit={handleSubmit} className="border border-border bg-surface p-6">
          {error && (
            <div className="border border-[#EF4444] text-[#EF4444] font-mono text-[12px] px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="form-label">Workout Name</label>
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
                    onClick={() => setFormData((prev) => ({ ...prev, workout_type: type }))}
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

            {formData.workout_type === 'Race' && (
              <div>
                <label className="form-label">Link a Race</label>
                {selectedRace ? (
                  <div className="border border-border p-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[13px] text-fg font-medium truncate">{selectedRace.name}</p>
                      <p className="font-mono text-[11px] text-fg-secondary">
                        {selectedRace.distance_label}
                        {selectedRace.date && ` · ${new Date(selectedRace.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        {selectedRace.location && ` · ${selectedRace.location}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearRace}
                      className="btn-secondary text-[11px] px-3 py-1 flex-shrink-0 ml-3"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={raceSearch}
                      onChange={(e) => { setRaceSearch(e.target.value); setRaceDropdownOpen(true); }}
                      onFocus={() => setRaceDropdownOpen(true)}
                      className="input-field"
                      placeholder="Search races..."
                    />
                    {raceDropdownOpen && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-0 border border-border bg-surface max-h-[240px] overflow-y-auto">
                        <button
                          type="button"
                          onClick={handleClearRace}
                          className="w-full text-left px-3 py-2.5 font-mono text-[12px] text-fg-muted hover:bg-surface-secondary transition-colors border-b border-border"
                        >
                          None — custom race
                        </button>
                        {raceResults.map((race) => (
                          <button
                            key={race.id}
                            type="button"
                            onClick={() => handleSelectRace(race)}
                            className="w-full text-left px-3 py-2.5 hover:bg-surface-secondary transition-colors border-b border-border"
                          >
                            <p className="font-mono text-[12px] text-fg font-medium">{race.name}</p>
                            <p className="font-mono text-[10px] text-fg-secondary">
                              {race.distance_label || ''}
                              {race.date && ` · ${new Date(race.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                              {race.location && ` · ${race.location}`}
                            </p>
                          </button>
                        ))}
                        {raceResults.length === 0 && raceSearch && (
                          <p className="px-3 py-2.5 font-mono text-[11px] text-fg-muted">No races found</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <p className="font-mono text-[10px] text-fg-muted mt-1">Optional — link an official race to this workout.</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="workout_date" className="form-label">Date *</label>
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
                <label htmlFor="workout_time" className="form-label">Time *</label>
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
              <label htmlFor="location" className="form-label">Location *</label>
              <PlacesAutocomplete
                telemetryName="CreateWorkout"
                value={formData.location}
                onChange={handleLocationChange}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="distance" className="form-label">Distance (km)</label>
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
                <label htmlFor="pace" className="form-label">Target Pace (min/km)</label>
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
              <label htmlFor="max_participants" className="form-label">Max Participants</label>
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
              <label htmlFor="visibility" className="form-label">Visibility</label>
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

            {formData.visibility === 'club' && (
              <div>
                <label htmlFor="club_id" className="form-label">Club *</label>
                {userClubs.length === 0 ? (
                  <p className="font-mono text-[12px] text-fg-muted">You are not a member of any clubs.</p>
                ) : (
                  <>
                    <select
                      id="club_id"
                      name="club_id"
                      value={formData.club_id}
                      onChange={handleChange}
                      className="input-field"
                      required
                    >
                      <option value="">Select a club</option>
                      {userClubs.map(club => (
                        <option key={club.id} value={club.id}>{club.name}</option>
                      ))}
                    </select>
                    {formData.club_id && (() => {
                      const membership = userMemberships.find(m => m.club_id === formData.club_id);
                      const club = membership?.clubs;
                      if (club?.workout_creation === 'admins' && !['owner', 'admin'].includes(membership?.role)) {
                        return (
                          <p className="font-mono text-[11px] text-[#EF4444] mt-1.5">
                            Only admins can create workouts for this club.
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </>
                )}
              </div>
            )}

            {formData.visibility !== 'club' && userClubs.length > 0 && (
              <div>
                <label htmlFor="club_id" className="form-label">Club</label>
                <select
                  id="club_id"
                  name="club_id"
                  value={formData.club_id}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">None</option>
                  {userClubs.map(club => (
                    <option key={club.id} value={club.id}>{club.name}</option>
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
              <label htmlFor="description" className="form-label">Description</label>
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
                  <img src={imagePreview} alt="Preview" className="w-24 h-16 object-cover border border-border" />
                ) : (
                  <div className="w-24 h-16 bg-surface-secondary border border-border flex items-center justify-center">
                    <span className="font-mono text-[11px] text-fg-muted">No image</span>
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
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
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
              disabled={loading}
              className="btn-accent flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Workout'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
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
