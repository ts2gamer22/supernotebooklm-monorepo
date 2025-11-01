/**
 * Diagnostic utilities for Summarizer API
 * 
 * Run these in console to debug Summarizer API issues
 */

export async function diagnoseSummarizerAPI() {
  console.log('=== Summarizer API Diagnostics ===');
  
  // Check if API exists
  const apiExists = 'Summarizer' in globalThis;
  console.log('1. API exists:', apiExists);
  
  if (!apiExists) {
    console.log('❌ Summarizer API not found. Check Chrome version (need 138+) and flags.');
    return;
  }
  
  // Check availability
  try {
    const Summarizer = (globalThis as any).Summarizer;
    console.log('2. Summarizer object:', Summarizer);
    
    const availability = await Summarizer.availability();
    console.log('3. Availability response:', availability);
    console.log('   Type:', typeof availability);
    
    // Try to get more details
    if (typeof availability === 'object') {
      console.log('   Keys:', Object.keys(availability));
      console.log('   Values:', Object.values(availability));
    }
    
  } catch (error) {
    console.error('❌ Error checking availability:', error);
  }
  
  // Check user activation
  console.log('4. User activation:', {
    hasAPI: 'userActivation' in navigator,
    isActive: (navigator as any).userActivation?.isActive,
    hasBeenActive: (navigator as any).userActivation?.hasBeenActive,
  });
  
  // Check chrome.ai namespace (for comparison)
  console.log('5. chrome.ai namespace:', {
    exists: typeof (globalThis as any).chrome?.ai !== 'undefined',
    hasPrompt: typeof (globalThis as any).chrome?.ai?.prompt !== 'undefined',
    hasRewriter: typeof (globalThis as any).chrome?.ai?.rewriter !== 'undefined',
    hasTranslator: typeof (globalThis as any).chrome?.ai?.translator !== 'undefined',
  });
  
  console.log('=== End Diagnostics ===');
}

// Export for console use
(globalThis as any).diagnoseSummarizerAPI = diagnoseSummarizerAPI;
