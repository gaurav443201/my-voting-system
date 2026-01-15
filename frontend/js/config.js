/**
 * VIT-ChainVote Configuration
 * Automatically detects environment and sets API URL
 */

// Detect if running locally or in production
const isLocalhost = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '';

// Set API URL based on environment
const app_api_url = isLocalhost
    ? 'http://localhost:5000/api'  // Local development
    : '/api';  // Production (Automatic same-origin)

// Export for use in other files
window.CONFIG = {
    API_URL: app_api_url,
    IS_PRODUCTION: !isLocalhost
};

console.log(`🔧 Environment: ${isLocalhost ? 'Development' : 'Production'}`);
console.log(`🌐 API URL: ${window.CONFIG.API_URL}`);
