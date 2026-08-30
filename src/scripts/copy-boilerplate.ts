// Copy-to-clipboard control for the Media page's boilerplate block — lets a
// journalist grab the canonical ODD description without manually selecting
// text. Progressive enhancement only: the text itself is always plain,
// selectable copy regardless of whether this script runs. Falls back to a
// visible "select manually" state if the Clipboard API is unavailable or the
// browser denies the write (e.g. no secure-context/permission), rather than
// failing silently.
const button = document.querySelector<HTMLButtonElement>('[data-copy-boilerplate]');
const source = document.querySelector<HTMLElement>('[data-boilerplate-text]');

if (button && source) {
  const defaultLabel = button.textContent ?? 'Copy';
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  button.addEventListener('click', async () => {
    const text = source.innerText.trim();
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      copied = false;
    }
    button.textContent = copied ? 'Copied' : 'Select the text above to copy';
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      button.textContent = defaultLabel;
    }, 2500);
  });
}

export {};
