const VerifyAnim = (() => {
  const DEFAULT_STAGE_ORDER = ['scan', 'label', 'match', 'audit', 'summarize'];
  const MIN_DWELL_MS = 900;
  const ICON_BOX_PX = 64;

  const DEFAULT_STAGES = {
    scan: {
      caption: 'Scanning your documents…',
      build: panel => {
        panel.appendChild(iconRow(iconBox(Icons.document), arrowBox(), iconBox(Icons.spreadsheet)));
      },
      animate: panel => {
        const scanline = document.createElement('div');
        scanline.className = 'verify-anim-scanline';
        panel.querySelector('.verify-anim-icon-row').appendChild(scanline);
        return anime({
          targets: scanline,
          translateY: [0, ICON_BOX_PX],
          opacity: [0, 1, 1, 0],
          duration: 1400,
          easing: 'easeInOutSine',
          loop: true
        });
      }
    },
    label: {
      caption: 'Labeling extracted values…',
      build: panel => {
        panel.appendChild(iconRow(iconBox(Icons.sparkle)));
      },
      animate: panel => anime({
        targets: panel.querySelector('.verify-anim-icon-box'),
        scale: [1, 1.15, 1],
        opacity: [1, .7, 1],
        duration: 1100,
        easing: 'easeInOutSine',
        loop: true
      })
    },
    match: {
      caption: 'Matching against the spreadsheet…',
      build: panel => {
        panel.appendChild(iconRow(iconBox(Icons.spreadsheet), arrowBox(), iconBox(Icons.magnifier)));
      },
      animate: panel => anime({
        targets: panel.querySelectorAll('.verify-anim-icon-box')[1],
        translateY: [0, -6, 0],
        duration: 900,
        easing: 'easeInOutSine',
        loop: true
      })
    },
    audit: {
      caption: 'Auditing discrepancies…',
      build: panel => {
        const row = iconRow(iconBox(Icons.folder));
        row.querySelector('.verify-anim-icon-box').classList.add('verify-anim-pulse');
        panel.appendChild(row);
      },
      animate: () => null
    },
    summarize: {
      caption: 'Summarizing findings…',
      build: panel => {
        const row = iconRow(iconBox(Icons.chat));
        const dots = document.createElement('div');
        dots.className = 'verify-anim-typing';
        dots.append(
          typingDot(), typingDot(), typingDot()
        );
        row.appendChild(dots);
        panel.appendChild(row);
      },
      animate: panel => anime({
        targets: panel.querySelectorAll('.verify-anim-typing-dot'),
        translateY: [0, -5, 0],
        delay: anime.stagger(120),
        duration: 700,
        easing: 'easeInOutSine',
        loop: true
      })
    }
  };

  const GENERATOR_STAGE_ORDER = ['parse', 'extract', 'write', 'validate'];

  const GENERATOR_STAGES = {
    parse: {
      caption: 'Reading your spreadsheet and summary…',
      build: panel => {
        panel.appendChild(iconRow(iconBox(Icons.spreadsheet), arrowBox(), iconBox(Icons.document)));
      },
      animate: panel => anime({
        targets: panel.querySelectorAll('.verify-anim-icon-box'),
        translateY: [0, -6, 0],
        duration: 900,
        easing: 'easeInOutSine',
        loop: true
      })
    },
    extract: {
      caption: 'Extracting the numbers for',
      build: panel => {
        panel.appendChild(iconRow(iconBox(Icons.sparkle)));
      },
      animate: panel => anime({
        targets: panel.querySelector('.verify-anim-icon-box'),
        scale: [1, 1.15, 1],
        opacity: [1, .7, 1],
        duration: 1100,
        easing: 'easeInOutSine',
        loop: true
      })
    },
    write: {
      caption: 'Writing the narrative for',
      build: panel => {
        const row = iconRow(iconBox(Icons.chat));
        const dots = document.createElement('div');
        dots.className = 'verify-anim-typing';
        dots.append(typingDot(), typingDot(), typingDot());
        row.appendChild(dots);
        panel.appendChild(row);
      },
      animate: panel => anime({
        targets: panel.querySelectorAll('.verify-anim-typing-dot'),
        translateY: [0, -5, 0],
        delay: anime.stagger(120),
        duration: 700,
        easing: 'easeInOutSine',
        loop: true
      })
    },
    validate: {
      caption: 'Checking the draft against your Total Budget…',
      build: panel => {
        panel.appendChild(iconRow(iconBox(Icons.spreadsheet), arrowBox(), iconBox(Icons.magnifier)));
      },
      animate: panel => anime({
        targets: panel.querySelectorAll('.verify-anim-icon-box')[1],
        translateY: [0, -6, 0],
        duration: 900,
        easing: 'easeInOutSine',
        loop: true
      })
    }
  };

  function iconBox(svg) {
    const box = document.createElement('div');
    box.className = 'verify-anim-icon-box';
    box.innerHTML = svg;
    return box;
  }

  function arrowBox() {
    const box = document.createElement('div');
    box.className = 'verify-anim-arrow';
    box.innerHTML = Icons.arrow;
    return box;
  }

  function iconRow(...children) {
    const row = document.createElement('div');
    row.className = 'verify-anim-icon-row';
    children.forEach(c => row.appendChild(c));
    return row;
  }

  function typingDot() {
    const dot = document.createElement('span');
    dot.className = 'verify-anim-typing-dot';
    return dot;
  }

  let active           = false;
  let epoch            = 0;
  let currentPanel     = null;
  let idleAnims        = [];
  let lastTransitionAt = 0;
  let queue            = Promise.resolve();

  let stages, stageOrder, expandBtnId, stepLogId, manageDetailsToggle;
  let startAnnounce, finishCleanAnnounce, finishOtherAnnounce;
  let container, viewportEl, dotsEls, batchEl, countEl, liveEl;

  function mount(config = {}) {
    stages     = config.stages     || DEFAULT_STAGES;
    stageOrder = config.stageOrder || DEFAULT_STAGE_ORDER;
    expandBtnId = config.expandBtnId || 'verify-expand-details-btn';
    stepLogId   = config.stepLogId   || 'verify-step-log';
    manageDetailsToggle = config.manageDetailsToggle !== false;
    startAnnounce       = config.startAnnounce       || 'Analyzing your documents.';
    finishCleanAnnounce = config.finishCleanAnnounce || 'Analysis complete — no discrepancies found.';
    finishOtherAnnounce = config.finishOtherAnnounce || 'Analysis complete — opening findings review.';

    container  = document.getElementById(config.containerId || 'verify-anim');
    viewportEl = container.querySelector('.verify-anim-viewport');
    dotsEls    = [...container.querySelectorAll('.verify-anim-dot')];
    batchEl    = container.querySelector('.verify-anim-batch');
    countEl    = container.querySelector('.verify-anim-count');
    liveEl     = document.getElementById(config.liveId || 'verify-anim-live');
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function killIdle() {
    idleAnims.forEach(a => a.pause());
    idleAnims = [];
  }

  function announce(text) {
    liveEl.textContent = text;
  }

  function updateDots(key) {
    const idx = stageOrder.indexOf(key);
    dotsEls.forEach((dot, i) => {
      dot.classList.toggle('active', i === idx);
      dot.classList.toggle('done', i < idx);
    });
  }

  function enqueue(fn, gated = true) {
    const myEpoch = epoch;
    queue = queue.then(async () => {
      if (epoch !== myEpoch || !active) return;
      if (gated) {
        const wait = MIN_DWELL_MS - (performance.now() - lastTransitionAt);
        if (wait > 0) await sleep(wait);
        if (epoch !== myEpoch || !active) return;
        lastTransitionAt = performance.now();
      }
      fn();
    });
  }

  function start() {
    epoch++;
    queue = Promise.resolve();
    active = true;
    lastTransitionAt = 0;
    killIdle();
    viewportEl.innerHTML = '';
    currentPanel = null;
    updateDots(null);
    batchEl.classList.add('hidden');
    countEl.classList.remove('verify-anim-count-pop');
    countEl.classList.add('hidden');
    if (manageDetailsToggle) document.getElementById(expandBtnId).classList.add('hidden');
    container.classList.remove('hidden', 'verify-anim-fade-out');
    announce(startAnnounce);
  }

  function stage(key, detail) {
    if (!active) return;
    enqueue(() => {
      const def = stages[key];
      const captionText = detail ? `${def.caption} ${detail}` : def.caption;

      if (currentPanel) {
        const prevPanel = currentPanel;
        prevPanel.classList.remove('verify-anim-stage-enter');
        prevPanel.classList.add('verify-anim-stage-exit');
        setTimeout(() => prevPanel.remove(), 220);
      }
      killIdle();

      const panel = document.createElement('div');
      panel.className = 'verify-anim-stage verify-anim-stage-enter';
      def.build(panel);
      const caption = document.createElement('p');
      caption.className = 'verify-anim-caption';
      caption.textContent = captionText;
      panel.appendChild(caption);
      viewportEl.appendChild(panel);
      currentPanel = panel;

      batchEl.classList.add('hidden');
      countEl.classList.remove('verify-anim-count-pop');
      countEl.classList.add('hidden');

      updateDots(key);
      announce(captionText);

      const specific = def.animate(panel);
      if (specific) idleAnims.push(specific);
      const arrows = panel.querySelectorAll('.verify-anim-arrow');
      if (arrows.length) {
        idleAnims.push(anime({
          targets: arrows,
          translateX: [0, 6, 0],
          duration: 1200,
          easing: 'easeInOutSine',
          loop: true
        }));
      }
    });
  }

  function updateBatch(current, total) {
    if (!active) return;
    enqueue(() => {
      if (total > 1) {
        batchEl.textContent = `Batch ${current} of ${total}`;
        batchEl.classList.remove('hidden');
      }
    }, false);
  }

  function complete(count, label) {
    if (!active) return;
    enqueue(() => {
      killIdle();
      batchEl.classList.add('hidden');
      countEl.classList.remove('hidden');
      const proxy = { v: 0 };
      anime({
        targets: proxy,
        v: count,
        round: 1,
        duration: 600,
        easing: 'easeOutExpo',
        update: () => { countEl.textContent = `${proxy.v} ${label}`; }
      });
      void countEl.offsetWidth;
      countEl.classList.add('verify-anim-count-pop');
      announce(`${count} ${label}.`);
    });
  }

  function finish(mode) {
    if (!active) return;
    active = false;
    killIdle();
    container.classList.add('verify-anim-fade-out');
    setTimeout(() => {
      container.classList.add('hidden');
      container.classList.remove('verify-anim-fade-out');
    }, 250);
    if (manageDetailsToggle) document.getElementById(expandBtnId).classList.remove('hidden');
    announce(mode === 'clean' ? finishCleanAnnounce : finishOtherAnnounce);
  }

  function fail() {
    if (!active) return;
    active = false;
    killIdle();
    container.classList.add('hidden');
    container.classList.remove('verify-anim-fade-out');
    if (manageDetailsToggle) {
      document.getElementById(stepLogId).classList.remove('hidden');
      document.getElementById(expandBtnId).classList.add('hidden');
    }
  }

  return {
    mount, start, stage, updateBatch, complete, finish, fail,
    stageSets: {
      verifier:  { stages: DEFAULT_STAGES,   stageOrder: DEFAULT_STAGE_ORDER },
      generator: { stages: GENERATOR_STAGES, stageOrder: GENERATOR_STAGE_ORDER }
    }
  };
})();
