import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import Avatar from '../components/Avatar';
import WorkoutCover from '../components/WorkoutCover';
import ReportButton from '../components/ReportButton';

export default function ClubDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState(null); // user's own membership
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('workouts');

  const isAdmin = membership && ['owner', 'admin'].includes(membership.role) && membership.status === 'approved';
  const isMember = membership && membership.status === 'approved';
  const isPending = membership && membership.status === 'pending';

  useEffect(() => {
    fetchClub();
  }, [id]);

  const fetchClub = async () => {
    setLoading(true);

    // Fetch club
    const { data: clubData, error: clubError } = await supabase
      .from('clubs')
      .select('*')
      .eq('id', id)
      .single();

    if (clubError || !clubData) {
      setLoading(false);
      return;
    }
    setClub(clubData);

    // Fetch all members
    const { data: membersData } = await supabase
      .from('club_members')
      .select(`
        *,
        profiles:user_id (id, full_name, avatar_url)
      `)
      .eq('club_id', id);

    if (membersData) {
      setMembers(membersData.filter(m => m.status === 'approved'));
      setPendingMembers(membersData.filter(m => m.status === 'pending'));
      const userMembership = membersData.find(m => m.user_id === user.id);
      setMembership(userMembership || null);
    }

    // Fetch club workouts (only if member — we'll gate display in JSX)
    const { data: workoutsData } = await supabase
      .from('workouts')
      .select(`
        *,
        profiles!creator_id (full_name, avatar_url),
        workout_participants (id, status)
      `)
      .eq('club_id', id)
      .order('workout_date', { ascending: true });

    if (workoutsData) {
      setWorkouts(workoutsData);
    }

    setLoading(false);
  };

  const handleJoinRequest = async () => {
    setActionLoading(true);
    const { error } = await supabase
      .from('club_members')
      .insert([{ club_id: id, user_id: user.id, role: 'member', status: 'pending' }]);

    if (!error) {
      setMembership({ club_id: id, user_id: user.id, role: 'member', status: 'pending' });
    }
    setActionLoading(false);
  };

  const handleMembershipAction = async (memberId, action) => {
    setActionLoading(true);
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const { error } = await supabase
      .from('club_members')
      .update({ status: newStatus })
      .eq('id', memberId);

    if (!error) {
      fetchClub();
    }
    setActionLoading(false);
  };

  const getParticipantCount = (workout) => {
    return workout.workout_participants?.filter(p => p.status === 'accepted').length || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-[13px] text-fg-secondary">Loading club...</p>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-[13px] text-fg-secondary">Club not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="max-w-3xl mx-auto px-6">
        {/* Club Header */}
        <div className="border border-border bg-surface p-6 mb-6">
          <div className="flex items-start gap-4">
            {club.avatar_url ? (
              <img src={club.avatar_url} alt={club.name} className="w-16 h-16 object-cover border border-border flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 bg-surface-secondary border border-border flex items-center justify-center flex-shrink-0">
                <span className="font-mono text-[22px] font-medium text-fg-secondary">
                  {club.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-sans text-[26px] font-normal tracking-[-0.01em]">{club.name}</h1>
              {club.description && (
                <p className="text-[13px] font-light text-fg-secondary mt-1">{club.description}</p>
              )}
              <p className="font-mono text-[11px] text-fg-muted mt-2">
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isAdmin && (
                <Link to={`/clubs/${id}/settings`} className="btn-secondary text-[11px] px-3 py-1.5">
                  Settings
                </Link>
              )}
              {!membership && (
                <button
                  onClick={handleJoinRequest}
                  disabled={actionLoading}
                  className="btn-accent text-[11px] px-4 py-1.5 disabled:opacity-50"
                >
                  Request to Join
                </button>
              )}
              {isPending && (
                <span className="badge-pending">Join Pending</span>
              )}
              {!isAdmin && (
                <ReportButton clubId={id} />
              )}
            </div>
          </div>
        </div>

        {/* Pending Requests (admin only) */}
        {isAdmin && pendingMembers.length > 0 && (
          <div className="border border-border bg-surface p-6 mb-6">
            <h2 className="section-label">Pending Requests ({pendingMembers.length})</h2>
            <div className="space-y-3">
              {pendingMembers.map((pm) => (
                <div key={pm.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={pm.profiles?.full_name}
                      avatarUrl={pm.profiles?.avatar_url}
                      userId={pm.user_id}
                      size="sm"
                      linked
                    />
                    <span className="font-mono text-[13px]">{pm.profiles?.full_name || 'Runner'}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMembershipAction(pm.id, 'approve')}
                      disabled={actionLoading}
                      className="btn-accept text-[10px] px-2.5 py-1"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleMembershipAction(pm.id, 'reject')}
                      disabled={actionLoading}
                      className="btn-decline text-[10px] px-2.5 py-1"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border mb-6">
          <button
            onClick={() => setActiveTab('workouts')}
            className={`font-mono text-[11px] uppercase tracking-[0.06em] px-4 py-2.5 border-b-2 transition-colors ${
              activeTab === 'workouts' ? 'border-accent text-fg' : 'border-transparent text-fg-secondary hover:text-fg'
            }`}
          >
            Workouts
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`font-mono text-[11px] uppercase tracking-[0.06em] px-4 py-2.5 border-b-2 transition-colors ${
              activeTab === 'members' ? 'border-accent text-fg' : 'border-transparent text-fg-secondary hover:text-fg'
            }`}
          >
            Members ({members.length})
          </button>
        </div>

        {/* Workouts Tab */}
        {activeTab === 'workouts' && (
          <>
            {!isMember ? (
              <div className="text-center py-16 border border-border">
                <p className="font-mono text-[13px] text-fg-secondary">
                  Join this club to see its workouts.
                </p>
              </div>
            ) : workouts.length === 0 ? (
              <div className="text-center py-16">
                <p className="font-mono text-[13px] text-fg-secondary">
                  No workouts yet.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {workouts.map((workout) => {
                  const count = getParticipantCount(workout);
                  const hasMax = workout.max_participants != null;
                  const isFull = hasMax && count >= workout.max_participants;
                  const isPast = new Date(workout.workout_date) < new Date();

                  return (
                    <Link
                      key={workout.id}
                      to={`/workout/${workout.id}`}
                      className={`card hover:border-fg transition-colors ${isPast ? 'opacity-60' : ''}`}
                    >
                      <WorkoutCover imageUrl={workout.image_url} workoutType={workout.workout_type} />
                      <div className="p-5 border-b border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="badge-type">{workout.workout_type}</span>
                          {hasMax ? (
                            isFull ? <span className="badge-full">Full</span> : <span className="badge-open">Open</span>
                          ) : (
                            <span className="badge-open">Open</span>
                          )}
                          {isPast && <span className="badge-full">Past</span>}
                        </div>
                        <h3 className="font-sans text-[15px] font-medium">{workout.name || workout.workout_type}</h3>
                      </div>
                      <div className="p-5 flex flex-col gap-2">
                        <p className="font-mono text-[12px] text-fg-secondary">
                          {format(new Date(workout.workout_date), 'MMM d, yyyy · h:mm a')}
                        </p>
                        <p className="font-mono text-[12px] text-fg-secondary">{workout.location}</p>
                        {workout.description && (
                          <p className="text-[13px] font-light text-fg-secondary line-clamp-2">{workout.description}</p>
                        )}
                      </div>
                      <div className="px-5 py-3.5 bg-surface-secondary border-t border-border flex items-center justify-end">
                        <span className="btn-primary text-[10px] px-3 py-1">View</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="border border-border bg-surface">
            {members.map((member, i) => (
              <div
                key={member.id}
                className={`flex items-center justify-between px-5 py-3.5 ${i < members.length - 1 ? 'border-b border-border' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    name={member.profiles?.full_name}
                    avatarUrl={member.profiles?.avatar_url}
                    userId={member.user_id}
                    size="sm"
                    linked
                  />
                  <span className="font-mono text-[13px]">{member.profiles?.full_name || 'Runner'}</span>
                </div>
                <span className={`font-mono text-[10px] uppercase tracking-[0.08em] px-2.5 py-[3px] border ${
                  member.role === 'owner'
                    ? 'bg-accent text-[#0A0A0A] border-accent'
                    : member.role === 'admin'
                    ? 'bg-surface-secondary text-fg-secondary border-border'
                    : 'text-fg-muted border-border'
                }`}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
