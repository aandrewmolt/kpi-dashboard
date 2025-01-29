// API Configuration
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'http://207.244.237.89/api'
  : 'http://localhost:3002/api';

// Other configuration constants
export const DEFAULT_PAGE_SIZE = 10;
export const DATE_FORMAT = 'MMM d, yyyy HH:mm';
export const SHORT_DATE_FORMAT = 'MMM d, HH:mm'; 