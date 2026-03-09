export function setupUI(experience) {
  const modal = document.getElementById('previewModal');
  const close = document.getElementById('modalClose');
  if (!modal) return;

  function hideModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  if (close) {
    close.addEventListener('click', hideModal);
  }

  // Close when clicking the dimmed backdrop (but not the content)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) hideModal();
  });

  // Close on Escape for accessibility
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) hideModal();
  });
}
