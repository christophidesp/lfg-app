import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format, isToday, isTomorrow, addDays, startOfDay } from 'date-fns';
import { loadLibrary } from '../lib/googleMaps';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import Avatar from '../components/Avatar';
import { X, ChevronRight } from 'lucide-react';
import { WORKOUT_TYPES } from '../constants/workoutTypes';
import { useGeolocation } from '../hooks/useGeolocation';
import { getGenderBreakdown } from '../lib/genderBreakdown';
import GenderBreakdown from '../components/GenderBreakdown';

const ALL_CHIPS = ['All', ...WORKOUT_TYPES];

const NEAR_RADIUS = 50;

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
  if (workout.max_participants == null) return null;
  return Math.max(0, workout.max_participants - accepted);
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
  const { location: geoLocation, status: geoStatus, refresh: refreshLocation } = useGeolocation();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLocation, setSearchLocation] = useState(null);
  const [searchLabel, setSearchLabel] = useState('');
  const [activeChip, setActiveChip] = useState('All');
  const [showMoreChips, setShowMoreChips] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ALL_CHIPS.length);
  const [showMap, setShowMap] = useState(false);
  const chipRowRef = useRef(null);
  const chipMeasureRef = useRef(null);

  // Fetch workouts
  useEffect(() => {
    const fetchWorkouts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          *,
          profiles!creator_id (id, full_name, avatar_url),
          clubs!club_id (id, name, avatar_url),
          workout_participants (id, status, profiles!user_id (gender_identity, display_gender_on_profile)),
          races (name)
        `)
        .gte('workout_date', new Date().toISOString())
        .eq('visibility', 'public')
        .is('cancelled_at', null)
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

  const origin = searchLocation || geoLocation;
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

  // Unified workout list
  const unifiedList = useMemo(() => {
    if (hasLocation) {
      // State A: filter to workouts with geo within 50km, sort by distance then date
      return filtered
        .filter((w) => w._distance !== null && w._distance <= NEAR_RADIUS)
        .sort((a, b) => {
          if (a._distance !== b._distance) return a._distance - b._distance;
          return new Date(a.workout_date) - new Date(b.workout_date);
        });
    }
    // State B: workouts within next 7 days, sorted by date
    const cutoff = addDays(startOfDay(new Date()), 7);
    return [...filtered]
      .filter((w) => new Date(w.workout_date) < cutoff)
      .sort((a, b) => new Date(a.workout_date) - new Date(b.workout_date));
  }, [filtered, hasLocation]);

  // Group by date (State B only)
  const groupedList = useMemo(() => {
    if (hasLocation) return [];
    const groups = [];
    let currentKey = '';
    for (const w of unifiedList) {
      const dateKey = format(new Date(w.workout_date), 'yyyy-MM-dd');
      if (dateKey !== currentKey) {
        currentKey = dateKey;
        groups.push({ dateKey, label: formatDateDivider(w.workout_date), items: [] });
      }
      groups[groups.length - 1].items.push(w);
    }
    return groups;
  }, [unifiedList, hasLocation]);

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
            <PlacesAutocomplete onChange={handlePlaceSelect} telemetryName="Home" />
          )}

          {/* Context bar */}
          {searchLocation ? (
            <div className="border-y border-border py-1.5 px-5 -mx-6 mt-3 flex items-center justify-between">
              <span className="font-mono text-[11px] text-fg-muted">
                Sorted by distance from {searchLabel}
              </span>
              <button
                onClick={clearSearch}
                className="font-mono text-[11px] text-accent hover:underline flex-shrink-0 ml-3"
              >
                Clear ×
              </button>
            </div>
          ) : geoLocation && !searchLocation ? (
            <div className="border-y border-border py-1.5 px-5 -mx-6 mt-3">
              <span className="font-mono text-[11px] text-fg-muted">
                {geoStatus === 'cached' || geoStatus === 'refreshing'
                  ? 'Using your last known location'
                  : 'Using your current location'}
              </span>
            </div>
          ) : null}
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

        {/* Unified workout list */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-secondary">
              {geoStatus === 'loading' && !geoLocation
                ? 'Finding nearby workouts\u2026'
                : hasLocation
                  ? searchLocation
                    ? `Workouts near ${searchLabel}`
                    : 'Workouts near you'
                  : 'Upcoming workouts'}
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

          {/* Location prompt banner — only when we have no usable location */}
          {!geoLocation && !searchLocation && (geoStatus === 'idle' || geoStatus === 'error' || geoStatus === 'unsupported') && (
            <LocationBanner onAllow={refreshLocation} denied={geoStatus === 'error'} />
          )}

          {loading ? (
            <p className="text-[13px] text-fg-muted font-light">Loading workouts…</p>
          ) : unifiedList.length === 0 ? (
            <p className="text-[13px] text-fg-muted font-light">
              {hasLocation
                ? 'No upcoming workouts within 50 km'
                : 'No upcoming workouts this week'}
            </p>
          ) : hasLocation ? (
            /* State A: flat list sorted by distance, date as pill */
            <div className="flex flex-col">
              <div className="border-t border-border" />
              {unifiedList.map((w) => (
                <WorkoutRow
                  key={w.id}
                  workout={w}
                  hasLocation={hasLocation}
                  showDate
                  onClick={() => navigate(`/workout/${w.id}`)}
                />
              ))}
            </div>
          ) : (
            /* State B: grouped by date */
            <div className="flex flex-col">
              {groupedList.map((group) => (
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

function LocationBanner({ onAllow, denied }) {
  return (
    <div className="border border-border p-5 mb-4">
      <p className="text-[14px] font-medium mb-1">
        See workouts near you
      </p>
      <p className="text-[12px] text-fg-secondary font-light mb-4">
        Enable location to find runs within 50 km.
      </p>
      <button onClick={onAllow} className="btn-secondary text-[11px] px-4 py-2">
        {denied ? 'Retry location' : 'Allow location'}
      </button>
    </div>
  );
}

function WorkoutRow({ workout, hasLocation, showDate, onClick }) {
  const time = format(new Date(workout.workout_date), 'HH:mm');
  const dateLabel = showDate
    ? format(new Date(workout.workout_date), 'EEE d MMM').toUpperCase()
    : null;
  const spots = spotsRemaining(workout);
  const isClubHost = workout.host_type === 'club' && workout.clubs;
  const hostName = isClubHost ? workout.clubs.name : formatHostName(workout.profiles?.full_name);

  const accepted = (workout.workout_participants || []).filter(p => p.status === 'accepted');
  const genderBreakdown = getGenderBreakdown(accepted);

  const spotsColor =
    spots === null
      ? accepted.length === 0
        ? 'text-[#4ADE80]'
        : 'text-fg-muted'
      : spots <= 0
      ? 'text-fg-muted'
      : spots <= 2
      ? 'text-accent'
      : 'text-[#4ADE80]';

  const spotsCompact =
    spots === null
      ? accepted.length === 0
        ? 'Open'
        : accepted.length
      : spots <= 0
      ? 'Full'
      : spots;

  const spotsVerbose =
    spots === null
      ? accepted.length === 0
        ? 'Open'
        : `${accepted.length} joined`
      : spots <= 0
      ? 'Full'
      : `${spots} remaining ${spots === 1 ? 'spot' : 'spots'}`;

  return (
    <button
      onClick={onClick}
      className="w-full flex flex-wrap items-center gap-x-4 gap-y-0 py-3 border-b border-border hover:bg-surface-secondary transition-colors text-left px-1"
    >
      {/* Date + Time */}
      <div className="flex-shrink-0 w-[76px]">
        {dateLabel && (
          <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-fg-muted mb-0.5">
            {dateLabel}
          </p>
        )}
        <span className="font-mono text-[16px] font-medium text-fg tabular-nums">
          {time}
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-secondary mb-0.5">
          {workout.workout_type}
        </p>
        <p className="text-[14px] font-medium text-fg truncate mb-0.5">
          {workout.name || workout.workout_type}
        </p>
        {workout.workout_type === 'Race' && workout.races?.name && (
          <p className="font-mono text-[11px] font-normal text-fg-muted truncate mb-1">
            {workout.races.name}
          </p>
        )}
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

      {/* Host — desktop only */}
      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        <Avatar
          name={isClubHost ? workout.clubs.name : workout.profiles?.full_name}
          avatarUrl={isClubHost ? workout.clubs.avatar_url : workout.profiles?.avatar_url}
          userId={isClubHost ? workout.clubs.id : workout.profiles?.id}
          size="sm"
          linked={false}
        />
        <span className="font-mono text-[11px] text-fg-secondary">
          {hostName}
        </span>
      </div>

      {/* Spots + arrow — desktop only */}
      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        <div className="flex flex-col items-end gap-0.5">
          <span className={`font-mono text-[10px] uppercase tracking-[0.06em] px-2 py-[1px] ${spotsColor}`}>
            {spotsVerbose}
          </span>
          {genderBreakdown.label && (
            <span className="font-mono text-[10px] text-fg-muted px-2">
              <GenderBreakdown breakdown={genderBreakdown} />
            </span>
          )}
        </div>
        <ChevronRight size={14} className="text-fg-muted" />
      </div>

      {/* Mobile bottom row — host + count + gender + chevron */}
      <div className="flex sm:hidden w-full items-center gap-2 mt-2">
        <Avatar
          name={isClubHost ? workout.clubs.name : workout.profiles?.full_name}
          avatarUrl={isClubHost ? workout.clubs.avatar_url : workout.profiles?.avatar_url}
          userId={isClubHost ? workout.clubs.id : workout.profiles?.id}
          size="sm"
          linked={false}
        />
        <span className="font-mono text-[11px] text-fg-secondary truncate flex-1 min-w-0">
          {hostName}
        </span>
        <span className={`font-mono text-[10px] uppercase tracking-[0.06em] px-2 py-[1px] flex-shrink-0 ${spotsColor}`}>
          {spotsCompact}
        </span>
        {genderBreakdown.label && (
          <span className="font-mono text-[11px] text-fg-muted flex-shrink-0">
            <GenderBreakdown breakdown={genderBreakdown} />
          </span>
        )}
        <ChevronRight size={14} className="text-fg-muted flex-shrink-0" />
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
