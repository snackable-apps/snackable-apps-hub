/**
 * Ezoic Ads Integration
 * 
 * SETUP INSTRUCTIONS:
 * 1. Get accepted into Ezoic (incubator or regular)
 * 2. Create ad placements in Ezoic Dashboard
 * 3. Update EZOIC_CONFIG below with your placeholder IDs
 * 4. Set EZOIC_ENABLED to true
 * 5. Update ads.txt with Ezoic's provided entries
 */

const EZOIC_CONFIG = {
  // Set to true once you have your Ezoic account set up
  enabled: false,
  
  // Placeholder IDs from your Ezoic Dashboard
  // You'll create these in: Ezoic Dashboard > Monetization > Ad Placeholders
  placeholders: {
    // Example: headerBanner: 101, sidebarTop: 102, etc.
    // Replace with your actual IDs from Ezoic
  }
};

/**
 * Initialize Ezoic ads on the page
 * Call this after DOM is ready
 */
function initEzoicAds() {
  if (!EZOIC_CONFIG.enabled) {
    console.log('[Ezoic] Ads disabled in config');
    return;
  }

  if (typeof ezstandalone === 'undefined') {
    console.warn('[Ezoic] ezstandalone not loaded');
    return;
  }

  const placeholderIds = Object.values(EZOIC_CONFIG.placeholders);
  
  if (placeholderIds.length === 0) {
    console.warn('[Ezoic] No placeholder IDs configured');
    return;
  }

  ezstandalone.cmd.push(function() {
    // Define which placeholders exist on this page
    ezstandalone.define(...placeholderIds);
    ezstandalone.enable();
    ezstandalone.display();
  });

  console.log('[Ezoic] Ads initialized with placeholders:', placeholderIds);
}

/**
 * Refresh ads (useful for single-page app navigation)
 */
function refreshEzoicAds() {
  if (!EZOIC_CONFIG.enabled || typeof ezstandalone === 'undefined') return;
  
  ezstandalone.cmd.push(function() {
    ezstandalone.showAds();
  });
}

/**
 * Destroy ads (call before removing ad containers from DOM)
 */
function destroyEzoicAds() {
  if (!EZOIC_CONFIG.enabled || typeof ezstandalone === 'undefined') return;
  
  ezstandalone.cmd.push(function() {
    ezstandalone.destroyPlaceholders();
  });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEzoicAds);
} else {
  initEzoicAds();
}
