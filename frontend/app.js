// ============================================================
// Annsetu — Frontend Logic
// Communicates with our Express backend, renders mandi prices
// ============================================================

const BACKEND_URL = 'http://localhost:3001';

// ---- DOM references ----
const fetchBtn        = document.getElementById('fetchBtn');
const summarySection  = document.getElementById('summarySection');
const tableSection    = document.getElementById('tableSection');
const errorSection    = document.getElementById('errorSection');
const minPriceEl      = document.getElementById('minPrice');
const maxPriceEl      = document.getElementById('maxPrice');
const recordsNoteEl   = document.getElementById('recordsNote');
const tableBody       = document.getElementById('tableBody');
const errorMessageEl  = document.getElementById('errorMessage');

// ---- Helpers ----
function setLoading(isLoading) {
  fetchBtn.disabled = isLoading;
  fetchBtn.classList.toggle('loading', isLoading);
}

function hideAll() {
  summarySection.classList.add('hidden');
  tableSection.classList.add('hidden');
  errorSection.classList.add('hidden');
}

function formatPrice(value) {
  if (!value && value !== 0) return '—';
  return '₹' + Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function showError(message) {
  errorMessageEl.textContent = message || 'An unexpected error occurred. Please try again.';
  errorSection.classList.remove('hidden');
  errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderTable(records) {
  tableBody.innerHTML = '';
  if (!records || records.length === 0) return;

  records.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(row.commodity)}</td>
      <td>${escapeHtml(row.market)}</td>
      <td>${escapeHtml(row.state)}</td>
      <td>${formatPrice(row.minPrice)}</td>
      <td>${formatPrice(row.maxPrice)}</td>
      <td>${formatPrice(row.modalPrice)}</td>
    `;
    tableBody.appendChild(tr);
  });

  tableSection.classList.remove('hidden');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ---- Animate number count-up ----
function animateValue(el, end, duration = 800) {
  const start = 0;
  const startTime = performance.now();

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(start + (end - start) * eased);
    el.textContent = '₹' + current.toLocaleString('en-IN');
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// ---- Main fetch function ----
async function fetchPrices() {
  hideAll();
  setLoading(true);

  try {
    const response = await fetch(`${BACKEND_URL}/api/mandi-prices`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `Server error (${response.status})`);
    }

    const { summary, records } = data;

    // Animate prices into view
    minPriceEl.textContent = '₹0';
    maxPriceEl.textContent = '₹0';
    summarySection.classList.remove('hidden');
    summarySection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    animateValue(minPriceEl, summary.minPrice);
    animateValue(maxPriceEl, summary.maxPrice);

    recordsNoteEl.textContent = `Based on ${summary.totalRecords} market record${summary.totalRecords !== 1 ? 's' : ''} fetched from data.gov.in`;

    renderTable(records);


  } catch (err) {
    console.error('Fetch error:', err);

    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      showError('Cannot connect to the Annsetu backend. Make sure the server is running on port 3001.');
    } else {
      showError(err.message);
    }
  } finally {
    setLoading(false);
  }
}
