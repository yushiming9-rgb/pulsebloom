// Canvas rendering: the beat-reactive backdrop, the arena, every entity, all glow.
import { ARENA_RADIUS, ARENA_CENTER, PALETTE } from './config.js';
import { STATE } from './world.js';

function glowCircle(ctx, x, y, r, color, glow) {
  ctx.shadowColor = glow || color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

export function draw(ctx, s, canvas) {
  const { width: W, height: H } = canvas;
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, W, H);

  // pulsing grid: breathes with the beat flash
  const pulse = 1 + s.beatFlash * 0.35;
  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 64 * pulse) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 64 * pulse) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // arena ring
  ctx.strokeStyle = PALETTE.arena;
  ctx.lineWidth = 3 + s.beatFlash * 4;
  ctx.beginPath();
  ctx.arc(ARENA_CENTER.x, ARENA_CENTER.y, ARENA_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(72,216,240,${0.15 + s.beatFlash * 0.4})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(ARENA_CENTER.x, ARENA_CENTER.y, ARENA_RADIUS * (0.985 - s.beatFlash * 0.03), 0, Math.PI * 2);
  ctx.stroke();

  if (s.state === STATE.TITLE) { drawTitle(ctx, s, W, H); return; }

  // particles
  for (const pt of s.particles) {
    ctx.globalAlpha = Math.max(0, pt.life * 2);
    ctx.fillStyle = pt.tint;
    ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;

  // enemies (bloom-in grows them from 0)
  for (const e of s.enemies) {
    const scale = e.bloom > 0 ? Math.max(0.05, 1 - e.bloom / 0.8) : 1;
    const r = e.spec.radius * scale;
    const color = PALETTE.enemy[e.spec.tint];
    glowCircle(ctx, e.x, e.y, r, color, PALETTE.enemyBloom);
    ctx.fillStyle = '#0b0e1a';
    ctx.beginPath();
    ctx.arc(e.x, e.y, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    if (e.boss) { // boss crown: a second ring
      ctx.strokeStyle = '#ffd94a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r + 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.health < e.spec.health) { // health pips
      ctx.fillStyle = PALETTE.dim;
      for (let i = 0; i < e.health; i++) ctx.fillRect(e.x - e.spec.radius + i * 6, e.y - e.spec.radius - 10, 4, 3);
    }
  }

  // bullets
  for (const b of s.bullets) glowCircle(ctx, b.x, b.y, 4, PALETTE.bullet);
  for (const b of s.enemyBullets) glowCircle(ctx, b.x, b.y, 5, '#ff9c9c');

  // player
  const p = s.player;
  const flashing = p.invuln > 0 && Math.floor(s.time * 12) % 2 === 0;
  if (!flashing) {
    glowCircle(ctx, p.x, p.y, p.radius, PALETTE.player, PALETTE.playerGlow);
    // aim line
    ctx.strokeStyle = 'rgba(72,216,240,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.aim) * 46, p.y + Math.sin(p.aim) * 46);
    ctx.stroke();
    if (p.dashCooldown <= 0) { // dash-ready ring
      ctx.strokeStyle = 'rgba(255,217,74,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // floating score text
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const f of s.floaters) {
    ctx.globalAlpha = Math.min(1, f.life * 2);
    ctx.fillStyle = f.tint;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  drawHud(ctx, s, W, H);
  if (s.state === STATE.UPGRADE) drawUpgrade(ctx, s, W, H);
  if (s.state === STATE.PAUSED) drawCentered(ctx, W, H, 'PAUSED', 'press P or Esc to resume', PALETTE.text);
  if (s.state === STATE.GAME_OVER) drawCentered(ctx, W, H, 'THE PULSE FADES', `SCORE ${s.score} · reached wave ${s.wave} of 10 · best ${s.best}`, PALETTE.bad, 'PRESS ENTER OR R TO RESTART');
  if (s.state === STATE.VICTORY) drawCentered(ctx, W, H, 'THE BLOOM IS YOURS', `SCORE ${s.score} · best ${s.best}`, PALETTE.good, 'PRESS ENTER TO PLAY AGAIN');

  // wave banner
  if (s.messageTimer > 0) {
    ctx.globalAlpha = Math.min(1, s.messageTimer);
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'center';
    ctx.fillText(s.message, W / 2, 150);
    ctx.globalAlpha = 1;
  }
}

function drawHud(ctx, s, W, H) {
  const p = s.player;
  ctx.textAlign = 'left';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`SCORE ${s.score}`, 24, 84);
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`BEST ${s.best}`, 24, 106);
  for (let i = 0; i < p.maxHealth; i++) {
    ctx.fillStyle = i < p.health ? '#f4527f' : 'rgba(244,82,127,0.2)';
    ctx.fillText('♥', 24 + i * 22, 46);
  }
  ctx.textAlign = 'right';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(`WAVE ${s.wave}/10`, W - 24, 56);
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`${Math.round(112 + (s.wave - 1) * 3)} BPM`, W - 24, 76);
  if (s.combo >= 3) {
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = '#ffd94a';
    ctx.fillText(`x${s.combo} COMBO`, W - 24, 104);
  }
  ctx.textAlign = 'left';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(139,150,184,0.75)';
  ctx.fillText('WASD move · aim mouse · hold to fire · SPACE dash (on-beat = bonus) · P pause', 24, H - 20);
}

function drawTitle(ctx, s, W, H) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 76px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.player;
  ctx.fillText('PULSEBLOOM', W / 2, 230);
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('an arena that dances to its own music', W / 2, 272);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('Enemies bloom in on every beat. Survive ten waves.', W / 2, 336);
  ctx.fillText('Dash on the beat for bonus score. Pick a boon after each wave.', W / 2, 366);
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillStyle = '#e8b84a';
  ctx.fillText('PRESS ENTER TO PLAY', W / 2, 450);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`BEST SCORE ${s.best}`, W / 2, 505);
}

function drawUpgrade(ctx, s, W, H) {
  ctx.fillStyle = 'rgba(7,10,20,0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`WAVE ${s.wave} CLEARED — CHOOSE A BOON`, W / 2, 190);
  s.offers.forEach((o, i) => {
    const x = W / 2 + (i - 1) * 300, y = 330;
    ctx.fillStyle = '#141a2e';
    ctx.strokeStyle = PALETTE.player;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - 130, y - 80, 260, 160, 12);
    ctx.fill(); ctx.stroke();
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.player;
    ctx.fillText(o.name, x, y - 20);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(o.desc, x, y + 14);
    ctx.fillStyle = '#e8b84a';
    ctx.fillText(`press ${i + 1}`, x, y + 52);
  });
}

function drawCentered(ctx, W, H, big, mid, tint, small) {
  ctx.fillStyle = 'rgba(7,10,20,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 60px system-ui, sans-serif';
  ctx.fillStyle = tint;
  ctx.fillText(big, W / 2, 250);
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(mid, W / 2, 320);
  if (small) {
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillStyle = '#e8b84a';
    ctx.fillText(small, W / 2, 460);
  }
}
