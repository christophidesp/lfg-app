import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { LogOut, Bell } from 'lucide-react';

export default function Navbar() {
  const { signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="border-b border-black bg-white px-6 py-4 flex items-center justify-between">
      <Link to="/dashboard" className="font-mono text-[14px] font-medium uppercase tracking-[0.1em]">
        LFG
      </Link>

      <div className="flex items-center gap-6">
        <Link
          to="/browse"
          className="font-mono text-[12px] uppercase tracking-[0.06em] text-gray-600 hover:text-black transition-colors"
        >
          Browse
        </Link>

        <Link
          to="/dashboard"
          className="font-mono text-[12px] uppercase tracking-[0.06em] text-gray-600 hover:text-black transition-colors"
        >
          Dashboard
        </Link>

        <Link
          to="/create-workout"
          className="btn-accent text-[11px] px-4 py-1.5"
        >
          Create
        </Link>

        <Link
          to="/notifications"
          className="relative font-mono text-[12px] uppercase tracking-[0.06em] text-gray-600 hover:text-black transition-colors"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </Link>

        <Link
          to="/profile"
          className="font-mono text-[12px] uppercase tracking-[0.06em] text-gray-600 hover:text-black transition-colors"
        >
          Profile
        </Link>

        <button
          onClick={handleSignOut}
          className="font-mono text-[12px] uppercase tracking-[0.06em] text-gray-600 hover:text-black transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  );
}
