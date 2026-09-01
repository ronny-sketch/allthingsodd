// "Info" nav dropdown — the trigger is a real <button> with no navigation
// destination of its own (see Nav.astro's own comment on why it changed
// from an <a href="/about"> that happened to also have a hover menu). Hover
// and :focus-within still open the panel with zero JS, same as before; this
// adds the explicit affordances a hover-only pattern can't provide: a
// click/Enter/Space toggle, Escape-to-close (returning focus to the
// trigger), and click-outside-to-close.
const container = document.querySelector<HTMLElement>('[data-nav-info]');
const trigger = container?.querySelector<HTMLButtonElement>('[data-nav-info-trigger]');
const menu = container?.querySelector<HTMLElement>('[data-nav-info-menu]');

if (container && trigger && menu) {
  let open = false;

  function setOpen(next: boolean): void {
    if (!container || !trigger) return;
    open = next;
    container.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  trigger.addEventListener('click', () => setOpen(!open));

  document.addEventListener('click', (e) => {
    if (!open) return;
    if (!container.contains(e.target as Node)) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) {
      setOpen(false);
      trigger.focus();
    }
  });
}

export {};
