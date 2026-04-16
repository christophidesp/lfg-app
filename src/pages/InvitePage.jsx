import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import Avatar from '../components/Avatar';
import { Lock } from 'lucide-react';
import WorkoutCover from '../components/WorkoutCover';

export default function InvitePage() {
  const { token } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [userParticipation, setUserParticipation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    fetchInvite();
  }, [token, authLoading, user]);

  const fetchInvite = async () => {
    setLoading(true);

    const { data: inviteData, error: inviteError } = await supabase
      .from('workout_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteError || !inviteData) {
      setInvalid(true);
      setLoading(false);
      return;
    }

    setInvite(inviteData);

    const { data: workoutData } = await supabase
      .from('workouts')
      .select(`
        *,
        profiles!creator_id (full_name, avatar_url),
        clubs!club_id (id, name, avatar_url),
        workout_participants (id, status)
      `)
      .eq('id', inviteData.workout_id)
      .single();

    if (!workoutData) {
      setInvalid(true);
      setLoading(false);
      return;
    }

    setWorkout(workoutData);

    if (user) {
      const { data: participantData } = await supabase
        .from('workout_participants')
        .select('*')
        .eq('workout_id', inviteData.workout_id)
        .eq('user_id', user.id)
        .maybeSingle();

      setUserParticipation(participantData || null);
    }

    setLoading(false);
  };

  const handleJoinRequest = async () => {
    setSubmitting(true);

    const { error } = await supabase
      .from('workout_participants')
      .insert([{
        workout_id: workout.id,
        user_id: user.id,
        status: 'pending',
      }]);

    if (!error) {
      await supabase.from('notifications').insert([{
        user_id: workout.creator_id,
        type: 'join_request',
        workout_id: workout.id,
        from_user_id: user.id,
      }]);
      setRequestSent(true);
      setUserParticipation({ status: 'pending' });
    }

    setSubmitting(false);
  };

  const handleSignupRedirect = () => {
    sessionStorage.setItem('invite_token', token);
    navigate('/signup');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-[13px] text-fg-secondary">Loading...</p>
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="font-sans text-[26px] font-normal tracking-[-0.01em] mb-4">Invalid Invite</h1>
          <p className="font-mono text-[13px] text-fg-secondary mb-8">
            This invite link is invalid or has expired.
          </p>
          <Link to={user ? '/dashboard' : '/'} className="btn-secondary">
            {user ? 'Go to Dashboard' : 'Go Home'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <Link to="/" className="font-mono text-[14px] font-medium uppercase tracking-[0.1em]">LFG</Link>
          <h1 className="font-sans text-[22px] font-normal tracking-[-0.01em] mt-4">You've been invited to a workout</h1>
        </div>

        {/* Workout Preview Card */}
        {!user ? (
          <>
            {/* Teaser card for non-authenticated users */}
            <div className="card mb-6">
              <WorkoutCover imageUrl={workout.image_url} workoutType={workout.workout_type} />
              <div className="p-5 border-b border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge-type">{workout.workout_type}</span>
                </div>
                <h2 className="font-sans text-[18px] font-medium">{workout.name || workout.workout_type}</h2>
                <div className="flex items-center gap-2 mt-2">
                  {workout.host_type === 'club' && workout.clubs ? (
                    <>
                      <Avatar
                        name={workout.clubs.name}
                        avatarUrl={workout.clubs.avatar_url}
                        userId={workout.clubs.id}
                        size="sm"
                        linked={false}
                      />
                      <p className="font-mono text-[11px] text-fg-secondary">
                        Hosted by {workout.clubs.name}
                      </p>
                    </>
                  ) : (
                    <>
                      <Avatar
                        name={workout.profiles?.full_name}
                        avatarUrl={workout.profiles?.avatar_url}
                        userId={workout.creator_id}
                        size="sm"
                        linked={false}
                      />
                      <p className="font-mono text-[11px] text-fg-secondary">
                        Hosted by {workout.profiles?.full_name || 'Runner'}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="p-5 flex flex-col gap-2.5">
                <p className="font-mono text-[12px] text-fg-secondary">
                  {format(new Date(workout.workout_date), 'MMM d, yyyy · h:mm a')}
                </p>
                {workout.host_type !== 'club' && workout.clubs && (
                  <p className="font-mono text-[12px] text-fg-secondary">
                    Club: <Link to={`/clubs/${workout.clubs.id}`} className="text-accent underline hover:text-accent-dark transition-colors">{workout.clubs.name}</Link>
                  </p>
                )}
                <p className="font-mono text-[12px] text-fg-secondary">
                  {workout.workout_participants?.filter(p => p.status === 'accepted').length || 0} {(workout.workout_participants?.filter(p => p.status === 'accepted').length || 0) === 1 ? 'runner' : 'runners'} joined
                </p>
              </div>
            </div>

            {/* Locked section */}
            <div className="border border-border bg-surface-secondary p-6 mb-6 text-center">
              <Lock size={20} className="mx-auto text-fg-muted mb-3" />
              <p className="font-mono text-[12px] text-fg-secondary">
                Sign up to see the full details and request to join
              </p>
            </div>

            <div className="space-y-3">
              <button onClick={handleSignupRedirect} className="btn-accent w-full">
                Sign up to join
              </button>
              <p className="font-mono text-[11px] text-fg-muted text-center">
                Already have an account?{' '}
                <Link to="/signin" className="text-fg underline">Sign in</Link>
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Full card for authenticated users */}
            <div className="card mb-6">
              <WorkoutCover imageUrl={workout.image_url} workoutType={workout.workout_type} />
              <div className="p-5 border-b border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge-type">{workout.workout_type}</span>
                </div>
                <h2 className="font-sans text-[18px] font-medium">{workout.name || workout.workout_type}</h2>
                <div className="flex items-center gap-2 mt-2">
                  {workout.host_type === 'club' && workout.clubs ? (
                    <>
                      <Avatar
                        name={workout.clubs.name}
                        avatarUrl={workout.clubs.avatar_url}
                        userId={workout.clubs.id}
                        size="sm"
                        linked={false}
                      />
                      <p className="font-mono text-[11px] text-fg-secondary">
                        Hosted by <Link to={`/clubs/${workout.clubs.id}`} className="underline hover:text-fg transition-colors">{workout.clubs.name}</Link>
                      </p>
                    </>
                  ) : (
                    <>
                      <Avatar
                        name={workout.profiles?.full_name}
                        avatarUrl={workout.profiles?.avatar_url}
                        userId={workout.creator_id}
                        size="sm"
                        linked={false}
                      />
                      <p className="font-mono text-[11px] text-fg-secondary">
                        Hosted by {workout.profiles?.full_name || 'Runner'}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="p-5 flex flex-col gap-2.5">
                <p className="font-mono text-[12px] text-fg-secondary">
                  {format(new Date(workout.workout_date), 'MMM d, yyyy · h:mm a')}
                </p>
                <p className="font-mono text-[12px] text-fg-secondary">
                  {workout.location}
                </p>
                {workout.host_type !== 'club' && workout.clubs && (
                  <p className="font-mono text-[12px] text-fg-secondary">
                    Club: <Link to={`/clubs/${workout.clubs.id}`} className="text-accent underline hover:text-accent-dark transition-colors">{workout.clubs.name}</Link>
                  </p>
                )}
                {(workout.distance || workout.pace) && (
                  <p className="font-mono text-[12px] text-fg-secondary">
                    {workout.distance && `${workout.distance} km`}
                    {workout.distance && workout.pace && ' · '}
                    {workout.pace && `${workout.pace} min/km`}
                  </p>
                )}
                {workout.description && (
                  <p className="text-[13px] font-light text-fg-secondary line-clamp-3 mt-1">
                    {workout.description}
                  </p>
                )}
              </div>
            </div>
        </>
        )}

        {/* Actions for authenticated users */}
        {user && (
          <div>
            {userParticipation?.status === 'accepted' && (
              <div className="badge-open font-mono text-[12px] px-4 py-3 w-full text-center">
                You're already part of this workout
              </div>
            )}
            {userParticipation?.status === 'pending' && (
              <div className="badge-pending font-mono text-[12px] px-4 py-3 w-full text-center">
                Your request is pending approval
              </div>
            )}
            {!userParticipation && !requestSent && workout.creator_id !== user.id && (
              <button
                onClick={handleJoinRequest}
                disabled={submitting}
                className="btn-accent w-full disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Request to Join'}
              </button>
            )}
            {requestSent && (
              <div className="badge-pending font-mono text-[12px] px-4 py-3 w-full text-center">
                Request sent, waiting for approval
              </div>
            )}
            {workout.creator_id === user.id && (
              <Link to={`/workout/${workout.id}`} className="btn-primary w-full block text-center">
                View your workout
              </Link>
            )}
            <Link
              to={`/workout/${workout.id}`}
              className="block text-center font-mono text-[11px] text-fg-secondary underline hover:text-fg transition-colors mt-4"
            >
              View full workout details
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
