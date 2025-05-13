export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('ServiceWorker registration successful');
          
          // Handle unrecoverable state
          navigator.serviceWorker.addEventListener('message', event => {
            if (event.data.type === 'UNRECOVERABLE_STATE') {
              console.error('Unrecoverable state detected:', event.data.reason);
              // Show a user-friendly error message
              const shouldReload = window.confirm(
                'An error occurred that requires a page reload to fix. Would you like to reload now?'
              );
              if (shouldReload) {
                window.location.reload();
              }
            }
          });
        })
        .catch(error => {
          console.error('ServiceWorker registration failed:', error);
        });
    });
  }
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error('ServiceWorker unregistration failed:', error);
      });
  }
} 