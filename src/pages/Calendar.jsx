import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';

export default function Calendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    const fetchWorkouts = async () => {
      setLoading(true);
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      // Workouts the user created
      const { data: created } = await supabase
        .from('workouts')
        .select('id, name, workout_type, workout_date, address, location')
        .eq('creator_id', user.id)
        .is('cancelled_at', null)
        .gte('workout_date', monthStart.toISOString())
        .lte('workout_date', monthEnd.toISOString());

      // Workouts the user joined (approved participant)
      const { data: participantRows } = await supabase
        .from('workout_participants')
        .select(`
          workout_id,
          workouts (id, name, workout_type, workout_date, address, location, creator_id, cancelled_at)
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      const joinedInMonth = (participantRows || [])
        .map((r) => r.workouts)
        .filter((w) => {
          if (!w || w.cancelled_at) return false;
          const d = new Date(w.workout_date);
          return d >= monthStart && d <= monthEnd && w.creator_id !== user.id;
        });

      const createdTagged = (created || []).map((w) => ({ ...w, _role: 'creator' }));
      const joinedTagged = joinedInMonth.map((w) => ({ ...w, _role: 'participant' }));

      // Deduplicate by id (creator takes priority)
      const map = new Map();
      for (const w of createdTagged) map.set(w.id, w);
      for (const w of joinedTagged) {
        if (!map.has(w.id)) map.set(w.id, w);
      }

      setWorkouts(Array.from(map.values()));
      setLoading(false);
    };
    fetchWorkouts();
  }, [currentMonth, user.id]);

  const today = new Date();

  // Build calendar grid days (Mon-Sun, including padding days from adjacent months)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  // Map of date key -> workouts for that day
  const workoutsByDay = useMemo(() => {
    const map = new Map();
    for (const w of workouts) {
      const key = format(new Date(w.workout_date), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(w);
    }
    // Sort each day's workouts by time
    for (const [, list] of map) {
      list.sort((a, b) => new Date(a.workout_date) - new Date(b.workout_date));
    }
    return map;
  }, [workouts]);

  const selectedDayWorkouts = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, 'yyyy-MM-dd');
    return workoutsByDay.get(key) || [];
  }, [selectedDay, workoutsByDay]);

  const hasWorkoutsThisMonth = workouts.length > 0;

  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="max-w-3xl mx-auto px-6">
        {/* Month header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => { setCurrentMonth(subMonths(currentMonth, 1)); setSelectedDay(null); }}
            className="font-mono text-[14px] text-fg-secondary hover:text-fg transition-colors px-2 py-1"
          >
            &larr;
          </button>
          <h1 className="font-mono text-[14px] uppercase tracking-[0.1em] text-fg">
            {format(currentMonth, 'MMMM yyyy')}
          </h1>
          <button
            onClick={() => { setCurrentMonth(addMonths(currentMonth, 1)); setSelectedDay(null); }}
            className="font-mono text-[14px] text-fg-secondary hover:text-fg transition-colors px-2 py-1"
          >
            &rarr;
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-muted text-center py-2"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 border-t border-l" style={{ borderWidth: '0.5px' }}>
          {calendarDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const isToday = isSameDay(day, today);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const dayWorkouts = workoutsByDay.get(key) || [];
            const hasCreated = dayWorkouts.some((w) => w._role === 'creator');
            const hasJoined = dayWorkouts.some((w) => w._role === 'participant');
            const hasWorkouts = dayWorkouts.length > 0;

            return (
              <button
                key={key}
                onClick={() => setSelectedDay(hasWorkouts ? (isSelected ? null : day) : null)}
                className={`relative flex flex-col items-center py-3 border-r border-b transition-colors ${
                  isSelected ? 'bg-surface-secondary' : hasWorkouts ? 'hover:bg-surface-secondary' : ''
                } ${hasWorkouts ? 'cursor-pointer' : 'cursor-default'}`}
                style={{ borderWidth: '0.5px' }}
              >
                <span
                  className={`font-sans text-[13px] w-7 h-7 flex items-center justify-center ${
                    isToday
                      ? 'font-medium text-fg border border-accent'
                      : isCurrentMonth
                      ? 'font-normal text-fg'
                      : 'font-normal text-fg-muted/40'
                  }`}
                  style={isToday ? { borderWidth: '0.5px' } : undefined}
                >
                  {format(day, 'd')}
                </span>
                {/* Dot indicators */}
                {(hasCreated || hasJoined) && isCurrentMonth && (
                  <div className="flex gap-1 mt-1">
                    {hasCreated && (
                      <span className="w-[5px] h-[5px] bg-accent" />
                    )}
                    {hasJoined && (
                      <span className="w-[5px] h-[5px] border border-accent" style={{ borderWidth: '0.5px' }} />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day expansion panel */}
        {selectedDay && (
          <div className="border border-border mt-4 p-5" style={{ borderWidth: '0.5px' }}>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-secondary mb-4">
              {format(selectedDay, 'EEEE, d MMMM yyyy')}
            </h2>
            {selectedDayWorkouts.length === 0 ? (
              <p className="font-mono text-[12px] text-fg-muted">No workouts scheduled</p>
            ) : (
              <div className="space-y-0">
                {selectedDayWorkouts.map((w, i) => (
                  <button
                    key={w.id}
                    onClick={() => navigate(`/workout/${w.id}`)}
                    className={`w-full text-left flex items-center gap-4 py-3 hover:bg-surface-secondary transition-colors px-2 ${
                      i < selectedDayWorkouts.length - 1 ? 'border-b border-border' : ''
                    }`}
                    style={i < selectedDayWorkouts.length - 1 ? { borderBottomWidth: '0.5px' } : undefined}
                  >
                    {/* Time */}
                    <span className="font-mono text-[14px] font-medium text-fg tabular-nums flex-shrink-0 w-[48px]">
                      {format(new Date(w.workout_date), 'HH:mm')}
                    </span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-secondary mb-0.5">
                        {w.workout_type}
                      </p>
                      <p className="text-[14px] font-medium text-fg truncate">
                        {w.name || w.workout_type}
                      </p>
                      {(w.address || w.location) && (
                        <p className="font-mono text-[11px] text-fg-muted truncate mt-0.5">
                          {w.address || w.location}
                        </p>
                      )}
                    </div>

                    {/* Role badge */}
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.08em] px-2 py-[2px] border flex-shrink-0 ${
                        w._role === 'creator'
                          ? 'text-[#0A0A0A] bg-accent border-accent'
                          : 'text-fg-muted border-border'
                      }`}
                      style={{ borderWidth: '0.5px' }}
                    >
                      {w._role === 'creator' ? 'Host' : 'Joined'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty month state */}
        {!loading && !hasWorkoutsThisMonth && !selectedDay && (
          <div className="text-center py-12">
            <p className="font-mono text-[13px] text-fg-muted mb-3">No workouts this month</p>
            <Link
              to="/"
              className="font-mono text-[12px] text-fg-secondary hover:text-fg transition-colors"
            >
              Find a workout &rarr;
            </Link>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-5 mt-6">
          <div className="flex items-center gap-2">
            <span className="w-[5px] h-[5px] bg-accent" />
            <span className="font-mono text-[10px] text-fg-muted uppercase tracking-[0.06em]">Hosting</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[5px] h-[5px] border border-accent" style={{ borderWidth: '0.5px' }} />
            <span className="font-mono text-[10px] text-fg-muted uppercase tracking-[0.06em]">Joined</span>
          </div>
        </div>
      </div>
    </div>
  );
}
