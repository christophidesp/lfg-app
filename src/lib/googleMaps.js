const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let scriptPromise = null;

function loadScript() {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      // If google.maps is already loaded, resolve immediately
      if (window.google?.maps) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,marker&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps'));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export function loadLibrary(name) {
  return loadScript().then(() => google.maps.importLibrary(name));
}
