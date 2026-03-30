import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import PlacesAutocomplete from '../components/PlacesAutocomplete';

const WORKOUT_TYPES = [
  'Easy Run',
  'Long Run',
  'Tempo Run',
  'Intervals',
  'Recovery Run',
  'Fartlek',
  'Hill Repeats',
  'Track Workout'
];

export default function CreateWorkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    max_participants: 5
  });

  const handleLocationChange = useCallback(({ address, lat, lng }) => {
    setFormData(prev => ({ ...prev, location: address, lat, lng }));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: insertError } = await supabase
        .from('workouts')
        .insert([
          {
            creator_id: user.id,
            workout_type: formData.workout_type,
            workout_date: `${formData.workout_date}T${formData.workout_time}`,
            location: formData.location,
            lat: formData.lat,
            lng: formData.lng,
            address: formData.location,
            distance: formData.distance ? parseFloat(formData.distance) : null,
            pace: formData.pace || null,
            description: formData.description,
            max_participants: parseInt(formData.max_participants)
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      navigate(`/workout/${data.id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="font-sans text-[26px] font-normal tracking-[-0.01em] mb-2">Create a Workout</h1>
        <p className="font-sans text-[13px] text-gray-600 mb-8">
          Post a new running session and find training partners.
        </p>

        <form onSubmit={handleSubmit} className="border border-gray-200 bg-white p-6">
          {error && (
            <div className="border border-[#991B1B] text-[#991B1B] font-mono text-[12px] px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="workout_type" className="form-label">Workout Type *</label>
              <select
                id="workout_type"
                name="workout_type"
                required
                value={formData.workout_type}
                onChange={handleChange}
                className="input-field"
              >
                {WORKOUT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

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
              <label htmlFor="max_participants" className="form-label">Max Participants *</label>
              <input
                id="max_participants"
                name="max_participants"
                type="number"
                min="1"
                max="20"
                required
                value={formData.max_participants}
                onChange={handleChange}
                className="input-field"
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
                placeholder="Add any additional details about the workout, meeting point, etc."
              />
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
