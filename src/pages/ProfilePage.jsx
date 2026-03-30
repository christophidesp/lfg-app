import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import Avatar from '../components/Avatar';

export default function ProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = user?.id === id;

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);

    const [{ data: profileData }, { data: workoutsData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase
        .from('workouts')
        .select('*')
        .eq('creator_id', id)
        .order('workout_date', { ascending: false }),
    ]);

    setProfile(profileData || null);
    setWorkouts(workoutsData || []);
    setLoading(false);
  };

  const formatPace = (min, sec) => {
    if (min == null && sec == null) return null;
    return `${min || 0}:${String(sec || 0).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-[13px] text-fg-secondary">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-[13px] text-fg-secondary">Profile not found</p>
      </div>
    );
  }

  const pace = formatPace(profile.pace_min, profile.pace_sec);

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="max-w-3xl mx-auto px-6">
        <div className="card mb-8">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar
                name={profile.full_name}
                avatarUrl={profile.avatar_url}
                userId={id}
                size="lg"
                linked={false}
              />
              <div>
                <h1 className="font-sans text-[22px] font-medium">{profile.full_name || 'Runner'}</h1>
                <p className="font-mono text-[11px] text-fg-muted mt-1">
                  Member since {profile.created_at ? format(new Date(profile.created_at), 'MMM yyyy') : 'Unknown'}
                </p>
              </div>
            </div>
            {isOwnProfile && (
              <Link to="/profile/edit" className="btn-secondary">
                Edit Profile
              </Link>
            )}
          </div>

          <div className="p-6 flex flex-col gap-5">
            {profile.bio && (
              <div>
                <p className="mono-label mb-2">Bio</p>
                <p className="text-[13px] font-light text-fg-secondary leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {pace && (
              <div>
                <p className="mono-label mb-2">Pace</p>
                <p className="font-mono text-[13px] text-fg-secondary">{pace} /km</p>
              </div>
            )}
          </div>
        </div>

        {/* Workouts created */}
        <div className="border-t border-border-strong pt-6">
          <p className="section-label">
            {isOwnProfile ? 'Your Workouts' : `Workouts by ${profile.full_name || 'Runner'}`}
          </p>

          {workouts.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-mono text-[13px] text-fg-secondary">No workouts created yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workouts.map((workout) => (
                <Link
                  key={workout.id}
                  to={`/workout/${workout.id}`}
                  className="card hover:border-fg transition-colors"
                >
                  <div className="p-5 border-b border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="badge-type">{workout.workout_type}</span>
                    </div>
                    <h3 className="font-sans text-[15px] font-medium">{workout.workout_type}</h3>
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
      </div>
    </div>
  );
}
