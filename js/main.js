// ── Elements ──
const dayButtons = document.querySelectorAll('.day-btn');
const eventCards = document.querySelectorAll('.event-card');
const eventsScroll = document.querySelector('.events-scroll');

// ── State ──
let currentIndex = 0;
let isSnapping = false;
const SNAP_COOLDOWN = 600;

function updateDay(index) {
  const newDay = eventCards[index].dataset.day;
  dayButtons.forEach(b => b.classList.toggle('active', b.dataset.day === newDay));
  if (typeof highlightDay === 'function') {
    highlightDay(newDay);
  }
}

function snapToCard(index) {
  if (index < 0 || index >= eventCards.length || isSnapping) return;
  isSnapping = true;
  currentIndex = index;
  eventCards[index].classList.add('visible');
  eventCards[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
  updateDay(index);
  setTimeout(() => { isSnapping = false; }, SNAP_COOLDOWN);
}

// ── Check if current card is at its scroll boundary ──
function atCardBoundary(direction) {
  const card = eventCards[currentIndex];
  const cardTop = card.offsetTop;
  const cardHeight = card.offsetHeight;
  const scrollTop = eventsScroll.scrollTop;
  const viewHeight = eventsScroll.clientHeight;

  if (direction > 0) {
    // At bottom of card?
    return scrollTop + viewHeight >= cardTop + cardHeight - 2;
  } else {
    // At top of card?
    return scrollTop <= cardTop + 2;
  }
}

// ── Wheel: native scroll within card, snap at boundaries ──
let boundaryAccum = 0;
const BOUNDARY_THRESHOLD = 80;
let boundaryTimer;

eventsScroll.addEventListener('wheel', (e) => {
  if (isSnapping) {
    e.preventDefault();
    return;
  }

  const direction = e.deltaY > 0 ? 1 : -1;

  if (atCardBoundary(direction)) {
    // At the edge — accumulate toward a snap
    e.preventDefault();
    boundaryAccum += Math.abs(e.deltaY);

    if (boundaryAccum >= BOUNDARY_THRESHOLD) {
      boundaryAccum = 0;
      snapToCard(currentIndex + direction);
    }

    clearTimeout(boundaryTimer);
    boundaryTimer = setTimeout(() => { boundaryAccum = 0; }, 200);
  } else {
    // Not at edge — allow normal scroll
    boundaryAccum = 0;
  }
}, { passive: false });

// ── Touch: native scroll within card, snap at boundaries ──
let touchStartY = 0;

eventsScroll.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

eventsScroll.addEventListener('touchend', (e) => {
  if (isSnapping) return;
  const deltaY = touchStartY - e.changedTouches[0].clientY;
  const direction = deltaY > 0 ? 1 : -1;

  if (atCardBoundary(direction) && Math.abs(deltaY) > 50) {
    snapToCard(currentIndex + direction);
  }
}, { passive: true });

// ── Track current card during free scroll ──
eventsScroll.addEventListener('scroll', () => {
  if (isSnapping) return;
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
    if (index !== -1) {
      isSnapping = false;
      snapToCard(index);
    }
  });
});

// ── Init ──
eventCards[0].classList.add('visible');
