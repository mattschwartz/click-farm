// Console error overlay — intercepts console.error and shows a toast.
//
// Monkey-patches console.error so every call surfaces a brief on-screen
// toast. The original console.error still fires normally. Toasts auto-
// dismiss after 6 seconds or can be tapped to dismiss early.
//
// Call install() once before React mounts. Idempotent — safe to call twice.

let installed = false;

const TOAST_DURATION_MS = 6000;
const MAX_VISIBLE = 5;

function createContainer(): HTMLDivElement {
  const existing = document.getElementById('console-error-overlay');
  if (existing) return existing as HTMLDivElement;

  const container = document.createElement('div');
  container.id = 'console-error-overlay';
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '12px',
    left: '12px',
    right: '12px',
    zIndex: '99999',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    pointerEvents: 'none',
  });
  document.body.appendChild(container);
  return container;
}

function showToast(container: HTMLDivElement, message: string) {
  // Cap visible toasts so they don't flood the screen.
  while (container.childNodes.length >= MAX_VISIBLE) {
    container.removeChild(container.firstChild!);
  }

  const toast = document.createElement('div');
  Object.assign(toast.style, {
    background: 'rgba(180, 30, 30, 0.92)',
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '12px',
    lineHeight: '1.4',
    padding: '8px 12px',
    borderRadius: '6px',
    pointerEvents: 'auto',
    cursor: 'pointer',
    maxHeight: '120px',
    overflow: 'hidden',
    wordBreak: 'break-word',
    backdropFilter: 'blur(4px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    opacity: '0',
    transform: 'translateY(8px)',
    transition: 'opacity 0.2s, transform 0.2s',
  });

  toast.textContent = message;
  toast.addEventListener('click', () => dismiss());

  const dismiss = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 200);
  };

  container.appendChild(toast);

  // Trigger enter animation on next frame.
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(dismiss, TOAST_DURATION_MS);
}

function argsToString(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
}

export function install(): void {
  if (installed) return;
  installed = true;

  const original = console.error.bind(console);
  const container = createContainer();

  console.error = (...args: unknown[]) => {
    original(...args);
    try {
      const message = argsToString(args);
      showToast(container, message);
    } catch {
      // Never let the overlay itself break the app.
    }
  };
}
