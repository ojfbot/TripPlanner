import axios from 'axios';

// VITE_API_URL controls the API target:
//   - dev: unset → '' → Vite proxy handles /api/* → localhost:3011
//   - production with API: set to 'https://trips.jim.software'
//   - demo (no API deployed): set to '' → requests fail fast → error guards show empty state
//
// Note: bare relative axios calls in MF remotes resolve to the HOST origin (frame.jim.software),
// not this remote's origin (trips.jim.software). Use apiClient instead of bare axios.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
});
