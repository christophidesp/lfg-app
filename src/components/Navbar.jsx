import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { supabase } from '../lib/supabase';
import { Bell, CalendarDays } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Avatar from './Avatar';

const NOTIFICATION_CONFIG = {
  join_request: {
    message: (n) => `${n.from_profile?.full_name || 'Someone'} requested to join your workout`,
  },
  join_accepted: {
    message: (n) => `${n.from_profile?.full_name || 'The host'} accepted your request to join`,
  },
  join_rejected: {
    message: (n) => `${n.from_profile?.full_name || 'The host'} declined your request to join`,
  },
  workout_updated: {
    message: (n) => `${n.from_profile?.full_name || 'The host'} updated a workout you joined`,
  },
};

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { unreadCount, refreshNotifications } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef(null);
  const avatarRef = useRef(null);

  const isHome = location.pathname === '/' || location.pathname === '/home';
  const isClubs = location.pathname === '/clubs' || location.pathname.startsWith('/clubs/');
  const isCalendar = location.pathname === '/calendar';

  // Fetch profile
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [user?.id]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setShowAvatarMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleBellClick = async () => {
    const next = !showNotifications;
    setShowNotifications(next);
    setShowAvatarMenu(false);
    if (next) {
      setNotifLoading(true);
      const { data } = await supabase
        .from('notifications')
        .select(`
          *,
          from_profile:profiles!from_user_id (full_name),
          workouts (workout_type, location)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(8);
      setNotifications(data || []);
      setNotifLoading(false);
      // Mark as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
      refreshNotifications();
    }
  };

  const handleAvatarClick = () => {
    setShowAvatarMenu(!showAvatarMenu);
    setShowNotifications(false);
  };

  const handleSignOut = async () => {
    setShowAvatarMenu(false);
    await signOut();
    navigate('/');
  };

  return (
    <nav className="border-b border-border-strong bg-surface px-6 py-0 flex items-center justify-between">
      <Link
        to="/"
        className={`font-mono text-[14px] font-medium uppercase tracking-[0.1em] py-4 ${
          isHome ? 'border-b-2 border-accent' : 'border-b-2 border-transparent'
        }`}
      >
        LFG
      </Link>

      <div className="flex items-center gap-5">
        <Link
          to="/clubs"
          className={`font-mono text-[12px] uppercase tracking-[0.06em] text-fg-secondary hover:text-fg transition-colors py-4 ${
            isClubs ? 'border-b-2 border-accent' : 'border-b-2 border-transparent'
          }`}
        >
          Clubs
        </Link>

        <Link
          to="/calendar"
          className={`flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.06em] text-fg-secondary hover:text-fg transition-colors py-4 ${
            isCalendar ? 'border-b-2 border-accent' : 'border-b-2 border-transparent'
          }`}
        >
          <CalendarDays size={15} className="sm:hidden" />
          <span className="hidden sm:inline">Calendar</span>
          <CalendarDays size={14} className="hidden sm:inline" />
        </Link>

        {/* Bell with dropdown */}
        <div ref={notifRef} className="relative">
          <button
            onClick={handleBellClick}
            className="relative text-fg-secondary hover:text-fg transition-colors"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-8 w-[320px] border border-border bg-surface z-50 max-h-[400px] overflow-y-auto">
              <div className="px-3 py-2 border-b border-border">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-secondary">
                  Notifications
                </span>
              </div>
              {notifLoading ? (
                <div className="px-3 py-4">
                  <p className="font-mono text-[11px] text-fg-muted">Loading…</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-3 py-4">
                  <p className="font-mono text-[11px] text-fg-muted">No notifications</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const config = NOTIFICATION_CONFIG[n.type];
                  return (
                    <Link
                      key={n.id}
                      to={`/workout/${n.workout_id}`}
                      onClick={() => setShowNotifications(false)}
                      className="flex gap-2 items-start px-3 py-2.5 border-b border-border hover:bg-surface-secondary transition-colors"
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                          n.read ? 'bg-border' : 'bg-accent'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] leading-snug">
                          {config?.message(n) || n.type}
                        </p>
                        <p className="font-mono text-[10px] text-fg-muted mt-0.5">
                          {n.workouts?.workout_type} · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </Link>
                  );
                })
              )}
              <Link
                to="/notifications"
                onClick={() => setShowNotifications(false)}
                className="block px-3 py-2 font-mono text-[11px] uppercase tracking-[0.06em] text-fg-secondary hover:text-fg text-center border-t border-border transition-colors"
              >
                View all
              </Link>
            </div>
          )}
        </div>

        {/* Avatar with dropdown */}
        <div ref={avatarRef} className="relative">
          <button onClick={handleAvatarClick} className="flex-shrink-0">
            <Avatar
              name={profile?.full_name}
              avatarUrl={profile?.avatar_url}
              userId={user?.id}
              size="sm"
              linked={false}
            />
          </button>

          {showAvatarMenu && (
            <div className="absolute right-0 top-9 w-[160px] border border-border bg-surface z-50">
              <Link
                to={`/profile/${user?.id}`}
                onClick={() => setShowAvatarMenu(false)}
                className="block px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.06em] text-fg-secondary hover:text-fg hover:bg-surface-secondary transition-colors"
              >
                My profile
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.06em] text-fg-secondary hover:text-fg hover:bg-surface-secondary transition-colors border-t border-border"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
