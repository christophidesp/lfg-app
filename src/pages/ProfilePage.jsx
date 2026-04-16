import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format, isPast } from 'date-fns';
import Avatar from '../components/Avatar';
import { ChevronRight } from 'lucide-react';

function spotsRemaining(workout) {
  const accepted = (workout.workout_participants || []).filter(
    (p) => p.status === 'accepted'
  ).length;
  return Math.max(0, (workout.max_participants || 5) - accepted);
}

function filterByPrivacy(workouts, isOwner, viewerClubIds) {
  if (isOwner) return workouts;
  return workouts.filter((w) => {
    if (w.is_private) return false;
    if (w.club_id) return viewerClubIds.includes(w.club_id);
    return true;
  });
}

export default function ProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [createdWorkouts, setCreatedWorkouts] = useState([]);
  const [joinedWorkouts, setJoinedWorkouts] = useState([]);
  const [viewerClubIds, setViewerClubIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = user?.id === id;

  useEffect(() => {
    fetchData();
  }, [id, user?.id]);

  const fetchData = async () => {
    setLoading(true);

    const [{ data: profileData }, { data: created }, { data: joined }, { data: clubs }] =
      await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase
          .from('workouts')
          .select('*, workout_participants (id, status), clubs!club_id (id, name, avatar_url)')
          .eq('creator_id', id)
          .order('workout_date', { ascending: false }),
        supabase
          .from('workout_participants')
          .select('*, workouts (*, workout_participants (id, status), clubs!club_id (id, name, avatar_url))')
          .eq('user_id', id)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false }),
        supabase
          .from('club_members')
          .select('club_id')
          .eq('user_id', user.id)
          .eq('status', 'approved'),
      ]);

    setProfile(profileData || null);
    setCreatedWorkouts(created || []);
    setJoinedWorkouts(
      (joined || []).map((p) => p.workouts).filter(Boolean)
    );
    setViewerClubIds((clubs || []).map((c) => c.club_id));
    setLoading(false);
  };

  const formatPace = (min, sec) => {
    if (min == null && sec == null) return null;
    return `${min || 0}:${String(sec || 0).padStart(2, '0')}`;
  };

  const filteredCreated = useMemo(
    () => filterByPrivacy(createdWorkouts, isOwnProfile, viewerClubIds),
    [createdWorkouts, isOwnProfile, viewerClubIds]
  );

  const filteredJoined = useMemo(
    () => filterByPrivacy(joinedWorkouts, isOwnProfile, viewerClubIds),
    [joinedWorkouts, isOwnProfile, viewerClubIds]
  );

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
        <WorkoutSection
          title="Workouts created"
          workouts={filteredCreated}
          allHidden={!isOwnProfile && createdWorkouts.length > 0 && filteredCreated.length === 0}
          onRowClick={(w) => navigate(`/workout/${w.id}`)}
        />

        {/* Workouts joined */}
        <WorkoutSection
          title="Workouts joined"
          workouts={filteredJoined}
          allHidden={!isOwnProfile && joinedWorkouts.length > 0 && filteredJoined.length === 0}
          onRowClick={(w) => navigate(`/workout/${w.id}`)}
        />
      </div>
    </div>
  );
}

function WorkoutSection({ title, workouts, allHidden, onRowClick }) {
  const upcoming = workouts.filter((w) => !isPast(new Date(w.workout_date)));
  const past = workouts.filter((w) => isPast(new Date(w.workout_date)));

  return (
    <div className="border-t border-border-strong pt-6 mb-8">
      <p className="section-label">{title}</p>

      {allHidden ? (
        <p className="font-mono text-[13px] text-fg-muted py-6">No public workouts yet.</p>
      ) : workouts.length === 0 ? (
        <p className="font-mono text-[13px] text-fg-muted py-6">No workouts yet.</p>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-muted mb-2">
                Upcoming
              </p>
              <div className="border-t border-border">
                {upcoming.map((w) => (
                  <WorkoutRow key={w.id} workout={w} onClick={() => onRowClick(w)} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-muted mb-2">
                Past
              </p>
              <div className="border-t border-border">
                {past.map((w) => (
                  <WorkoutRow key={w.id} workout={w} onClick={() => onRowClick(w)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function WorkoutRow({ workout, onClick }) {
  const spots = spotsRemaining(workout);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 py-3 border-b border-border hover:bg-surface-secondary transition-colors text-left px-1"
    >
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-secondary mb-0.5">
          {workout.workout_type}
        </p>
        <p className="text-[14px] font-medium text-fg truncate mb-1">
          {workout.name || workout.workout_type}
        </p>
        {workout.host_type === 'club' && workout.clubs && (
          <p className="font-mono text-[10px] text-fg-muted mb-1">
            Hosted by {workout.clubs.name}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[11px] text-fg-secondary">
            {format(new Date(workout.workout_date), 'MMM d, yyyy · HH:mm')}
          </span>
          {workout.distance && (
            <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-fg-secondary border border-border px-2 py-[1px]">
              {workout.distance} km
            </span>
          )}
          {workout.pace && (
            <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-fg-secondary border border-border px-2 py-[1px]">
              {workout.pace}/km
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.06em] ${
            spots <= 0
              ? 'text-fg-muted'
              : spots <= 2
              ? 'text-accent'
              : 'text-[#4ADE80]'
          }`}
        >
          {spots <= 0 ? 'Full' : `${spots} spot${spots !== 1 ? 's' : ''}`}
        </span>
        <ChevronRight size={14} className="text-fg-muted" />
      </div>
    </button>
  );
}
