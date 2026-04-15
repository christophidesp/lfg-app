import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ClubsPage() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [maxDistance, setMaxDistance] = useState(51); // 51 = "Any"

  useEffect(() => {
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
    fetchClubs();
  }, []);

  // Request geolocation (same pattern as Home)
  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'granted' || result.state === 'prompt') {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          () => {}
        );
      }
    });
  }, []);

  const getMemberCount = (club) => {
    return club.club_members?.filter(m => m.status === 'approved').length || 0;
  };

  const hasLocation = !!userLocation;
  const isAny = maxDistance > 50;

  const withDistance = useMemo(() => {
    return clubs.map((c) => {
      let dist = null;
      if (hasLocation && c.lat != null && c.lng != null) {
        dist = haversineDistance(userLocation.lat, userLocation.lng, c.lat, c.lng);
      }
      return { ...c, _distance: dist };
    });
  }, [clubs, userLocation, hasLocation]);

  const filtered = useMemo(() => {
    let list = withDistance.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );

    if (hasLocation && !isAny) {
      // Clubs with location within range
      const inRange = list
        .filter(c => c._distance !== null && c._distance <= maxDistance)
        .sort((a, b) => a._distance - b._distance);
      // Clubs without location go at the bottom
      const noLocation = list.filter(c => c._distance === null);
      return [...inRange, ...noLocation];
    }

    if (hasLocation) {
      // "Any" selected but we have location — sort by distance, no-location at bottom
      const withDist = list.filter(c => c._distance !== null).sort((a, b) => a._distance - b._distance);
      const noDist = list.filter(c => c._distance === null);
      return [...withDist, ...noDist];
    }

    return list;
  }, [withDistance, search, hasLocation, isAny, maxDistance]);

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

        {/* Distance slider — only shown when user location is available */}
        {hasLocation && (
          <div className="flex items-center gap-4 mb-6 border border-border p-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-fg-secondary flex-shrink-0">
              Distance
            </span>
            <input
              type="range"
              min="1"
              max="51"
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className="distance-slider flex-1"
            />
            <span className="font-mono text-[12px] text-fg-secondary w-[80px] text-right">
              {isAny ? 'Any' : `within ${maxDistance} km`}
            </span>
          </div>
        )}

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
                      <div className="min-w-0 flex-1">
                        <h3 className="font-sans text-[15px] font-medium">{club.name}</h3>
                        <p className="font-mono text-[11px] text-fg-secondary">
                          {memberCount} {memberCount === 1 ? 'member' : 'members'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {(club.description || club._distance !== null || (hasLocation && club._distance === null)) && (
                    <div className="p-5">
                      {club.description && (
                        <p className="text-[13px] font-light text-fg-secondary line-clamp-2">
                          {club.description}
                        </p>
                      )}
                      {hasLocation && (
                        <p className={`font-mono text-[11px] mt-2 ${club._distance !== null ? 'text-accent-dark font-medium' : 'text-fg-muted'}`}>
                          {club._distance !== null
                            ? club._distance < 1
                              ? `${Math.round(club._distance * 1000)} m away`
                              : `${club._distance.toFixed(1)} km away`
                            : 'No location set'}
                        </p>
                      )}
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
