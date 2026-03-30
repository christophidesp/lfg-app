import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import WorkoutMap from '../components/WorkoutMap';
import PlacesAutocomplete from '../components/PlacesAutocomplete';

const RADIUS_OPTIONS = [
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
  { label: '50 km', value: 50 },
  { label: 'Any', value: null },
];

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function BrowseWorkouts() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [userLocation, setUserLocation] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [searchLocation, setSearchLocation] = useState(null);
  const [filters, setFilters] = useState({
    workout_type: '',
    location: '',
    radius: null,
  });

  // Request user location on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocationDenied(true);
      }
    );
  }, []);

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    setLoading(true);

    let query = supabase
      .from('workouts')
      .select(`
        *,
        profiles!creator_id (full_name),
        workout_participants (id, status)
      `)
      .gte('workout_date', new Date().toISOString())
      .order('workout_date', { ascending: true });

    if (filters.workout_type) {
      query = query.eq('workout_type', filters.workout_type);
    }
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    const { data, error } = await query;

    if (!error && data) {
      const filtered = data.filter(w => w.creator_id !== user.id);
      setWorkouts(filtered);
    }

    setLoading(false);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRadiusChange = (e) => {
    const val = e.target.value;
    setFilters(prev => ({
      ...prev,
      radius: val === '' ? null : Number(val),
    }));
  };

  const handleLocationSelect = useCallback(({ address, lat, lng }) => {
    setFilters(prev => ({ ...prev, location: address }));
    if (lat != null && lng != null) {
      setSearchLocation({ lat, lng });
    } else {
      setSearchLocation(null);
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchWorkouts();
  };

  const getParticipantCount = (workout) => {
    return workout.workout_participants?.filter(p => p.status === 'accepted').length || 0;
  };

  const effectiveCenter = searchLocation || userLocation;

  const getDistance = (workout) => {
    if (!effectiveCenter || workout.lat == null || workout.lng == null) return null;
    return haversineDistance(effectiveCenter.lat, effectiveCenter.lng, workout.lat, workout.lng);
  };

  // Apply client-side distance filtering
  const displayedWorkouts = workouts.filter(w => {
    if (filters.radius == null || !effectiveCenter) return true;
    const dist = getDistance(w);
    if (dist === null) return true; // show workouts without coords
    return dist <= filters.radius;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-[13px] text-gray-600">Loading workouts...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-sans text-[26px] font-normal tracking-[-0.01em]">Browse Workouts</h1>
          <div className="flex border border-gray-200">
            <button
              onClick={() => setViewMode('list')}
              className={`font-mono text-[11px] uppercase tracking-[0.06em] px-4 py-2 transition-colors ${
                viewMode === 'list' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:text-black'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`font-mono text-[11px] uppercase tracking-[0.06em] px-4 py-2 border-l border-gray-200 transition-colors ${
                viewMode === 'map' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:text-black'
              }`}
            >
              Map
            </button>
          </div>
        </div>

        {/* Filters */}
        <form onSubmit={handleSearch} className="border border-gray-200 p-5 mb-8">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="workout_type" className="form-label">Type</label>
              <select
                id="workout_type"
                name="workout_type"
                value={filters.workout_type}
                onChange={handleFilterChange}
                className="input-field"
              >
                <option value="">All Types</option>
                <option value="Easy Run">Easy Run</option>
                <option value="Long Run">Long Run</option>
                <option value="Tempo Run">Tempo Run</option>
                <option value="Intervals">Intervals</option>
                <option value="Recovery Run">Recovery Run</option>
                <option value="Fartlek">Fartlek</option>
                <option value="Hill Repeats">Hill Repeats</option>
                <option value="Track Workout">Track Workout</option>
              </select>
            </div>
            <div>
              <label className="form-label">Location</label>
              <PlacesAutocomplete
                value={filters.location}
                onChange={handleLocationSelect}
              />
            </div>
            <div>
              <label htmlFor="radius" className="form-label">Distance</label>
              <select
                id="radius"
                name="radius"
                value={filters.radius ?? ''}
                onChange={handleRadiusChange}
                className="input-field"
                disabled={!effectiveCenter}
              >
                <option value="">Any distance</option>
                {RADIUS_OPTIONS.filter(o => o.value !== null).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full">
                Search
              </button>
            </div>
          </div>
          {locationDenied && (
            <p className="font-mono text-[11px] text-gray-400 mt-3">
              Location access denied — distance filter unavailable.
            </p>
          )}
        </form>

        {/* Map View */}
        {viewMode === 'map' && (
          <div className="mb-8">
            <WorkoutMap workouts={displayedWorkouts} userLocation={effectiveCenter} />
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <>
            {displayedWorkouts.length === 0 ? (
              <div className="text-center py-16">
                <p className="font-mono text-[13px] text-gray-600">
                  No workouts found. Try adjusting your filters or check back later.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedWorkouts.map((workout) => {
                  const count = getParticipantCount(workout);
                  const isFull = count >= workout.max_participants;
                  const spotsLeft = workout.max_participants - count;
                  const distance = getDistance(workout);

                  return (
                    <Link
                      key={workout.id}
                      to={`/workout/${workout.id}`}
                      className="card hover:border-black transition-colors"
                    >
                      {/* Header */}
                      <div className="p-5 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="badge-type">{workout.workout_type}</span>
                            {isFull ? (
                              <span className="badge-full">Full</span>
                            ) : (
                              <span className="badge-open">Open</span>
                            )}
                          </div>
                          <span className="font-mono text-[12px] text-gray-600">
                            {count}/{workout.max_participants}
                          </span>
                        </div>
                        <h3 className="font-sans text-[15px] font-medium">{workout.workout_type}</h3>
                        <p className="font-mono text-[11px] text-gray-600 mt-1">
                          Hosted by {workout.profiles?.full_name || 'Runner'}
                        </p>
                      </div>

                      {/* Body */}
                      <div className="p-5 flex flex-col gap-2.5">
                        <p className="font-mono text-[12px] text-gray-600">
                          {format(new Date(workout.workout_date), 'MMM d, yyyy · h:mm a')}
                        </p>
                        <p className="font-mono text-[12px] text-gray-600">
                          {workout.location}
                        </p>
                        {distance !== null && (
                          <p className="font-mono text-[11px] text-accent-dark font-medium">
                            {distance < 1 ? `${Math.round(distance * 1000)} m away` : `${distance.toFixed(1)} km away`}
                          </p>
                        )}
                        {workout.distance && (
                          <p className="font-mono text-[12px] text-gray-600">
                            {workout.distance} km {workout.pace && `@ ${workout.pace}`}
                          </p>
                        )}
                        {workout.description && (
                          <p className="text-[13px] font-light text-gray-600 line-clamp-2">
                            {workout.description}
                          </p>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="px-5 py-3.5 bg-gray-100 border-t border-gray-200 flex items-center justify-between">
                        <div className="flex-1 mr-4">
                          <div className="h-[2px] bg-gray-200 w-full">
                            <div
                              className={`h-[2px] ${spotsLeft <= 1 ? 'bg-accent' : 'bg-black'}`}
                              style={{ width: `${(count / workout.max_participants) * 100}%` }}
                            />
                          </div>
                          <p className="font-mono text-[10px] text-gray-600 mt-1.5">
                            {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
                          </p>
                        </div>
                        <span className="btn-primary text-[10px] px-3 py-1">
                          View
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
