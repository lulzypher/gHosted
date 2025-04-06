// Service worker registration for offline support

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      
      if (registration.installing) {
        console.log('Service worker installing');
      } else if (registration.waiting) {
        console.log('Service worker installed but waiting');
      } else if (registration.active) {
        console.log('Service worker active');
      }
      
      // Setup service worker update flow
      registration.addEventListener('updatefound', () => {
        // A new service worker is installing
        const newWorker = registration.installing;
        if (!newWorker) return;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available, show a notification to the user
            console.log('New content is available; please refresh.');
            
            // Dispatch an event for the UI to handle
            window.dispatchEvent(new CustomEvent('swUpdateAvailable'));
          }
        });
      });
      
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  } else {
    console.warn('Service workers are not supported in this browser');
  }
}

// Check for service worker updates
export async function checkForUpdates() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    } catch (error) {
      console.error('Error checking for service worker updates:', error);
    }
  }
}

// Unregister service worker
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const success = await registration.unregister();
        if (success) {
          console.log('Service worker unregistered successfully');
        } else {
          console.warn('Service worker unregistration failed');
        }
      }
    } catch (error) {
      console.error('Error unregistering service worker:', error);
    }
  }
}
