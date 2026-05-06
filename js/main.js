// ── Elements ──
const dayButtons = document.querySelectorAll('.day-btn');
const eventCards = [...document.querySelectorAll('.event-card')];
const eventsScroll = document.querySelector('.events-scroll');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (window.gsap && window.Observer) {
  gsap.registerPlugin(Observer);
}

// ── Motion constants ──
const EDGE_THRESHOLD = 135;
const EDGE_RESET_DELAY = 260;
const TRANSITION_DURATION = prefersReducedMotion ? 0.22 : 0.7;
const DIRECT_TRANSITION_DURATION = prefersReducedMotion ? 0.18 : 0.55;
const INPUT_COOLDOWN = prefersReducedMotion ? 80 : 90;
const CARD_OFFSET = prefersReducedMotion ? 0 : 40;
const CARD_EXIT_OFFSET = prefersReducedMotion ? 0 : 18;
const EDGE_EPSILON = 2;
const MAX_EDGE_DELTA = 90;
const EDGE_COMMIT_PROGRESS = 0.58;

// ── State ──
const WHEEL_COOLDOWN_MS = 600;
let currentIndex = 0;
let transitionTween = null;
let wheelLockedUntil = 0;
let edgeTween = null;
let edgeResetTimer = null;
let touchLastY = 0;
let edgeState = {
  direction: 0,
  progress: 0,
  targetIndex: -1,
};

// ── Card setup ──
eventCards.forEach((card, index) => {
  if (!card.querySelector(':scope > .event-card-content')) {
    const content = document.createElement('div');
    content.className = 'event-card-content';
    while (card.firstChild) content.appendChild(card.firstChild);
    card.appendChild(content);
  }

  card.dataset.index = String(index);
  card.setAttribute('aria-hidden', index === 0 ? 'false' : 'true');
});

const eventContents = eventCards.map(card => card.querySelector('.event-card-content'));

function refreshScrollableContent() {
  eventContents.forEach(content => {
    content.classList.toggle('is-scrollable', content.scrollHeight > content.clientHeight + EDGE_EPSILON);
  });
}

function setInitialCardState() {
  gsap.set(eventCards, {
    autoAlpha: 0,
    y: CARD_OFFSET,
    zIndex: 1,
    pointerEvents: 'none',
  });

  gsap.set(eventCards[0], {
    autoAlpha: 1,
    y: 0,
    zIndex: 3,
    pointerEvents: 'auto',
  });

  eventCards[0].classList.add('active', 'visible');
}

// ── UI sync ──
const dayPips = new Map();

function buildDayPips() {
  dayButtons.forEach(btn => {
    const day = btn.dataset.day;
    const cardsForDay = eventCards.filter(c => c.dataset.day === day);
    if (cardsForDay.length <= 1) return;

    const pips = document.createElement('span');
    pips.className = 'day-pips';
    cardsForDay.forEach(() => {
      const pip = document.createElement('span');
      pip.className = 'day-pip';
      pips.appendChild(pip);
    });
    btn.appendChild(pips);
    dayPips.set(day, [...pips.children]);
  });
}

function updateDay(index) {
  const card = eventCards[index];
  const newDay = card.dataset.day;
  const locationName = card.dataset.location || '';
  dayButtons.forEach(b => b.classList.toggle('active', b.dataset.day === newDay));

  dayPips.forEach((pips, day) => {
    const cardsForDay = eventCards.filter(c => c.dataset.day === day);
    const activePos = cardsForDay.indexOf(card);
    pips.forEach((pip, i) => pip.classList.toggle('active', i === activePos));
  });

  if (typeof highlightMarker === 'function') {
    highlightMarker(locationName);
  }
}

function closeMapPopup() {
  if (typeof map !== 'undefined') map.closePopup();
}

// ── Inner scroll boundary helpers ──
function maxScrollFor(content) {
  return Math.max(0, content.scrollHeight - content.clientHeight);
}

function isAtContentBoundary(direction, index = currentIndex) {
  const content = eventContents[index];
  const maxScroll = maxScrollFor(content);

  if (maxScroll <= EDGE_EPSILON) return true;
  if (direction > 0) return content.scrollTop >= maxScroll - EDGE_EPSILON;
  return content.scrollTop <= EDGE_EPSILON;
}

function setTargetContentStart(index, direction, fromDirectJump = false) {
  const content = eventContents[index];
  if (fromDirectJump || direction >= 0) {
    content.scrollTop = 0;
    return;
  }

  content.scrollTop = maxScrollFor(content);
}

// ── Edge preview ──
function resetEdgeState(animate = true) {
  clearTimeout(edgeResetTimer);

  const { targetIndex } = edgeState;
  edgeState = { direction: 0, progress: 0, targetIndex: -1 };

  if (edgeTween) edgeTween.kill();
  if (targetIndex === -1 || targetIndex === currentIndex) return;

  const targetCard = eventCards[targetIndex];
  const currentCard = eventCards[currentIndex];
  const currentContent = eventContents[currentIndex];

  if (!animate || prefersReducedMotion) {
    gsap.set(targetCard, { autoAlpha: 0, y: CARD_OFFSET, zIndex: 1, pointerEvents: 'none' });
    gsap.set(currentCard, { autoAlpha: 1, y: 0, zIndex: 3, pointerEvents: 'auto' });
    gsap.set(currentContent, { autoAlpha: 1 });
    return;
  }

  edgeTween = gsap.timeline({
    defaults: { duration: 0.22, ease: 'power2.out' },
    onComplete: () => { edgeTween = null; },
  });
  edgeTween.to(currentCard, { autoAlpha: 1, y: 0 }, 0);
  edgeTween.to(currentContent, { autoAlpha: 1 }, 0);
  edgeTween.to(targetCard, {
    autoAlpha: 0,
    y: CARD_OFFSET * Math.sign(targetIndex - currentIndex),
    pointerEvents: 'none',
    zIndex: 1,
  }, 0);
}

function updateEdgePreview(direction, amount) {
  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= eventCards.length) return false;

  if (edgeState.direction !== direction || edgeState.targetIndex !== targetIndex) {
    resetEdgeState(false);
    edgeState = { direction, progress: 0, targetIndex };
    gsap.set(eventCards[targetIndex], {
      autoAlpha: 0,
      y: direction * CARD_OFFSET,
      zIndex: 4,
      pointerEvents: 'none',
    });
    gsap.set(eventCards[currentIndex], { autoAlpha: 1, zIndex: 3 });
    gsap.set(eventContents[currentIndex], { autoAlpha: 0 });
  }

  edgeState.progress = Math.min(1, edgeState.progress + amount / EDGE_THRESHOLD);
  const eased = gsap.parseEase('power2.out')(edgeState.progress);
  const preview = Math.min(edgeState.progress / EDGE_COMMIT_PROGRESS, 1);
  const currentCard = eventCards[currentIndex];
  const targetCard = eventCards[targetIndex];

  gsap.set(currentCard, {
    autoAlpha: 1,
    y: -direction * CARD_EXIT_OFFSET * eased,
  });

  gsap.set(targetCard, {
    autoAlpha: 0.08 + preview * 0.48,
    y: direction * CARD_OFFSET * (1 - preview * 0.86),
  });

  clearTimeout(edgeResetTimer);
  edgeResetTimer = setTimeout(() => resetEdgeState(true), EDGE_RESET_DELAY);

  if (edgeState.progress >= EDGE_COMMIT_PROGRESS) {
    transitionToCard(targetIndex, direction, { fromEdge: true });
  }

  return true;
}

// ── Card transition ──
function cleanupCards(activeIndex) {
  eventCards.forEach((card, index) => {
    const isActive = index === activeIndex;
    card.classList.toggle('active', isActive);
    card.classList.toggle('visible', isActive);
    card.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    gsap.set(card, {
      autoAlpha: isActive ? 1 : 0,
      y: isActive ? 0 : CARD_OFFSET,
      zIndex: isActive ? 3 : 1,
      pointerEvents: isActive ? 'auto' : 'none',
    });
    gsap.set(eventContents[index], { autoAlpha: 1 });
  });
}

function transitionToCard(index, direction, options = {}) {
  if (index < 0 || index >= eventCards.length || index === currentIndex) {
    resetEdgeState(true);
    return;
  }

  const fromIndex = currentIndex;
  const fromCard = eventCards[fromIndex];
  const toCard = eventCards[index];
  const fromContent = eventContents[fromIndex];
  const fromDirectJump = Boolean(options.direct);
  const duration = fromDirectJump ? DIRECT_TRANSITION_DURATION : TRANSITION_DURATION;
  const resolvedDirection = direction || (index > fromIndex ? 1 : -1);

  clearTimeout(edgeResetTimer);
  if (edgeTween) edgeTween.kill();
  if (transitionTween) transitionTween.kill();

  currentIndex = index;
  edgeState = { direction: 0, progress: 0, targetIndex: -1 };
  closeMapPopup();
  setTargetContentStart(index, resolvedDirection, fromDirectJump);
  updateDay(index);

  gsap.set(toCard, {
    autoAlpha: options.fromEdge ? gsap.getProperty(toCard, 'autoAlpha') : 0,
    y: options.fromEdge ? gsap.getProperty(toCard, 'y') : resolvedDirection * CARD_OFFSET,
    zIndex: 4,
    pointerEvents: 'none',
  });
  gsap.set(fromCard, { zIndex: 3, pointerEvents: 'none' });
  gsap.set(fromContent, { autoAlpha: 0 });

  const onTransitionComplete = () => {
    cleanupCards(currentIndex);
    refreshScrollableContent();
    transitionTween = null;
  };

  transitionTween = gsap.timeline({
    defaults: { duration, ease: prefersReducedMotion ? 'power1.out' : 'power3.out' },
    onComplete: onTransitionComplete,
  });

  transitionTween.to(fromCard, {
    autoAlpha: 0,
    y: -resolvedDirection * CARD_EXIT_OFFSET,
  }, 0);

  transitionTween.to(toCard, {
    autoAlpha: 1,
    y: 0,
  }, 0);
}

// Public integration used by map markers and day nav.
function snapToCard(index) {
  if (index < 0 || index >= eventCards.length || index === currentIndex) return;
  transitionToCard(index, index > currentIndex ? 1 : -1, { direct: true });
}

function handleDeckInput(deltaY, event) {
  if (!deltaY) return false;

  closeMapPopup();

  const direction = deltaY > 0 ? 1 : -1;
  if (!isAtContentBoundary(direction)) {
    resetEdgeState(true);
    return false;
  }

  const consumed = updateEdgePreview(direction, Math.min(Math.abs(deltaY), MAX_EDGE_DELTA));
  if (consumed) event.preventDefault?.();
  return consumed;
}

// ── Wheel gesture handling ──
// Fixed cooldown after each fire — predictable, not tied to animation.
function handleWheel(event) {
  event.preventDefault();
  const now = performance.now();
  if (now < wheelLockedUntil) return;
  if (Math.abs(event.deltaY) < 4) return;

  const direction = event.deltaY > 0 ? 1 : -1;
  if (!isAtContentBoundary(direction)) {
    resetEdgeState(true);
    return;
  }

  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= eventCards.length) return;

  wheelLockedUntil = now + WHEEL_COOLDOWN_MS;
  closeMapPopup();
  transitionToCard(targetIndex, direction);
}

function createObserverInput() {
  if (!window.Observer) return false;

  Observer.create({
    target: eventsScroll,
    type: 'touch,pointer',
    lockAxis: true,
    tolerance: 8,
    preventDefault: false,
    onUp: self => {
      if (self.event?.type === 'wheel') return;
      handleDeckInput(Math.max(24, Math.abs(self.deltaY)), self.event);
    },
    onDown: self => {
      if (self.event?.type === 'wheel') return;
      handleDeckInput(-Math.max(24, Math.abs(self.deltaY)), self.event);
    },
    onPress: () => { touchLastY = 0; },
  });

  return true;
}

function createFallbackInput() {
  eventsScroll.addEventListener('touchstart', event => {
    touchLastY = event.touches[0].clientY;
  }, { passive: true });

  eventsScroll.addEventListener('touchmove', event => {
    const nextY = event.touches[0].clientY;
    const deltaY = touchLastY - nextY;
    touchLastY = nextY;
    handleDeckInput(deltaY, event);
  }, { passive: false });
}

eventContents.forEach(content => {
  content.addEventListener('scroll', () => {
    if (edgeState.progress > 0 && !isAtContentBoundary(edgeState.direction)) {
      resetEdgeState(true);
    }
  }, { passive: true });
});

dayButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetDay = btn.dataset.day;
    const index = eventCards.findIndex(c => c.dataset.day === targetDay);
    snapToCard(index);
  });
});

window.addEventListener('resize', () => {
  refreshScrollableContent();
  cleanupCards(currentIndex);
});

document.fonts?.ready?.then(refreshScrollableContent);

buildDayPips();
setInitialCardState();
updateDay(currentIndex);
refreshScrollableContent();
createObserverInput() || createFallbackInput();
eventsScroll.addEventListener('wheel', handleWheel, { passive: false });
