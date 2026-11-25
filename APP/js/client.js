'use strict';

// Read the existing Firebase configuration loaded before this file.
const firebaseConfig = window.firebaseConfig || {};
const PROJECT_ID = firebaseConfig.projectId || 'malea-by-pf';
const API_KEY = firebaseConfig.apiKey || '';
const COLLECTION_NAME = 'dresses';
// Replace this with the URL of your DEPLOYED reservation Cloud Function.
// Reservation writes must remain server-side; do not write reservation documents directly from this page.

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const STATUS_OPTIONS = ['Available', 'Reserved', 'Borrowed', 'Unavailable'];
const state = {
  dresses: [],
  filtered: [],
  selectedDress: null,
  selectedPhotoIndex: 0,
  selectedPhotos: [],
  loading: false
};
const $ = (id) => document.getElementById(id);

const els = {
  grid: $('dressGrid'), empty: $('emptyState'), count: $('collectionCount'), search: $('searchInput'),
  category: $('categoryFilter'), size: $('sizeFilter'), availability: $('availabilityFilter'),
  detailsModal: $('detailsModal'), bookingModal: $('bookingModal'), toast: $('toast'),
  bookingForm: $('bookingForm'), bookingMessage: $('bookingMessage'), submitReservation: $('submitReservation')
};

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function normalizeText(value) { return String(value ?? '').trim(); }
function asString(value) {
  if (value == null) return '';
  if (typeof value === 'object' && value.stringValue != null) return value.stringValue;
  if (typeof value === 'object' && value.integerValue != null) return String(value.integerValue);
  if (typeof value === 'object' && value.doubleValue != null) return String(value.doubleValue);
  if (typeof value === 'object' && value.booleanValue != null) return String(value.booleanValue);
  return String(value);
}
function readFirestoreValue(value) {
  if (!value || typeof value !== 'object') return value ?? '';
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(readFirestoreValue);
  if ('mapValue' in value) return convertFields(value.mapValue.fields || {});
  return '';
}
function convertFields(fields) {
  const output = {};
  for (const [key, value] of Object.entries(fields || {})) output[key] = readFirestoreValue(value);
  return output;
}
function normalizeStatus(raw) {
  const status = normalizeText(raw).toLowerCase();
  if (status === 'reserved') return 'Reserved';
  if (status === 'borrowed' || status === 'rented') return 'Borrowed';
  if (status === 'unavailable') return 'Unavailable';
  return 'Available';
}
function normalizeDress(doc) {
  const fields = convertFields(doc.fields || {});

  const name = fields.name || fields.dressName || 'Untitled dress';
  const priceValue = fields.price ?? fields.rentalPrice ?? '';

  const image =
    fields.photo ||
    fields.imageUrl ||
    fields.image ||
    fields.photoUrl ||
    fields.imageURL ||
    '';

  const gallerySource =
    fields.photos ||
    fields.images ||
    fields.gallery ||
    fields.imageUrls ||
    fields.additionalPhotos ||
    [];

  const gallery = Array.isArray(gallerySource)
    ? gallerySource.map(item => {
        if (typeof item === 'string') return item;

        if (item && typeof item === 'object') {
          return item.url || item.imageUrl || item.src || '';
        }

        return '';
      }).filter(Boolean)
    : [];

  const imageList = [
    ...new Set([
      ...(typeof image === 'string' ? [image] : []),
      ...gallery
    ])
  ];

  return {
    id: (doc.name || '').split('/').pop(),
    code: String(fields.dressCode || fields.code || fields.dressCodeNumber || (doc.name || '').split('/').pop()),
    name: String(name),
    category: String(fields.category || 'Dress'),
    size: String(fields.size || 'Not specified'),
    price: priceValue,
    color: String(fields.color || 'Not specified'),
    notes: String(fields.notes || fields.description || ''),
    image: typeof image === 'string' ? image : '',
    images: imageList,
    availability: normalizeStatus(fields.availability || fields.status || 'Available'),
    raw: fields
  };
}
function formatPrice(value) {
  if (value === '' || value == null) return 'Ask for price';
  const number = Number(value);
  return Number.isFinite(number) ? `₱${number.toLocaleString('en-PH', { maximumFractionDigits: 2 })}` : escapeHTML(value);
}
function statusClass(status) { return `status-${String(status).toLowerCase()}`; }
function canRequest(dress) { return dress && (dress.availability === 'Available' || dress.availability === 'Reserved'); }
function showToast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove('show'), 3200);
}
function openModal(modal) {
  if (!modal) return;
  modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); document.body.classList.add('modal-open');
}
function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true');
  if (!document.querySelector('.modal.is-open')) document.body.classList.remove('modal-open');
}
function safeImageUrl(url) {
  try { const parsed = new URL(url, window.location.href); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : ''; }
  catch { return ''; }
}
function imageMarkup(dress, className = 'dress-image') {
  const url = safeImageUrl(dress.image);
  return url
    ? `<img class="${className}" src="${escapeHTML(url)}" alt="${escapeHTML(dress.name)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'dress-image-placeholder',textContent:'MALEA'}))">`
    : '<div class="dress-image-placeholder" aria-label="No dress photo available">MALEA</div>';
}
function populateFilter(select, values, label) {
  const previous = select.value || 'all';
  select.innerHTML = `<option value="all">${label}</option>` + values.map(value => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join('');
  select.value = values.includes(previous) ? previous : 'all';
}
function updateFilters() {
  populateFilter(els.category, [...new Set(state.dresses.map(d => d.category).filter(Boolean))].sort((a,b) => a.localeCompare(b)), 'All categories');
  populateFilter(els.size, [...new Set(state.dresses.map(d => d.size).filter(Boolean))].sort((a,b) => a.localeCompare(b)), 'All sizes');
}
function renderDresses() {
  const query = normalizeText(els.search.value).toLowerCase();
  const category = els.category.value;
  const size = els.size.value;
  const availability = els.availability.value;
state.filtered = state.dresses
  .filter(dress => {
    const matchesQuery = [
      dress.name,
      dress.category,
      dress.size,
      dress.color,
      dress.notes
    ].join(' ').toLowerCase().includes(query);

    return matchesQuery &&
      (category === 'all' || dress.category === category) &&
      (size === 'all' || dress.size === size) &&
      (availability === 'all' || dress.availability === availability);
  })
  .sort((a, b) =>
    String(a.name || '').localeCompare(
      String(b.name || ''),
      undefined,
      { numeric: true, sensitivity: 'base' }
    )
  );
  els.count.textContent = `${state.filtered.length} ${state.filtered.length === 1 ? 'dress' : 'dresses'}`;
  els.grid.innerHTML = state.filtered.map(dress => `
    <article class="dress-card" data-dress-details="${escapeHTML(dress.id)}" tabindex="0" role="button" aria-label="View details for ${escapeHTML(dress.name)}">
      <div class="dress-image-wrap">${imageMarkup(dress)} </div>
      <div class="dress-card-body">
        <div class="dress-card-top"><div><span class="dress-category">${escapeHTML(dress.category)}</span><h3>${escapeHTML(dress.name)}</h3></div>
          <button class="availability-pill ${statusClass(dress.availability)}" type="button" data-dress-open="${escapeHTML(dress.id)}" aria-label="View ${escapeHTML(dress.availability)} status and details">${escapeHTML(dress.availability)}</button>
        </div>
        <div class="dress-meta"><span>Size: ${escapeHTML(dress.size)}</span><span>Color: ${escapeHTML(dress.color)}</span></div>
        <div class="dress-card-footer"><div class="dress-price">${formatPrice(dress.price)} <small>${dress.price !== '' && dress.price != null ? '/ rental' : ''}</small></div>
          <button class="button button-primary card-reserve" type="button" data-reserve="${escapeHTML(dress.id)}" ${canRequest(dress) ? '' : 'disabled'}>${canRequest(dress) ? 'Reserve' : 'Not available'}</button>
        </div>
      </div>
    </article>`).join('');
  els.empty.classList.toggle('hidden', state.filtered.length > 0);
  els.grid.classList.toggle('hidden', state.filtered.length === 0);
}
function renderDressGallery() {
  const photoWrap = $('detailsPhotoWrap');
  const photos = state.selectedPhotos;
  const index = state.selectedPhotoIndex;
  const url = photos[index] || '';

  photoWrap.innerHTML = `
    ${
      url
        ? `<img class="details-photo"
             src="${escapeHTML(url)}"
             alt="${escapeHTML(state.selectedDress?.name || 'Dress photo')} - photo ${index + 1}"
             draggable="false">`
        : '<div class="details-photo-placeholder">MALEA</div>'
    }

    <div class="gallery-controls">
      <button type="button"
        class="gallery-arrow"
        data-gallery-prev
        aria-label="Previous photo"
        ${photos.length < 2 ? 'disabled' : ''}>‹</button>

      <button type="button"
        class="gallery-arrow"
        data-gallery-next
        aria-label="Next photo"
        ${photos.length < 2 ? 'disabled' : ''}>›</button>
    </div>

    <span class="gallery-counter">
      ${photos.length ? `${index + 1} / ${photos.length}` : 'No photo'}
    </span>

    <button type="button"
      class="gallery-download"
      data-gallery-download
      ${url ? '' : 'disabled'}>
      ↓ Download photo
    </button>
  `;
}
function findDress(id) { return state.dresses.find(dress => dress.id === id) || null; }
function openDressDetails(dress) {
  state.selectedDress = dress;
  state.selectedPhotos = (dress.images || [dress.image])
  .map(safeImageUrl)
  .filter(Boolean);

if (!state.selectedPhotos.length && safeImageUrl(dress.image)) {
  state.selectedPhotos = [safeImageUrl(dress.image)];
}

state.selectedPhotoIndex = 0;

renderDressGallery();
  if (!dress) return;
  state.selectedDress = dress;
  const photoWrap = $('detailsPhotoWrap');
  photoWrap.innerHTML = imageMarkup(dress, 'details-photo');
  const photo = photoWrap.querySelector('img');
  if (photo) { photo.style.width = '100%'; photo.style.height = '100%'; photo.style.minHeight = '430px'; photo.style.objectFit = 'cover'; }
  $('detailsCategory').textContent = dress.category;
  $('detailsName').textContent = dress.name;
  $('detailsNotes').textContent = dress.notes || 'A lovely choice for your next special occasion.';
  $('detailsPrice').textContent = formatPrice(dress.price);
  $('detailsSize').textContent = dress.size || 'Not specified';
  $('detailsColor').textContent = dress.color || 'Not specified';
  $('detailsAvailability').textContent = dress.availability;
  const statusButton = $('detailsStatus');
  statusButton.textContent = dress.availability;
  statusButton.className = `availability-pill ${statusClass(dress.availability)}`;
  statusButton.setAttribute('aria-label', `Availability status: ${dress.availability}. Availability is checked for your dates.`);
  $('detailsBookingNote').textContent = dress.availability === 'Reserved'
    ? 'This dress has a Reserved status. You may send a request, but the server must verify that your dates do not conflict.'
    : dress.availability === 'Borrowed' || dress.availability === 'Unavailable'
      ? 'This dress cannot currently be reserved. Please choose another dress.'
      : 'Availability is checked against your selected dates when you submit a reservation request.';
  const reserveButton = $('detailsReserve');
  reserveButton.disabled = !canRequest(dress);
  reserveButton.textContent = canRequest(dress) ? 'Reserve this dress' : 'Currently unavailable';
  openModal(els.detailsModal);
}
async function downloadCurrentDressPhoto() {
  const url = state.selectedPhotos[state.selectedPhotoIndex];

  if (!url) return;

  const safeUrl = safeImageUrl(url);

  if (!safeUrl) return;

  const fileName =
    `${(state.selectedDress?.name || 'malea-dress')
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/^-|-$/g, '') || 'malea-dress'}-${state.selectedPhotoIndex + 1}.jpg`;

  try {
    const response = await fetch(safeUrl, { mode: 'cors' });

    if (!response.ok) {
      throw new Error('Photo download failed');
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(objectUrl);

  } catch (error) {
    console.warn('Direct download unavailable:', error);

    const link = document.createElement('a');
    link.href = safeUrl;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener';

    document.body.appendChild(link);
    link.click();
    link.remove();

    showToast(
      'If the photo opens in a new tab, use Save image to download it.'
    );
  }
}
function openBooking(dress) {
  if (!dress || !canRequest(dress)) { showToast('This dress is not currently available to reserve.'); return; }
  state.selectedDress = dress;
  $('bookingDressId').value = dress.id;
  $('bookingSelectedDress').innerHTML = `${escapeHTML(dress.name)} · ${formatPrice(dress.price)}<small>Size ${escapeHTML(dress.size)} · ${escapeHTML(dress.color)} · Status: ${escapeHTML(dress.availability)}</small>`;
  els.bookingMessage.textContent = '';
  els.bookingMessage.className = 'form-message';
  els.bookingForm.reset();
  $('bookingDressId').value = dress.id;
  $('bookingSelectedDress').innerHTML = `${escapeHTML(dress.name)} · ${formatPrice(dress.price)}<small>Size ${escapeHTML(dress.size)} · ${escapeHTML(dress.color)} · Status: ${escapeHTML(dress.availability)}</small>`;
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0,10);
  $('pickupDate').min = localToday;
  $('returnDate').min = localToday;
  closeModal(els.detailsModal);
  openModal(els.bookingModal);
}
async function loadDresses() {
  state.loading = true;
  els.grid.innerHTML = '<div class="loading-state">Preparing the collection…</div>';
  if (!API_KEY || API_KEY.includes('PASTE_')) {
    els.grid.innerHTML = '<div class="loading-state">Add your existing Firebase Web API key in <code>js/client.js</code> to load dresses.</div>';
    els.count.textContent = 'Setup required'; state.loading = false; return;
  }
  try {
    const response = await fetch(`${FIRESTORE_BASE}/${COLLECTION_NAME}?key=${encodeURIComponent(API_KEY)}`);
    if (!response.ok) throw new Error(`Could not load dresses (HTTP ${response.status}). Check your Firebase project settings and Firestore rules.`);
    const data = await response.json();
    state.dresses = (data.documents || []).map(normalizeDress);
    updateFilters(); renderDresses();
    if (!state.dresses.length) { els.grid.innerHTML = '<div class="loading-state">No dresses have been added to the collection yet.</div>'; }
  } catch (error) {
    console.error('Loading dresses failed:', error);
    els.grid.innerHTML = `<div class="loading-state">${escapeHTML(error.message || 'Could not load dresses. Please try again later.')}</div>`;
    els.count.textContent = 'Unable to load';
  } finally { state.loading = false; }
}

function setBookingMessage(message, type = '') {
  els.bookingMessage.textContent = message;
  els.bookingMessage.className = `form-message ${type}`.trim();
}

function makeRequestReference() {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MR-${datePart}-${randomPart}`;
}

function formatRequestDate(value) {
  if (!value) return '—';

  return new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function buildRequestCard(data) {
  const card = document.createElement('section');
  card.className = 'malea-request-card';
  card.id = 'maleaRequestCard';

  card.innerHTML = `
    <div class="mrc-top">
      <div class="mrc-brand">
        MALEA
        <small>DRESS RENTAL</small>
      </div>
      <span class="mrc-status">
        PENDING
        <small>NOT YET CONFIRMED</small>
      </span>
    </div>

    <p class="mrc-eyebrow">RESERVATION REQUEST</p>
    <h2>Send Your Request to Maléa.</h2>

    <p class="mrc-ref">
      Reference: <strong>${escapeHTML(data.reference)}</strong>
    </p>

    <div class="mrc-dress">
      <div>
        <small>SELECTED DRESS</small>
        <strong>${escapeHTML(data.dress.name)}</strong>
        <span>
          ${escapeHTML(data.dress.category)} ·
          Size ${escapeHTML(data.dress.size)} ·
          ${escapeHTML(data.dress.color)}
        </span>
      </div>
      <strong class="mrc-price">
        ${escapeHTML(formatPrice(data.dress.price))}
      </strong>
    </div>

    <div class="mrc-grid">
      <div>
        <small>CUSTOMER NAME</small>
        <strong>${escapeHTML(data.customerName)}</strong>
      </div>

      <div>
        <small>CONTACT NUMBER</small>
        <strong>${escapeHTML(data.customerPhone)}</strong>
      </div>

      ${data.customerEmail ? `
        <div class="mrc-wide">
          <small>EMAIL</small>
          <strong>${escapeHTML(data.customerEmail)}</strong>
        </div>
      ` : ''}

      <div>
        <small>PREFERRED PICKUP</small>
        <strong>${escapeHTML(formatRequestDate(data.pickupDate))}</strong>
      </div>

      <div>
        <small>PREFERRED RETURN</small>
        <strong>${escapeHTML(formatRequestDate(data.returnDate))}</strong>
      </div>

      ${data.notes ? `
        <div class="mrc-wide">
          <small>ADDITIONAL NOTES</small>
          <strong>${escapeHTML(data.notes)}</strong>
        </div>
      ` : ''}
    </div>

    <div class="mrc-warning">
      This is a request only. Your rental dates and dress availability
      must be checked by Maléa. Your reservation is confirmed only
      after Maléa contacts you.
    </div>

    <div class="mrc-footer">
      Thank you for choosing Maléa.
    </div>
  `;

  return card;
}

function showRequestCard(data) {
  const old = document.getElementById('maleaRequestResult');

  if (old) old.remove();

  const result = document.createElement('div');
  result.id = 'maleaRequestResult';
  result.className = 'malea-request-result';

  result.innerHTML = `
    <div class="mrr-heading">
      <p class="eyebrow">REQUEST CARD READY</p>
      <h3>Send your request to Maléa</h3>
      <p>
        Download the card or share it through Messenger.
        Maléa will check your preferred dates and contact you.
      </p>
    </div>

    <div id="maleaRequestCardMount"></div>

    <div class="mrr-actions">
      <button class="button button-primary" type="button" id="downloadRequestCard">
        Download card
      </button>

      <button class="button button-outline" type="button" id="shareRequestCard">
        Share card
      </button>

      <button class="button button-outline" type="button" id="closeRequestCard">
        Close
      </button>
    </div>

    <p class="mrr-hint">
      If sharing is unavailable on your device, download the card image
      and attach it to your Messenger message.
    </p>
  `;

  const card = buildRequestCard(data);

  result.querySelector('#maleaRequestCardMount').appendChild(card);

  els.bookingModal.querySelector('.modal-panel').appendChild(result);
  els.bookingForm.hidden = true;

  result.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });

  const renderCanvas = async () => {
    if (typeof window.html2canvas !== 'function') {
      throw new Error(
        'The card image tool did not load. Please refresh and try again.'
      );
    }

    return window.html2canvas(card, {
      scale: 2,
      backgroundColor: '#fbf8f5',
      useCORS: true
    });
  };

  $('downloadRequestCard').addEventListener('click', async () => {
    const button = $('downloadRequestCard');

    button.disabled = true;
    button.textContent = 'Preparing…';

    try {
      const canvas = await renderCanvas();
      const link = document.createElement('a');

      link.download = `${data.reference}-MALEA-REQUEST.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

    } catch (error) {
      setBookingMessage(error.message, 'error');

    } finally {
      button.disabled = false;
      button.textContent = 'Download card';
    }
  });

  $('shareRequestCard').addEventListener('click', async () => {
    const button = $('shareRequestCard');

    button.disabled = true;
    button.textContent = 'Preparing…';

    try {
      const canvas = await renderCanvas();

      const blob = await new Promise(resolve =>
        canvas.toBlob(resolve, 'image/png')
      );

      if (!blob) {
        throw new Error('Unable to prepare the request card image.');
      }

      const file = new File(
        [blob],
        `${data.reference}-MALEA-REQUEST.png`,
        { type: 'image/png' }
      );

      if (
        navigator.canShare &&
        navigator.canShare({ files: [file] }) &&
        navigator.share
      ) {
        await navigator.share({
          title: 'Maléa Reservation Request',
          text: `Reservation request ${data.reference} — pending confirmation.`,
          files: [file]
        });

      } else {
        const link = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);

        link.download = file.name;
        link.href = objectUrl;
        link.click();

        URL.revokeObjectURL(objectUrl);

        showToast('Card downloaded. Attach it to your Messenger message.');
      }

    } catch (error) {
      if (error.name !== 'AbortError') {
        setBookingMessage(
          error.message || 'Unable to share the card.',
          'error'
        );
      }

    } finally {
      button.disabled = false;
      button.textContent = 'Share card';
    }
  });

  $('closeRequestCard').addEventListener('click', () => {
    result.remove();
    els.bookingForm.hidden = false;
    closeModal(els.bookingModal);
  });
}

function submitReservation(event) {
  event.preventDefault();

  const dress = findDress($('bookingDressId').value);

  if (!dress) {
    setBookingMessage('Please choose a dress again.', 'error');
    return;
  }

  const pickupDate = $('pickupDate').value;
  const returnDate = $('returnDate').value;

  if (!pickupDate || !returnDate || returnDate < pickupDate) {
    setBookingMessage(
      'Please select valid pickup and return dates. The return date must be on or after pickup.',
      'error'
    );
    return;
  }

  const customerName = normalizeText($('customerName').value);
  const customerPhone = normalizeText($('customerPhone').value);

  if (!customerName || !customerPhone) {
    setBookingMessage(
      'Please enter your name and contact number.',
      'error'
    );
    return;
  }

  const data = {
    reference: makeRequestReference(),
    dress,
    customerName,
    customerPhone,
    customerEmail: normalizeText($('customerEmail').value),
    pickupDate,
    returnDate,
    notes: normalizeText($('reservationNotes').value)
  };

  setBookingMessage(
    'Your request card is ready. Please send it to Maléa for availability checking.',
    'success'
  );

  showRequestCard(data);
}

function formatCardDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-PH', { day: '2-digit', month: 'long', year: 'numeric' });
}

function drawBookingCard(booking) {
  const canvas = $('bookingCardCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 1080;
  const H = 1350;
  canvas.width = W;
  canvas.height = H;

  ctx.fillStyle = '#F8F3ED';
  ctx.fillRect(0, 0, W, H);

  // Fine editorial frame and subtle ornamental rules.
  ctx.strokeStyle = '#D8C5B9';
  ctx.lineWidth = 3;
  ctx.strokeRect(42, 42, W - 84, H - 84);
  ctx.strokeStyle = '#E5D8CF';
  ctx.lineWidth = 1;
  ctx.strokeRect(60, 60, W - 120, H - 120);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#642536';
  ctx.font = '500 68px "Playfair Display", Georgia, serif';
  ctx.fillText('MALEA', W / 2, 160);
  ctx.fillStyle = '#927A70';
  ctx.font = '600 19px "DM Sans", Arial, sans-serif';
  ctx.letterSpacing = '7px';
  ctx.fillText('BY PF  ·  DRESS RENTAL', W / 2, 202);
  ctx.letterSpacing = '0px';

  ctx.strokeStyle = '#D8C5B9';
  ctx.beginPath(); ctx.moveTo(150, 245); ctx.lineTo(930, 245); ctx.stroke();

  ctx.fillStyle = '#642536';
  ctx.font = '500 54px "Playfair Display", Georgia, serif';
  ctx.fillText('Booking Request', W / 2, 330);
  ctx.fillStyle = '#927A70';
  ctx.font = '600 18px "DM Sans", Arial, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('AWAITING CONFIRMATION', W / 2, 375);
  ctx.letterSpacing = '0px';

  // Booking reference panel.
  ctx.fillStyle = '#EFE5DD';
  ctx.fillRect(125, 420, 830, 145);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#927A70';
  ctx.font = '600 18px "DM Sans", Arial, sans-serif';
  ctx.fillText('BOOKING CODE', 165, 465);
  ctx.fillStyle = '#642536';
  ctx.font = '600 43px "DM Sans", Arial, sans-serif';
  ctx.fillText(booking.bookingCode || '—', 165, 525);

  const left = 155;
  const right = 925;
  let y = 635;
  const label = (text, x, yy) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#927A70';
    ctx.font = '600 16px "DM Sans", Arial, sans-serif';
    ctx.fillText(text.toUpperCase(), x, yy);
  };
  const value = (text, x, yy, maxWidth=760, font='500 27px "DM Sans", Arial, sans-serif') => {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#392B2D';
    ctx.font = font;
    const words = String(text || '—').split(/\s+/);
    let line = '';
    let lineY = yy;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, lineY);
        line = word;
        lineY += 36;
      } else line = test;
    }
    if (line) ctx.fillText(line, x, lineY);
    return lineY;
  };
  const rule = (yy) => {
    ctx.strokeStyle = '#E1D3CA';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left, yy); ctx.lineTo(right, yy); ctx.stroke();
  };

  label('The dress', left, y);
  y += 42;
  y = value(booking.dressName, left, y, 770, '500 34px "Playfair Display", Georgia, serif') + 42;
  value(`Price: ${formatPrice(booking.price)}`, left, y, 770, '600 25px "DM Sans", Arial, sans-serif');
  y += 42;
  value(`Size: ${booking.dressSize || '—'}     Color: ${booking.dressColor || '—'}`, left, y, 770, '500 21px "DM Sans", Arial, sans-serif');
  y += 30;
  rule(y); y += 48;

  label('Client information', left, y); y += 42;
  value(booking.clientName, left, y, 770, '500 28px "DM Sans", Arial, sans-serif'); y += 43;
  value(booking.contactNumber, left, y, 770, '400 23px "DM Sans", Arial, sans-serif'); y += 30;
  rule(y); y += 48;

  label('Booking details', left, y); y += 42;
  value(`Booking Date: ${formatCardDate(booking.bookingDate)}`, left, y, 770, '500 22px "DM Sans", Arial, sans-serif'); y += 42;
  value(`Rental Period: ${formatCardDate(booking.pickupDate)} – ${formatCardDate(booking.returnDate)}`, left, y, 770, '400 20px "DM Sans", Arial, sans-serif');

  ctx.strokeStyle = '#D8C5B9';
  ctx.beginPath(); ctx.moveTo(150, 1135); ctx.lineTo(930, 1135); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#642536';
  ctx.font = '600 21px "DM Sans", Arial, sans-serif';
  ctx.fillText('Please send this booking reference to any MALEA', W / 2, 1190);
  ctx.fillText('page or account for confirmation.', W / 2, 1225);
  ctx.fillStyle = '#927A70';
  ctx.font = 'italic 22px "Playfair Display", Georgia, serif';
  ctx.fillText('A little moment, a beautiful look.', W / 2, 1280);
}

function showBookingConfirmation(booking) {
  const modal = $('bookingConfirmationModal');
  if (!modal) return;
  drawBookingCard(booking);
  openModal(modal);
}

async function downloadBookingCard() {
  const canvas = $('bookingCardCanvas');
  if (!canvas) return;
  const fileCode = ($('bookingCardCode')?.textContent || 'MALEA-booking')
    .replace(/[^a-z0-9-_]/gi, '-');
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    showToast('Unable to prepare the booking card. Please try again.');
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileCode}-booking-request.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}


async function submitReservation(event) {
  event.preventDefault();

  const dress = findDress($('bookingDressId').value);

  if (!dress) {
    setBookingMessage('Please choose a dress again.', 'error');
    return;
  }

  const pickupDate = $('pickupDate').value;
  const returnDate = $('returnDate').value;
  const customerName = normalizeText($('customerName').value);
  const customerPhone = normalizeText($('customerPhone').value);
  const customerEmail = normalizeText($('customerEmail').value);
  const notes = normalizeText($('reservationNotes').value);

  if (!pickupDate || !returnDate || returnDate < pickupDate) {
    setBookingMessage(
      'Please select valid pickup and return dates.',
      'error'
    );
    return;
  }

  if (!customerName || !customerPhone) {
    setBookingMessage(
      'Please enter your name and contact number.',
      'error'
    );
    return;
  }

  const reference =
    'MR-' +
    new Date().toISOString().slice(2, 10).replace(/-/g, '') +
    '-' +
    Math.random().toString(36).substring(2, 6).toUpperCase();

  const formatDate = (date) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const card = document.createElement('div');
  card.id = 'maleaRequestCard';
  card.className = 'malea-request-card';

  card.innerHTML = `
    <div class="mrc-top">
      <div class="mrc-brand">
        MALEA
        <small>BY PF · DRESS RENTAL</small>
      </div>
      <span class="mrc-status">
        PENDING
        <small>NOT YET CONFIRMED</small>
      </span>
    </div>

    <p class="mrc-eyebrow">RESERVATION REQUEST</p>
    <h2>Your special moment starts here.</h2>

    <p class="mrc-ref">
      Reference: <strong>${escapeHTML(reference)}</strong>
    </p>

    <div class="mrc-dress">
      <div>
        <small>SELECTED DRESS</small>
        <strong>${escapeHTML(dress.name)}</strong>
        <span>
          ${escapeHTML(dress.category)} ·
          Size ${escapeHTML(dress.size)} ·
          ${escapeHTML(dress.color)}
        </span>
      </div>
      <strong class="mrc-price">${formatPrice(dress.price)}</strong>
    </div>

    <div class="mrc-grid">
      <div>
        <small>CUSTOMER NAME</small>
        <strong>${escapeHTML(customerName)}</strong>
      </div>

      <div>
        <small>CONTACT NUMBER</small>
        <strong>${escapeHTML(customerPhone)}</strong>
      </div>

      ${customerEmail ? `
        <div class="mrc-wide">
          <small>EMAIL</small>
          <strong>${escapeHTML(customerEmail)}</strong>
        </div>
      ` : ''}

      <div>
        <small>PREFERRED PICKUP</small>
        <strong>${formatDate(pickupDate)}</strong>
      </div>

      <div>
        <small>PREFERRED RETURN</small>
        <strong>${formatDate(returnDate)}</strong>
      </div>

      ${notes ? `
        <div class="mrc-wide">
          <small>ADDITIONAL NOTES</small>
          <strong>${escapeHTML(notes)}</strong>
        </div>
      ` : ''}
    </div>

    <div class="mrc-warning">
      This is a reservation request only. Your preferred dates and
      dress availability must be checked by Maléa. Your reservation
      is confirmed only after Maléa contacts you.
    </div>

    <div class="mrc-footer">
      Thank you for choosing Maléa by PF.
    </div>
  `;

  const modalPanel = els.bookingModal.querySelector('.modal-panel');

  if (!modalPanel) {
    setBookingMessage('Unable to display the request card.', 'error');
    return;
  }

  document.getElementById('maleaRequestResult')?.remove();

  const result = document.createElement('div');
  result.id = 'maleaRequestResult';
  result.className = 'malea-request-result';

  result.innerHTML = `
    <div class="mrr-heading">
      <p class="eyebrow">REQUEST CARD READY</p>
      <h3>Send Your Request to Maléa</h3>
      <p>Download your card and send it to Maléa through Messenger, TikTok, or Instagram.</p>
    </div>

    <div id="maleaRequestCardMount"></div>

    <div class="mrr-actions">
   

      <button type="button" class="button button-outline" id="shareRequestCard">
        Download/Share
      </button>

      <button type="button" class="button button-outline" id="closeRequestCard">
        Close
      </button>
    </div>

    <p class="mrr-hint">
      Please send this card to Maléa so we can check your requested dates.
    </p>
  `;

  result.querySelector('#maleaRequestCardMount').appendChild(card);

  els.bookingForm.hidden = true;
  modalPanel.appendChild(result);

  result.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });

  async function createCardImage() {
    if (typeof window.html2canvas !== 'function') {
      throw new Error('Card image library not loaded. Please refresh the page.');
    }

    return await window.html2canvas(card, {
      scale: 2,
      backgroundColor: '#fbf8f5'
    });
  }

  $('downloadRequestCard').addEventListener('click', async () => {
    try {
      const canvas = await createCardImage();
      const link = document.createElement('a');

      link.download = `${reference}-MALEA-REQUEST.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

    } catch (error) {
      setBookingMessage(error.message, 'error');
    }
  });

  $('shareRequestCard').addEventListener('click', async () => {
    try {
      const canvas = await createCardImage();

      const blob = await new Promise(resolve =>
        canvas.toBlob(resolve, 'image/png')
      );

      if (!blob) throw new Error('Unable to prepare card image.');

      const file = new File(
        [blob],
        `${reference}-MALEA-REQUEST.png`,
        { type: 'image/png' }
      );

      if (navigator.share && navigator.canShare &&
          navigator.canShare({ files: [file] })) {

        await navigator.share({
          title: 'Maléa Reservation Request',
          text: `Reservation request ${reference} - Pending confirmation.`,
          files: [file]
        });

      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = file.name;
        link.click();

        URL.revokeObjectURL(url);
        showToast('Card downloaded. You can attach it to Messenger.');
      }

    } catch (error) {
      if (error.name !== 'AbortError') {
        setBookingMessage(error.message, 'error');
      }
    }
  });

  $('closeRequestCard').addEventListener('click', () => {
    result.remove();
    els.bookingForm.hidden = false;
    closeModal(els.bookingModal);
  });

  setBookingMessage('Your reservation request card is ready.', 'success');
}

function clearFilters() {
  els.search.value = ''; els.category.value = 'all'; els.size.value = 'all'; els.availability.value = 'all'; renderDresses();
}
function closeOnEscape(event) {
  if (event.key === 'Escape') { closeModal(els.detailsModal); closeModal(els.bookingModal); }
}




document.addEventListener('DOMContentLoaded', () => {
  $('currentYear').textContent = new Date().getFullYear();

  // Search and filters
  els.search.addEventListener('input', renderDresses);

  [els.category, els.size, els.availability].forEach(select =>
    select.addEventListener('change', renderDresses)
  );

  $('clearFilters').addEventListener('click', clearFilters);

  // Dress card click: open details or reservation
  els.grid.addEventListener('click', event => {
    const reserveButton = event.target.closest('[data-reserve]');

    if (reserveButton) {
      event.stopPropagation();
      openBooking(findDress(reserveButton.dataset.reserve));
      return;
    }

    const detailsTrigger = event.target.closest('[data-dress-open]');

    if (detailsTrigger) {
      event.stopPropagation();
      openDressDetails(findDress(detailsTrigger.dataset.dressOpen));
      return;
    }

    const card = event.target.closest('[data-dress-details]');

    if (card) {
      openDressDetails(findDress(card.dataset.dressDetails));
    }
  });

  // Keyboard support for dress cards
  els.grid.addEventListener('keydown', event => {
    if (
      (event.key === 'Enter' || event.key === ' ') &&
      event.target.matches('[data-dress-details]')
    ) {
      event.preventDefault();
      openDressDetails(findDress(event.target.dataset.dressDetails));
    }
  });

  // Dress gallery: previous, next, and download buttons
  const photoWrap = $('detailsPhotoWrap');

  photoWrap.addEventListener('click', event => {
    if (
      event.target.closest('[data-gallery-prev]') &&
      state.selectedPhotos.length > 1
    ) {
      state.selectedPhotoIndex =
        (state.selectedPhotoIndex - 1 + state.selectedPhotos.length) %
        state.selectedPhotos.length;

      renderDressGallery();

    } else if (
      event.target.closest('[data-gallery-next]') &&
      state.selectedPhotos.length > 1
    ) {
      state.selectedPhotoIndex =
        (state.selectedPhotoIndex + 1) % state.selectedPhotos.length;

      renderDressGallery();

    } else if (event.target.closest('[data-gallery-download]')) {
      downloadCurrentDressPhoto();
    }
  });

  // Swipe support for mobile devices
  let galleryTouchStartX = 0;

  photoWrap.addEventListener('touchstart', event => {
    galleryTouchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  photoWrap.addEventListener('touchend', event => {
    if (state.selectedPhotos.length < 2) return;

    const deltaX =
      event.changedTouches[0].clientX - galleryTouchStartX;

    if (Math.abs(deltaX) < 45) return;

    state.selectedPhotoIndex = deltaX < 0
      ? (state.selectedPhotoIndex + 1) % state.selectedPhotos.length
      : (state.selectedPhotoIndex - 1 + state.selectedPhotos.length) %
        state.selectedPhotos.length;

    renderDressGallery();
  }, { passive: true });

  // Close dress details modal
  $('closeDetails').addEventListener('click', () =>
    closeModal(els.detailsModal)
  );

  document.querySelectorAll('[data-close-details]').forEach(node =>
    node.addEventListener('click', () => closeModal(els.detailsModal))
  );

  // Reserve from dress details
  $('detailsReserve').addEventListener('click', () =>
    openBooking(state.selectedDress)
  );

  $('detailsStatus').addEventListener('click', () => {
    $('detailsBookingNote').textContent =
      `Current status: ${state.selectedDress?.availability || 'Unknown'}. Final availability is checked against your requested dates by the reservation service.`;
  });

  // Booking modal
  $('closeBooking').addEventListener('click', () =>
    closeModal(els.bookingModal)
  );

  document.querySelectorAll('[data-close-booking]').forEach(node =>
    node.addEventListener('click', () => closeModal(els.bookingModal))
  );

  els.bookingForm.addEventListener('submit', submitReservation);
  $('downloadBookingCard').addEventListener('click', downloadBookingCard);
  $('closeBookingConfirmation').addEventListener('click', () =>
    closeModal($('bookingConfirmationModal'))
  );
  $('bookingConfirmationDone').addEventListener('click', () =>
    closeModal($('bookingConfirmationModal'))
  );
  $('bookingConfirmationModal').querySelectorAll('[data-close-booking-confirmation]').forEach(node =>
    node.addEventListener('click', () => closeModal($('bookingConfirmationModal')))
  );

  // Pickup and return date validation
  $('pickupDate').addEventListener('change', () => {
    $('returnDate').min =
      $('pickupDate').value || $('returnDate').min;

    if (
      $('returnDate').value &&
      $('returnDate').value < $('pickupDate').value
    ) {
      $('returnDate').value = '';
    }
  });

  // Close modal using Escape key
  document.addEventListener('keydown', closeOnEscape);

  // Mobile navigation
  const menuToggle = $('menuToggle');

  menuToggle.addEventListener('click', () => {
    const open = $('mainNav').classList.toggle('is-open');

    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute(
      'aria-label',
      open ? 'Close navigation' : 'Open navigation'
    );
  });

  document.querySelectorAll('#mainNav a').forEach(link =>
    link.addEventListener('click', () => {
      $('mainNav').classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    })
  );

  // Load dresses from Firestore
  loadDresses();
});



