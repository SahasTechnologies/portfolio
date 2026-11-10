// Client-side behaviour for the pixel animations on the home page. The animation
// itself (SVG + CSS entrance) is rendered on the server; this file only wires up
// the pointer interactions. The code for each study is the same code the
// "Sahas — animation studies" page runs, so a study behaves identically here.

(function () {
  const root = document.querySelector('.anim[data-anim]');
  if (!root || root.dataset.booted) return;
  root.dataset.booted = '1';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const resets = {};
  const $ = (sel) => root.querySelector(sel);

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

  // Run the entrance again: the study's own reset first, then the CSS play class.
  function replay() {
    const reset = resets[root.dataset.anim];
    if (reset) reset();
    root.classList.remove('play');
    void root.offsetHeight;
    root.classList.add('play');
  }

  const boot = {
    tet() {
      $('.tet').addEventListener('click', function () {
        replay($('.tet').closest('.anim'));
      });
      var tet = $('.tet'),
        tcs = [].slice.call(tet.querySelectorAll('.tc')),
        cleared = [],
        filling = {},
        ttm = 0;
      function tapply() {
        tcs.forEach(function (c) {
          var y = +c.dataset.y,
            isc = cleared.indexOf(y) >= 0,
            sh = cleared.filter(function (r) {
              return r > y;
            }).length;
          c.classList.toggle('clr', isc);
          c.style.transform = isc ? '' : sh ? 'translateY(' + sh + 'px)' : '';
        });
      }
      function trevert() {
        cleared = [];
        filling = {};
        tcs.forEach(function (c) {
          c.classList.remove('fill');
          c.style.transitionDelay = '';
        });
        tapply();
      }
      function rowHover(r) {
        if (cleared.indexOf(r) >= 0 || filling[r]) return;
        filling[r] = 1;
        clearTimeout(ttm);
        tcs.forEach(function (c) {
          if (+c.dataset.y === r && c.classList.contains('tf')) {
            c.style.transitionDelay = +c.dataset.x * 14 + 'ms';
            c.classList.add('fill');
          }
        });
        setTimeout(function () {
          tcs.forEach(function (c) {
            if (+c.dataset.y === r) c.style.transitionDelay = '0ms';
          });
          cleared.push(r);
          delete filling[r];
          tapply();
          clearTimeout(ttm);
          ttm = setTimeout(trevert, 1500);
        }, 700);
      }
      var tetReady = false,
        tready = 0;
      resets.tet = function () {
        tetReady = false;
        clearTimeout(tready);
        trevert();
        tready = setTimeout(function () {
          tetReady = true;
        }, +tet.dataset.ready * 1000);
      };
      resets.tet();
      tet.addEventListener('pointermove', function (e) {
        if (!tetReady) return;
        var r = Math.floor(sp(tet, e).y);
        if (r >= 0 && r <= 6) rowHover(r);
      });
    },

    scatter() {
      var dis = $('.dis'),
        dps = [].slice.call(dis.querySelectorAll('.dp'));
      dis.addEventListener('pointermove', function (e) {
        var pt = dis.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        var p = pt.matrixTransform(dis.getScreenCTM().inverse());
        dps.forEach(function (r) {
          var dx = +r.dataset.x - p.x,
            dy = +r.dataset.y - p.y,
            d = Math.hypot(dx, dy) || 0.01;
          if (d < 5) {
            var k = ((5 - d) / 5) * 4;
            r.style.transform = 'translate(' + (dx / d) * k + 'px,' + (dy / d) * k + 'px)';
          } else r.style.transform = '';
        });
      });
      dis.addEventListener('pointerleave', function () {
        dps.forEach(function (r) {
          r.style.transform = '';
        });
      });
      dis.addEventListener('click', function () {
        dps.forEach(function (r) {
          r.style.transform =
            'translate(' + (Math.random() - 0.5) * 22 + 'px,' + (Math.random() - 0.5) * 16 + 'px)';
        });
        setTimeout(function () {
          dps.forEach(function (r) {
            r.style.transform = '';
          });
        }, 350);
      });
    },

    led() {
      var led = $('.led'),
        lp = [].slice.call(led.querySelectorAll('.lp')),
        bgp = [].slice.call(led.querySelectorAll('.bgp')),
        cells = lp.concat(bgp),
        inten = new Float32Array(cells.length),
        lraf = 0,
        lsw = 0;
      function lframe() {
        var any = false;
        for (var i = 0; i < cells.length; i++) {
          var v = inten[i];
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
          var h = cells[i].style.getPropertyValue('--h'),
            isb = i >= lp.length;
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
        var t = (now - lsw) / 1000,
          sx = (t / 1.4) * 33 - 2;
        for (var i = 0; i < lp.length; i++) {
          var dx = +lp[i].dataset.x - sx;
          if (dx > -1.5 && dx < 0.8) inten[i] = 1;
        }
        lkick();
        if (t < 1.8) requestAnimationFrame(lsweep);
      }
      var lbusy = 0;
      function ledStart() {
        lbusy = performance.now() + 2400;
        lsw = 0;
        for (var i = 0; i < cells.length; i++) {
          inten[i] = 0;
          cells[i].style.fill = '';
        }
        requestAnimationFrame(lsweep);
      }
      resets.led = ledStart;
      led.addEventListener('click', ledStart);
      led.addEventListener('pointermove', function (e) {
        if (performance.now() < lbusy) return;
        var p = sp(led, e),
          R = 4.5;
        for (var i = 0; i < cells.length; i++) {
          var c = cells[i],
            d = Math.hypot(+c.dataset.x - p.x, +c.dataset.y - p.y);
          if (d < R) {
            var v = Math.pow(1 - d / R, 0.7);
            if (i >= lp.length) v *= 0.55;
            if (v > inten[i]) inten[i] = v;
          }
        }
        lkick();
      });
      ledStart();
    },

    rain() {
      var rain = $('.rain'),
        rcs = [].slice.call(rain.querySelectorAll('.rn')),
        lastc = -1;
      rain.addEventListener('pointermove', function (e) {
        var c = Math.floor(sp(rain, e).x);
        if (c === lastc || c < 0 || c > 28) return;
        lastc = c;
        var col = rcs.filter(function (r) {
          return +r.dataset.x === c;
        });
        col.forEach(function (r) {
          r.style.setProperty('--dl', (+r.dataset.y + 5) * 0.05 + 's');
        });
        restart(col);
      });
      rain.addEventListener('pointerleave', function () {
        lastc = -1;
      });
      resets.rain = function () {
        rcs.forEach(function (r) {
          r.style.setProperty('--dl', r.dataset.dl + 's');
          r.style.animation = '';
        });
      };
    },

    flip() {
      var PAL = ['#22d3ee', '#facc15', '#c084fc', '#4ade80', '#f87171', '#60a5fa', '#fb923c'];
      var flip = $('.flip'),
        fps = [].slice.call(flip.querySelectorAll('.fp')),
        lastf = null;
      fps.forEach(function (r) {
        r.dataset.ci = r.dataset.l;
      });
      flip.addEventListener('pointermove', function (e) {
        var p = sp(flip, e),
          hit = null;
        fps.forEach(function (r) {
          if (Math.abs(+r.dataset.x - p.x) < 0.5 && Math.abs(+r.dataset.y - p.y) < 0.5) hit = r;
        });
        if (hit === lastf) return;
        lastf = hit;
        if (!hit) return;
        var ci = +hit.dataset.ci,
          nx = (ci + 1) % 7;
        hit.style.setProperty('--from', PAL[ci]);
        hit.style.setProperty('--f', PAL[nx]);
        hit.dataset.ci = nx;
        var on = hit.classList.contains('f1');
        hit.classList.toggle('f1', !on);
        hit.classList.toggle('f2', on);
      });
      flip.addEventListener('pointerleave', function () {
        lastf = null;
      });
      resets.flip = function () {
        fps.forEach(function (r) {
          r.classList.remove('f1', 'f2');
          r.style.setProperty('--f', PAL[+r.dataset.l]);
          r.dataset.ci = r.dataset.l;
        });
      };
    },

    eq() {
      var equ = $('.equ'),
        eqs = [].slice.call(equ.querySelectorAll('.eq')),
        lastq = -1;
      equ.addEventListener('pointermove', function (e) {
        var c = Math.floor(sp(equ, e).x);
        if (c === lastq || c < 0 || c > 28) return;
        lastq = c;
        var b = eqs[c],
          on = b.classList.contains('pop');
        b.classList.toggle('pop', !on);
        b.classList.toggle('pop2', on);
      });
      resets.eq = function () {
        eqs.forEach(function (b) {
          b.classList.remove('pop', 'pop2');
        });
      };
    },

    pls() {
      var pls = $('.pls'),
        pps = [].slice.call(pls.querySelectorAll('.pp')),
        hot = null,
        soft = [];
      function clearp() {
        if (hot) hot.classList.remove('on');
        hot = null;
        soft.forEach(function (r) {
          r.style.transform = '';
        });
        soft = [];
      }
      pls.addEventListener('pointermove', function (e) {
        var p = sp(pls, e),
          best = null,
          bd = 0.8,
          next = [];
        pps.forEach(function (r) {
          var d = Math.hypot(+r.dataset.x - p.x, +r.dataset.y - p.y);
          if (d < bd) {
            bd = d;
            best = r;
          }
        });
        pps.forEach(function (r) {
          var d = Math.hypot(+r.dataset.x - p.x, +r.dataset.y - p.y);
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
        var p = sp(pls, e);
        pps.forEach(function (r) {
          var d = Math.hypot(+r.dataset.x - p.x, +r.dataset.y - p.y);
          r.style.setProperty('--pd', d * 0.05 + 's');
          var on = r.classList.contains('p1');
          r.classList.toggle('p1', !on);
          r.classList.toggle('p2', on);
        });
      });
      resets.pls = function () {
        clearp();
        pps.forEach(function (r) {
          r.classList.remove('p1', 'p2');
        });
      };
    },

    tw() {
      var typ = $('.typ'),
        twp = [].slice.call(typ.querySelectorAll('.tw')),
        tcar = $('.tcar');
      function twRestore() {
        twp.forEach(function (r) {
          r.style.opacity = '';
        });
        tcar.style.opacity = 0;
      }
      typ.addEventListener('pointermove', function (e) {
        var c = Math.max(0, Math.min(29, Math.floor(sp(typ, e).x)));
        twp.forEach(function (r) {
          r.style.opacity = +r.dataset.c < c ? '' : '0';
        });
        tcar.style.opacity = 1;
        tcar.setAttribute('x', c + 0.06);
      });
      typ.addEventListener('pointerleave', twRestore);
      resets.tw = twRestore;
    },

    pac() {
      var pcm = $('.pcm'),
        pac = pcm.querySelector('.pacm'),
        pg = pcm.querySelector('.pg'),
        pgi = pg.querySelector('.pgi'),
        PATH = JSON.parse(pcm.dataset.path.replace(/'/g, '"')),
        pcells = [].slice.call(pcm.querySelectorAll('.pmn')).map(function (r) {
          return { x: Math.round(+r.getAttribute('x') - 0.06), y: Math.round(+r.getAttribute('y') - 0.06) };
        }),
        WALK = {},
        P = {
          x: 29,
          y: 6,
          ang: 0,
          intro: false,
          ghost: false,
          dying: false,
          inside: false,
          gx: 0,
          gy: 0,
          raf: 0,
          iv: 0,
        };
      pcells.forEach(function (c) {
        WALK[c.x + ',' + c.y] = 1;
      });
      pcm.dataset.grey.split(';').forEach(function (s) {
        WALK[s] = 1;
      });
      function bfs(sx, sy, goal) {
        var key = function (x, y) {
            return x + ',' + y;
          },
          prev = {},
          q = [[sx, sy]],
          end = null;
        prev[key(sx, sy)] = null;
        while (q.length) {
          var c = q.shift();
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
            var nx = c[0] + d[0],
              ny = c[1] + d[1],
              k = key(nx, ny);
            if (WALK[k] && !(k in prev)) {
              prev[k] = c;
              q.push([nx, ny]);
            }
          });
        }
        if (!end) return null;
        var path = [],
          c = end;
        while (c && !(c[0] === sx && c[1] === sy)) {
          path.push(c);
          c = prev[key(c[0], c[1])];
        }
        return path.reverse();
      }
      function pset(ang, ms) {
        var d = ((ang - P.ang + 540) % 360) - 180;
        P.ang += d;
        pac.style.transition = ms ? 'transform ' + ms + 'ms linear' : 'none';
        pac.style.transform =
          'translate(' + (P.x + 0.5) + 'px,' + (P.y + 0.5) + 'px) rotate(' + P.ang + 'deg)';
      }
      function pdir(dx, dy) {
        return dx > 0 ? 0 : dx < 0 ? 180 : dy > 0 ? 90 : -90;
      }
      function stepTo(n) {
        var dx = n[0] - P.x,
          dy = n[1] - P.y;
        P.x = n[0];
        P.y = n[1];
        pset(pdir(dx, dy), 110);
      }
      function toEdge() {
        clearInterval(P.iv);
        if (P.ghost && !P.dying) return;
        var path = bfs(P.x, P.y, function (x, y) {
          return y === 6 && (x === -1 || x === 29);
        });
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
        var path = bfs(P.x, P.y, function (x, y) {
          return x === P.gx && y === P.gy;
        });
        if (!path) {
          return;
        }
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
        var best = null,
          bd = 1e9;
        pcells.forEach(function (c) {
          var d = Math.hypot(c.x + 0.5 - p.x, c.y + 0.5 - p.y);
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
        var t0 = performance.now(),
          last = -1;
        P.x = PATH[0][0];
        P.y = PATH[0][1];
        P.ang = 0;
        pset(0, 0);
        function f(now) {
          var i = Math.min(PATH.length - 1, Math.floor((now - t0) / 55));
          if (i !== last) {
            last = i;
            var a = PATH[i],
              b = PATH[Math.min(i + 1, PATH.length - 1)];
            P.x = a[0];
            P.y = a[1];
            var dx = b[0] - a[0],
              dy = b[1] - a[1];
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
      resets.pac = introStart;
      introStart();
      pcm.addEventListener('pointermove', function (e) {
        P.inside = true;
        if (!P.intro || P.dying) return;
        pcm.classList.add('hunt');
        var c = nearest(sp(pcm, e));
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
      pcm.addEventListener('click', replay);
    },

    wav() {
      var wv = $('.wv'),
        wcs = [].slice.call(wv.querySelectorAll('.wc')),
        wcur = [],
        wm = -1,
        wws = [],
        wcard = wv.closest('.anim');
      wcs.forEach(function () {
        wcur.push(0);
      });
      function wframe(now) {
        if (!wcard.hidden) {
          wws = wws.filter(function (w) {
            return now - w.t < 3400;
          });
          for (var c = 0; c < 29; c++) {
            var t;
            if (wm >= 0) {
              var d = c + 0.5 - wm;
              t = 2.4 * (d < 0 ? Math.max(0, 1 + d / 4) : Math.max(0, 1 - d / 16));
            } else t = reduce ? 0 : 1.1 * (0.5 + 0.5 * Math.sin(c * 0.42 - now / 230));
            wws.forEach(function (w) {
              var age = (now - w.t) / 1000,
                r = age * 13,
                dd = Math.abs(c + 0.5 - w.x);
              t += 2 * Math.exp(-Math.pow(dd - r, 2) / 2.4) * Math.exp(-age / 1.6);
            });
            wcur[c] += (t - wcur[c]) * 0.25;
            wcs[c].style.transform = 'translateY(' + (-wcur[c]).toFixed(2) + 'px)';
          }
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

    mq() {
      var mrq = $('.mrq'),
        mqs = [].slice.call(mrq.querySelectorAll('.mq0,.mq1,.mq2')),
        MP = 34,
        ms = 0,
        mdir = 1,
        mmov = false,
        mtm = 0,
        mlive = false;
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
      resets.mq = function () {
        clearInterval(mtm);
        mtm = 0;
        mlive = false;
        ms = 0;
        mdir = 1;
        mmov = false;
        mrq.classList.remove('live');
        mqs.forEach(function (g) {
          g.removeAttribute('transform');
        });
        mqs[1].style.animation = '';
      };
    },

    twinkle() {
      var twk = $('.twk');
      twk.addEventListener('click', function () {
        twk.classList.remove('go');
        void twk.getBoundingClientRect();
        twk.classList.add('go');
      });
    },

    rdr() {
      var rdr = $('.rdr'),
        rps = [].slice.call(rdr.querySelectorAll('.rp')),
        rw = rdr.querySelector('.rw'),
        rl = rdr.querySelector('.rl'),
        rth = 0,
        rtg = null,
        rcard = rdr.closest('.anim');
      rps.forEach(function (r) {
        r.dataset.a = Math.atan2(+r.dataset.y - 3.5, +r.dataset.x - 14.5);
      });
      function rframe() {
        if (!rcard.hidden) {
          if (rtg === null) {
            if (!reduce) rth += 0.024;
          } else rth += Math.atan2(Math.sin(rtg - rth), Math.cos(rtg - rth)) * 0.14;
          rps.forEach(function (r) {
            var d = (((rth - +r.dataset.a) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI),
              b = Math.max(0, 1 - d / (2 * Math.PI * 0.6));
            b = b * b;
            r.style.fill =
              'rgb(' +
              Math.round(29 + 96 * b) +
              ',' +
              Math.round(58 + 197 * b) +
              ',' +
              Math.round(40 + 134 * b) +
              ')';
          });
          var L = 17;
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
              (3.5 + L * Math.sin(rth)).toFixed(2),
          );
        }
        requestAnimationFrame(rframe);
      }
      rframe();
      rdr.addEventListener('pointermove', function (e) {
        var p = sp(rdr, e);
        rtg = Math.atan2(p.y - 3.5, p.x - 14.5);
      });
      rdr.addEventListener('pointerleave', function () {
        rtg = null;
      });
    },

    crm() {
      var crm = $('.crm'),
        cps = [].slice.call(crm.querySelectorAll('.cp'));
      function crumble(r, delay) {
        if (r.dataset.b) return;
        r.dataset.b = 1;
        var rx = (Math.random() - 0.5) * 3,
          rot = (Math.random() - 0.5) * 160;
        var a = r.animate(
          [
            { transform: 'translate(0px,0px) rotate(0deg)', opacity: 1 },
            {
              transform: 'translate(' + rx + 'px,' + (10 + Math.random() * 4) + 'px) rotate(' + rot + 'deg)',
              opacity: 0,
            },
          ],
          { duration: 650, delay: delay, easing: 'cubic-bezier(.55,0,1,.6)', fill: 'forwards' },
        );
        a.onfinish = function () {
          setTimeout(function () {
            a.cancel();
            var b = r.animate(
              [
                { transform: 'scale(0)', opacity: 0 },
                { transform: 'scale(1.25)', opacity: 1, offset: 0.6 },
                { transform: 'none', opacity: 1 },
              ],
              { duration: 450 },
            );
            b.onfinish = function () {
              delete r.dataset.b;
            };
          }, 700);
        };
      }
      crm.addEventListener('pointermove', function (e) {
        var p = sp(crm, e);
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

    snd() {
      var snd = $('.snd'),
        sgs = [].slice.call(snd.querySelectorAll('.sg')),
        sst = sgs.map(function () {
          return { ox: 0, oy: 0, vx: 0, vy: 0 };
        }),
        sraf = 0,
        smouse = null,
        smv = 0,
        sspd = 0,
        sthrow = false,
        stm = 0,
        scard = snd.closest('.anim');
      function szero() {
        clearTimeout(stm);
        sthrow = false;
        sst.forEach(function (s, i) {
          s.ox = s.oy = s.vx = s.vy = 0;
          sgs[i].style.transform = '';
        });
      }
      function sloop() {
        var act = sthrow,
          hit = smv > 0 && !sthrow;
        sgs.forEach(function (r, i) {
          var s = sst[i];
          if (hit && smouse) {
            var dx = +r.dataset.x + s.ox - smouse.x,
              dy = +r.dataset.y + s.oy - smouse.y,
              d = Math.hypot(dx, dy);
            if (d < 2.3 && d > 0.01) {
              var f = (1 - d / 2.3) * sspd;
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
          var moving =
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
        var p = sp(snd, e);
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
        var p = sp(snd, e);
        sthrow = true;
        sgs.forEach(function (r, i) {
          var s = sst[i],
            dx = +r.dataset.x - p.x,
            dy = +r.dataset.y - p.y,
            d = Math.hypot(dx, dy) || 1;
          s.vx += (dx / d) * (0.25 + Math.random() * 0.35);
          s.vy += (dy / d) * 0.2 - (0.35 + Math.random() * 0.55);
        });
        skick();
        clearTimeout(stm);
        stm = setTimeout(function () {
          szero();
          replay(scard);
        }, 1700);
      });
      resets.snd = szero;
    },

    slt() {
      var slt = $('.slt'),
        rls = [].slice.call(slt.querySelectorAll('.reel')),
        lastr = -1;
      slt.addEventListener('pointermove', function (e) {
        var c = Math.floor(sp(slt, e).x);
        if (c === lastr || c < 0 || c > 28) return;
        lastr = c;
        rls[c].animate([{ transform: 'translateY(14px)' }, { transform: 'none' }], {
          duration: 650,
          easing: 'steps(14)',
        });
      });
      slt.addEventListener('pointerleave', function () {
        lastr = -1;
      });
      slt.addEventListener('click', function () {
        replay(slt.closest('.anim'));
      });
    },

    mgs() {
      var mgs = $('.mgs'),
        mgp = [].slice.call(mgs.querySelectorAll('.mg')),
        mst = mgp.map(function () {
          return { ox: 0, oy: 0, vx: 0, vy: 0 };
        }),
        mm = null,
        mraf = 0;
      function mloop() {
        var act = !!mm;
        mgp.forEach(function (r, i) {
          var s = mst[i],
            hx = +r.dataset.x,
            hy = +r.dataset.y;
          if (mm) {
            var dx = mm.x - (hx + s.ox),
              dy = mm.y - (hy + s.oy),
              d = Math.hypot(dx, dy) || 0.01,
              R = 7;
            if (d < R) {
              var f = 1 - d / R;
              s.vx += (dx / d) * f * 0.045 - (dy / d) * f * 0.03;
              s.vy += (dy / d) * f * 0.045 + (dx / d) * f * 0.03;
            }
          }
          s.vx -= s.ox * 0.012;
          s.vy -= s.oy * 0.012;
          s.vx *= 0.9;
          s.vy *= 0.9;
          s.ox += s.vx;
          s.oy += s.vy;
          if (
            Math.abs(s.ox) > 0.01 ||
            Math.abs(s.oy) > 0.01 ||
            Math.abs(s.vx) > 0.01 ||
            Math.abs(s.vy) > 0.01
          ) {
            act = true;
            r.style.transform = 'translate(' + s.ox.toFixed(3) + 'px,' + s.oy.toFixed(3) + 'px)';
          } else if (s.ox || s.oy) {
            s.ox = s.oy = s.vx = s.vy = 0;
            r.style.transform = '';
          }
        });
        mraf = act ? requestAnimationFrame(mloop) : 0;
      }
      function mkick() {
        if (!mraf) mraf = requestAnimationFrame(mloop);
      }
      mgs.addEventListener('pointermove', function (e) {
        mm = sp(mgs, e);
        mkick();
      });
      mgs.addEventListener('pointerleave', function () {
        mm = null;
      });
      mgs.addEventListener('click', function (e) {
        var p = sp(mgs, e);
        mgp.forEach(function (r, i) {
          var s = mst[i],
            dx = +r.dataset.x + s.ox - p.x,
            dy = +r.dataset.y + s.oy - p.y,
            d = Math.hypot(dx, dy) || 1;
          s.vx += (dx / d) * (0.5 + Math.random() * 0.4);
          s.vy += (dy / d) * (0.5 + Math.random() * 0.4);
        });
        mkick();
      });
      resets.mgs = function () {
        mst.forEach(function (s, i) {
          s.ox = s.oy = s.vx = s.vy = 0;
          mgp[i].style.transform = '';
        });
      };
    },
  };

  const run = boot[root.dataset.anim];
  if (run) run();
})();
