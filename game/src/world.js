// The world: the whole simulation in one step() function — player physics, shooting, dashes,
// enemy brains, bullets, particles, the beat clock, the wave director and scoring. Rendering
// reads it; the screenshot autopilot steers it; the browser loop and the scenes both feed it.

import { BULLET, COMBO, ENEMIES, FIELD, PLAYER, PALETTE, SCORE_PER_BEAT_DASH, STEP, WAVES } from './config.js';
import { createRandom, rangeBetween } from './random.js';
import { rollOffers } from './upgrades.js';
import { planWave } from './waves.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';
export const SCREEN_PAUSE = 'pause';

export const EVENT_OVER = 1;
export const EVENT_WIN = 2;

export function createWorld(seed) {
  return {
    seed,
    random: null,
    state: null,
    /** Fixed-step simulator. `fire` is a command object from the input layer or autopilot:
     *  { moveX, moveY, aimX, aimY, shoot, dash }. Shot mode freezes audio involvement. */
    step(dt, command, shotMode) {
      const s = this.state;
      s.time += dt;
      s.secondsPerBeat = 60 / s.bpm;
      const beatNow = Math.floor(s.time / s.secondsPerBeat);
      if (beatNow > s.lastBeat) {
        s.lastBeat = beatNow;
        s.beatFlash = 1;
        s.onBeatWindow = true;
      } else {
        s.onBeatWindow = false;
      }
      s.beatFlash = Math.max(0, s.beatFlash - dt * 4);

      this.stepPlayer(dt, command, shotMode);
      this.stepEnemies(dt);
      this.stepBullets(dt);
      this.stepEnemyBullets(dt);
      this.stepParticles(dt);
      this.stepDirector();
      this.stepCombo(dt);

      if (s.hp <= 0 && s.screen === SCREEN_PLAY) {
        s.screen = SCREEN_OVER;
        return EVENT_OVER;
      }
      return 0;
    },
    stepPlayer(dt, command, shotMode) {
      const s = this.state;
      const p = s.player;
      if (s.screen !== SCREEN_PLAY) return;
      // Dash: a short burst with a cooldown; dashing exactly on the beat pays out.
      if (command.dash && p.dashTimer <= 0 && p.dashCooldownTimer <= 0) {
        const aimX = command.moveX || command.aimX || 0;
        const aimY = command.moveY || command.aimY || 0;
        const len = Math.hypot(aimX, aimY) || 1;
        p.dashVX = (aimX / len) * PLAYER.dashSpeed;
        p.dashVY = (aimY / len) * PLAYER.dashSpeed;
        p.dashTimer = PLAYER.dashTime;
        p.dashCooldownTimer = s.dashCooldown;
        if (s.onBeatWindow && !shotMode) s.score += SCORE_PER_BEAT_DASH;
        if (shotMode) s.score += SCORE_PER_BEAT_DASH;
        for (let i = 0; i < 8; i += 1) this.spawnParticle(p.x, p.y, rangeBetween(s.random, -60, 60), rangeBetween(s.random, -60, 60), 0.3, PALETTE.player, 3);
      }
      if (p.dashTimer > 0) {
        p.dashTimer -= dt;
        p.x += p.dashVX * dt;
        p.y += p.dashVY * dt;
        p.invuln = Math.max(p.invuln, 0.12);
      } else {
        p.dashCooldownTimer -= dt;
        p.x += command.moveX * s.playerSpeed * dt;
        p.y += command.moveY * s.playerSpeed * dt;
      }
      p.x = Math.max(FIELD.margin, Math.min(FIELD.width - FIELD.margin, p.x));
      p.y = Math.max(FIELD.margin, Math.min(FIELD.height - FIELD.margin, p.y));
      p.invuln = Math.max(0, p.invuln - dt);

      // Shooting: hold to fire toward the aim point, at a rate the upgrades shape.
      p.fireTimer -= dt;
      if (command.shoot && p.fireTimer <= 0) {
        p.fireTimer = s.fireInterval;
        const baseAngle = Math.atan2(command.aimY - p.y, command.aimX - p.x);
        const spread = s.spread;
        for (let i = 0; i <= spread; i += 1) {
          const angle = baseAngle + (i - spread / 2) * 0.12;
          s.bullets.push({
            x: p.x + Math.cos(baseAngle) * PLAYER.radius,
            y: p.y + Math.sin(baseAngle) * PLAYER.radius,
            vx: Math.cos(angle) * PLAYER.bulletSpeed,
            vy: Math.sin(angle) * PLAYER.bulletSpeed,
            r: s.bulletRadius,
            damage: s.bulletDamage,
            pierce: s.pierce,
            life: 1.4,
          });
        }
        s.firedShots += 1;
        if (!shotMode) s.onShoot?.();
        for (let i = 0; i < 3; i += 1) this.spawnParticle(p.x + Math.cos(baseAngle) * 20, p.y + Math.sin(baseAngle) * 20, Math.cos(baseAngle) * 120 + rangeBetween(s.random, -40, 40), Math.sin(baseAngle) * 120 + rangeBetween(s.random, -40, 40), 0.15, PALETTE.bullet, 2);
      }
    },
    stepEnemies(dt) {
      const s = this.state;
      const p = s.player;
      for (const enemy of s.enemies) {
        enemy.pulse = (s.time / s.secondsPerBeat) % 1;
        if (enemy.type === 'dart') {
          if (enemy.telegraph > 0) {
            enemy.telegraph -= dt;
          } else if (enemy.chargeDir === null) {
            const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
            enemy.chargeDir = { x: Math.cos(angle), y: Math.sin(angle) };
            enemy.charging = ENEMIES.dart.chargeTime;
          } else if (enemy.charging > 0) {
            enemy.charging -= dt;
            enemy.x += enemy.chargeDir.x * ENEMIES.dart.chargeSpeed * dt;
            enemy.y += enemy.chargeDir.y * ENEMIES.dart.chargeSpeed * dt;
          } else {
            // After the charge it drifts toward the player slowly.
            const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
            enemy.x += Math.cos(angle) * ENEMIES.dart.speed * dt;
            enemy.y += Math.sin(angle) * ENEMIES.dart.speed * dt;
          }
        } else if (enemy.type === 'boss') {
          const angle = Math.atan2(FIELD.centreY - enemy.y, FIELD.centreX - enemy.x);
          enemy.x += Math.cos(angle) * enemy.speed * dt;
          enemy.y += Math.sin(angle) * enemy.speed * dt;
          if (s.lastBeat !== enemy.lastBurst && s.lastBeat % ENEMIES.boss.burstBeatEvery === 0 && s.lastBeat > enemy.lastBurst) {
            enemy.lastBurst = s.lastBeat;
            for (let i = 0; i < ENEMIES.boss.burstShots; i += 1) {
              const shotAngle = (i / ENEMIES.boss.burstShots) * Math.PI * 2 + s.time;
              s.enemyBullets.push({ x: enemy.x, y: enemy.y, vx: Math.cos(shotAngle) * BULLET.enemySpeed, vy: Math.sin(shotAngle) * BULLET.enemySpeed, r: BULLET.enemyRadius, life: 6 });
            }
          }
        } else {
          const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
          enemy.x += Math.cos(angle) * enemy.speed * dt;
          enemy.y += Math.sin(angle) * enemy.speed * dt;
        }
        // Touching anything hostile hurts.
        if (p.invuln <= 0 && Math.hypot(enemy.x - p.x, enemy.y - p.y) < enemy.radius + PLAYER.radius) this.hurtPlayer();
      }
      // Nothing hostile wanders out of the arena for long: clamp strays back inside.
      for (const enemy of s.enemies) {
        if (enemy.y > FIELD.height + 60) enemy.y = FIELD.height + 60;
        if (enemy.y < -80) enemy.y = -80;
        if (enemy.x > FIELD.width + 60) enemy.x = FIELD.width + 60;
        if (enemy.x < -80) enemy.x = -80;
      }
    },
    stepBullets(dt) {
      const s = this.state;
      for (let i = s.bullets.length - 1; i >= 0; i -= 1) {
        const bullet = s.bullets[i];
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        bullet.life -= dt;
        if (bullet.life <= 0 || bullet.x < -30 || bullet.x > FIELD.width + 30 || bullet.y < -30 || bullet.y > FIELD.height + 30) {
          s.bullets.splice(i, 1);
          continue;
        }
        for (let j = s.enemies.length - 1; j >= 0; j -= 1) {
          const enemy = s.enemies[j];
          if (Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < enemy.radius + bullet.r) {
            enemy.hp -= bullet.damage;
            if (s.knockback > 0) {
              const angle = Math.atan2(enemy.y - bullet.y, enemy.x - bullet.x);
              enemy.x += Math.cos(angle) * s.knockback * dt * 10;
              enemy.y += Math.sin(angle) * s.knockback * dt * 10;
            }
            if (bullet.pierce > 0) bullet.pierce -= 1;
            else s.bullets.splice(i, 1);
            if (!s.shotMode) s.onHit?.();
            if (enemy.hp <= 0) {
              s.enemies.splice(j, 1);
              this.killEnemy(enemy);
            } else {
              for (let k = 0; k < 4; k += 1) this.spawnParticle(bullet.x, bullet.y, rangeBetween(s.random, -140, 140), rangeBetween(s.random, -140, 140), 0.25, PALETTE.bullet, 3);
            }
            break;
          }
        }
      }
    },
    killEnemy(enemy) {
      const s = this.state;
      s.combo += 1;
      s.comboTimer = COMBO.decaySeconds;
      s.score += Math.round(enemy.score * (1 + s.combo * 0.1) * s.scoreMult);
      const colour = enemy.type === 'boss' ? PALETTE.enemyC : enemy.tint;
      for (let i = 0; i < (enemy.type === 'boss' ? 60 : 16); i += 1) {
        this.spawnParticle(enemy.x, enemy.y, rangeBetween(s.random, -260, 260), rangeBetween(s.random, -260, 260), rangeBetween(s.random, 0.3, 0.8), colour, enemy.type === 'boss' ? 5 : 3);
      }
      if (enemy.type === 'bloom') {
        for (let i = 0; i < ENEMIES.bloom.shards; i += 1) {
          s.enemies.push({
            type: 'shard', x: enemy.x + rangeBetween(s.random, -20, 20), y: enemy.y + rangeBetween(s.random, -20, 20),
            radius: ENEMIES.shard.radius, hp: ENEMIES.shard.hp, speed: ENEMIES.shard.speed, score: ENEMIES.shard.score,
            tint: enemy.tint, pulse: 0, chargeDir: null, telegraph: 0, lastBurst: -1,
          });
        }
      }
      if (!s.shotMode) s.onKill?.();
    },
    stepEnemyBullets(dt) {
      const s = this.state;
      const p = s.player;
      for (let i = s.enemyBullets.length - 1; i >= 0; i -= 1) {
        const bullet = s.enemyBullets[i];
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        bullet.life -= dt;
        if (bullet.life <= 0 || bullet.x < -40 || bullet.x > FIELD.width + 40 || bullet.y < -40 || bullet.y > FIELD.height + 40) {
          s.enemyBullets.splice(i, 1);
          continue;
        }
        if (p.invuln <= 0 && Math.hypot(bullet.x - p.x, bullet.y - p.y) < bullet.r + PLAYER.radius) {
          s.enemyBullets.splice(i, 1);
          this.hurtPlayer();
        }
      }
    },
    stepParticles(dt) {
      const s = this.state;
      for (let i = s.particles.length - 1; i >= 0; i -= 1) {
        const particle = s.particles[i];
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= 1 - dt * 3;
        particle.vy *= 1 - dt * 3;
        particle.life -= dt;
        if (particle.life <= 0) s.particles.splice(i, 1);
      }
    },
    stepCombo(dt) {
      const s = this.state;
      if (s.comboTimer > 0) {
        s.comboTimer -= dt;
        if (s.comboTimer <= 0) s.combo = 0;
      }
    },
    stepDirector() {
      const s = this.state;
      if (s.screen !== SCREEN_PLAY) return;
      // Spawning: entries come due on their planned beat.
      while (s.plan.length > 0 && s.lastBeat >= s.plan[0].beat) {
        const entry = s.plan.shift();
        s.enemies.push({
          type: entry.type, x: entry.x, y: entry.y,
          radius: ENEMIES[entry.type].radius, hp: Math.ceil(ENEMIES[entry.type].hp * entry.scale),
          speed: (ENEMIES[entry.type].speed ?? 0) * entry.scale || (ENEMIES[entry.type].chargeSpeed ?? 0),
          score: ENEMIES[entry.type].score, tint: entry.type === 'drifter' ? PALETTE.enemyA : entry.type === 'dart' ? PALETTE.enemyB : PALETTE.enemyC,
          pulse: 0, chargeDir: entry.type === 'dart' ? null : undefined,
          telegraph: entry.type === 'dart' ? ENEMIES.dart.telegraph : 0,
          lastBurst: -1,
        });
      }
      if (s.plan.length === 0 && s.enemies.length === 0 && s.enemyBullets.length === 0) {
        if (s.wave >= WAVES.total) {
          s.screen = SCREEN_WIN;
          s.wonAt = s.time;
          return;
        }
        s.screen = SCREEN_UPGRADE;
        s.offers = rollOffers(s.random, s.taken);
      }
    },
    hurtPlayer() {
      const s = this.state;
      const p = s.player;
      if (p.invuln > 0 || s.hp <= 0) return;
      s.hp -= 1;
      p.invuln = PLAYER.hurtInvuln;
      s.combo = 0;
      for (let i = 0; i < 24; i += 1) this.spawnParticle(p.x, p.y, rangeBetween(s.random, -300, 300), rangeBetween(s.random, -300, 300), 0.5, PALETTE.enemyBullet, 4);
      if (!s.shotMode) s.onHurt?.();
    },
    spawnParticle(x, y, vx, vy, life, colour, size) {
      const s = this.state;
      if (s.particles.length > 400) s.particles.shift();
      s.particles.push({ x, y, vx, vy, life, maxLife: life, colour, size });
    },
    chooseUpgrade(index) {
      const s = this.state;
      if (s.screen !== SCREEN_UPGRADE || index >= s.offers.length) return;
      const upgrade = s.offers[index];
      upgrade.apply(s);
      s.taken.add(upgrade.id);
      s.wave += 1;
      s.bpm = WAVES.bpmStart + WAVES.bpmPerWave * s.wave;
      s.onBpm?.(s.bpm);
      s.plan = planWave(s.wave, s.random);
      s.screen = SCREEN_PLAY;
      if (!s.shotMode) s.onWaveStart?.();
    },
    reset() {
      this.random = createRandom(this.seed);
      this.state = {
        random: this.random,
        screen: SCREEN_TITLE,
        time: 0,
        lastBeat: -1,
        beatFlash: 0,
        onBeatWindow: false,
        secondsPerBeat: 60 / WAVES.bpmStart,
        bpm: WAVES.bpmStart,
        wave: 0,
        score: 0,
        best: this.state ? this.state.best : 0,
        hp: PLAYER.hp,
        maxHp: PLAYER.hp,
        combo: 0,
        comboTimer: 0,
        scoreMult: 1,
        firedShots: 0,
        player: { x: FIELD.centreX, y: FIELD.centreY, dashTimer: 0, dashCooldownTimer: 0, dashVX: 0, dashVY: 0, fireTimer: 0, invuln: 0 },
        bullets: [],
        enemies: [],
        enemyBullets: [],
        particles: [],
        plan: planWave(0, this.random),
        offers: [],
        taken: new Set(),
        // Tuning fields the upgrades rewrite.
        bulletDamage: PLAYER.bulletDamage,
        fireInterval: PLAYER.fireInterval,
        playerSpeed: PLAYER.speed,
        dashCooldown: PLAYER.dashCooldown,
        spread: 0,
        pierce: 0,
        bulletRadius: PLAYER.bulletRadius,
        knockback: 0,
        shotMode: false,
        onShoot: null, onHit: null, onKill: null, onHurt: null, onBpm: null, onWaveStart: null,
      };
    },
    beginRun() {
      this.state.screen = SCREEN_PLAY;
      this.state.wave = 1;
      this.state.plan = planWave(1, this.random);
    },
  };
}
