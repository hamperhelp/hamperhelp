
// ===========================
// HamperHelp Form Logic JS (Full Logic Included)
// ===========================

// CONFIGURATION
const MAX_LOADS = 5;
let loadCount = 0;
let postalCodes = [];
let selectedLoads = [];
let totalPrice = 0;
let stripe, card;

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

function setMinMaxDate() {
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 14);
  const toYMD = date => date.toISOString().split('T')[0];
  const laterInput = document.getElementById('later-date');
  if (laterInput) {
    laterInput.min = toYMD(today);
    laterInput.max = toYMD(maxDate);
  }
}

function formatDateLabel(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function activatePickupDay(day) {
  // highlight clicked button
  document.querySelectorAll('#pickup-day-buttons button')
          .forEach(b => b.classList.toggle(
            'selected',
            b.id === `btn-${day}`
          ));

  // show only the chosen time group
  document.querySelectorAll('.pickup-btn-group')
          .forEach(g => g.style.display = 'none');
  document.getElementById(`time-${day}`).style.display = 'block';
}


// ========== GOOGLE AUTOCOMPLETE ==========
function initAddressAutocomplete() {
  const input = document.getElementById("address");
  if (input && typeof google !== 'undefined') {
    new google.maps.places.Autocomplete(input, { componentRestrictions: { country: "ca" } });
  }
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
  document.getElementById('section-pickup').style.display = 'block'; // 👈 show pickup section
  document.getElementById('section-payment').style.display = 'block'; // 👈 show payment section
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

  const group = document.getElementById(`time-${type}`);
  document.querySelectorAll('.pickup-btn-group').forEach(div => div.classList.remove('active'));
  group.innerHTML = html;
  group.classList.add('active');
}

// ========== LOAD UI ==========
function addLoad() {
  if (loadCount >= MAX_LOADS) return;
  const container = document.getElementById("load-section");
  const load = document.createElement("div");
  load.className = "load-entry";
  const id = loadCount;
  load.innerHTML = `
    <h4>What are we picking up?</h4>
    <div>
      <button class="btn-basket" onclick="selectOption(${id}, 'basket')">Basket — up to 16 lbs — $30</button>
      <div style="text-align: center; margin: 5px 0;">or</div>
      <button class="btn-hamper" onclick="selectOption(${id}, 'hamper')">Hamper — up to 32 lbs — $50</button>
    </div>
    <h5>Need it in 12 hours?</h5>
    <div>
      <button class="rush-yes" onclick="selectRush(${id}, true)">Yes, I’m in a hurry +$10</button>
      <div style="text-align: center; margin: 5px 0;">or</div>
      <button class="rush-no" onclick="selectRush(${id}, false)">No thanks — 24 hours is fine</button>
    </div>
    <h5>Free Options</h5>
    <label>Fabric Softener: <select><option>Yes</option><option>No</option></select></label>
    <label>Folding Style: <select><option>Standard</option><option>KonMari</option></select></label>
    <h5>Need a Little Aromatherapy?</h5>
    <label>Just 75¢ for scent that turns heads — choose your aroma:
      <select onchange="selectScent(${id}, this.value)">
        <option value="none">None</option>
        <option value="gain">Gain Original</option>
        <option value="island">Island Fresh</option>
      </select>
    </label>
  `;
  container.appendChild(load);
  // Toggle behavior for load buttons
  load.querySelectorAll('button').forEach(btn => btn.addEventListener('click', (e) => {
    const group = btn.parentElement;
    group.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  }));
  selectedLoads.push({ type: null, rush: false, scent: 'none' });
  loadCount++;
  updateLoadButtons();
  updateOrderTotal();
}

function selectOption(index, type) {
  selectedLoads[index].type = type;
  updateOrderTotal();
}

function selectRush(index, rush) {
  selectedLoads[index].rush = rush;
  updateOrderTotal();
}

function selectScent(index, scent) {
  selectedLoads[index].scent = scent;
  updateOrderTotal();
}

function updateOrderTotal() {
  totalPrice = 0;
  selectedLoads.forEach(load => {
    if (load.type === 'basket') totalPrice += 30;
    if (load.type === 'hamper') totalPrice += 50;
    if (load.rush) totalPrice += 10;
    if (load.scent !== 'none') totalPrice += 0.75;
  });
  document.getElementById("order-total").innerText = `Order total: $${totalPrice.toFixed(2)} CAD`;
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

// ========== STRIPE INTEGRATION ==========
function setupStripe() {
  stripe = Stripe("YOUR_PUBLISHABLE_KEY");
  const elements = stripe.elements();
  card = elements.create("card");
  card.mount("#card-element");
}

async function submitOrder() {
  const { paymentMethod, error } = await stripe.createPaymentMethod({
    type: "card",
    card: card,
  });
  if (error) {
    alert(error.message);
  } else {
    document.getElementById("confirmation-message").innerText = "Laundry locked in! One final step — payment complete. Your clean clothes will be back within 24 hours or less.";
  }
}

// ========== INIT ==========

// ========== TOGGLE LOGIC PATCHES ==========
function clearSelected(className, parent) {
  const buttons = parent.querySelectorAll(`.${className}`);
  buttons.forEach(btn => btn.classList.remove('selected'));
}

function selectOption(index, type) {
  selectedLoads[index].type = type;
  const loadDivs = document.querySelectorAll('.load-entry')[index];
  clearSelected('btn-basket', loadDivs);
  clearSelected('btn-hamper', loadDivs);
  if (type === 'basket') loadDivs.querySelector('.btn-basket').classList.add('selected');
  if (type === 'hamper') loadDivs.querySelector('.btn-hamper').classList.add('selected');
  updateOrderTotal();
}

function selectRush(index, rush) {
  selectedLoads[index].rush = rush;
  const loadDivs = document.querySelectorAll('.load-entry')[index];
  clearSelected('rush-yes', loadDivs);
  clearSelected('rush-no', loadDivs);
  if (rush) loadDivs.querySelector('.rush-yes').classList.add('selected');
  else loadDivs.querySelector('.rush-no').classList.add('selected');
  updateOrderTotal();
}
document.addEventListener("DOMContentLoaded", () => {
  fetchPostalCodes();
  updateLiveClock();
  setMinMaxDate();
  initAddressAutocomplete();
  setInterval(updateLiveClock, 60000);

  document.getElementById("btn-today").innerText = `Today (${formatDateLabel(0)})`;
  document.getElementById("btn-tomorrow").innerText = `Tomorrow (${formatDateLabel(1)})`;

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

  document.getElementById("add-load").addEventListener("click", addLoad);
  document.getElementById("submit-order").addEventListener("click", submitOrder);
 
 document.getElementById("btn-today").addEventListener("click", () => {
  activatePickupDay("today");     // 🆕 highlight button + show its time group
  renderPickupWindows("today");   // existing logic that fills the slots
});

  document.getElementById("btn-tomorrow").addEventListener("click", () => {
  activatePickupDay("tomorrow");      // highlight & show group
  renderPickupWindows("tomorrow");    // fill tomorrow slots
});
  // OLD: only showed the div, no highlight
// document.getElementById("btn-later").addEventListener("click", () => {
//   document.getElementById("time-later").classList.add("active");
// });

// NEW: highlight + show + date input
document.getElementById("btn-later").addEventListener("click", () => {
  activatePickupDay("later");
  document.getElementById("later-date").style.display = 'inline-block';
  renderPickupWindows("later");
});

  setupStripe();
  addLoad();
});
