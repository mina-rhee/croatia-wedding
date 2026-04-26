// ── Elements ──
const dayButtons = document.querySelectorAll('.day-btn');
const eventCards = document.querySelectorAll('.event-card');
const eventsScroll = document.querySelector('.events-scroll');

// ── State ──
let currentIndex = 0;
let isSnapping = false;
let snapTween = null;
let suppressScrollUntil = 0;

function updateDay(index) {
  const card = eventCards[index];
  const newDay = card.dataset.day;
  const locationName = card.dataset.location || '';
  dayButtons.forEach(b => b.classList.toggle('active', b.dataset.day === newDay));
  if (typeof highlightMarker === 'function') {
    highlightMarker(locationName);
  }
}

function snapToCard(index) {
  if (index < 0 || index >= eventCards.length || isSnapping) return;
  isSnapping = true;
  currentIndex = index;
  updateDay(index);

  // Show the card immediately so it's visible during the scroll animation.
  // The CSS entrance transition is suppressed here; free-scroll triggers it naturally.
  const card = eventCards[index];
  card.style.transition = 'none';
  card.classList.add('visible');
  card.offsetHeight;
  card.style.transition = '';

  const targetY = card.offsetTop;
  if (snapTween) snapTween.kill();
  snapTween = gsap.to(eventsScroll, {
    scrollTop: targetY,
    duration: 0.65,
    ease: 'power2.out',
    onComplete: () => {
      eventsScroll.scrollTop = targetY;
      suppressScrollUntil = performance.now() + 150;
      isSnapping = false;
      snapTween = null;
      boundaryAccum = 0;
    }
  });
}

// ── Check if current card is at its scroll boundary ──
function atCardBoundary(direction) {
  const card = eventCards[currentIndex];
  const cardTop = card.offsetTop;
  const cardHeight = card.offsetHeight;
  const scrollTop = eventsScroll.scrollTop;
  const viewHeight = eventsScroll.clientHeight;

  if (direction > 0) {
    return scrollTop + viewHeight >= cardTop + cardHeight - 2;
  } else {
    return scrollTop <= cardTop + 2;
  }
}

// ── Wheel: native scroll within card, snap at boundaries ──
let boundaryAccum = 0;
const BOUNDARY_THRESHOLD = 25;
let boundaryTimer;

eventsScroll.addEventListener('wheel', (e) => {
  if (isSnapping || snapTween?.isActive() || performance.now() < suppressScrollUntil) {
    e.preventDefault();
    return;
  }

  const direction = e.deltaY > 0 ? 1 : -1;

  if (atCardBoundary(direction)) {
    e.preventDefault();
    boundaryAccum += Math.abs(e.deltaY);

    if (boundaryAccum >= BOUNDARY_THRESHOLD) {
      boundaryAccum = 0;
      snapToCard(currentIndex + direction);
    }

    clearTimeout(boundaryTimer);
    boundaryTimer = setTimeout(() => { boundaryAccum = 0; }, 200);
  } else {
    boundaryAccum = 0;
  }
}, { passive: false });

// ── Touch: native scroll within card, snap at boundaries ──
let touchStartY = 0;
let touchLastY = 0;

eventsScroll.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
  touchLastY = touchStartY;
}, { passive: true });

eventsScroll.addEventListener('touchmove', (e) => {
  touchLastY = e.touches[0].clientY;
}, { passive: true });

eventsScroll.addEventListener('touchend', () => {
  if (isSnapping) return;
  const delta = touchStartY - touchLastY;
  if (Math.abs(delta) < 30) return;
  const direction = delta > 0 ? 1 : -1;
  if (atCardBoundary(direction)) {
    snapToCard(currentIndex + direction);
  }
}, { passive: true });

// ── Track current card during free scroll ──
eventsScroll.addEventListener('scroll', () => {
  if (typeof map !== 'undefined') map.closePopup();

  if (isSnapping || performance.now() < suppressScrollUntil) {
    const targetY = eventCards[currentIndex].offsetTop;
    if (Math.abs(eventsScroll.scrollTop - targetY) > 1) {
      eventsScroll.scrollTop = targetY;
    }
    return;
  }
  const scrollTop = eventsScroll.scrollTop;
  const viewHeight = eventsScroll.clientHeight;

  for (let i = eventCards.length - 1; i >= 0; i--) {
    if (scrollTop >= eventCards[i].offsetTop - viewHeight * 0.3) {
      if (i !== currentIndex) {
        currentIndex = i;
        eventCards[i].classList.add('visible');
        updateDay(i);
      }
      break;
    }
  }
}, { passive: true });

// ── Day Navigation Click ──
dayButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetDay = btn.dataset.day;
    const index = [...eventCards].findIndex(c => c.dataset.day === targetDay);
    if (index === -1 || index === currentIndex) return;
    if (snapTween) snapTween.kill();
    isSnapping = true;
    currentIndex = index;
    updateDay(index);

    const tl = gsap.timeline({
      onComplete: () => {
        isSnapping = false;
        snapTween = null;
        boundaryAccum = 0;
      }
    });
    tl.to(eventsScroll, { opacity: 0, duration: 0.18, ease: 'power1.in' });
    tl.add(() => {
      eventsScroll.scrollTop = eventCards[index].offsetTop;
      eventCards[index].classList.add('visible');
    });
    tl.to(eventsScroll, { opacity: 1, duration: 0.28, ease: 'power1.out' });
    snapTween = tl;
  });
});

// ── Init ──
eventCards[0].classList.add('visible');
