/**
 * New Bright Button Palace - Centralized API Config & Auth Utilities
 */

// === Domain & Auth Config ===
const API_BASE = 'https://api.builder.agentzee.ai';
const PROJECT_ID = 'd1dab2fb-9a09-4bef-a3ce-be208b7876c3';
const WEBSITE_ID = '451c57c2-7ca6-42fb-94ce-5ffd129823a2';

// === API Endpoints ===
const API_ENDPOINTS = {
  products: '/api/storefront/products/',
  productDetail: (id) => `/api/storefront/products/${id}/`,
  requestOtp: '/api/storefront/request-otp/',
  verifyOtp: '/api/storefront/verify-otp/',
  customerProfile: '/api/storefront/customer-profile/',
  updateProfile: '/api/storefront/update-customer-profile/',
  addAddress: '/api/storefront/add-customer-address/',
  placeOrder: '/api/storefront/place-order/',
  contactSubmission: '/api/storefront/contact-submissions/',
  newsletter: '/api/storefront/subscribe-newsletter/',
  paymentGateways: '/payments/paymentgateways/',
};

// === Shared apiFetch Utility ===
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(options.headers || {})
  };
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    return res;
  } catch (e) {
    console.warn('[apiFetch] Request failed:', e.message);
    throw e;
  }
}

// === Auth Helpers ===

/**
 * Get the logged-in customer's email.
 */
function getUserEmail() {
  return sessionStorage.getItem('customerEmail') ||
    localStorage.getItem('customerEmail') ||
    sessionStorage.getItem('loginEmail') ||
    localStorage.getItem('loginEmail') ||
    '';
}

/**
 * Returns true only when the user has completed OTP verification
 * and the isLoggedIn flag is explicitly set.
 */
function isUserLoggedIn() {
  return sessionStorage.getItem('isLoggedIn') === 'true' ||
    localStorage.getItem('isLoggedIn') === 'true';
}

function getAuthToken() {
  return sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || '';
}

function logoutUser() {
  sessionStorage.removeItem('loginEmail');
  sessionStorage.removeItem('customerEmail');
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('loginFirstName');
  sessionStorage.removeItem('loginLastName');
  sessionStorage.removeItem('isLoggedIn');
  localStorage.removeItem('loginEmail');
  localStorage.removeItem('customerEmail');
  localStorage.removeItem('authToken');
  localStorage.removeItem('isLoggedIn');
  window.location.href = 'login.html';
}

window.API_BASE = API_BASE;
window.PROJECT_ID = PROJECT_ID;
window.WEBSITE_ID = WEBSITE_ID;
window.API_ENDPOINTS = API_ENDPOINTS;
window.apiFetch = apiFetch;
window.getUserEmail = getUserEmail;
window.isUserLoggedIn = isUserLoggedIn;
window.getAuthToken = getAuthToken;
window.logoutUser = logoutUser;
