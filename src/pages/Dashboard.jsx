import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import WorkoutCover from '../components/WorkoutCover';

export default function Dashboard() {
  const { user } = useAuth();
  const [myWorkouts, setMyWorkouts] = useState([]);
  const [joinedWorkouts, setJoinedWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkouts();
  }, [user]);

  const fetchWorkouts = async () => {
    if (!user) return;

    setLoading(true);

    const { data: created } = await supabase
      .from('workouts')
      .select('*')
      .eq('creator_id', user.id)
      .order('workout_date', { ascending: true });

    const { data: joined } = await supabase
      .from('workout_participants')
      .select(`
        *,
        workouts (*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    setMyWorkouts(created || []);
    setJoinedWorkouts(joined || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-[13px] text-fg-secondary">Loading your workouts...</p>
      </div>
    );
  }

  const totalWorkouts = myWorkouts.length + joinedWorkouts.length;

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="max-w-5xl mx-auto px-6">
        <h1 className="font-sans text-[26px] font-normal tracking-[-0.01em] mb-8">Dashboard</h1>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-[1px] bg-border-strong border border-border-strong mb-10">
          <div className="bg-surface p-4">
            <div className="font-sans text-[28px] font-light tracking-[-0.02em] leading-none mb-1">
              {myWorkouts.length}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-secondary">
              Created
            </div>
          </div>
          <div className="bg-surface p-4">
            <div className="font-sans text-[28px] font-light tracking-[-0.02em] leading-none mb-1">
              {joinedWorkouts.length}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-secondary">
              Joined
            </div>
          </div>
          <div className="bg-surface p-4">
            <div className="font-sans text-[28px] font-light tracking-[-0.02em] leading-none mb-1">
              {totalWorkouts}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-secondary">
              Total
            </div>
          </div>
        </div>

        {/* My Workouts */}
        <div className="border-t border-border-strong pt-6 mb-10">
          <p className="section-label">My Workouts</p>
          {myWorkouts.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-mono text-[13px] text-fg-secondary mb-4">
                No workouts created yet.
              </p>
              <Link to="/create-workout" className="btn-accent">
                Create Your First Workout
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myWorkouts.map((workout) => (
                <Link
                  key={workout.id}
                  to={`/workout/${workout.id}`}
                  className="card hover:border-fg transition-colors"
                >
                  <WorkoutCover imageUrl={workout.image_url} workoutType={workout.workout_type} />
                  <div className="p-5 border-b border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="badge-type">{workout.workout_type}</span>
                    </div>
                    <h3 className="font-sans text-[15px] font-medium">{workout.name || workout.workout_type}</h3>
                  </div>
                  <div className="p-5 flex flex-col gap-2.5">
                    <p className="font-mono text-[12px] text-fg-secondary">
                      {format(new Date(workout.workout_date), 'MMM d, yyyy · h:mm a')}
                    </p>
                    <p className="font-mono text-[12px] text-fg-secondary">
                      {workout.location}
                    </p>
                    {workout.description && (
                      <p className="text-[13px] font-light text-fg-secondary line-clamp-2">
                        {workout.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Joined Workouts */}
        <div className="border-t border-border-strong pt-6">
          <p className="section-label">Workouts I'm Joining</p>
          {joinedWorkouts.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-mono text-[13px] text-fg-secondary mb-4">
                No workouts joined yet.
              </p>
              <Link to="/" className="btn-primary">
                Browse Available Workouts
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {joinedWorkouts.map((participant) => {
                const workout = participant.workouts;
                return (
                  <Link
                    key={participant.id}
                    to={`/workout/${workout.id}`}
                    className="card hover:border-fg transition-colors"
                  >
                    <WorkoutCover imageUrl={workout.image_url} workoutType={workout.workout_type} />
                    <div className="p-5 border-b border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="badge-type">{workout.workout_type}</span>
                        <span className="badge-open">Joined</span>
                      </div>
                      <h3 className="font-sans text-[15px] font-medium">{workout.name || workout.workout_type}</h3>
                    </div>
                    <div className="p-5 flex flex-col gap-2.5">
                      <p className="font-mono text-[12px] text-fg-secondary">
                        {format(new Date(workout.workout_date), 'MMM d, yyyy · h:mm a')}
                      </p>
                      <p className="font-mono text-[12px] text-fg-secondary">
                        {workout.location}
                      </p>
                      {workout.description && (
                        <p className="text-[13px] font-light text-fg-secondary line-clamp-2">
                          {workout.description}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
