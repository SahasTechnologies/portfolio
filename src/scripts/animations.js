// Client-side behaviour for the pixel animations on the home page. The animation
// itself (SVG + CSS entrance) is rendered on the server; this file only wires up
// the pointer interactions, ported from the "Sahas — animation studies" export.

(function () {
  const root = document.querySelector('.anim[data-anim]');
  if (!root || root.dataset.booted) return;
  root.dataset.booted = '1';

  const all = (sel) => Array.from(root.querySelectorAll(sel));
  const one = (sel) => root.querySelector(sel);

  // Map client coordinates into the SVG's user units.
  function sp(svg, e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function restart(els) {
    els.forEach((r) => (r.style.animation = 'none'));
    void document.body.offsetHeight;
    els.forEach((r) => (r.style.animation = ''));
  }

  const boot = {
    // Hover a row to fill it, then the full line clears and the stack drops.
    tet() {
      const tet = one('.tet');
      const tcs = all('.tc');
      let cleared = [];
      let filling = {};
      let ttm = 0;
      let ready = false;
      let tready = 0;

      function tapply() {
        tcs.forEach((c) => {
          const y = +c.dataset.y;
          const isc = cleared.indexOf(y) >= 0;
          const sh = cleared.filter((r) => r > y).length;
          c.classList.toggle('clr', isc);
          c.style.transform = isc ? '' : sh ? 'translateY(' + sh + 'px)' : '';
        });
      }
      function trevert() {
        cleared = [];
        filling = {};
        tcs.forEach((c) => {
          c.classList.remove('fill');
          c.style.transitionDelay = '';
        });
        tapply();
      }
      function rowHover(r) {
        if (cleared.indexOf(r) >= 0 || filling[r]) return;
        filling[r] = 1;
        clearTimeout(ttm);
        tcs.forEach((c) => {
          if (+c.dataset.y === r && c.classList.contains('tf')) {
            c.style.transitionDelay = +c.dataset.x * 14 + 'ms';
            c.classList.add('fill');
          }
        });
        setTimeout(function () {
          tcs.forEach((c) => {
            if (+c.dataset.y === r) c.style.transitionDelay = '0ms';
          });
          cleared.push(r);
          delete filling[r];
          tapply();
          clearTimeout(ttm);
          ttm = setTimeout(trevert, 1500);
        }, 700);
      }
      function start() {
        ready = false;
        clearTimeout(tready);
        trevert();
        tready = setTimeout(function () {
          ready = true;
        }, +tet.dataset.ready * 1000);
      }

      start();
      tet.addEventListener('click', start);
      tet.addEventListener('pointermove', function (e) {
        if (!ready) return;
        const r = Math.floor(sp(tet, e).y);
        if (r >= 0 && r <= 6) rowHover(r);
      });
    },

    // Cursor pushes pixels away, click bursts.
    scatter() {
      const dis = one('.dis');
      const dps = all('.dp');
      dis.addEventListener('pointermove', function (e) {
        const p = sp(dis, e);
        dps.forEach(function (r) {
          const dx = +r.dataset.x - p.x;
          const dy = +r.dataset.y - p.y;
          const d = Math.hypot(dx, dy) || 0.01;
          if (d < 5) {
            const k = ((5 - d) / 5) * 4;
            r.style.transform = 'translate(' + (dx / d) * k + 'px,' + (dy / d) * k + 'px)';
          } else r.style.transform = '';
        });
      });
      dis.addEventListener('pointerleave', function () {
        dps.forEach((r) => (r.style.transform = ''));
      });
      dis.addEventListener('click', function () {
        dps.forEach(function (r) {
          r.style.transform =
            'translate(' + (Math.random() - 0.5) * 22 + 'px,' + (Math.random() - 0.5) * 16 + 'px)';
        });
        setTimeout(function () {
          dps.forEach((r) => (r.style.transform = ''));
        }, 350);
      });
    },

    // A sweep on load, then the cursor lights nearby blocks which fade away.
    led() {
      const led = one('.led');
      const lp = all('.lp');
      const bgp = all('.bgp');
      const cells = lp.concat(bgp);
      const inten = new Float32Array(cells.length);
      let lraf = 0;
      let lsw = 0;
      let lbusy = 0;

      function lframe() {
        let any = false;
        for (let i = 0; i < cells.length; i++) {
          let v = inten[i];
          if (v < 0.01) {
            if (v > 0) {
              inten[i] = 0;
              cells[i].style.fill = '';
            }
            continue;
          }
          any = true;
          v *= 0.972;
          inten[i] = v;
          const h = cells[i].style.getPropertyValue('--h');
          const isb = i >= lp.length;
          cells[i].style.fill = isb
            ? 'hsl(' + h + ' 80% ' + (9 + 24 * v) + '%)'
            : 'hsl(' + h + ' ' + Math.min(95, 150 * v) + '% ' + (24 + 42 * v) + '%)';
        }
        lraf = any ? requestAnimationFrame(lframe) : 0;
      }
      function lkick() {
        if (!lraf) lraf = requestAnimationFrame(lframe);
      }
      function lsweep(now) {
        if (!lsw) lsw = now;
        const t = (now - lsw) / 1000;
        const sx = (t / 1.4) * 33 - 2;
        for (let i = 0; i < lp.length; i++) {
          const dx = +lp[i].dataset.x - sx;
          if (dx > -1.5 && dx < 0.8) inten[i] = 1;
        }
        lkick();
        if (t < 1.8) requestAnimationFrame(lsweep);
      }
      function ledStart() {
        lbusy = performance.now() + 2400;
        lsw = 0;
        for (let i = 0; i < cells.length; i++) {
          inten[i] = 0;
          cells[i].style.fill = '';
        }
        requestAnimationFrame(lsweep);
      }

      led.addEventListener('click', ledStart);
      led.addEventListener('pointermove', function (e) {
        if (performance.now() < lbusy) return;
        const p = sp(led, e);
        const R = 4.5;
        for (let i = 0; i < cells.length; i++) {
          const c = cells[i];
          const d = Math.hypot(+c.dataset.x - p.x, +c.dataset.y - p.y);
          if (d < R) {
            let v = Math.pow(1 - d / R, 0.7);
            if (i >= lp.length) v *= 0.55;
            if (v > inten[i]) inten[i] = v;
          }
        }
        lkick();
      });
      ledStart();
    },

    // Hover makes it rain down a column.
    rain() {
      const rain = one('.rain');
      const rcs = all('.rn');
      let lastc = -1;
      rain.addEventListener('pointermove', function (e) {
        const c = Math.floor(sp(rain, e).x);
        if (c === lastc || c < 0 || c > 28) return;
        lastc = c;
        const col = rcs.filter((r) => +r.dataset.x === c);
        col.forEach((r) => r.style.setProperty('--dl', (+r.dataset.y + 5) * 0.05 + 's'));
        restart(col);
      });
      rain.addEventListener('pointerleave', function () {
        lastc = -1;
      });
    },

    // Hover flips just the one tile under the cursor, once.
    flip() {
      const PAL = ['#22d3ee', '#facc15', '#c084fc', '#4ade80', '#f87171', '#60a5fa', '#fb923c'];
      const flip = one('.flip');
      const fps = all('.fp');
      let lastf = null;
      fps.forEach((r) => (r.dataset.ci = r.dataset.l));
      flip.addEventListener('pointermove', function (e) {
        const p = sp(flip, e);
        let hit = null;
        fps.forEach(function (r) {
          if (Math.abs(+r.dataset.x - p.x) < 0.5 && Math.abs(+r.dataset.y - p.y) < 0.5) hit = r;
        });
        if (hit === lastf) return;
        lastf = hit;
        if (!hit) return;
        const ci = +hit.dataset.ci;
        const nx = (ci + 1) % 7;
        hit.style.setProperty('--from', PAL[ci]);
        hit.style.setProperty('--f', PAL[nx]);
        hit.dataset.ci = nx;
        const on = hit.classList.contains('f1');
        hit.classList.toggle('f1', !on);
        hit.classList.toggle('f2', on);
      });
      flip.addEventListener('pointerleave', function () {
        lastf = null;
      });
    },

    // Hover bounces the bar under the cursor.
    eq() {
      const equ = one('.equ');
      const eqs = all('.eq');
      let lastq = -1;
      equ.addEventListener('pointermove', function (e) {
        const c = Math.floor(sp(equ, e).x);
        if (c === lastq || c < 0 || c > 28) return;
        lastq = c;
        const b = eqs[c];
        if (!b) return;
        const on = b.classList.contains('pop');
        b.classList.toggle('pop', !on);
        b.classList.toggle('pop2', on);
      });
    },

    // The block under the cursor stays pulsed, neighbours swell; click sends a wave.
    pls() {
      const pls = one('.pls');
      const pps = all('.pp');
      let hot = null;
      let soft = [];
      function clearp() {
        if (hot) hot.classList.remove('on');
        hot = null;
        soft.forEach((r) => (r.style.transform = ''));
        soft = [];
      }
      pls.addEventListener('pointermove', function (e) {
        const p = sp(pls, e);
        let best = null;
        let bd = 0.8;
        const next = [];
        pps.forEach(function (r) {
          const d = Math.hypot(+r.dataset.x - p.x, +r.dataset.y - p.y);
          if (d < bd) {
            bd = d;
            best = r;
          }
        });
        pps.forEach(function (r) {
          const d = Math.hypot(+r.dataset.x - p.x, +r.dataset.y - p.y);
          if (r !== best && d < 2.4) {
            r.style.transform = 'scale(' + (1 + 0.3 * (1 - d / 2.4)).toFixed(2) + ')';
            next.push(r);
          }
        });
        soft.forEach(function (r) {
          if (next.indexOf(r) < 0) r.style.transform = '';
        });
        soft = next;
        if (best !== hot) {
          if (hot) hot.classList.remove('on');
          if (best) {
            best.style.transform = '';
            best.classList.add('on');
          }
          hot = best;
        }
      });
      pls.addEventListener('pointerleave', clearp);
      pls.addEventListener('click', function (e) {
        const p = sp(pls, e);
        pps.forEach(function (r) {
          const d = Math.hypot(+r.dataset.x - p.x, +r.dataset.y - p.y);
          r.style.setProperty('--pd', d * 0.05 + 's');
          const on = r.classList.contains('p1');
          r.classList.toggle('p1', !on);
          r.classList.toggle('p2', on);
        });
      });
    },

    // Move across it to scrub the text; the caret follows.
    tw() {
      const typ = one('.typ');
      const twp = all('.tw');
      const tcar = one('.tcar');
      function twRestore() {
        twp.forEach((r) => (r.style.opacity = ''));
        tcar.style.opacity = 0;
      }
      typ.addEventListener('pointermove', function (e) {
        const c = Math.max(0, Math.min(29, Math.floor(sp(typ, e).x)));
        twp.forEach((r) => (r.style.opacity = +r.dataset.c < c ? '' : '0'));
        tcar.style.opacity = 1;
        tcar.setAttribute('x', c + 0.06);
      });
      typ.addEventListener('pointerleave', twRestore);
    },

    // Pac-Man eats the name in handwriting order, then hunts a ghost that follows
    // your cursor, travelling only on the white and grey connector squares.
    pac() {
      const pcm = one('.pcm');
      const pac = one('.pacm');
      const pg = one('.pg');
      const pgi = pg.querySelector('.pgi');
      const PATH = JSON.parse(pcm.dataset.path.replace(/'/g, '"'));
      const pcells = all('.pmn').map(function (r) {
        return { x: Math.round(+r.getAttribute('x') - 0.06), y: Math.round(+r.getAttribute('y') - 0.06) };
      });
      const WALK = {};
      const P = { x: 29, y: 6, ang: 0, intro: false, ghost: false, dying: false, inside: false, gx: 0, gy: 0, raf: 0, iv: 0 };
      pcells.forEach((c) => (WALK[c.x + ',' + c.y] = 1));
      pcm.dataset.grey.split(';').forEach((s) => (WALK[s] = 1));

      function bfs(sx, sy, goal) {
        const key = (x, y) => x + ',' + y;
        const prev = {};
        const q = [[sx, sy]];
        let end = null;
        prev[key(sx, sy)] = null;
        while (q.length) {
          const c = q.shift();
          if (goal(c[0], c[1])) {
            end = c;
            break;
          }
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].forEach(function (d) {
            const nx = c[0] + d[0];
            const ny = c[1] + d[1];
            const k = key(nx, ny);
            if (WALK[k] && !(k in prev)) {
              prev[k] = c;
              q.push([nx, ny]);
            }
          });
        }
        if (!end) return null;
        const path = [];
        let c = end;
        while (c && !(c[0] === sx && c[1] === sy)) {
          path.push(c);
          c = prev[key(c[0], c[1])];
        }
        return path.reverse();
      }
      function pset(ang, ms) {
        const d = ((ang - P.ang + 540) % 360) - 180;
        P.ang += d;
        pac.style.transition = ms ? 'transform ' + ms + 'ms linear' : 'none';
        pac.style.transform = 'translate(' + (P.x + 0.5) + 'px,' + (P.y + 0.5) + 'px) rotate(' + P.ang + 'deg)';
      }
      function pdir(dx, dy) {
        return dx > 0 ? 0 : dx < 0 ? 180 : dy > 0 ? 90 : -90;
      }
      function stepTo(n) {
        const dx = n[0] - P.x;
        const dy = n[1] - P.y;
        P.x = n[0];
        P.y = n[1];
        pset(pdir(dx, dy), 110);
      }
      function toEdge() {
        clearInterval(P.iv);
        if (P.ghost && !P.dying) return;
        const path = bfs(P.x, P.y, (x, y) => y === 6 && (x === -1 || x === 29));
        if (!path || !path.length) {
          pac.classList.add('rest');
          return;
        }
        P.iv = setInterval(function () {
          stepTo(path.shift());
          if (!path.length) {
            clearInterval(P.iv);
            pac.classList.add('rest');
          }
        }, 110);
      }
      function killGhost() {
        P.dying = true;
        pgi.classList.remove('born');
        pgi.classList.add('dead');
        clearInterval(P.iv);
        setTimeout(function () {
          pg.style.opacity = 0;
          pgi.classList.remove('dead');
          P.ghost = false;
          P.dying = false;
          if (!P.inside) toEdge();
        }, 950);
      }
      function chase() {
        const path = bfs(P.x, P.y, (x, y) => x === P.gx && y === P.gy);
        if (!path) return;
        if (!path.length) {
          killGhost();
          return;
        }
        stepTo(path[0]);
        if (P.x === P.gx && P.y === P.gy) killGhost();
      }
      function gplace(c, instant) {
        P.gx = c.x;
        P.gy = c.y;
        if (instant) pg.style.transition = 'none';
        pg.style.transform = 'translate(' + (c.x + 0.5) + 'px,' + (c.y + 0.5) + 'px)';
        if (instant) {
          void pg.getBoundingClientRect();
          pg.style.transition = '';
        }
      }
      function nearest(p) {
        let best = null;
        let bd = 1e9;
        pcells.forEach(function (c) {
          const d = Math.hypot(c.x + 0.5 - p.x, c.y + 0.5 - p.y);
          if (d < bd) {
            bd = d;
            best = c;
          }
        });
        return best;
      }
      function introStart() {
        cancelAnimationFrame(P.raf);
        clearInterval(P.iv);
        P.intro = false;
        P.ghost = false;
        P.dying = false;
        pg.style.opacity = 0;
        pgi.classList.remove('born', 'dead');
        pac.classList.remove('rest');
        pcm.classList.remove('hunt');
        const t0 = performance.now();
        let last = -1;
        P.x = PATH[0][0];
        P.y = PATH[0][1];
        P.ang = 0;
        pset(0, 0);
        function f(now) {
          const i = Math.min(PATH.length - 1, Math.floor((now - t0) / 55));
          if (i !== last) {
            last = i;
            const a = PATH[i];
            const b = PATH[Math.min(i + 1, PATH.length - 1)];
            P.x = a[0];
            P.y = a[1];
            const dx = b[0] - a[0];
            const dy = b[1] - a[1];
            pset(dx || dy ? pdir(dx, dy) : P.ang, 55);
          }
          if (i < PATH.length - 1) P.raf = requestAnimationFrame(f);
          else {
            P.intro = true;
            if (P.inside) pcm.classList.add('hunt');
            else toEdge();
          }
        }
        P.raf = requestAnimationFrame(f);
      }

      introStart();
      pcm.addEventListener('pointermove', function (e) {
        P.inside = true;
        if (!P.intro || P.dying) return;
        pcm.classList.add('hunt');
        const c = nearest(sp(pcm, e));
        if (!c) return;
        if (!P.ghost) {
          P.ghost = true;
          pg.style.opacity = 1;
          gplace(c, true);
          pgi.classList.remove('dead');
          pgi.classList.add('born');
          pac.classList.remove('rest');
          clearInterval(P.iv);
          P.iv = setInterval(chase, 110);
        } else gplace(c, false);
      });
      pcm.addEventListener('pointerleave', function () {
        P.inside = false;
        pcm.classList.remove('hunt');
        if (P.ghost && !P.dying) {
          pg.style.opacity = 0;
          P.ghost = false;
          clearInterval(P.iv);
        }
        if (P.intro && !P.dying) toEdge();
      });
    },

    // A wave rolls left to right; hover raises the column under the cursor, click
    // sends a wave both ways.
    wav() {
      const wv = one('.wv');
      const wcs = all('.wc');
      const wcur = wcs.map(() => 0);
      let wm = -1;
      let wws = [];
      function wframe(now) {
        wws = wws.filter((w) => now - w.t < 3400);
        for (let c = 0; c < wcs.length; c++) {
          let t;
          if (wm >= 0) {
            const d = c + 0.5 - wm;
            t = 2.4 * (d < 0 ? Math.max(0, 1 + d / 4) : Math.max(0, 1 - d / 16));
          } else t = 1.1 * (0.5 + 0.5 * Math.sin(c * 0.42 - now / 230));
          wws.forEach(function (w) {
            const age = (now - w.t) / 1000;
            const r = age * 13;
            const dd = Math.abs(c + 0.5 - w.x);
            t += 2 * Math.exp(-Math.pow(dd - r, 2) / 2.4) * Math.exp(-age / 1.6);
          });
          wcur[c] += (t - wcur[c]) * 0.25;
          wcs[c].style.transform = 'translateY(' + -wcur[c].toFixed(2) + 'px)';
        }
        requestAnimationFrame(wframe);
      }
      requestAnimationFrame(wframe);
      wv.addEventListener('pointermove', function (e) {
        wm = sp(wv, e).x;
      });
      wv.addEventListener('pointerleave', function () {
        wm = -1;
      });
      wv.addEventListener('click', function (e) {
        wws.push({ t: performance.now(), x: sp(wv, e).x });
      });
    },

    // Hover scrolls right one column at a time, leaving a gap between repeats; it
    // finishes its lap after you leave; click reverses.
    mq() {
      const mrq = one('.mrq');
      const mqs = all('.mq0, .mq1, .mq2');
      const MP = 34;
      let ms = 0;
      let mdir = 1;
      let mmov = false;
      let mtm = 0;
      let mlive = false;
      function mrender() {
        mqs[0].setAttribute('transform', 'translate(' + (ms - MP) + ' 0)');
        mqs[1].setAttribute('transform', 'translate(' + ms + ' 0)');
        mqs[2].setAttribute('transform', 'translate(' + (ms + MP) + ' 0)');
      }
      function mtick() {
        if (mmov || ms !== 0) {
          ms = (((ms + mdir) % MP) + MP) % MP;
          mrender();
        } else {
          clearInterval(mtm);
          mtm = 0;
        }
      }
      function mstart() {
        if (!mlive) {
          mlive = true;
          mqs[1].style.animation = 'none';
          mrq.classList.add('live');
          mrender();
        }
        if (!mtm) mtm = setInterval(mtick, 85);
      }
      mrq.addEventListener('pointerenter', function () {
        mmov = true;
        mstart();
      });
      mrq.addEventListener('pointerleave', function () {
        mmov = false;
      });
      mrq.addEventListener('click', function () {
        mdir = -mdir;
        mstart();
      });
    },

    // Click lights every pixel.
    twk() {
      const twk = one('.twk');
      twk.addEventListener('click', function () {
        twk.classList.remove('go');
        void twk.getBoundingClientRect();
        twk.classList.add('go');
      });
    },

    // A sweeping beam lights the name; hover aims it.
    rdr() {
      const rdr = one('.rdr');
      const rps = all('.rp');
      const rw = one('.rw');
      const rl = one('.rl');
      let rth = 0;
      let rtg = null;
      rps.forEach((r) => (r.dataset.a = Math.atan2(+r.dataset.y - 3.5, +r.dataset.x - 14.5)));
      function rframe() {
        if (rtg === null) rth += 0.024;
        else rth += Math.atan2(Math.sin(rtg - rth), Math.cos(rtg - rth)) * 0.14;
        rps.forEach(function (r) {
          const d = (((rth - +r.dataset.a) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          let b = Math.max(0, 1 - d / (2 * Math.PI * 0.6));
          b = b * b;
          r.style.fill =
            'rgb(' + Math.round(29 + 96 * b) + ',' + Math.round(58 + 197 * b) + ',' + Math.round(40 + 134 * b) + ')';
        });
        const L = 17;
        rl.setAttribute('x2', (14.5 + L * Math.cos(rth)).toFixed(2));
        rl.setAttribute('y2', (3.5 + L * Math.sin(rth)).toFixed(2));
        rw.setAttribute(
          'points',
          '14.5,3.5 ' +
            (14.5 + L * Math.cos(rth - 0.55)).toFixed(2) +
            ',' +
            (3.5 + L * Math.sin(rth - 0.55)).toFixed(2) +
            ' ' +
            (14.5 + L * Math.cos(rth)).toFixed(2) +
            ',' +
            (3.5 + L * Math.sin(rth)).toFixed(2)
        );
        requestAnimationFrame(rframe);
      }
      rframe();
      rdr.addEventListener('pointermove', function (e) {
        const p = sp(rdr, e);
        rtg = Math.atan2(p.y - 3.5, p.x - 14.5);
      });
      rdr.addEventListener('pointerleave', function () {
        rtg = null;
      });
    },

    // Touched pixels fall away and pop back.
    crm() {
      const crm = one('.crm');
      const cps = all('.cp');
      function crumble(r, delay) {
        if (r.dataset.b) return;
        r.dataset.b = 1;
        const rx = (Math.random() - 0.5) * 3;
        const rot = (Math.random() - 0.5) * 160;
        const a = r.animate(
          [
            { transform: 'translate(0px,0px) rotate(0deg)', opacity: 1 },
            {
              transform: 'translate(' + rx + 'px,' + (10 + Math.random() * 4) + 'px) rotate(' + rot + 'deg)',
              opacity: 0,
            },
          ],
          { duration: 650, delay: delay, easing: 'cubic-bezier(.55,0,1,.6)', fill: 'forwards' }
        );
        a.onfinish = function () {
          setTimeout(function () {
            a.cancel();
            const b = r.animate(
              [
                { transform: 'scale(0)', opacity: 0 },
                { transform: 'scale(1.25)', opacity: 1, offset: 0.6 },
                { transform: 'none', opacity: 1 },
              ],
              { duration: 450 }
            );
            b.onfinish = function () {
              delete r.dataset.b;
            };
          }, 700);
        };
      }
      crm.addEventListener('pointermove', function (e) {
        const p = sp(crm, e);
        cps.forEach(function (r) {
          if (Math.hypot(+r.dataset.x - p.x, +r.dataset.y - p.y) < 0.8) crumble(r, 0);
        });
      });
      crm.addEventListener('click', function () {
        cps.forEach(function (r) {
          crumble(r, +r.dataset.x * 35);
        });
      });
    },

    // Grains pour into the name; moving the cursor flicks the pile; click throws
    // every block away, then it rains again.
    snd() {
      const snd = one('.snd');
      const sgs = all('.sg');
      const sst = sgs.map(() => ({ ox: 0, oy: 0, vx: 0, vy: 0 }));
      let sraf = 0;
      let smouse = null;
      let smv = 0;
      let sspd = 0;
      let sthrow = false;
      let stm = 0;
      function szero() {
        clearTimeout(stm);
        sthrow = false;
        sst.forEach(function (s, i) {
          s.ox = s.oy = s.vx = s.vy = 0;
          sgs[i].style.transform = '';
        });
      }
      function sloop() {
        let act = sthrow;
        const hit = smv > 0 && !sthrow;
        sgs.forEach(function (r, i) {
          const s = sst[i];
          if (hit && smouse) {
            const dx = +r.dataset.x + s.ox - smouse.x;
            const dy = +r.dataset.y + s.oy - smouse.y;
            const d = Math.hypot(dx, dy);
            if (d < 2.3 && d > 0.01) {
              const f = (1 - d / 2.3) * sspd;
              s.vx += (dx / d) * f * 0.2;
              s.vy -= (0.1 + Math.random() * 0.12) * f;
            }
          }
          s.vy += 0.035;
          s.oy += s.vy;
          s.ox += s.vx;
          if (!sthrow && s.oy > 0) {
            s.oy = 0;
            s.vy = s.vy > 0.06 ? -s.vy * 0.3 : 0;
            s.vx *= 0.7;
            s.vx -= s.ox * 0.06;
          }
          if (!sthrow) s.vx *= 0.985;
          const moving =
            sthrow ||
            Math.abs(s.ox) > 0.008 ||
            s.oy < -0.008 ||
            Math.abs(s.vx) > 0.008 ||
            Math.abs(s.vy) > 0.03;
          if (moving) {
            act = true;
            r.style.transform = 'translate(' + s.ox.toFixed(3) + 'px,' + s.oy.toFixed(3) + 'px)';
          } else if (s.ox || s.oy || s.vx || s.vy) {
            s.ox = s.oy = s.vx = s.vy = 0;
            r.style.transform = '';
          }
        });
        smv = 0;
        sraf = act ? requestAnimationFrame(sloop) : 0;
      }
      function skick() {
        if (!sraf) sraf = requestAnimationFrame(sloop);
      }
      snd.addEventListener('pointermove', function (e) {
        const p = sp(snd, e);
        sspd = smouse ? Math.min(1.3, 0.35 + Math.hypot(p.x - smouse.x, p.y - smouse.y) * 0.6) : 0.5;
        smouse = p;
        smv = 1;
        skick();
      });
      snd.addEventListener('pointerleave', function () {
        smouse = null;
      });
      snd.addEventListener('click', function (e) {
        if (sthrow) return;
        const p = sp(snd, e);
        sthrow = true;
        sgs.forEach(function (r, i) {
          const s = sst[i];
          const dx = +r.dataset.x - p.x;
          const dy = +r.dataset.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          s.vx += (dx / d) * (0.25 + Math.random() * 0.35);
          s.vy += (dy / d) * 0.2 - (0.35 + Math.random() * 0.55);
        });
        skick();
        clearTimeout(stm);
        stm = setTimeout(szero, 1700);
      });
    },
  };

  const run = boot[root.dataset.anim];
  if (run) run();
})();
