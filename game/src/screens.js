// The interface surfaces: title screen, the HUD during play, the upgrade choice, pause,
// game over and victory. Each is drawn straight onto the playfield so screenshots and play
// share one code path.

import { COMBO, FIELD, PALETTE, SCORE_PER_BEAT_DASH, WAVES } from './config.js';
import { SCREEN_OVER, SCREEN_PAUSE, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './world.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.player;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function centred(ctx, text, y, size, colour, bold) {
  ctx.fillStyle = colour;
  ctx.font = `${bold ? 'bold ' : ''}${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(text, FIELD.centreX, y);
}

function hearts(ctx, s) {
  for (let i = 0; i < s.maxHp; i += 1) {
    const x = 34 + i * 34;
    ctx.fillStyle = i < s.hp ? PALETTE.enemyA : 'rgba(139,147,179,0.3)';
    ctx.shadowColor = i < s.hp ? PALETTE.enemyA : 'transparent';
    ctx.shadowBlur = i < s.hp ? 8 : 0;
    ctx.beginPath();
    const y = 36;
    ctx.moveTo(x, y + 8);
    ctx.bezierCurveTo(x - 14, y - 6, x - 4, y - 16, x, y - 4);
    ctx.bezierCurveTo(x + 4, y - 16, x + 14, y - 6, x, y + 8);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

export function drawHud(ctx, s) {
  hearts(ctx, s);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 26px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillText(`SCORE ${s.score}`, 24, 84);
  ctx.font = `16px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`BEST ${s.best}`, 24, 108);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 26px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillText(`WAVE ${Math.max(1, s.wave)}/${WAVES.total}`, FIELD.width - 24, 60);
  ctx.font = `16px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`${s.bpm} BPM`, FIELD.width - 24, 84);
  if (s.combo > 0) {
    ctx.fillStyle = PALETTE.bullet;
    ctx.font = `bold 20px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillText(`x${s.combo} COMBO`, FIELD.width - 24, 112);
  }
  // Dash readiness pip under the player.
  const p = s.player;
  const ready = p.dashCooldownTimer <= 0;
  ctx.fillStyle = ready ? PALETTE.good : 'rgba(139,147,179,0.5)';
  ctx.beginPath();
  ctx.arc(p.x, p.y + 26, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(139,147,179,0.75)';
  ctx.font = `14px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillText('WASD move · aim mouse · hold to fire · SPACE dash (on-beat = bonus)', 24, FIELD.height - 18);
}

export function drawTitle(ctx, s) {
  centred(ctx, 'PULSEBLOOM', 250, 84, PALETTE.player, true);
  centred(ctx, 'an arena that dances to its own music', 300, 24, PALETTE.muted, false);
  centred(ctx, 'Enemies bloom in on every beat. Survive ten waves.', 360, 22, PALETTE.text, false);
  centred(ctx, 'Dash on the beat for bonus score. Pick a boon after each wave.', 392, 20, PALETTE.muted, false);
  const flash = 0.6 + 0.4 * Math.sin(s.time * 4);
  ctx.globalAlpha = flash;
  centred(ctx, 'PRESS ENTER TO PLAY', 470, 30, PALETTE.bullet, true);
  ctx.globalAlpha = 1;
  centred(ctx, `BEST SCORE ${s.best}`, 540, 20, PALETTE.muted, false);
}

export function drawUpgrade(ctx, s) {
  panel(ctx, 190, 110, 900, 500);
  centred(ctx, `WAVE ${s.wave} CLEARED`, 180, 40, PALETTE.good, true);
  centred(ctx, 'Choose one boon — 1, 2 or 3', 220, 22, PALETTE.text, false);
  s.offers.forEach((offer, index) => {
    const x = 240 + index * 280;
    const y = 340;
    ctx.fillStyle = 'rgba(99,230,255,0.08)';
    ctx.fillRect(x, y - 90, 240, 220);
    ctx.strokeStyle = PALETTE.player;
    ctx.strokeRect(x, y - 90, 240, 220);
    centredBox(ctx, `${index + 1}`, x + 120, y - 40, 36, PALETTE.bullet, true);
    centredBox(ctx, offer.name, x + 120, y + 30, 24, PALETTE.text, true);
    centredBox(ctx, offer.detail, x + 120, y + 70, 18, PALETTE.muted, false);
  });
}

function centredBox(ctx, text, x, y, size, colour, bold) {
  ctx.fillStyle = colour;
  ctx.font = `${bold ? 'bold ' : ''}${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  const width = ctx.measureText(text).width;
  if (width > 220) ctx.font = `${bold ? 'bold ' : ''}${Math.floor((size * 220) / width)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillText(text, x, y);
}

export function drawPause(ctx) {
  panel(ctx, 440, 280, 400, 160);
  centred(ctx, 'PAUSED', 340, 40, PALETTE.text, true);
  centred(ctx, 'P to resume · M mute', 386, 18, PALETTE.muted, false);
}

export function drawGameOver(ctx, s) {
  ctx.fillStyle = 'rgba(11,14,26,0.82)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  centred(ctx, 'THE PULSE FADES', 250, 64, PALETTE.enemyA, true);
  centred(ctx, `SCORE ${s.score}`, 330, 44, PALETTE.text, true);
  centred(ctx, `reached wave ${Math.max(1, s.wave)} of ${WAVES.total} · best ${s.best}`, 376, 22, PALETTE.muted, false);
  const flash = 0.6 + 0.4 * Math.sin(s.time * 4);
  ctx.globalAlpha = flash;
  centred(ctx, 'PRESS ENTER OR R TO RESTART', 460, 28, PALETTE.bullet, true);
  ctx.globalAlpha = 1;
}

export function drawVictory(ctx, s) {
  ctx.fillStyle = 'rgba(11,14,26,0.82)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  centred(ctx, 'THE BLOOM IS BROKEN', 240, 60, PALETTE.good, true);
  centred(ctx, `FINAL SCORE ${s.score}`, 320, 46, PALETTE.text, true);
  centred(ctx, `all ${WAVES.total} waves survived · best ${s.best}`, 366, 22, PALETTE.muted, false);
  const flash = 0.6 + 0.4 * Math.sin(s.time * 4);
  ctx.globalAlpha = flash;
  centred(ctx, 'PRESS ENTER OR R TO RESTART', 450, 28, PALETTE.bullet, true);
  ctx.globalAlpha = 1;
}

export function drawMuteBadge(ctx, muted) {
  if (!muted) return;
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `16px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillText('MUTED (M)', FIELD.width - 24, FIELD.height - 18);
  ctx.textAlign = 'left';
}

/** Whatever the current state's screen implies, drawn over the world. */
export function drawScreen(ctx, world, muted) {
  const s = world.state;
  if (s.screen === SCREEN_TITLE) {
    drawTitle(ctx, s);
  } else {
    drawHud(ctx, s);
    if (s.screen === SCREEN_UPGRADE) drawUpgrade(ctx, s);
    if (s.screen === SCREEN_PAUSE) drawPause(ctx);
    if (s.screen === SCREEN_OVER) drawGameOver(ctx, s);
    if (s.screen === SCREEN_WIN) drawVictory(ctx, s);
    drawMuteBadge(ctx, muted);
  }
}
