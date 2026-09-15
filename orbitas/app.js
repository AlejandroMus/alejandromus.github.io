const TAU = Math.PI * 2;
const G = 1;
const SOFTENING = 0.055;
const BODY_COLORS = ['#64c8d2', '#f17748', '#ece7d9'];
const nf = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: a => Math.hypot(a[0], a[1], a[2]),
};

class GravityLab {
  constructor(root) {
    this.root = root;
    this.kind = root.dataset.simulation;
    this.canvas = root.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.inputs = Object.fromEntries([...root.querySelectorAll('[data-param]')].map(input => [input.dataset.param, input]));
    this.outputs = Object.fromEntries([...root.querySelectorAll('[data-output]')].map(output => [output.dataset.output, output]));
    this.readouts = Object.fromEntries([...root.querySelectorAll('[data-readout]')].map(output => [output.dataset.readout, output]));
    this.timeLabel = root.querySelector('.sim-time');
    this.statusLabel = root.querySelector('.status');
    this.playButton = root.querySelector('[data-action="play"]');
    this.trailButton = root.querySelector('[data-action="trails"]');
    this.playbackSelect = root.querySelector('[data-playback]');
    this.phaseCanvas = root.querySelector('.phase-canvas');
    this.phaseCtx = this.phaseCanvas ? this.phaseCanvas.getContext('2d') : null;
    this.phaseReadout = root.querySelector('[data-phase-readout]');
    this.running = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.showTrails = true;
    this.playback = Number(this.playbackSelect?.value || 1);
    this.visible = false;
    this.time = 0;
    this.frame = 0;
    this.stepBudget = 0;
    this.phasePoints = [];
    this.yaw = -0.55;
    this.pitch = 0.58;
    this.zoom = 1;
    this.drag = null;
    this.preset = this.kind === 'two' ? 'circular' : 'figure8';
    this.layout = this.preset;
    this.stars = this.makeStars(135);

    this.bindControls();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas.parentElement);
    this.visibilityObserver = new IntersectionObserver(entries => {
      this.visible = entries[0].isIntersecting;
      this.lastFrame = performance.now();
      if (this.visible) this.render();
    }, { rootMargin: '150px' });
    this.visibilityObserver.observe(this.root);
    this.resize();
    this.reset();
    this.updatePlayButton();
    requestAnimationFrame(now => this.animate(now));
  }

  bindControls() {
    Object.values(this.inputs).forEach(input => {
      input.addEventListener('input', () => {
        this.preset = 'custom';
        this.root.querySelectorAll('[data-preset]').forEach(button => button.classList.remove('active'));
        this.updateOutputs();
        this.reset();
      });
    });
    this.root.querySelectorAll('[data-preset]').forEach(button => {
      button.addEventListener('click', () => this.applyPreset(button.dataset.preset));
    });
    this.playButton.addEventListener('click', () => {
      this.running = !this.running;
      this.updatePlayButton();
    });
    this.root.querySelector('[data-action="reset"]').addEventListener('click', () => this.reset());
    this.trailButton.addEventListener('click', () => {
      this.showTrails = !this.showTrails;
      this.trailButton.setAttribute('aria-pressed', String(this.showTrails));
      this.trailButton.textContent = `Trazas: ${this.showTrails ? 'sí' : 'no'}`;
      this.render();
    });

    this.playbackSelect?.addEventListener('change', () => {
      this.playback = Number(this.playbackSelect.value);
      this.stepBudget = 0;
      this.updateReadouts();
    });

    this.canvas.tabIndex = 0;
    this.canvas.addEventListener('pointerdown', event => {
      this.drag = { x: event.clientX, y: event.clientY, yaw: this.yaw, pitch: this.pitch };
      this.canvas.setPointerCapture(event.pointerId);
    });
    this.canvas.addEventListener('pointermove', event => {
      if (!this.drag) return;
      this.yaw = this.drag.yaw + (event.clientX - this.drag.x) * 0.008;
      this.pitch = Math.max(-1.25, Math.min(1.25, this.drag.pitch + (event.clientY - this.drag.y) * 0.006));
      this.render();
    });
    this.canvas.addEventListener('pointerup', () => { this.drag = null; });
    this.canvas.addEventListener('pointercancel', () => { this.drag = null; });
    this.canvas.addEventListener('wheel', event => {
      event.preventDefault();
      this.zoom = Math.max(0.45, Math.min(2.4, this.zoom * Math.exp(-event.deltaY * 0.001)));
      this.render();
    }, { passive: false });
    this.canvas.addEventListener('keydown', event => {
      if (event.code === 'Space') {
        event.preventDefault();
        this.playButton.click();
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        this.yaw += event.key === 'ArrowLeft' ? -0.12 : 0.12;
        this.render();
      }
    });
  }

  applyPreset(name) {
    const presets = this.kind === 'two' ? {
      circular: { mass1: 2, mass2: .6, distance: 6, speed: 1, inclination: 22 },
      eccentric: { mass1: 2, mass2: .6, distance: 7.5, speed: .62, inclination: 38 },
      escape: { mass1: 2.2, mass2: .35, distance: 5, speed: 1.48, inclination: 55 },
    } : {
      figure8: { mass1: 1, mass2: 1, mass3: 1, distance: 6, speed: 1, perturbation: 0 },
      lagrange: { mass1: 1, mass2: 1, mass3: 1, distance: 6, speed: 1, perturbation: 0 },
      binary: { mass1: 2.3, mass2: .8, mass3: .18, distance: 7, speed: 1.04, perturbation: .35 },
      chaos: { mass1: 1.5, mass2: 1, mass3: .72, distance: 5.5, speed: .73, perturbation: .18 },
    };
    const values = presets[name];
    Object.entries(values).forEach(([key, value]) => { this.inputs[key].value = value; });
    this.preset = name;
    this.layout = name;
    this.root.querySelectorAll('[data-preset]').forEach(button => button.classList.toggle('active', button.dataset.preset === name));
    this.updateOutputs();
    this.reset();
  }

  values() {
    return Object.fromEntries(Object.entries(this.inputs).map(([key, input]) => [key, Number(input.value)]));
  }

  updateOutputs() {
    const values = this.values();
    Object.entries(values).forEach(([key, value]) => {
      if (!this.outputs[key]) return;
      let text = nf.format(value);
      if (key === 'distance') text = value.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      if (key === 'speed') text += this.kind === 'two' ? ' × vcirc' : ' ×';
      if (key === 'inclination') text = `${Math.round(value)}°`;
      this.outputs[key].textContent = text;
    });
  }

  reset() {
    this.updateOutputs();
    this.time = 0;
    this.frame = 0;
    this.stepBudget = 0;
    this.phasePoints = [];
    this.bodies = this.kind === 'two' ? this.buildTwoBodies() : this.buildThreeBodies();
    this.accelerate();
    this.initialEnergy = this.energy();
    this.recordPhase();
    this.lastFrame = performance.now();
    this.updateReadouts();
    this.render();
  }

  body(mass, pos, vel, color, name) {
    return { mass, pos, vel, acc: [0, 0, 0], color, name, trail: [pos.slice()] };
  }

  buildTwoBodies() {
    const p = this.values();
    const total = p.mass1 + p.mass2;
    const relativeSpeed = Math.sqrt(G * total / p.distance) * p.speed;
    const inclination = p.inclination * Math.PI / 180;
    const positions = [
      [-p.distance * p.mass2 / total, 0, 0],
      [p.distance * p.mass1 / total, 0, 0],
    ];
    const velocities = [
      [0, -relativeSpeed * p.mass2 / total * Math.cos(inclination), -relativeSpeed * p.mass2 / total * Math.sin(inclination)],
      [0, relativeSpeed * p.mass1 / total * Math.cos(inclination), relativeSpeed * p.mass1 / total * Math.sin(inclination)],
    ];
    return [
      this.body(p.mass1, positions[0], velocities[0], BODY_COLORS[0], 'Primaria'),
      this.body(p.mass2, positions[1], velocities[1], BODY_COLORS[1], 'Secundaria'),
    ];
  }

  buildThreeBodies() {
    const p = this.values();
    const masses = [p.mass1, p.mass2, p.mass3];
    let positions;
    let velocities;
    if (this.layout === 'lagrange') {
      const radius = p.distance / Math.sqrt(3);
      const omega = Math.sqrt(G * (p.mass1 + p.mass2 + p.mass3) / Math.pow(p.distance, 3));
      positions = [0, 1, 2].map(i => [radius * Math.cos(i * TAU / 3), radius * Math.sin(i * TAU / 3), 0]);
      velocities = positions.map(([x, y]) => [-omega * y * p.speed, omega * x * p.speed, 0]);
    } else if (this.layout === 'binary') {
      const binaryDistance = p.distance * .28;
      const binaryMass = p.mass1 + p.mass2;
      const relativeSpeed = Math.sqrt(G * binaryMass / binaryDistance) * p.speed;
      positions = [
        [-binaryDistance * p.mass2 / binaryMass, 0, 0],
        [binaryDistance * p.mass1 / binaryMass, 0, 0],
        [0, p.distance, p.perturbation],
      ];
      velocities = [
        [0, -relativeSpeed * p.mass2 / binaryMass, 0],
        [0, relativeSpeed * p.mass1 / binaryMass, 0],
        [-.78 * Math.sqrt(G * (binaryMass + p.mass3) / p.distance) * p.speed, -.08, -.025],
      ];
    } else if (this.layout === 'chaos') {
      const s = p.distance;
      const speed = Math.sqrt(G * (p.mass1 + p.mass2 + p.mass3) / s) * p.speed;
      positions = [[-.48 * s, -.25 * s, 0], [.1 * s, .34 * s, p.perturbation], [.52 * s, -.14 * s, -.4 * p.perturbation]];
      velocities = [[.34 * speed, -.28 * speed, .07 * speed], [-.52 * speed, .08 * speed, -.04 * speed], [.19 * speed, .33 * speed, 0]];
    } else {
      const scale = p.distance / 1.94;
      const massScale = Math.sqrt(((p.mass1 + p.mass2 + p.mass3) / 3) / scale) * p.speed;
      positions = [
        [-.97000436 * scale, .24308753 * scale, p.perturbation],
        [.97000436 * scale, -.24308753 * scale, -p.perturbation],
        [0, 0, .2 * p.perturbation],
      ];
      velocities = [
        [.466203685 * massScale, .43236573 * massScale, .035 * p.perturbation],
        [.466203685 * massScale, .43236573 * massScale, -.035 * p.perturbation],
        [-.93240737 * massScale, -.86473146 * massScale, 0],
      ];
    }
    this.recenter(positions, velocities, masses);
    return masses.map((mass, i) => this.body(mass, positions[i], velocities[i], BODY_COLORS[i], ['Azul', 'Naranja', 'Claro'][i]));
  }

  recenter(positions, velocities, masses) {
    const total = masses.reduce((sum, mass) => sum + mass, 0);
    const center = [0, 1, 2].map(axis => positions.reduce((sum, pos, i) => sum + pos[axis] * masses[i], 0) / total);
    const drift = [0, 1, 2].map(axis => velocities.reduce((sum, vel, i) => sum + vel[axis] * masses[i], 0) / total);
    positions.forEach(pos => { for (let axis = 0; axis < 3; axis++) pos[axis] -= center[axis]; });
    velocities.forEach(vel => { for (let axis = 0; axis < 3; axis++) vel[axis] -= drift[axis]; });
  }

  accelerate() {
    this.bodies.forEach(body => { body.acc = [0, 0, 0]; });
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const a = this.bodies[i];
        const b = this.bodies[j];
        const delta = v3.sub(b.pos, a.pos);
        const r2 = v3.dot(delta, delta) + SOFTENING * SOFTENING;
        const inverseCube = 1 / (r2 * Math.sqrt(r2));
        a.acc = v3.add(a.acc, v3.scale(delta, G * b.mass * inverseCube));
        b.acc = v3.add(b.acc, v3.scale(delta, -G * a.mass * inverseCube));
      }
    }
  }

  integrate(dt) {
    this.bodies.forEach(body => {
      body.vel = v3.add(body.vel, v3.scale(body.acc, dt * .5));
      body.pos = v3.add(body.pos, v3.scale(body.vel, dt));
    });
    this.accelerate();
    this.bodies.forEach(body => { body.vel = v3.add(body.vel, v3.scale(body.acc, dt * .5)); });
    this.time += dt;
  }

  energy() {
    let total = this.bodies.reduce((sum, body) => sum + .5 * body.mass * v3.dot(body.vel, body.vel), 0);
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const distance = Math.sqrt(v3.dot(v3.sub(this.bodies[j].pos, this.bodies[i].pos), v3.sub(this.bodies[j].pos, this.bodies[i].pos)) + SOFTENING ** 2);
        total -= G * this.bodies[i].mass * this.bodies[j].mass / distance;
      }
    }
    return total;
  }

  pairDistances() {
    const distances = [];
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) distances.push(v3.norm(v3.sub(this.bodies[j].pos, this.bodies[i].pos)));
    }
    return distances;
  }

  updateReadouts() {
    const distances = this.pairDistances();
    const maximum = Math.max(...distances);
    const minimum = Math.min(...distances);
    if (this.kind === 'two') {
      const energy = this.energy();
      this.readouts.energy.textContent = `${energy >= 0 ? '+' : ''}${nf.format(energy)}`;
      this.readouts.separation.textContent = nf.format(maximum);
      const relativePosition = v3.sub(this.bodies[1].pos, this.bodies[0].pos);
      const relativeVelocity = v3.sub(this.bodies[1].vel, this.bodies[0].vel);
      const angularMomentum = v3.cross(relativePosition, relativeVelocity);
      const eccentricityVector = v3.sub(v3.scale(v3.cross(relativeVelocity, angularMomentum), 1 / (G * (this.bodies[0].mass + this.bodies[1].mass))), v3.scale(relativePosition, 1 / Math.max(v3.norm(relativePosition), .0001)));
      const eccentricity = v3.norm(eccentricityVector);
      if (minimum < .22) this.setStatus('Encuentro próximo', '#e9c46a');
      else if (energy >= 0 || eccentricity >= 1) this.setStatus('Trayectoria de escape', '#f17748');
      else if (eccentricity < .08) this.setStatus('Órbita casi circular', '#64c8d2');
      else this.setStatus(`Elipse · e ${nf.format(eccentricity)}`, '#64c8d2');
    } else {
      const drift = Math.abs((this.energy() - this.initialEnergy) / (this.initialEnergy || 1)) * 100;
      this.readouts.energy.textContent = `${drift.toLocaleString('es-ES', { maximumFractionDigits: 3 })} %`;
      this.readouts.separation.textContent = nf.format(maximum);
      if (minimum < .24) this.setStatus('Encuentro próximo', '#e9c46a');
      else if (maximum > 28) this.setStatus('Un cuerpo escapa', '#f17748');
      else if (this.preset === 'figure8' && this.time < 45) this.setStatus('Danza periódica', '#64c8d2');
      else if (this.preset === 'lagrange' && this.time < 45) this.setStatus('Triángulo en rotación', '#64c8d2');
      else this.setStatus('Caos en evolución', '#a995e8');
    }
    this.timeLabel.textContent = `t = ${this.time.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} · ${this.playback}×`;
  }

  setStatus(text, color) {
    this.statusLabel.textContent = text;
    this.statusLabel.style.color = color;
    this.statusLabel.style.borderColor = color;
  }

  updatePlayButton() {
    this.playButton.innerHTML = this.running ? '<span>Ⅱ</span> Pausar' : '<span>▶</span> Continuar';
    this.playButton.setAttribute('aria-label', this.running ? 'Pausar simulación' : 'Continuar simulación');
  }

  animate(now) {
    const elapsed = Math.min(45, now - (this.lastFrame || now));
    this.lastFrame = now;
    if (this.visible && this.running) {
      this.stepBudget += Math.max(1, Math.round(elapsed / 8)) * this.playback;
      const steps = Math.min(96, Math.floor(this.stepBudget));
      this.stepBudget -= steps;
      const dt = this.kind === 'two' ? .011 : .008;
      for (let i = 0; i < steps; i++) this.integrate(dt);
      if (steps && ++this.frame % 2 === 0) {
        this.bodies.forEach(body => {
          body.trail.push(body.pos.slice());
          if (body.trail.length > 2400) body.trail.shift();
        });
        this.recordPhase();
      }
      if (this.frame % 8 === 0) this.updateReadouts();
      this.render();
    }
    requestAnimationFrame(next => this.animate(next));
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.resizePhase();
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
    this.render();
  }

  project(point) {
    const cosYaw = Math.cos(this.yaw);
    const sinYaw = Math.sin(this.yaw);
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const x1 = cosYaw * point[0] - sinYaw * point[1];
    const y1 = sinYaw * point[0] + cosYaw * point[1];
    const y2 = cosPitch * y1 - sinPitch * point[2];
    const depth = sinPitch * y1 + cosPitch * point[2];
    const cameraDistance = 34;
    const perspective = cameraDistance / Math.max(8, cameraDistance - depth);
    const scale = Math.min(this.width, this.height) / 18 * this.zoom;
    return { x: this.width / 2 + x1 * scale * perspective, y: this.height / 2 + y2 * scale * perspective, depth, perspective };
  }

  render() {
    if (!this.ctx || !this.width || !this.bodies) return;
    const ctx = this.ctx;
    const background = ctx.createRadialGradient(this.width * .5, this.height * .48, 0, this.width * .5, this.height * .48, Math.max(this.width, this.height) * .7);
    background.addColorStop(0, '#0b202b');
    background.addColorStop(.55, '#06121a');
    background.addColorStop(1, '#02070b');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, this.width, this.height);
    this.drawStars(ctx);
    this.drawPhase();
    this.drawGrid(ctx);
    if (this.showTrails) this.drawTrails(ctx);
    this.drawBodies(ctx);
    this.drawAxes(ctx);
  }

  resizePhase() {
    if (!this.phaseCanvas || !this.phaseCtx) return;
    const rect = this.phaseCanvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.phaseCanvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.phaseCanvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.phaseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.phaseWidth = rect.width;
    this.phaseHeight = rect.height;
  }

  recordPhase() {
    if (this.kind !== "three" || !this.bodies || this.bodies.length < 2) return;
    const relativePosition = v3.sub(this.bodies[1].pos, this.bodies[0].pos);
    const relativeVelocity = v3.sub(this.bodies[1].vel, this.bodies[0].vel);
    const separation = Math.max(v3.norm(relativePosition), .0001);
    const radialVelocity = v3.dot(relativePosition, relativeVelocity) / separation;
    this.phasePoints.push([separation, radialVelocity]);
    if (this.phasePoints.length > 3600) this.phasePoints.shift();
    if (this.phaseReadout) {
      this.phaseReadout.textContent = "r " + separation.toLocaleString("es-ES", { maximumFractionDigits: 2 }) + " · ṙ " + radialVelocity.toLocaleString("es-ES", { maximumFractionDigits: 2 });
    }
  }

  drawPhase() {
    if (!this.phaseCtx || !this.phaseWidth || !this.phaseHeight) return;
    const ctx = this.phaseCtx;
    const width = this.phaseWidth;
    const height = this.phaseHeight;
    const padding = { left: 34, right: 14, top: 15, bottom: 28 };
    ctx.fillStyle = "#03090e";
    ctx.fillRect(0, 0, width, height);
    const values = this.phasePoints.length ? this.phasePoints : [[0, 0]];
    const configuredDistance = Number(this.inputs.distance?.value || 6);
    const maxR = Math.max(configuredDistance * 1.45, ...values.map(point => point[0] * 1.08));
    const maxVelocity = Math.max(.35, ...values.map(point => Math.abs(point[1]) * 1.15));
    const x = value => padding.left + value / maxR * (width - padding.left - padding.right);
    const y = value => padding.top + (maxVelocity - value) / (2 * maxVelocity) * (height - padding.top - padding.bottom);

    ctx.strokeStyle = "#29404a";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gx = padding.left + i / 4 * (width - padding.left - padding.right);
      const gy = padding.top + i / 4 * (height - padding.top - padding.bottom);
      ctx.beginPath(); ctx.moveTo(gx, padding.top); ctx.lineTo(gx, height - padding.bottom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padding.left, gy); ctx.lineTo(width - padding.right, gy); ctx.stroke();
    }
    ctx.strokeStyle = "#718790";
    ctx.beginPath(); ctx.moveTo(padding.left, y(0)); ctx.lineTo(width - padding.right, y(0)); ctx.stroke();

    const stride = Math.max(1, Math.ceil(values.length / 1200));
    ctx.beginPath();
    for (let i = 0; i < values.length; i += stride) {
      const px = x(values[i][0]);
      const py = y(values[i][1]);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = "#f17748";
    ctx.globalAlpha = .78;
    ctx.lineWidth = 1.15;
    ctx.stroke();
    ctx.globalAlpha = 1;

    const current = values[values.length - 1];
    ctx.fillStyle = "#64c8d2";
    ctx.beginPath(); ctx.arc(x(current[0]), y(current[1]), 3.5, 0, TAU); ctx.fill();
    ctx.fillStyle = "#718790";
    ctx.font = "9px Arial";
    ctx.fillText("0", padding.left - 10, y(0) + 3);
    ctx.fillText(maxR.toLocaleString("es-ES", { maximumFractionDigits: 1 }), width - padding.right - 18, height - 9);
  }

  drawStars(ctx) {
    ctx.save();
    this.stars.forEach(star => {
      ctx.globalAlpha = star.a;
      ctx.fillStyle = '#dcebed';
      ctx.fillRect(star.x * this.width, star.y * this.height, star.s, star.s);
    });
    ctx.restore();
  }

  drawGrid(ctx) {
    const extent = 16;
    const step = 2;
    ctx.save();
    ctx.strokeStyle = '#77b8c214';
    ctx.lineWidth = 1;
    for (let value = -extent; value <= extent; value += step) {
      [[[-extent, value, 0], [extent, value, 0]], [[value, -extent, 0], [value, extent, 0]]].forEach(line => {
        const a = this.project(line[0]);
        const b = this.project(line[1]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });
    }
    ctx.restore();
  }

  drawTrails(ctx) {
    this.bodies.forEach(body => {
      if (body.trail.length < 2) return;
      const chunks = Math.min(8, Math.ceil(body.trail.length / 2));
      const stride = Math.max(1, Math.ceil(body.trail.length / 1400));
      for (let chunk = 0; chunk < chunks; chunk++) {
        const start = Math.floor(chunk * (body.trail.length - 1) / chunks);
        const end = Math.ceil((chunk + 1) * (body.trail.length - 1) / chunks);
        ctx.beginPath();
        for (let i = start; i <= end; i += stride) {
          const point = this.project(body.trail[i]);
          if (i === start) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
        }
        ctx.globalAlpha = .07 + .67 * (chunk + 1) / chunks;
        ctx.strokeStyle = body.color;
        ctx.lineWidth = 1.15;
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  }

  drawBodies(ctx) {
    const projected = this.bodies.map(body => ({ body, point: this.project(body.pos) })).sort((a, b) => a.point.depth - b.point.depth);
    projected.forEach(({ body, point }) => {
      const radius = Math.max(5, Math.min(18, (5.5 + Math.cbrt(body.mass) * 5.5) * point.perspective));
      const glow = ctx.createRadialGradient(point.x - radius * .28, point.y - radius * .28, 1, point.x, point.y, radius * 2.7);
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(.17, body.color);
      glow.addColorStop(.42, `${body.color}aa`);
      glow.addColorStop(1, `${body.color}00`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * 2.7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = body.color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#dcebedaa';
      ctx.font = '8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${body.name} · m ${body.mass.toLocaleString('es-ES')}`, point.x, point.y + radius + 15);
    });
  }

  drawAxes(ctx) {
    const origin = this.project([0, 0, 0]);
    const axes = [
      { end: this.project([1.1, 0, 0]), label: 'x', color: '#64c8d288' },
      { end: this.project([0, 1.1, 0]), label: 'y', color: '#f1774888' },
      { end: this.project([0, 0, 1.1]), label: 'z', color: '#ece7d988' },
    ];
    ctx.save();
    ctx.font = '8px Arial';
    axes.forEach(axis => {
      ctx.strokeStyle = axis.color;
      ctx.fillStyle = axis.color;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(axis.end.x, axis.end.y);
      ctx.stroke();
      ctx.fillText(axis.label, axis.end.x + 4, axis.end.y - 4);
    });
    ctx.restore();
  }

  makeStars(count) {
    let seed = this.kind === 'two' ? 2718 : 3141;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    return Array.from({ length: count }, () => ({ x: random(), y: random(), s: random() > .86 ? 1.4 : .7, a: .12 + random() * .45 }));
  }
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('.simulator').forEach(root => new GravityLab(root));
}

if (typeof module !== 'undefined') module.exports = { GravityLab, v3 };
