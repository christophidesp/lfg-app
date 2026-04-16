import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Lock } from 'lucide-react';

export default function ClubInvitePage() {
  const { token } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [club, setClub] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [membership, setMembership] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    fetchInvite();
  }, [token, authLoading, user]);

  const fetchInvite = async () => {
    setLoading(true);

    const { data: inviteData, error: inviteError } = await supabase
      .from('club_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteError || !inviteData) {
      setInvalid(true);
      setLoading(false);
      return;
    }

    const { data: clubData } = await supabase
      .from('clubs')
      .select('*')
      .eq('id', inviteData.club_id)
      .single();

    if (!clubData) {
      setInvalid(true);
      setLoading(false);
      return;
    }

    setClub(clubData);

    const { data: membersData } = await supabase
      .from('club_members')
      .select('id, status, role, user_id')
      .eq('club_id', inviteData.club_id);

    if (membersData) {
      setMemberCount(membersData.filter(m => m.status === 'approved').length);
      if (user) {
        const userMembership = membersData.find(m => m.user_id === user.id);
        setMembership(userMembership || null);
      }
    }

    setLoading(false);
  };

  const handleJoinRequest = async () => {
    setSubmitting(true);

    const { error } = await supabase
      .from('club_members')
      .insert([{ club_id: club.id, user_id: user.id, role: 'member', status: 'pending' }]);

    if (!error) {
      setRequestSent(true);
      setMembership({ status: 'pending' });
    }

    setSubmitting(false);
  };

  const handleSignupRedirect = () => {
    sessionStorage.setItem('club_invite_token', token);
    navigate('/signup', { state: { from: `/clubs/invite/${token}` } });
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
          <Link to={user ? '/clubs' : '/'} className="btn-secondary">
            {user ? 'Browse Clubs' : 'Go Home'}
          </Link>
        </div>
      </div>
    );
  }

  const isAdminOrOwner = membership && ['owner', 'admin'].includes(membership.role) && membership.status === 'approved';

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <Link to="/" className="font-mono text-[14px] font-medium uppercase tracking-[0.1em]">LFG</Link>
          <h1 className="font-sans text-[22px] font-normal tracking-[-0.01em] mt-4">You've been invited to a club</h1>
        </div>

        {/* Club Preview Card */}
        <div className="card mb-6">
          <div className="p-5 border-b border-border">
            <div className="flex items-center gap-3">
              {club.avatar_url ? (
                <img src={club.avatar_url} alt={club.name} className="w-12 h-12 object-cover border border-border flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 bg-surface-secondary border border-border flex items-center justify-center flex-shrink-0">
                  <span className="font-mono text-[16px] font-medium text-fg-secondary">
                    {club.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h2 className="font-sans text-[18px] font-medium">{club.name}</h2>
                <p className="font-mono text-[11px] text-fg-secondary">
                  {memberCount} {memberCount === 1 ? 'member' : 'members'}
                </p>
              </div>
            </div>
          </div>
          {club.description && (
            <div className="p-5">
              <p className="text-[13px] font-light text-fg-secondary">{club.description}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {!user ? (
          <>
            <div className="border border-border bg-surface-secondary p-6 mb-6 text-center">
              <Lock size={20} className="mx-auto text-fg-muted mb-3" />
              <p className="font-mono text-[12px] text-fg-secondary">
                Sign up to see the full details and request to join
              </p>
            </div>
            <div className="space-y-3">
              <button onClick={handleSignupRedirect} className="btn-accent w-full">
                Sign up to join this club
              </button>
              <p className="font-mono text-[11px] text-fg-muted text-center">
                Already have an account?{' '}
                <Link to="/signin" state={{ from: `/clubs/invite/${token}` }} className="text-fg underline">Sign in</Link>
              </p>
            </div>
          </>
        ) : (
          <div>
            {membership?.status === 'approved' && (
              <>
                <div className="badge-open font-mono text-[12px] px-4 py-3 w-full text-center">
                  You're already a member of this club
                </div>
                <Link
                  to={`/clubs/${club.id}`}
                  className="block text-center font-mono text-[11px] text-fg-secondary underline hover:text-fg transition-colors mt-4"
                >
                  Go to club
                </Link>
              </>
            )}
            {membership?.status === 'pending' && (
              <div className="badge-pending font-mono text-[12px] px-4 py-3 w-full text-center">
                Your request to join is pending approval
              </div>
            )}
            {!membership && !requestSent && (
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
          </div>
        )}
      </div>
    </div>
  );
}
