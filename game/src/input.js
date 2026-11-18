// Keyboard and mouse: a pressed-keys set with per-frame edge detection, and the pointer's
// position in the playfield's logical coordinates (the renderer's letterbox transform undone).

export function createInput(canvas, FIELD) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: FIELD.centreX, y: FIELD.centreY, down: false, clicked: false };
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    keys.add(key);
    pressed.add(key);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'].includes(event.key)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    keys.delete(key);
  });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rect.left - offsetX) / scale;
    mouse.y = (event.clientY - rect.top - offsetY) / scale;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      mouse.down = true;
      mouse.clicked = true;
    }
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  /** Called once per rendered frame with the current letterbox transform. */
  function setTransform(newScale, newOffsetX, newOffsetY) {
    scale = newScale;
    offsetX = newOffsetX;
    offsetY = newOffsetY;
  }

  const HOLD_ALIASES = { up: ['w', 'ArrowUp'], down: ['s', 'ArrowDown'], left: ['a', 'ArrowLeft'], right: ['d', 'ArrowRight'] };

  function holding(action) {
    for (const key of HOLD_ALIASES[action] ?? [action]) if (keys.has(key)) return true;
    return false;
  }

  /** True once per physical press of `key`, until endFrame. */
  function tapped(key) {
    return pressed.has(key);
  }

  function endFrame() {
    pressed.clear();
    mouse.clicked = false;
  }

  return { mouse, holding, tapped, setTransform, endFrame };
}
