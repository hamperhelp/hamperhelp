// ===========================
// HamperHelp Form Logic JS
// ===========================

// CONFIGURATION
const MAX_LOADS = 5;
let loadCount = 0;
let postalCodes = [];

// ========== UTILITY FUNCTIONS ==========
function formatPostal(raw) {
  const cleaned = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return cleaned.length >= 6 ? cleaned.substring(0, 3) + ' ' + cleaned.substring(3, 6) : cleaned;
}

function formatPhoneNumber(input) {
  const numbers = input.replace(/\D/g, '').substring(0, 10);
  const parts = numbers.match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
  return !parts[2] ? parts[1] : `(${parts[1]}) ${parts[2]}${parts[3] ? '-' + parts[3] : ''}`;
}

// ========== POSTAL CODE CHECK ==========
async function fetchPostalCodes() {
  const res = await fetch("https://cdn.prod.website-files.com/686bbad2da69272b6629d388/686dba9aec30b8edb0a9e7ee_working-postal.csv");
  const text = await res.text();
  postalCodes = text.split(/\r?\n/).map(c => c.trim().toUpperCase().replace(/\s+/g, '')).filter(Boolean);
}

function checkPostalCode() {
  const raw = document.getElementById('postal').value;
  const formatted = formatPostal(raw);
  const cleaned = formatted.replace(/\s+/g, '');
  const msg = document.getElementById('postal-message');
  document.getElementById('postal').value = formatted;

  if (postalCodes.includes(cleaned)) {
    msg.innerHTML = `<strong>Perfect — you're in our service area!</strong> Just a few more steps to laundry bliss.`;
    document.getElementById('section-info').style.display = 'block';
    document.getElementById('section-order').style.display = 'block';
    document.getElementById('section-out-of-range').style.display = 'none';
  } else {
    msg.innerHTML = `<strong>Looks like we’re not in your area yet:</strong> ${formatted}`;
    document.getElementById('notify-postal').value = formatted;
    document.getElementById('section-out-of-range').style.display = 'block';
    document.getElementById('section-info').style.display = 'none';
    document.getElementById('section-order').style.display = 'none';
  }
}

// ========== CLOCK & WINDOW LOGIC ==========
function updateLiveClock() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Toronto" }));
  const label = now.toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit', hour12: true });
  const clock = document.getElementById("live-clock");
  if (clock) clock.innerText = `Current time: ${label}`;
}

function renderPickupWindows(type) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Toronto" }));
  const hours = now.getHours();

  const windows = [
    { label: "8:00 AM – 11:00 AM", start: 8 },
    { label: "4:00 PM – 7:00 PM", start: 16 },
    { label: "9:00 PM – 12:00 AM", start: 21 }
  ];

  let html = "";

  windows.forEach(w => {
    let text = w.label;
    const minsLeft = (w.start * 60) - (hours * 60 + now.getMinutes());

    if (type === 'today' && minsLeft <= 0) {
      html += `<button disabled class="pickup-btn closed">${text} — Closed</button>`;
    } else {
      const countdown = minsLeft > 60 ? `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m` : `${minsLeft}m`;
      const phrase = minsLeft > 60 ? `Plenty of time — ${countdown} left` : `You’re still good — ${countdown}`;
      html += `<button class="pickup-btn">${text}<br><small>${phrase}</small></button>`;
    }
  });

  document.querySelectorAll('.pickup-btn-group').forEach(group => group.style.display = 'none');
  document.getElementById(`time-${type}`).style.display = 'block';
  document.getElementById(`time-${type}`).innerHTML = html;
}

// ========== LOAD UI ==========
function addLoad() {
  if (loadCount >= MAX_LOADS) return;
  const container = document.getElementById("load-section");
  const load = document.createElement("div");
  load.className = "load-entry";
  load.innerHTML = `
    <h4>What are we picking up?</h4>
    <div style="text-align: center">
      <button class="btn-basket">Basket — up to 16 lbs — $30</button>
      <div style="margin: 5px 0;">or</div>
      <button class="btn-hamper">Hamper — up to 32 lbs — $50</button>
    </div>
    <h5>Need it in 12 hours?</h5>
    <div style="text-align: center">
      <button class="rush-yes">Yes, I’m in a hurry +$10</button>
      <div style="margin: 5px 0;">or</div>
      <button class="rush-no">No thanks — 24 hours is fine</button>
    </div>
    <h5>Free Options</h5>
    <label>Fabric Softener: <select><option>Yes</option><option>No</option></select></label>
    <label>Folding Style: <select><option>Standard</option><option>KonMari</option></select></label>
    <h5>Need a Little Aromatherapy?</h5>
    <label>Just 75¢ for scent that turns heads — choose your aroma:
      <select><option>None</option><option>Gain Original</option><option>Island Fresh</option></select>
    </label>
  `;
  container.appendChild(load);
  loadCount++;
  updateLoadButtons();
}

function updateLoadButtons() {
  const btn = document.getElementById("add-load");
  const phrases = [
    "Got a bit more? Go ahead and add another load.",
    "You sure? Alright, add one more.",
    "Laundry day, huh? Let's add another.",
    "Almost done? Toss in one more.",
    "This is the max we can grab in one go."
  ];
  if (loadCount < MAX_LOADS) {
    btn.innerText = phrases[loadCount];
  } else {
    btn.disabled = true;
    btn.innerText = phrases[MAX_LOADS];
  }
}

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", () => {
  fetchPostalCodes();
  updateLiveClock();
  setInterval(updateLiveClock, 60000);

  document.getElementById("postal").addEventListener("input", e => {
    e.target.value = formatPostal(e.target.value);
  });

  document.getElementById("postal").addEventListener("keypress", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      checkPostalCode();
    }
  });

  document.getElementById("check-postal").addEventListener("click", checkPostalCode);

  document.getElementById("phone").addEventListener("input", e => {
    e.target.value = formatPhoneNumber(e.target.value);
  });

  document.getElementById("btn-today").addEventListener("click", () => renderPickupWindows("today"));
  document.getElementById("btn-tomorrow").addEventListener("click", () => renderPickupWindows("tomorrow"));
  document.getElementById("btn-later").addEventListener("click", () => renderPickupWindows("later"));

  addLoad();
  updateLoadButtons();
});
