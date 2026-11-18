// Keyboard and mouse with edge detection: pressed() is true only on the frame the key went down.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressedKeys = new Set();
    this.mouse = { x: 640, y: 200, down: false, clicked: false };
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (!e.repeat) this.pressedKeys.add(e.code);
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', () => { this.mouse.down = true; this.mouse.clicked = true; });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.down = false; });
  }
  down(...codes) { return codes.some((c) => this.keys.has(c)); }
  pressed(...codes) { return codes.some((c) => this.pressedKeys.has(c)); }
  endFrame() { this.pressedKeys.clear(); this.mouse.clicked = false; }
}
