import { useEffect, useRef } from 'react';
import { loadLibrary } from '../lib/googleMaps';

export default function PlacesAutocomplete({ value, onChange }) {
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
        const place = placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location'],
        });
        onChangeRef.current({
          address: place.formattedAddress || '',
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
