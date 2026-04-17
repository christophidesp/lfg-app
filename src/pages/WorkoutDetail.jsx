import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { APP_BASE_URL } from '../lib/config';
import { format } from 'date-fns';
import Avatar from '../components/Avatar';
import { Share2, Check, Pencil } from 'lucide-react';
import WorkoutCover from '../components/WorkoutCover';
import ReportButton from '../components/ReportButton';

export default function WorkoutDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [race, setRace] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [userParticipation, setUserParticipation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchWorkoutDetails();
  }, [id, user]);

  const fetchWorkoutDetails = async () => {
    setLoading(true);

    const { data: workoutData } = await supabase
      .from('workouts')
      .select(`
        *,
        profiles!creator_id (full_name, avatar_url),
        clubs!club_id (id, name, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (workoutData) {
      setWorkout(workoutData);

      // Fetch linked race if present
      if (workoutData.race_id) {
        const { data: raceData } = await supabase
          .from('races')
          .select('*')
          .eq('id', workoutData.race_id)
          .single();
        setRace(raceData || null);
      } else {
        setRace(null);
      }

      const { data: participantsData } = await supabase
        .from('workout_participants')
        .select(`
          *,
          profiles!user_id (full_name, avatar_url)
        `)
        .eq('workout_id', id)
        .order('created_at', { ascending: true });

      setParticipants(participantsData || []);

      const userPart = participantsData?.find(p => p.user_id === user.id);
      setUserParticipation(userPart || null);

      const { data: commentsData } = await supabase
        .from('workout_comments')
        .select(`
          *,
          profiles!user_id (full_name, avatar_url)
        `)
        .eq('workout_id', id)
        .order('created_at', { ascending: true });

      setComments(commentsData || []);
    }

    setLoading(false);
  };

  const handleRequestJoin = async () => {
    setSubmitting(true);

    const { error } = await supabase
      .from('workout_participants')
      .insert([
        {
          workout_id: id,
          user_id: user.id,
          status: 'pending'
        }
      ]);

    if (!error) {
      await supabase.from('notifications').insert([
        {
          user_id: workout.creator_id,
          type: 'join_request',
          workout_id: id,
          from_user_id: user.id,
        }
      ]);
      fetchWorkoutDetails();
    }

    setSubmitting(false);
  };

  const handleCancelRequest = async () => {
    setSubmitting(true);

    const { error } = await supabase
      .from('workout_participants')
      .delete()
      .eq('id', userParticipation.id);

    if (!error) {
      fetchWorkoutDetails();
    }

    setSubmitting(false);
  };

  const handleApprove = async (participantId) => {
    const participant = participants.find(p => p.id === participantId);
    const { error } = await supabase
      .from('workout_participants')
      .update({ status: 'accepted' })
      .eq('id', participantId);

    if (!error) {
      if (participant) {
        await supabase.from('notifications').insert([
          {
            user_id: participant.user_id,
            type: 'join_accepted',
            workout_id: id,
            from_user_id: user.id,
          }
        ]);
      }
      fetchWorkoutDetails();
    }
  };

  const handleReject = async (participantId) => {
    const participant = participants.find(p => p.id === participantId);
    const { error } = await supabase
      .from('workout_participants')
      .update({ status: 'rejected' })
      .eq('id', participantId);

    if (!error) {
      if (participant) {
        await supabase.from('notifications').insert([
          {
            user_id: participant.user_id,
            type: 'join_rejected',
            workout_id: id,
            from_user_id: user.id,
          }
        ]);
      }
      fetchWorkoutDetails();
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);

    const { error } = await supabase
      .from('workout_comments')
      .insert([
        {
          workout_id: id,
          user_id: user.id,
          comment: newComment.trim()
        }
      ]);

    if (!error) {
      setNewComment('');
      fetchWorkoutDetails();
    }

    setSubmitting(false);
  };

  const handleShare = async () => {
    setShareLoading(true);

    // Check if invite already exists
    const { data: existing } = await supabase
      .from('workout_invites')
      .select('token')
      .eq('workout_id', id)
      .maybeSingle();

    if (existing) {
      setInviteToken(existing.token);
    } else {
      const { data: newInvite } = await supabase
        .from('workout_invites')
        .insert([{ workout_id: id, created_by: user.id }])
        .select('token')
        .single();

      if (newInvite) {
        setInviteToken(newInvite.token);
      }
    }

    setShareLoading(false);
  };

  const handleCopyLink = async () => {
    const url = `${APP_BASE_URL}/invite/${inviteToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this workout? All accepted participants will be notified.')) return;

    const { error } = await supabase
      .from('workouts')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-[13px] text-fg-secondary">Loading workout...</p>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-[13px] text-fg-secondary">Workout not found</p>
      </div>
    );
  }

  const isCreator = workout.creator_id === user.id;
  const acceptedParticipants = participants.filter(p => p.status === 'accepted');
  const pendingParticipants = participants.filter(p => p.status === 'pending');
  const hasMax = workout.max_participants != null;
  const isFull = hasMax && acceptedParticipants.length >= workout.max_participants;
  const spotsLeft = hasMax ? workout.max_participants - acceptedParticipants.length : null;

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="max-w-3xl mx-auto px-6">
        {/* Cancelled banner */}
        {workout.cancelled_at && (
          <div className="border border-[#EF4444] bg-[#EF4444]/10 px-5 py-3 mb-4">
            <p className="font-mono text-[12px] uppercase tracking-[0.06em] text-[#EF4444]">
              This workout has been cancelled
            </p>
          </div>
        )}

        {/* Workout Card */}
        <div className="card mb-6">
          <WorkoutCover imageUrl={workout.image_url} workoutType={workout.workout_type} />
          {/* Header */}
          <div className="p-5 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="badge-type">{workout.workout_type}</span>
                {isFull ? (
                  <span className="badge-full">Full</span>
                ) : (
                  <span className="badge-open">Open</span>
                )}
              </div>
              {hasMax && (
                <span className="font-mono text-[12px] text-fg-secondary">
                  {acceptedParticipants.length}/{workout.max_participants}
                </span>
              )}
            </div>
            <h1 className="font-sans text-[26px] font-normal tracking-[-0.01em]">{workout.name || workout.workout_type}</h1>
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
                  />
                  <p className="font-mono text-[11px] text-fg-secondary">
                    Hosted by <Link to={`/profile/${workout.creator_id}`} className="underline hover:text-fg transition-colors">{workout.profiles?.full_name || 'Runner'}</Link>
                  </p>
                </>
              )}
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
            {(workout.distance || workout.pace) && (
              <p className="font-mono text-[12px] text-fg-secondary">
                {workout.distance && `${workout.distance} km`}
                {workout.distance && workout.pace && ' · '}
                {workout.pace && `${workout.pace} min/km`}
              </p>
            )}
            {workout.description && (
              <p className="text-[13px] font-light text-fg-secondary leading-relaxed mt-2">
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
                      style={{ width: `${(acceptedParticipants.length / workout.max_participants) * 100}%` }}
                    />
                  </div>
                  <p className="font-mono text-[10px] text-fg-secondary mt-1.5">
                    {isFull ? 'Full' : `${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left`}
                  </p>
                </>
              ) : (
                <p className="font-mono text-[10px] text-fg-secondary">
                  {acceptedParticipants.length} joined
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isCreator && !inviteToken && (
                <button
                  onClick={handleShare}
                  disabled={shareLoading}
                  className="btn-secondary flex items-center gap-1.5"
                >
                  <Share2 size={13} />
                  {shareLoading ? 'Generating...' : 'Share'}
                </button>
              )}
              {isCreator && inviteToken && (
                <button
                  onClick={handleCopyLink}
                  className="btn-secondary flex items-center gap-1.5"
                >
                  {copied ? <><Check size={13} /> Copied!</> : <><Share2 size={13} /> Copy link</>}
                </button>
              )}
              {isCreator && !workout.cancelled_at && (
                <Link
                  to={`/workout/${id}/edit`}
                  className="btn-secondary flex items-center gap-1.5"
                >
                  <Pencil size={13} />
                  Edit
                </Link>
              )}
              {isCreator && !workout.cancelled_at && (
                <button
                  onClick={handleCancel}
                  className="btn-decline"
                >
                  Cancel
                </button>
              )}
              {!isCreator && (
                <ReportButton workoutId={id} />
              )}
            </div>
          </div>
        </div>

        {/* Race Info Card */}
        {race && (
          <div className="border border-border border-l-[2px] border-l-accent p-5 mb-6" style={{ borderTopWidth: '0.5px', borderRightWidth: '0.5px', borderBottomWidth: '0.5px' }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-muted mb-1">Linked Race</p>
            <h3 className="font-sans text-[18px] font-medium text-fg mb-2">{race.name}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {race.distance_label && (
                <span className="font-mono text-[12px] text-fg-secondary">{race.distance_label}</span>
              )}
              {race.date && (
                <span className="font-mono text-[12px] text-fg-secondary">
                  {new Date(race.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
              {race.location && (
                <span className="font-mono text-[12px] text-fg-secondary">{race.location}</span>
              )}
            </div>
            {race.url && (
              <a
                href={race.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block font-mono text-[11px] text-accent hover:underline mt-3"
              >
                Race website &rarr;
              </a>
            )}
          </div>
        )}

        {/* Join Actions */}
        {!isCreator && !workout.cancelled_at && (
          <div className="mb-6">
            {!userParticipation && (
              <button
                onClick={handleRequestJoin}
                disabled={submitting || isFull}
                className="w-full btn-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFull ? 'Workout is Full' : 'Request to Join'}
              </button>
            )}
            {userParticipation?.status === 'pending' && (
              <div className="space-y-3">
                <div className="badge-pending font-mono text-[12px] px-4 py-3 w-full text-center">
                  Your join request is pending approval
                </div>
                <button
                  onClick={handleCancelRequest}
                  disabled={submitting}
                  className="btn-secondary w-full"
                >
                  Cancel Request
                </button>
              </div>
            )}
            {userParticipation?.status === 'accepted' && (
              <div className="space-y-3">
                <div className="badge-open font-mono text-[12px] px-4 py-3 w-full text-center">
                  You're joining this workout
                </div>
                <button
                  onClick={handleCancelRequest}
                  disabled={submitting}
                  className="btn-secondary w-full"
                >
                  Leave Workout
                </button>
              </div>
            )}
          </div>
        )}

        {/* Participants */}
        <div className="border-t border-border-strong pt-6 mb-8">
          <p className="section-label">Participants</p>

          {acceptedParticipants.length === 0 && pendingParticipants.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-mono text-[13px] text-fg-secondary">No participants yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {acceptedParticipants.length > 0 && (
                <div>
                  <p className="mono-label mb-3">Confirmed</p>
                  <div className="space-y-0">
                    {acceptedParticipants.map(participant => (
                      <div key={participant.id} className="border border-border p-3 flex items-center justify-between bg-surface-secondary">
                        <Link to={`/profile/${participant.user_id}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                          <Avatar
                            name={participant.profiles?.full_name}
                            avatarUrl={participant.profiles?.avatar_url}
                            userId={participant.user_id}
                            size="sm"
                            linked={false}
                          />
                          <span className="font-mono text-[13px] font-medium">
                            {participant.profiles?.full_name || 'Runner'}
                          </span>
                        </Link>
                        <span className="badge-open">Accepted</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isCreator && pendingParticipants.length > 0 && (
                <div>
                  <p className="mono-label mb-3">Pending Requests</p>
                  <div className="space-y-0">
                    {pendingParticipants.map(participant => (
                      <div key={participant.id} className="border border-border p-3 flex items-center justify-between">
                        <Link to={`/profile/${participant.user_id}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                          <Avatar
                            name={participant.profiles?.full_name}
                            avatarUrl={participant.profiles?.avatar_url}
                            userId={participant.user_id}
                            size="sm"
                            linked={false}
                          />
                          <span className="font-mono text-[13px] font-medium">
                            {participant.profiles?.full_name || 'Runner'}
                          </span>
                        </Link>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(participant.id)}
                            className="btn-accept"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleReject(participant.id)}
                            className="btn-decline"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="border-t border-border-strong pt-6">
          <p className="section-label">Comments</p>

          {/* Comment input */}
          <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="input-field flex-1"
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Post
            </button>
          </form>

          {comments.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-mono text-[13px] text-fg-secondary">No comments yet. Be the first to comment.</p>
            </div>
          ) : (
            <div>
              {comments.map((comment, index) => (
                <div
                  key={comment.id}
                  className={`border border-border p-4 ${index === comments.length - 1 ? 'bg-surface-secondary' : ''}`}
                >
                  <div className="flex items-center">
                    <span className="font-mono text-[11px] font-medium">
                      {comment.profiles?.full_name || 'Runner'}
                    </span>
                    <span className="font-mono text-[10px] text-fg-muted ml-2">
                      {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-[13px] text-fg-secondary leading-relaxed mt-1.5">
                    {comment.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
