import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';

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
};

export default function Notifications() {
  const { user } = useAuth();
  const { refreshNotifications } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    markAllAsRead();
  }, [user]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select(`
        *,
        from_profile:profiles!from_user_id (full_name),
        workouts (workout_type, location)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setNotifications(data || []);
    setLoading(false);
  };

  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    refreshNotifications();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-[13px] text-gray-600">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="font-sans text-[26px] font-normal tracking-[-0.01em] mb-8">Notifications</h1>

        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-mono text-[13px] text-gray-600">No notifications yet</p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => {
              const config = NOTIFICATION_CONFIG[notification.type];

              return (
                <Link
                  key={notification.id}
                  to={`/workout/${notification.workout_id}`}
                  className={`border border-gray-200 p-3 flex gap-3 items-start hover:border-black transition-colors ${
                    notification.read ? 'bg-gray-100' : ''
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${
                      notification.read ? 'bg-gray-200' : 'bg-accent'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-snug">
                      {config.message(notification)}
                    </p>
                    <p className="font-mono text-[11px] text-gray-600 mt-1">
                      {notification.workouts?.workout_type} · {notification.workouts?.location}
                    </p>
                    <p className="font-mono text-[10px] text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
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
