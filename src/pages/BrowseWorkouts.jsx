import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

export default function BrowseWorkouts() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    workout_type: '',
    location: ''
  });

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
      [name]: value
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchWorkouts();
  };

  const getParticipantCount = (workout) => {
    return workout.workout_participants?.filter(p => p.status === 'accepted').length || 0;
  };

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
        <h1 className="font-sans text-[26px] font-normal tracking-[-0.01em] mb-8">Browse Workouts</h1>

        {/* Filters */}
        <form onSubmit={handleSearch} className="border border-gray-200 p-5 mb-8">
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
              </select>
            </div>
            <div>
              <label htmlFor="location" className="form-label">Location</label>
              <input
                id="location"
                name="location"
                type="text"
                value={filters.location}
                onChange={handleFilterChange}
                className="input-field"
                placeholder="Search by location..."
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full">
                Search
              </button>
            </div>
          </div>
        </form>

        {/* Workouts */}
        {workouts.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-mono text-[13px] text-gray-600">
              No workouts found. Try adjusting your filters or check back later.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workouts.map((workout) => {
              const count = getParticipantCount(workout);
              const isFull = count >= workout.max_participants;
              const spotsLeft = workout.max_participants - count;

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
      </div>
    </div>
  );
}
