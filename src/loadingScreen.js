/** Remove the HTML loading screen overlay */
export function removeLoadingScreen() {
  const el = document.getElementById('loading-screen');
  if (el) el.remove();
}
