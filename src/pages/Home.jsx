import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format, isToday, isTomorrow } from 'date-fns';
import { loadLibrary } from '../lib/googleMaps';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import Avatar from '../components/Avatar';
import { X, ChevronRight } from 'lucide-react';
import { WORKOUT_TYPES } from '../constants/workoutTypes';

const ALL_CHIPS = ['All', ...WORKOUT_TYPES];

const NEAR_RADIUS_DEFAULT = 10;
const NEAR_RADIUS_EXPANDED = 25;

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

function formatHostName(fullName) {
  if (!fullName) return 'Runner';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

function spotsRemaining(workout) {
  const accepted = (workout.workout_participants || []).filter(
    (p) => p.status === 'accepted'
  ).length;
  return Math.max(0, (workout.max_participants || 5) - accepted);
}

function formatDateDivider(dateStr) {
  const date = new Date(dateStr);
  if (isToday(date)) return `Today — ${format(date, 'EEE d MMM')}`;
  if (isTomorrow(date)) return `Tomorrow — ${format(date, 'EEE d MMM')}`;
  return format(date, 'EEE d MMM');
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationRequested, setLocationRequested] = useState(false);
  const [searchLocation, setSearchLocation] = useState(null);
  const [searchLabel, setSearchLabel] = useState('');
  const [activeChip, setActiveChip] = useState('All');
  const [showMoreChips, setShowMoreChips] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ALL_CHIPS.length);
  const [showMap, setShowMap] = useState(false);
  const chipRowRef = useRef(null);
  const chipMeasureRef = useRef(null);

  // Check if location was previously granted
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          requestLocation();
        } else if (result.state === 'denied') {
          setLocationRequested(true);
        }
      });
    }
  }, []);

  // Fetch workouts
  useEffect(() => {
    const fetchWorkouts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          *,
          profiles!creator_id (id, full_name, avatar_url),
          workout_participants (id, status)
        `)
        .gte('workout_date', new Date().toISOString())
        .eq('visibility', 'public')
        .order('workout_date', { ascending: true });

      if (!error && data) {
        setWorkouts(data);
      }
      setLoading(false);
    };
    fetchWorkouts();
  }, []);

  // Measure how many chips fit in the row
  useEffect(() => {
    const measure = () => {
      const container = chipMeasureRef.current;
      if (!container) return;
      const chips = container.children;
      if (!chips.length) return;
      const containerRight = container.getBoundingClientRect().right;
      const gap = 8; // gap-2
      const moreWidth = 72; // approx width of "More +" chip
      const availableRight = containerRight - moreWidth - gap;
      let count = 0;
      for (let i = 0; i < chips.length; i++) {
        const chipRight = chips[i].getBoundingClientRect().right;
        if (chipRight <= availableRight) {
          count = i + 1;
        } else {
          break;
        }
      }
      // If all fit without needing "More +", show all
      const lastChipRight = chips[chips.length - 1].getBoundingClientRect().right;
      if (lastChipRight <= containerRight) {
        setVisibleCount(ALL_CHIPS.length);
      } else {
        setVisibleCount(Math.max(2, count)); // at least "All" + 1
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const visibleChips = ALL_CHIPS.slice(0, visibleCount);
  const overflowChips = ALL_CHIPS.slice(visibleCount);
  const hasOverflow = overflowChips.length > 0;

  const requestLocation = useCallback(() => {
    setLocationRequested(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationGranted(true);
      },
      () => {
        setLocationGranted(false);
      }
    );
  }, []);

  const origin = searchLocation || userLocation;
  const hasLocation = !!origin;

  const withDistance = useMemo(() => {
    return workouts.map((w) => {
      let dist = null;
      if (hasLocation && w.lat != null && w.lng != null) {
        dist = haversineDistance(origin.lat, origin.lng, w.lat, w.lng);
      }
      return { ...w, _distance: dist };
    });
  }, [workouts, origin, hasLocation]);

  const filtered = useMemo(() => {
    if (activeChip === 'All') return withDistance;
    return withDistance.filter((w) => w.workout_type === activeChip);
  }, [withDistance, activeChip]);

  // Near you cards — radius-filtered, sorted by distance
  const nearYouResult = useMemo(() => {
    if (!hasLocation) return { cards: [], radiusNote: null };

    const withDist = filtered.filter((w) => w._distance !== null);
    const sorted = [...withDist].sort((a, b) => a._distance - b._distance);

    const within10 = sorted.filter((w) => w._distance <= NEAR_RADIUS_DEFAULT);
    if (within10.length > 0) {
      return { cards: within10.slice(0, 10), radiusNote: null };
    }

    const within25 = sorted.filter((w) => w._distance <= NEAR_RADIUS_EXPANDED);
    if (within25.length > 0) {
      return {
        cards: within25.slice(0, 10),
        radiusNote: `No workouts within ${NEAR_RADIUS_DEFAULT} km — showing results within ${NEAR_RADIUS_EXPANDED} km`,
      };
    }

    return { cards: [], radiusNote: 'none' };
  }, [filtered, hasLocation]);

  // Upcoming workouts list — sorted by date then distance
  const upcomingList = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.workout_date);
      const dateB = new Date(b.workout_date);
      if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
      if (hasLocation && a._distance !== null && b._distance !== null) {
        return a._distance - b._distance;
      }
      return 0;
    });
  }, [filtered, hasLocation]);

  // Group upcoming by date
  const groupedUpcoming = useMemo(() => {
    const groups = [];
    let currentKey = '';
    for (const w of upcomingList) {
      const dateKey = format(new Date(w.workout_date), 'yyyy-MM-dd');
      if (dateKey !== currentKey) {
        currentKey = dateKey;
        groups.push({ dateKey, label: formatDateDivider(w.workout_date), items: [] });
      }
      groups[groups.length - 1].items.push(w);
    }
    return groups;
  }, [upcomingList]);

  const handlePlaceSelect = useCallback(({ address, lat, lng }) => {
    if (lat != null && lng != null) {
      setSearchLocation({ lat, lng });
      setSearchLabel(address);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchLocation(null);
    setSearchLabel('');
  }, []);

  const todayLabel = format(new Date(), "'Today ·' EEE d MMM").toUpperCase();

  // All geo-tagged workouts for the map (not radius-limited)
  const geoWorkouts = useMemo(
    () => withDistance.filter((w) => w.lat != null && w.lng != null),
    [withDistance]
  );

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="max-w-5xl mx-auto px-6">
        {/* Hero */}
        <section className="pt-10 pb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-secondary mb-3">
            {todayLabel}
          </p>
          <h1 className="text-[32px] font-light leading-tight mb-2">
            Find your next <span className="text-accent">run</span>
          </h1>
          <p className="text-[14px] text-fg-secondary font-light leading-relaxed mb-6">
            Find your people. Show up. Run.
          </p>

          {/* Search bar */}
          {searchLabel ? (
            <div className="border border-border-strong bg-surface-elevated h-[48px] flex items-center px-3 justify-between">
              <span className="font-mono text-[13px] text-fg truncate">{searchLabel}</span>
              <button onClick={clearSearch} className="text-fg-muted hover:text-fg ml-2 flex-shrink-0">
                <X size={16} />
              </button>
            </div>
          ) : (
            <PlacesAutocomplete onChange={handlePlaceSelect} />
          )}
        </section>

        {/* Hidden measurement row — renders all chips off-screen to measure */}
        <div
          ref={chipMeasureRef}
          aria-hidden="true"
          className="flex gap-2 -mx-6 px-6 overflow-hidden h-0 pointer-events-none"
        >
          {ALL_CHIPS.map((chip) => (
            <span
              key={chip}
              className="font-mono text-[11px] uppercase tracking-[0.06em] px-4 py-2 border border-border whitespace-nowrap flex-shrink-0"
            >
              {chip}
            </span>
          ))}
        </div>

        {/* Filter chips */}
        <div ref={chipRowRef} className="flex gap-2 pb-2 -mx-6 px-6">
          {visibleChips.map((chip) => (
            <ChipButton
              key={chip}
              label={chip}
              active={activeChip === chip}
              onClick={() => { setActiveChip(chip); setShowMoreChips(false); }}
            />
          ))}
          {hasOverflow && (
            <ChipButton
              label="More +"
              active={showMoreChips && !visibleChips.includes(activeChip)}
              onClick={() => setShowMoreChips((v) => !v)}
            />
          )}
        </div>
        {showMoreChips && hasOverflow && (
          <div className="flex gap-2 flex-wrap pb-2 -mx-6 px-6">
            {overflowChips.map((chip) => (
              <ChipButton
                key={chip}
                label={chip}
                active={activeChip === chip}
                onClick={() => { setActiveChip(chip); setShowMoreChips(false); }}
              />
            ))}
          </div>
        )}
        <div className="pb-4" />

        {/* Near you section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-secondary">
              Near you
            </h2>
            {hasLocation && geoWorkouts.length > 0 && (
              <button
                onClick={() => setShowMap(true)}
                className="font-mono text-[11px] uppercase tracking-[0.06em] text-fg-secondary hover:text-fg transition-colors"
              >
                See map →
              </button>
            )}
          </div>

          {!locationGranted && !locationRequested ? (
            <NearYouBanner onAllow={requestLocation} />
          ) : !locationGranted && locationRequested && !searchLocation ? (
            <NearYouBanner onAllow={requestLocation} denied />
          ) : nearYouResult.radiusNote === 'none' ? (
            <p className="text-[13px] text-fg-muted font-light">
              No workouts near you right now.
            </p>
          ) : (
            <>
              {nearYouResult.radiusNote && (
                <p className="font-mono text-[11px] text-fg-muted mb-3">
                  {nearYouResult.radiusNote}
                </p>
              )}
              <div className="flex gap-3 overflow-x-auto -mx-6 px-6 pb-2 scrollbar-hide">
                {nearYouResult.cards.map((w) => (
                  <NearYouCard key={w.id} workout={w} onClick={() => navigate(`/workout/${w.id}`)} />
                ))}
              </div>
            </>
          )}
        </section>

        {/* Upcoming workouts */}
        <section>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-secondary mb-4">
            Upcoming workouts
          </h2>

          {loading ? (
            <p className="text-[13px] text-fg-muted font-light">Loading workouts…</p>
          ) : groupedUpcoming.length === 0 ? (
            <p className="text-[13px] text-fg-muted font-light">
              No upcoming workouts found.
            </p>
          ) : (
            <div className="flex flex-col">
              {groupedUpcoming.map((group) => (
                <div key={group.dateKey}>
                  <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted pt-4 pb-2">
                    {group.label}
                  </div>
                  <div className="border-t border-border mb-1" />
                  {group.items.map((w) => (
                    <WorkoutRow
                      key={w.id}
                      workout={w}
                      hasLocation={hasLocation}
                      onClick={() => navigate(`/workout/${w.id}`)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-surface px-6 py-3 flex items-center justify-between z-40">
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-fg-muted">
          Hosting a run?
        </span>
        <Link to="/create-workout" className="btn-accent text-[11px] px-4 py-2">
          ＋ Create workout
        </Link>
      </div>

      {/* Map overlay */}
      {showMap && (
        <MapOverlay
          workouts={geoWorkouts}
          userLocation={origin}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
}

function ChipButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`font-mono text-[11px] uppercase tracking-[0.06em] px-4 py-2 border whitespace-nowrap transition-colors flex-shrink-0 ${
        active
          ? 'bg-fg text-surface border-fg'
          : 'bg-transparent text-fg-secondary border-border hover:border-border-strong'
      }`}
    >
      {label}
    </button>
  );
}

function NearYouBanner({ onAllow, denied }) {
  return (
    <div className="border border-border p-5">
      <p className="text-[14px] font-medium mb-1">
        Enable location for nearby workouts
      </p>
      <p className="text-[12px] text-fg-secondary font-light mb-4">
        See runs happening close to you first.
      </p>
      <button onClick={onAllow} className="btn-secondary text-[11px] px-4 py-2">
        {denied ? 'Retry location' : 'Allow location'}
      </button>
    </div>
  );
}

function NearYouCard({ workout, onClick }) {
  const spots = spotsRemaining(workout);
  const time = format(new Date(workout.workout_date), 'EEE · HH:mm');

  return (
    <button
      onClick={onClick}
      className="w-[168px] flex-shrink-0 border border-border bg-surface text-left p-4 hover:border-border-strong transition-colors"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-secondary mb-1">
        {workout.workout_type}
      </p>
      <p className="text-[13px] font-medium text-fg mb-2 leading-tight line-clamp-2">
        {workout.name || workout.workout_type}
      </p>
      <p className="font-mono text-[11px] text-fg-secondary mb-1">{time}</p>
      <div className="flex items-center gap-2 font-mono text-[11px] text-fg-secondary mb-2">
        {workout.distance && <span>{workout.distance} km</span>}
        {workout.pace && <span>· {workout.pace}/km</span>}
      </div>
      {workout._distance !== null && (
        <p className="font-mono text-[10px] text-fg-muted mb-2">
          {workout._distance < 1
            ? `${(workout._distance * 1000).toFixed(0)} m away`
            : `${workout._distance.toFixed(1)} km away`}
        </p>
      )}
      <span
        className={`font-mono text-[10px] uppercase tracking-[0.08em] px-2 py-[2px] inline-block ${
          spots <= 0
            ? 'bg-surface-secondary text-fg-muted border border-border'
            : spots <= 2
            ? 'bg-accent text-[#0A0A0A] border border-accent'
            : 'bg-accent text-[#0A0A0A] border border-accent'
        }`}
      >
        {spots <= 0 ? 'Full' : `${spots} spot${spots !== 1 ? 's' : ''} left`}
      </span>
    </button>
  );
}

function WorkoutRow({ workout, hasLocation, onClick }) {
  const time = format(new Date(workout.workout_date), 'HH:mm');
  const spots = spotsRemaining(workout);
  const hostName = formatHostName(workout.profiles?.full_name);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 py-3 border-b border-border hover:bg-surface-secondary transition-colors text-left px-1"
    >
      {/* Time */}
      <span className="font-mono text-[16px] font-medium text-fg w-[52px] flex-shrink-0 tabular-nums">
        {time}
      </span>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-secondary mb-0.5">
          {workout.workout_type}
        </p>
        <p className="text-[14px] font-medium text-fg truncate mb-1">
          {workout.name || workout.workout_type}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
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
          {hasLocation && workout._distance !== null && (
            <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-fg-muted border border-border px-2 py-[1px]">
              {workout._distance < 1
                ? `${(workout._distance * 1000).toFixed(0)} m away`
                : `${workout._distance.toFixed(1)} km away`}
            </span>
          )}
        </div>
      </div>

      {/* Host */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Avatar
          name={workout.profiles?.full_name}
          avatarUrl={workout.profiles?.avatar_url}
          userId={workout.profiles?.id}
          size="sm"
          linked={false}
        />
        <span className="font-mono text-[11px] text-fg-secondary hidden sm:inline">
          {hostName}
        </span>
      </div>

      {/* Spots + arrow */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.06em] px-2 py-[1px] ${
            spots <= 0
              ? 'text-fg-muted'
              : spots <= 2
              ? 'text-accent'
              : 'text-[#4ADE80]'
          }`}
        >
          {spots <= 0 ? 'Full' : `${spots}`}
        </span>
        <ChevronRight size={14} className="text-fg-muted" />
      </div>
    </button>
  );
}

function MapOverlay({ workouts, userLocation, onClose }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Lock body scroll while overlay is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    Promise.all([loadLibrary('maps'), loadLibrary('marker')])
      .then(() => setReady(true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;

    const center = userLocation
      ? { lat: userLocation.lat, lng: userLocation.lng }
      : { lat: 37.9838, lng: 23.7275 };

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center,
        zoom: userLocation ? 12 : 11,
        mapId: 'lfg-home-map',
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      infoWindowRef.current = new google.maps.InfoWindow();
    }
  }, [ready, userLocation]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    workouts.forEach((workout) => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstanceRef.current,
        position: { lat: workout.lat, lng: workout.lng },
        title: workout.name || workout.workout_type,
      });

      marker.addListener('click', () => {
        const dateStr = format(new Date(workout.workout_date), 'EEE d MMM · HH:mm');
        const spots = spotsRemaining(workout);
        const distStr = workout.distance ? `${workout.distance} km` : '';
        const paceStr = workout.pace ? `${workout.pace}/km` : '';
        const metaParts = [distStr, paceStr].filter(Boolean).join(' · ');
        const spotsLabel = spots <= 0 ? 'Full' : `${spots} spot${spots !== 1 ? 's' : ''} left`;

        infoWindowRef.current.setContent(`
          <div style="font-family: 'IBM Plex Mono', monospace; padding: 4px; max-width: 220px; background: #141414; color: #EAEAEA;">
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #999999; margin-bottom: 4px;">${workout.workout_type}</div>
            <div style="font-size: 13px; font-weight: 500; margin-bottom: 4px;">${workout.name || workout.workout_type}</div>
            <div style="font-size: 11px; color: #999999; margin-bottom: 2px;">${dateStr}</div>
            ${metaParts ? `<div style="font-size: 11px; color: #999999; margin-bottom: 2px;">${metaParts}</div>` : ''}
            <div style="font-size: 10px; color: ${spots <= 0 ? '#666666' : '#E8C547'}; margin-bottom: 8px;">${spotsLabel}</div>
            <a href="/workout/${workout.id}" style="font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; background: #E8C547; color: #0A0A0A; padding: 4px 12px; text-decoration: none; display: inline-block;">View workout</a>
          </div>
        `);
        infoWindowRef.current.open({
          anchor: marker,
          map: mapInstanceRef.current,
        });
      });

      markersRef.current.push(marker);
    });
  }, [workouts, ready]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-surface flex flex-col">
      {/* Top bar */}
      <div className="border-b border-border-strong px-6 py-4 flex items-center justify-between flex-shrink-0">
        <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-fg-secondary">
          Workouts near you
        </span>
        <button
          onClick={onClose}
          className="text-fg-secondary hover:text-fg transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      {/* Map */}
      <div ref={mapRef} className="flex-1" />
    </div>
  );
}
