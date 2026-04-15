/**
 * COST AUDIT NOTE
 * To verify session token reuse:
 * 1. Open DevTools -> Network tab -> filter "places.googleapis.com"
 * 2. Type in the autocomplete, then select a result
 * 3. All Autocomplete requests + the final Details request should share
 *    the same `sessionToken` query parameter
 * 4. If tokens differ between keystrokes, billing is per-request (bad)
 */
import { useEffect, useRef } from 'react';
import { loadLibrary } from '../lib/googleMaps';
import { usePlacesTelemetry } from '../hooks/usePlacesTelemetry';

export default function PlacesAutocomplete({ value, onChange, telemetryName = 'PlacesAutocomplete' }) {
  usePlacesTelemetry(telemetryName);
  const containerRef = useRef(null);
  const elementRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || elementRef.current) return;

    let cancelled = false;

    loadLibrary('places').then(() => {
      if (cancelled || elementRef.current) return;

      const placeAutocomplete = new google.maps.places.PlaceAutocompleteElement();

      placeAutocomplete.addEventListener('gmp-select', async ({ placePrediction }) => {
        if (import.meta.env.DEV) {
          console.log(
            '%c[Places] SELECT',
            'color: #4ade80; font-weight: 500;',
            { placeId: placePrediction?.placeId, text: placePrediction?.text?.toString() }
          );
        }
        const place = placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location'],
        });
        const displayName = place.displayName || '';
        const formattedAddress = place.formattedAddress || '';
        const address = displayName && !formattedAddress.startsWith(displayName)
          ? `${displayName}, ${formattedAddress}`
          : formattedAddress;
        onChangeRef.current({
          address,
          lat: place.location.lat(),
          lng: place.location.lng(),
        });
      });

      containerRef.current.appendChild(placeAutocomplete);
      elementRef.current = placeAutocomplete;
    }).catch(() => {});

    return () => { cancelled = true; };
  }, []);

  return (
    <div ref={containerRef} className="places-autocomplete-container" />
  );
}
