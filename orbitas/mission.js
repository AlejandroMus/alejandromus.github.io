const MissionL2 = (() => {
  const MU = 3.0034896e-6;
  const EARTH_X = 1 - MU;
  const AU_KM = 149597870.7;
  const VELOCITY_UNIT_MS = 29784.7;
  const TIME_UNIT_DAYS = 365.256 / (2 * Math.PI);
  const EARTH_RADIUS = 6371 / AU_KM;
  const SUN_RADIUS = 696340 / AU_KM;
  const RELEASE_DISTANCE = 0.0015;
  const TARGET_RADIUS = 120000 / AU_KM;
  const STEP = 0.00012;

  const solveLagrange = side => {
    let x = EARTH_X + side * Math.cbrt(MU / 3);
    for (let i = 0; i < 16; i++) {
      const a = x + MU;
      const b = x - EARTH_X;
      const f = x - (1 - MU) * a / Math.abs(a) ** 3 - MU * b / Math.abs(b) ** 3;
      const df = 1 + 2 * (1 - MU) / Math.abs(a) ** 3 + 2 * MU / Math.abs(b) ** 3;
      x -= f / df;
    }
    return x;
  };

  const L1 = solveLagrange(-1);
  const L2 = solveLagrange(1);
  const length = ([x, y]) => Math.hypot(x, y);

  class Mission {
    constructor() {
      this.canvas = document.querySelector('#missionCanvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.speedInput = document.querySelector('#launchSpeed');
      this.angleInput = document.querySelector('#launchAngle');
      this.speedValue = document.querySelector('#launchSpeedValue');
      this.angleValue = document.querySelector('#launchAngleValue');
      this.playbackSelect = document.querySelector('#missionPlayback');
      this.launchButton = document.querySelector('#missionLaunch');
      this.resetButton = document.querySelector('#missionReset');
      this.viewButton = document.querySelector('#missionView');
      this.viewName = document.querySelector('#missionViewName');
      this.status = document.querySelector('#missionStatus');
      this.clock = document.querySelector('#missionClock');
      this.readouts = {
        l2: document.querySelector('#distanceL2'),
        closest: document.querySelector('#closestL2'),
        speed: document.querySelector('#relativeSpeed'),
        earth: document.querySelector('#distanceEarth'),
      };
      this.view = 'local';
      this.visible = false;
      this.stars = this.makeStars(150);
      this.bind();
      new ResizeObserver(() => this.resize()).observe(this.canvas.parentElement);
      new IntersectionObserver(entries => {
        this.visible = entries[0].isIntersecting;
        this.lastFrame = performance.now();
        if (this.visible) this.draw();
      }, { rootMargin: '120px' }).observe(this.canvas);
      this.resize();
      this.reset();
      requestAnimationFrame(now => this.animate(now));
    }

    bind() {
      [this.speedInput, this.angleInput].forEach(input => input.addEventListener('input', () => {
        document.querySelectorAll('[data-mission-preset]').forEach(button => button.classList.remove('active'));
        this.updateControlLabels();
        this.reset();
      }));
      document.querySelectorAll('[data-mission-preset]').forEach(button => button.addEventListener('click', () => {
        const preset = {
          reference: [1700, 15],
          slow: [1300, 0],
          fast: [2600, 5],
        }[button.dataset.missionPreset];
        this.speedInput.value = preset[0];
        this.angleInput.value = preset[1];
        document.querySelectorAll('[data-mission-preset]').forEach(item => item.classList.toggle('active', item === button));
        this.updateControlLabels();
        this.reset();
      }));
      this.launchButton.addEventListener('click', () => {
        if (this.mode === 'ready') this.launch();
        else if (this.mode === 'complete') {
          this.reset();
          this.launch();
        }
        else {
          this.running = !this.running;
          this.mode = this.running ? 'flight' : 'paused';
          this.launchButton.textContent = this.running ? 'Ⅱ Pausar' : '▶ Continuar';
          this.setStatus(this.running ? 'En transferencia' : 'Misión pausada', this.running ? '#64c8d2' : '#e9c46a');
        }
      });
      this.resetButton.addEventListener('click', () => this.reset());
      this.viewButton.addEventListener('click', () => {
        this.view = this.view === 'local' ? 'system' : 'local';
        this.viewName.textContent = this.view === 'local' ? 'VISTA LOCAL · TIERRA–L2' : 'VISTA COMPLETA · SOL–TIERRA';
        this.viewButton.textContent = this.view === 'local' ? 'Ver sistema completo' : 'Acercar a Tierra–L2';
        this.draw();
      });
    }

    updateControlLabels() {
      this.speedValue.textContent = `${Number(this.speedInput.value).toLocaleString('es-ES')} m/s`;
      const angle = Number(this.angleInput.value);
      this.angleValue.textContent = `${angle >= 0 ? '+' : ''}${angle.toLocaleString('es-ES', { minimumFractionDigits: 1 })}°`;
    }

    reset() {
      this.updateControlLabels();
      this.mode = 'ready';
      this.running = false;
      this.time = 0;
      this.stepBudget = 0;
      this.hitWindow = false;
      this.closest = Infinity;
      this.closestSpeed = Infinity;
      this.trail = [];
      const speed = Number(this.speedInput.value) / VELOCITY_UNIT_MS;
      const angle = Number(this.angleInput.value) * Math.PI / 180;
      this.position = [EARTH_X + RELEASE_DISTANCE, 0];
      this.velocity = [speed * Math.cos(angle), this.position[0] + speed * Math.sin(angle)];
      this.acceleration = this.gravity(this.position, this.time);
      this.record();
      this.launchButton.textContent = 'Lanzar →';
      this.setStatus('Preparado', '#64c8d2');
      this.updateReadouts();
      this.draw();
    }

    launch() {
      this.mode = 'flight';
      this.running = true;
      this.lastFrame = performance.now();
      this.launchButton.textContent = 'Ⅱ Pausar';
      this.setStatus('En transferencia', '#64c8d2');
    }

    primaries(time) {
      const c = Math.cos(time);
      const s = Math.sin(time);
      return {
        sun: { position: [-MU * c, -MU * s], velocity: [MU * s, -MU * c] },
        earth: { position: [EARTH_X * c, EARTH_X * s], velocity: [-EARTH_X * s, EARTH_X * c] },
      };
    }

    gravity(position, time) {
      const { sun, earth } = this.primaries(time);
      const acceleration = [0, 0];
      [[sun, 1 - MU], [earth, MU]].forEach(([body, mass]) => {
        const dx = body.position[0] - position[0];
        const dy = body.position[1] - position[1];
        const r2 = dx * dx + dy * dy;
        const factor = mass / (r2 * Math.sqrt(r2));
        acceleration[0] += dx * factor;
        acceleration[1] += dy * factor;
      });
      return acceleration;
    }

    integrate() {
      this.velocity[0] += this.acceleration[0] * STEP * .5;
      this.velocity[1] += this.acceleration[1] * STEP * .5;
      this.position[0] += this.velocity[0] * STEP;
      this.position[1] += this.velocity[1] * STEP;
      this.time += STEP;
      this.acceleration = this.gravity(this.position, this.time);
      this.velocity[0] += this.acceleration[0] * STEP * .5;
      this.velocity[1] += this.acceleration[1] * STEP * .5;
      this.evaluate();
    }

    rotatingState() {
      const c = Math.cos(this.time);
      const s = Math.sin(this.time);
      const x = c * this.position[0] + s * this.position[1];
      const y = -s * this.position[0] + c * this.position[1];
      return {
        position: [x, y],
        velocity: [c * this.velocity[0] + s * this.velocity[1] + y, -s * this.velocity[0] + c * this.velocity[1] - x],
      };
    }

    evaluate() {
      const rotating = this.rotatingState();
      const distanceL2 = Math.hypot(rotating.position[0] - L2, rotating.position[1]);
      const relativeSpeed = length(rotating.velocity) * VELOCITY_UNIT_MS;
      if (distanceL2 < this.closest) {
        this.closest = distanceL2;
        this.closestSpeed = relativeSpeed;
      }
      if (distanceL2 < TARGET_RADIUS && relativeSpeed < 600) {
        this.hitWindow = true;
        this.setStatus('Ventana L2 alcanzada', '#68d391');
      }
      const primaries = this.primaries(this.time);
      const distanceEarth = Math.hypot(this.position[0] - primaries.earth.position[0], this.position[1] - primaries.earth.position[1]);
      const distanceSun = Math.hypot(this.position[0] - primaries.sun.position[0], this.position[1] - primaries.sun.position[1]);
      if (distanceEarth < EARTH_RADIUS) this.finish('Impacto con la Tierra', '#f17748');
      else if (distanceSun < SUN_RADIUS) this.finish('Impacto con el Sol', '#f17748');
      else if (distanceSun > 1.4 || distanceSun < .55) this.finish('Observatorio perdido', '#f17748');
      else if (this.time * TIME_UNIT_DAYS >= 180) this.finishMission(distanceEarth, primaries.earth.velocity);
    }

    finishMission(distanceEarth, earthVelocity) {
      if (this.hitWindow) this.finish('Misión preparada para inserción', '#68d391');
      else {
        const dvx = this.velocity[0] - earthVelocity[0];
        const dvy = this.velocity[1] - earthVelocity[1];
        const earthEnergy = .5 * (dvx * dvx + dvy * dvy) - MU / distanceEarth;
        if (earthEnergy < 0 && distanceEarth < .012) this.finish('Órbita terrestre', '#e9c46a');
        else this.finish('Perdido en órbita solar', '#f17748');
      }
    }

    finish(message, color) {
      this.running = false;
      this.mode = 'complete';
      this.launchButton.textContent = 'Repetir lanzamiento';
      this.setStatus(message, color);
    }

    record() {
      const state = this.rotatingState();
      this.trail.push(state.position);
      if (this.trail.length > 4200) this.trail.shift();
    }

    animate(now) {
      const elapsed = Math.min(50, now - (this.lastFrame || now));
      this.lastFrame = now;
      if (this.running && this.visible) {
        const daysPerSecond = Number(this.playbackSelect.value);
        this.stepBudget += elapsed / 1000 * daysPerSecond / TIME_UNIT_DAYS / STEP;
        const steps = Math.min(320, Math.floor(this.stepBudget));
        this.stepBudget -= steps;
        for (let i = 0; i < steps && this.running; i++) {
          this.integrate();
          if (i % 5 === 0) this.record();
        }
        this.updateReadouts();
        this.draw();
      }
      requestAnimationFrame(next => this.animate(next));
    }

    setStatus(text, color) {
      this.status.textContent = text;
      this.status.style.color = color;
      this.status.style.borderColor = color;
    }

    updateReadouts() {
      const rotating = this.rotatingState();
      const primaries = this.primaries(this.time);
      const distanceL2 = Math.hypot(rotating.position[0] - L2, rotating.position[1]);
      const distanceEarth = Math.hypot(this.position[0] - primaries.earth.position[0], this.position[1] - primaries.earth.position[1]);
      const relativeSpeed = length(rotating.velocity) * VELOCITY_UNIT_MS;
      const distanceText = value => value < 1 ? `${Math.round(value * AU_KM).toLocaleString('es-ES')} km` : `${value.toLocaleString('es-ES', { maximumFractionDigits: 2 })} UA`;
      this.readouts.l2.textContent = distanceText(distanceL2);
      this.readouts.closest.textContent = this.closest < Infinity ? distanceText(this.closest) : '—';
      this.readouts.speed.textContent = `${Math.round(relativeSpeed).toLocaleString('es-ES')} m/s`;
      this.readouts.earth.textContent = distanceText(distanceEarth);
      this.clock.textContent = `Día ${(this.time * TIME_UNIT_DAYS).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
    }

    resize() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
      this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.width = rect.width;
      this.height = rect.height;
      this.draw();
    }

    draw() {
      if (!this.width || !this.position) return;
      const ctx = this.ctx;
      const gradient = ctx.createRadialGradient(this.width * .55, this.height * .5, 0, this.width * .55, this.height * .5, Math.max(this.width, this.height));
      gradient.addColorStop(0, '#0a202a');
      gradient.addColorStop(.55, '#06121a');
      gradient.addColorStop(1, '#02070b');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.width, this.height);
      this.drawStars();
      if (this.view === 'local') this.drawLocal(); else this.drawSystem();
    }

    drawStars() {
      this.ctx.save();
      this.stars.forEach(star => {
        this.ctx.globalAlpha = star.alpha;
        this.ctx.fillStyle = '#dcebed';
        this.ctx.fillRect(star.x * this.width, star.y * this.height, star.size, star.size);
      });
      this.ctx.restore();
    }

    drawLocal() {
      const ctx = this.ctx;
      const scale = Math.min(this.width / .052, this.height / .039);
      const center = [this.width * .43, this.height * .5];
      const project = point => [center[0] + (point[0] - EARTH_X) * scale, center[1] + point[1] * scale];
      const earth = project([EARTH_X, 0]);
      const l1 = project([L1, 0]);
      const l2 = project([L2, 0]);
      const hill = Math.cbrt(MU / 3) * scale;
      ctx.strokeStyle = '#64c8d218';
      ctx.lineWidth = 1;
      for (let offset = -.015; offset <= .025; offset += .005) {
        const x = project([EARTH_X + offset, 0])[0];
        ctx.beginPath(); ctx.moveTo(x, 38); ctx.lineTo(x, this.height - 38); ctx.stroke();
      }
      ctx.setLineDash([5, 7]);
      ctx.strokeStyle = '#64c8d24a';
      ctx.beginPath(); ctx.arc(earth[0], earth[1], hill, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#e9c46a';
      ctx.font = '10px Arial';
      ctx.fillText('← Sol · 1 UA', 22, this.height * .5 - 18);
      this.drawPoint(l1, 'L1', '#92a6ad', 4);
      ctx.strokeStyle = '#68d391';
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.arc(l2[0], l2[1], Math.max(10, TARGET_RADIUS * scale), 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      this.drawPoint(l2, 'L2 · ventana de llegada', '#68d391', 5);
      ctx.strokeStyle = '#64c8d25c';
      ctx.beginPath(); ctx.arc(earth[0], earth[1], 24, 0, Math.PI * 2); ctx.stroke();
      this.drawBody(earth, 10, '#64c8d2', 'Tierra');
      this.drawTrail(project);
      this.drawTelescope(project(this.rotatingState().position));
      ctx.fillStyle = '#647b84';
      ctx.font = '9px Arial';
      ctx.fillText('esfera de Hill', earth[0] - hill + 8, earth[1] - hill + 15);
    }

    drawSystem() {
      const ctx = this.ctx;
      const scale = Math.min(this.width, this.height) * .39;
      const center = [this.width * .5, this.height * .52];
      const project = point => [center[0] + point[0] * scale, center[1] + point[1] * scale];
      ctx.strokeStyle = '#64c8d22c';
      ctx.setLineDash([5, 8]);
      ctx.beginPath(); ctx.arc(center[0], center[1], scale, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      const sun = project([-MU, 0]);
      const earth = project([EARTH_X, 0]);
      this.drawBody(sun, 18, '#e9c46a', 'Sol');
      this.drawBody(earth, 7, '#64c8d2', 'Tierra + L2');
      this.drawTrail(project);
      this.drawTelescope(project(this.rotatingState().position));
    }

    drawTrail(project) {
      if (this.trail.length < 2) return;
      const ctx = this.ctx;
      const stride = Math.max(1, Math.ceil(this.trail.length / 1600));
      ctx.beginPath();
      for (let i = 0; i < this.trail.length; i += stride) {
        const point = project(this.trail[i]);
        if (i === 0) ctx.moveTo(point[0], point[1]); else ctx.lineTo(point[0], point[1]);
      }
      ctx.strokeStyle = '#f17748';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    drawBody(point, radius, color, label) {
      const ctx = this.ctx;
      const glow = ctx.createRadialGradient(point[0], point[1], 1, point[0], point[1], radius * 3);
      glow.addColorStop(0, color);
      glow.addColorStop(.35, `${color}aa`);
      glow.addColorStop(1, `${color}00`);
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(point[0], point[1], radius * 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(point[0], point[1], radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#dcebed';
      ctx.font = '9px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(label, point[0], point[1] + radius + 16);
    }

    drawPoint(point, label, color, radius) {
      this.ctx.fillStyle = color;
      this.ctx.beginPath(); this.ctx.arc(point[0], point[1], radius, 0, Math.PI * 2); this.ctx.fill();
      this.ctx.font = '9px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(label, point[0], point[1] - 12);
    }

    drawTelescope(point) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(point[0], point[1]);
      ctx.fillStyle = '#f17748';
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(7, 6); ctx.lineTo(0, 3); ctx.lineTo(-7, 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ece7d9';
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
      ctx.restore();
    }

    makeStars(count) {
      let seed = 424242;
      const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      return Array.from({ length: count }, () => ({ x: random(), y: random(), size: random() > .88 ? 1.4 : .7, alpha: .1 + random() * .42 }));
    }
  }

  return { Mission, constants: { MU, EARTH_X, L1, L2, AU_KM, VELOCITY_UNIT_MS, TIME_UNIT_DAYS } };
})();

if (typeof document !== 'undefined') new MissionL2.Mission();
if (typeof module !== 'undefined') module.exports = MissionL2;
