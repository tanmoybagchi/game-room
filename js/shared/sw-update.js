if ('serviceWorker' in navigator) {
  const swPath = document.currentScript.dataset.sw;
  navigator.serviceWorker.register(swPath);
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
}
