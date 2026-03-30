import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadLibrary } from '../lib/googleMaps';
import { format } from 'date-fns';

export default function WorkoutMap({ workouts, userLocation }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      loadLibrary('maps'),
      loadLibrary('marker'),
    ]).then(() => setReady(true)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;

    const center = userLocation
      ? { lat: userLocation.lat, lng: userLocation.lng }
      : { lat: 37.7749, lng: -23.4194 };

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center,
        zoom: userLocation ? 12 : 3,
        mapId: 'lfg-browse-map',
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

    // Clear old markers
    markersRef.current.forEach(m => m.map = null);
    markersRef.current = [];

    const geoWorkouts = workouts.filter(w => w.lat != null && w.lng != null);

    geoWorkouts.forEach(workout => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstanceRef.current,
        position: { lat: workout.lat, lng: workout.lng },
        title: workout.workout_type,
      });

      marker.addListener('click', () => {
        const dateStr = format(new Date(workout.workout_date), 'MMM d, yyyy · h:mm a');
        infoWindowRef.current.setContent(`
          <div style="font-family: 'IBM Plex Mono', monospace; padding: 4px; max-width: 220px; background: #141414; color: #EAEAEA;">
            <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">${workout.workout_type}</div>
            <div style="font-size: 11px; color: #999999; margin-bottom: 2px;">${dateStr}</div>
            <div style="font-size: 11px; color: #999999; margin-bottom: 8px;">${workout.location}</div>
            <a href="/workout/${workout.id}" style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; background: #E8C547; color: #0A0A0A; padding: 4px 12px; text-decoration: none; display: inline-block;">View</a>
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

  return (
    <div ref={mapRef} className="w-full h-[500px] border border-border" />
  );
}
