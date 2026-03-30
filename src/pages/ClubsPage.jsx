import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Avatar from '../components/Avatar';

export default function ClubsPage() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clubs')
      .select(`
        *,
        club_members (id, status)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setClubs(data);
    }
    setLoading(false);
  };

  const getMemberCount = (club) => {
    return club.club_members?.filter(m => m.status === 'approved').length || 0;
  };

  const filtered = clubs.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-[13px] text-fg-secondary">Loading clubs...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-sans text-[26px] font-normal tracking-[-0.01em]">Clubs</h1>
          {user && (
            <Link to="/clubs/new" className="btn-accent text-[11px] px-4 py-1.5">
              Create Club
            </Link>
          )}
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clubs..."
            className="input-field"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-mono text-[13px] text-fg-secondary">
              {search ? 'No clubs match your search.' : 'No clubs yet. Be the first to create one!'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((club) => {
              const memberCount = getMemberCount(club);
              return (
                <Link
                  key={club.id}
                  to={`/clubs/${club.id}`}
                  className="card hover:border-fg transition-colors"
                >
                  <div className="p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                      {club.avatar_url ? (
                        <img
                          src={club.avatar_url}
                          alt={club.name}
                          className="w-10 h-10 object-cover border border-border"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-surface-secondary border border-border flex items-center justify-center">
                          <span className="font-mono text-[14px] font-medium text-fg-secondary">
                            {club.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-sans text-[15px] font-medium">{club.name}</h3>
                        <p className="font-mono text-[11px] text-fg-secondary">
                          {memberCount} {memberCount === 1 ? 'member' : 'members'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {club.description && (
                    <div className="p-5">
                      <p className="text-[13px] font-light text-fg-secondary line-clamp-2">
                        {club.description}
                      </p>
                    </div>
                  )}
                  <div className="px-5 py-3.5 bg-surface-secondary border-t border-border flex items-center justify-end">
                    <span className="btn-primary text-[10px] px-3 py-1">View</span>
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
