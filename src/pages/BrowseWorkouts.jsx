import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import WorkoutMap from '../components/WorkoutMap';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import Avatar from '../components/Avatar';
import WorkoutCover from '../components/WorkoutCover';

const SORT_OPTIONS = [
  { label: 'Date (soonest)', value: 'date_asc' },
  { label: 'Newest created', value: 'created_desc' },
  { label: 'Distance (closest)', value: 'distance_asc' },
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
  const [autocompleteKey, setAutocompleteKey] = useState(0);
  const [showPast, setShowPast] = useState(false);
  const [sortBy, setSortBy] = useState('date_asc');
  const [feedTab, setFeedTab] = useState('all'); // 'all' or 'my_clubs'
  const [userClubIds, setUserClubIds] = useState([]);
  const [filters, setFilters] = useState({
    workout_type: '',
    location: '',
    radius: 30,
  });
  const [appliedFilters, setAppliedFilters] = useState({
    workout_type: '',
    location: '',
    radius: 30,
  });
  const [radiusEnabled, setRadiusEnabled] = useState(false);

  // Fetch user's club memberships
  useEffect(() => {
    const fetchUserClubs = async () => {
      const { data } = await supabase
        .from('club_members')
        .select('club_id')
        .eq('user_id', user.id)
        .eq('status', 'approved');
      if (data) {
        setUserClubIds(data.map(m => m.club_id));
      }
    };
    fetchUserClubs();
  }, [user.id]);

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
  }, [showPast]);

  const fetchWorkouts = async (overrideFilters) => {
    setLoading(true);
    const active = overrideFilters || appliedFilters;

    let query = supabase
      .from('workouts')
      .select(`
        *,
        profiles!creator_id (full_name, avatar_url),
        workout_participants (id, status)
      `)
      .order('workout_date', { ascending: true });

    if (!showPast) {
      query = query.gte('workout_date', new Date().toISOString());
    }

    if (active.workout_type) {
      query = query.eq('workout_type', active.workout_type);
    }
    if (active.location) {
      query = query.ilike('location', `%${active.location}%`);
    }

    const { data, error } = await query;

    if (!error && data) {
      setWorkouts(data);
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

  const handleRadiusSlider = (e) => {
    const val = Number(e.target.value);
    setFilters(prev => ({ ...prev, radius: val }));
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
    const next = { ...filters, radius: radiusEnabled ? filters.radius : null };
    setAppliedFilters(next);
    fetchWorkouts(next);
  };

  const clearFilter = (key) => {
    let next;
    if (key === 'radius') {
      next = { ...appliedFilters, radius: null };
      setRadiusEnabled(false);
      setFilters(prev => ({ ...prev, radius: 30 }));
    } else {
      next = { ...appliedFilters, [key]: '' };
      setFilters(prev => ({ ...prev, [key]: '' }));
    }
    setAppliedFilters(next);
    if (key === 'location') {
      setSearchLocation(null);
      setAutocompleteKey(k => k + 1);
    }
    fetchWorkouts(next);
  };

  const clearAllFilters = () => {
    const next = { workout_type: '', location: '', radius: null };
    setAppliedFilters(next);
    setFilters({ workout_type: '', location: '', radius: 30 });
    setRadiusEnabled(false);
    setSearchLocation(null);
    setAutocompleteKey(k => k + 1);
    fetchWorkouts(next);
  };

  const hasActiveFilters = appliedFilters.workout_type || appliedFilters.location || appliedFilters.radius != null;

  const getParticipantCount = (workout) => {
    return workout.workout_participants?.filter(p => p.status === 'accepted').length || 0;
  };

  const effectiveCenter = searchLocation || userLocation;

  const getDistance = (workout) => {
    if (!effectiveCenter || workout.lat == null || workout.lng == null) return null;
    return haversineDistance(effectiveCenter.lat, effectiveCenter.lng, workout.lat, workout.lng);
  };

  // Apply client-side visibility, club, distance filtering + sorting
  const displayedWorkouts = workouts
    .filter(w => {
      // Hide private workouts
      if (w.visibility === 'private') return false;
      // Club workouts: only visible to approved members
      if (w.visibility === 'club' && w.club_id && !userClubIds.includes(w.club_id)) return false;
      // My Clubs tab: only show workouts from user's clubs
      if (feedTab === 'my_clubs' && (!w.club_id || !userClubIds.includes(w.club_id))) return false;
      return true;
    })
    .filter(w => {
      if (appliedFilters.radius == null || !effectiveCenter) return true;
      const dist = getDistance(w);
      if (dist === null) return true;
      return dist <= appliedFilters.radius;
    })
    .sort((a, b) => {
      if (sortBy === 'date_asc') {
        return new Date(a.workout_date) - new Date(b.workout_date);
      }
      if (sortBy === 'created_desc') {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      if (sortBy === 'distance_asc') {
        const dA = getDistance(a);
        const dB = getDistance(b);
        if (dA === null && dB === null) return 0;
        if (dA === null) return 1;
        if (dB === null) return -1;
        return dA - dB;
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-[13px] text-fg-secondary">Loading workouts...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-sans text-[26px] font-normal tracking-[-0.01em]">Browse Workouts</h1>
          <div className="flex border border-border">
            <button
              onClick={() => setViewMode('list')}
              className={`font-mono text-[11px] uppercase tracking-[0.06em] px-4 py-2 transition-colors ${
                viewMode === 'list' ? 'bg-fg text-surface' : 'bg-surface text-fg-secondary hover:text-fg'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`font-mono text-[11px] uppercase tracking-[0.06em] px-4 py-2 border-l border-border transition-colors ${
                viewMode === 'map' ? 'bg-fg text-surface' : 'bg-surface text-fg-secondary hover:text-fg'
              }`}
            >
              Map
            </button>
          </div>
        </div>

        {/* Filters */}
        <form onSubmit={handleSearch} className="border border-border p-5 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
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
                <option value="Race">Race</option>
              </select>
            </div>
            <div>
              <label className="form-label">Location</label>
              <PlacesAutocomplete
                key={autocompleteKey}
                value={filters.location}
                onChange={handleLocationSelect}
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full">
                Search
              </button>
            </div>
          </div>

          {/* Distance slider */}
          <div className="mt-4 pt-4 border-t border-border">
            {effectiveCenter ? (
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={radiusEnabled}
                    onChange={(e) => setRadiusEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-border peer-checked:bg-accent relative transition-colors">
                    <div className={`absolute top-0.5 w-3 h-3 bg-surface transition-all ${radiusEnabled ? 'left-[18px]' : 'left-0.5'}`} />
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-fg-secondary">
                    Distance
                  </span>
                </label>
                <div className={`flex-1 flex items-center gap-3 ${!radiusEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={filters.radius}
                    onChange={handleRadiusSlider}
                    className="distance-slider flex-1"
                  />
                  <span className="font-mono text-[12px] text-fg-secondary w-[80px] text-right">
                    within {filters.radius} km
                  </span>
                </div>
              </div>
            ) : (
              <p className="font-mono text-[11px] text-fg-muted">
                Enable location to filter by distance
              </p>
            )}
          </div>
        </form>

        {/* Feed tabs */}
        <div className="flex border-b border-border mb-6">
          <button
            onClick={() => setFeedTab('all')}
            className={`font-mono text-[11px] uppercase tracking-[0.06em] px-4 py-2.5 border-b-2 transition-colors ${
              feedTab === 'all' ? 'border-accent text-fg' : 'border-transparent text-fg-secondary hover:text-fg'
            }`}
          >
            All Workouts
          </button>
          <button
            onClick={() => setFeedTab('my_clubs')}
            className={`font-mono text-[11px] uppercase tracking-[0.06em] px-4 py-2.5 border-b-2 transition-colors ${
              feedTab === 'my_clubs' ? 'border-accent text-fg' : 'border-transparent text-fg-secondary hover:text-fg'
            }`}
          >
            My Clubs
          </button>
        </div>

        {/* Controls row: sort + show past toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="font-mono text-[11px] uppercase tracking-[0.06em] text-fg-muted">
                Sort
              </label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="font-mono text-[12px] bg-surface border border-border text-fg px-2 py-1.5 outline-none focus:border-accent"
              >
                {SORT_OPTIONS.filter(opt => {
                  if (opt.value === 'distance_asc' && !effectiveCenter) return false;
                  return true;
                }).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPast}
                onChange={(e) => setShowPast(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-border peer-checked:bg-accent relative transition-colors">
                <div className={`absolute top-0.5 w-3 h-3 bg-surface transition-all ${showPast ? 'left-[18px]' : 'left-0.5'}`} />
              </div>
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-fg-secondary">
                Show past
              </span>
            </label>
          </div>
          <p className="font-mono text-[11px] text-fg-muted">
            {displayedWorkouts.length} workout{displayedWorkouts.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-fg-muted">
              Filtering by:
            </span>
            {appliedFilters.workout_type && (
              <button
                onClick={() => clearFilter('workout_type')}
                className="inline-flex items-center gap-1.5 font-mono text-[11px] bg-surface-secondary border border-border px-2.5 py-1 text-fg-secondary hover:border-fg transition-colors"
              >
                Type: {appliedFilters.workout_type}
                <span className="text-fg-muted text-[13px] leading-none">&times;</span>
              </button>
            )}
            {appliedFilters.location && (
              <button
                onClick={() => clearFilter('location')}
                className="inline-flex items-center gap-1.5 font-mono text-[11px] bg-surface-secondary border border-border px-2.5 py-1 text-fg-secondary hover:border-fg transition-colors max-w-[250px]"
              >
                <span className="truncate">Location: {appliedFilters.location}</span>
                <span className="text-fg-muted text-[13px] leading-none flex-shrink-0">&times;</span>
              </button>
            )}
            {appliedFilters.radius != null && (
              <button
                onClick={() => clearFilter('radius')}
                className="inline-flex items-center gap-1.5 font-mono text-[11px] bg-surface-secondary border border-border px-2.5 py-1 text-fg-secondary hover:border-fg transition-colors"
              >
                Within {appliedFilters.radius} km
                <span className="text-fg-muted text-[13px] leading-none">&times;</span>
              </button>
            )}
            <button
              onClick={clearAllFilters}
              className="font-mono text-[11px] text-fg-muted hover:text-fg transition-colors underline ml-1"
            >
              Clear all
            </button>
          </div>
        )}

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
                <p className="font-mono text-[13px] text-fg-secondary">
                  No workouts found. Try adjusting your filters or check back later.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedWorkouts.map((workout) => {
                  const count = getParticipantCount(workout);
                  const hasMax = workout.max_participants != null;
                  const isFull = hasMax && count >= workout.max_participants;
                  const spotsLeft = hasMax ? workout.max_participants - count : null;
                  const distance = getDistance(workout);
                  const isPast = new Date(workout.workout_date) < new Date();

                  return (
                    <Link
                      key={workout.id}
                      to={`/workout/${workout.id}`}
                      className={`card hover:border-fg transition-colors ${isPast ? 'opacity-60' : ''}`}
                    >
                      <WorkoutCover imageUrl={workout.image_url} workoutType={workout.workout_type} />
                      {/* Header */}
                      <div className="p-5 border-b border-border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="badge-type">{workout.workout_type}</span>
                            {hasMax ? (
                              isFull ? (
                                <span className="badge-full">Full</span>
                              ) : (
                                <span className="badge-open">Open</span>
                              )
                            ) : (
                              <span className="badge-open">Open</span>
                            )}
                            {isPast && (
                              <span className="badge-full">Past</span>
                            )}
                          </div>
                          {hasMax && (
                            <span className="font-mono text-[12px] text-fg-secondary">
                              {count}/{workout.max_participants}
                            </span>
                          )}
                        </div>
                        <h3 className="font-sans text-[15px] font-medium">{workout.name || workout.workout_type}</h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Avatar
                            name={workout.profiles?.full_name}
                            avatarUrl={workout.profiles?.avatar_url}
                            userId={workout.creator_id}
                            size="sm"
                            linked={false}
                          />
                          <p className="font-mono text-[11px] text-fg-secondary">
                            {workout.creator_id === user.id ? 'Created by you' : `Hosted by ${workout.profiles?.full_name || 'Runner'}`}
                          </p>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-5 flex flex-col gap-2.5">
                        <p className="font-mono text-[12px] text-fg-secondary">
                          {format(new Date(workout.workout_date), 'MMM d, yyyy · h:mm a')}
                        </p>
                        <p className="font-mono text-[12px] text-fg-secondary">
                          {workout.location}
                        </p>
                        {distance !== null && (
                          <p className="font-mono text-[11px] text-accent-dark font-medium">
                            {distance < 1 ? `${Math.round(distance * 1000)} m away` : `${distance.toFixed(1)} km away`}
                          </p>
                        )}
                        {workout.distance && (
                          <p className="font-mono text-[12px] text-fg-secondary">
                            {workout.distance} km {workout.pace && `@ ${workout.pace}`}
                          </p>
                        )}
                        {workout.description && (
                          <p className="text-[13px] font-light text-fg-secondary line-clamp-2">
                            {workout.description}
                          </p>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="px-5 py-3.5 bg-surface-secondary border-t border-border flex items-center justify-between">
                        <div className="flex-1 mr-4">
                          {hasMax ? (
                            <>
                              <div className="h-[2px] bg-border w-full">
                                <div
                                  className={`h-[2px] ${spotsLeft <= 1 ? 'bg-accent' : 'bg-fg'}`}
                                  style={{ width: `${(count / workout.max_participants) * 100}%` }}
                                />
                              </div>
                              <p className="font-mono text-[10px] text-fg-secondary mt-1.5">
                                {isFull
                                  ? 'Full'
                                  : `${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left`}
                              </p>
                            </>
                          ) : (
                            <p className="font-mono text-[10px] text-fg-secondary">
                              Open
                            </p>
                          )}
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
