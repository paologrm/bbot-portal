const SUPABASE_URL = 'https://opgvmgydbhjapergjoks.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZ3ZtZ3lkYmhqYXBlcmdqb2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTE4OTgsImV4cCI6MjA5MDUyNzg5OH0.rpo16CEJJORXOhqOY2dRljGsW5aWiT6Gu4CGlCnvjbQ';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentProperty = null;
let restaurants = [];
let monuments = [];
let externalUrls = [];

// AUTH
document.getElementById('login-btn').addEventListener('click', handleLogin);
document.getElementById('login-password').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') handleLogin();
});

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    errEl.textContent = 'Credenziali non valide. Riprova.';
    errEl.style.display = 'block';
    return;
  }
  loadApp();
}

document.getElementById('logout-btn').addEventListener('click', async function() {
  await sb.auth.signOut();
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
});

async function checkSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) loadApp();
}

async function loadApp() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('account-email').textContent = user.email;

  const { data: props } = await sb.from('properties').select('*').limit(1);
  if (props && props.length > 0) {
    currentProperty = props[0];
    loadPropertyData();
  }
  loadGuests();
  loadChatList();
}

function loadPropertyData() {
  if (!currentProperty) return;
  const p = currentProperty;
  document.getElementById('property-name-sidebar').textContent = p.name || 'La tua struttura';
  ['wifi_name','wifi_password','checkin_time','checkout_time','parking','transport','bike_rental','heating_ac','garbage','emergency_phone'].forEach(function(field) {
    var el = document.getElementById(field);
    if (el) el.value = p[field] || '';
  });
  renderRestaurants(p.restaurants || []);
  renderMonuments(p.monuments || []);
  renderUrls(p.external_urls || []);
  var days = p.bot_active_days_before || 0;
  document.getElementById('early-bot-toggle').checked = days > 0;
  document.getElementById('bot_active_days_before').value = days || 15;
  document.getElementById('early-bot-days').style.display = days > 0 ? 'block' : 'none';
  document.getElementById('tg-chat-id-label').textContent = p.host_telegram_chat_id || 'Non configurato';
  document.getElementById('wa-number-label').textContent = p.host_whatsapp || 'Non configurato';
}

// NAVIGATION
document.querySelectorAll('.nav-item').forEach(function(item) {
  item.addEventListener('click', function() {
    var page = this.getAttribute('data-page');
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
    document.getElementById('page-' + page).classList.add('active');
    item.classList.add('active');
  });
});

// STRUTTURA
document.getElementById('save-struttura').addEventListener('click', saveStruttura);

async function saveStruttura() {
  if (!currentProperty) return showToast('Nessuna struttura trovata', 'error');
  var fields = ['wifi_name','wifi_password','checkin_time','checkout_time','parking','transport','bike_rental','heating_ac','garbage','emergency_phone'];
  var updates = {};
  fields.forEach(function(f) { updates[f] = document.getElementById(f).value; });
  var result = await sb.from('properties').update(updates).eq('id', currentProperty.id);
  if (result.error) return showToast('Errore nel salvataggio', 'error');
  Object.assign(currentProperty, updates);
  showToast('Informazioni salvate ✓', 'success');
}

// RESTAURANTS
function renderRestaurants(list) {
  restaurants = list;
  var el = document.getElementById('restaurants-list');
  el.innerHTML = list.map(function(r, i) {
    return '<div class="list-item"><div class="list-item-body"><div class="list-item-name">' + escHtml(r.name) + ' <span style="color:var(--text3);font-size:0.8rem">' + escHtml(r.type || '') + '</span></div><div class="list-item-desc">' + escHtml(r.desc || '') + '</div></div><button class="btn btn-danger" data-idx="' + i + '" data-type="restaurant">✕</button></div>';
  }).join('');
  el.querySelectorAll('[data-type="restaurant"]').forEach(function(btn) {
    btn.addEventListener('click', function() { restaurants.splice(parseInt(this.getAttribute('data-idx')), 1); renderRestaurants(restaurants); });
  });
}

document.getElementById('add-restaurant').addEventListener('click', function() {
  var name = document.getElementById('rest-name').value.trim();
  var type = document.getElementById('rest-type').value.trim();
  var desc = document.getElementById('rest-desc').value.trim();
  if (!name) return;
  restaurants.push({ name: name, type: type, desc: desc });
  renderRestaurants(restaurants);
  ['rest-name','rest-type','rest-desc'].forEach(function(id) { document.getElementById(id).value = ''; });
});

// MONUMENTS
function renderMonuments(list) {
  monuments = list;
  var el = document.getElementById('monuments-list');
  el.innerHTML = list.map(function(m, i) {
    return '<div class="list-item"><div class="list-item-body"><div class="list-item-name">' + escHtml(m.name) + ' <span style="color:var(--text3);font-size:0.8rem">' + escHtml(m.cat || '') + '</span></div><div class="list-item-desc">' + escHtml(m.desc || '') + '</div></div><button class="btn btn-danger" data-idx="' + i + '" data-type="monument">✕</button></div>';
  }).join('');
  el.querySelectorAll('[data-type="monument"]').forEach(function(btn) {
    btn.addEventListener('click', function() { monuments.splice(parseInt(this.getAttribute('data-idx')), 1); renderMonuments(monuments); });
  });
}

document.getElementById('add-monument').addEventListener('click', function() {
  var name = document.getElementById('mon-name').value.trim();
  var cat = document.getElementById('mon-cat').value.trim();
  var desc = document.getElementById('mon-desc').value.trim();
  if (!name) return;
  monuments.push({ name: name, cat: cat, desc: desc });
  renderMonuments(monuments);
  ['mon-name','mon-cat','mon-desc'].forEach(function(id) { document.getElementById(id).value = ''; });
});

// URLS
function renderUrls(list) {
  externalUrls = list;
  var el = document.getElementById('urls-list');
  el.innerHTML = list.map(function(u, i) {
    return '<div class="url-item"><span>🔗</span><div style="flex:1"><div class="url-item-name">' + escHtml(u.name) + '</div><div class="url-item-url">' + escHtml(u.url) + '</div></div><button class="btn btn-danger" data-idx="' + i + '" data-type="url">✕</button></div>';
  }).join('');
  el.querySelectorAll('[data-type="url"]').forEach(function(btn) {
    btn.addEventListener('click', function() { externalUrls.splice(parseInt(this.getAttribute('data-idx')), 1); renderUrls(externalUrls); });
  });
}

document.getElementById('add-url').addEventListener('click', function() {
  var name = document.getElementById('url-name').value.trim();
  var url = document.getElementById('url-url').value.trim();
  if (!name || !url) return;
  externalUrls.push({ name: name, url: url });
  renderUrls(externalUrls);
  ['url-name','url-url'].forEach(function(id) { document.getElementById(id).value = ''; });
});

document.getElementById('save-tips').addEventListener('click', saveTips);

async function saveTips() {
  if (!currentProperty) return showToast('Nessuna struttura trovata', 'error');
  var tips = '';
  if (restaurants.length) {
    tips += 'RISTORANTI E BAR CONSIGLIATI:\n';
    restaurants.forEach(function(r) { tips += '- ' + r.name + (r.type ? ' (' + r.type + ')' : '') + ': ' + r.desc + '\n'; });
  }
  if (monuments.length) {
    tips += '\nMONUMENTI E ATTRAZIONI:\n';
    monuments.forEach(function(m) { tips += '- ' + m.name + (m.cat ? ' (' + m.cat + ')' : '') + ': ' + m.desc + '\n'; });
  }
  if (externalUrls.length) {
    tips += '\nRISORSE UTILI:\n';
    externalUrls.forEach(function(u) { tips += '- ' + u.name + ': ' + u.url + '\n'; });
  }
  var result = await sb.from('properties').update({ restaurants: restaurants, monuments: monuments, external_urls: externalUrls, local_tips: tips }).eq('id', currentProperty.id);
  if (result.error) return showToast('Errore nel salvataggio', 'error');
  currentProperty.restaurants = restaurants;
  currentProperty.monuments = monuments;
  currentProperty.external_urls = externalUrls;
  currentProperty.local_tips = tips;
  showToast('Tips salvati ✓', 'success');
}

// IMPOSTAZIONI
document.getElementById('early-bot-toggle').addEventListener('change', function() {
  document.getElementById('early-bot-days').style.display = this.checked ? 'block' : 'none';
});

document.getElementById('save-impostazioni').addEventListener('click', saveImpostazioni);

async function saveImpostazioni() {
  if (!currentProperty) return showToast('Nessuna struttura trovata', 'error');
  var earlyEnabled = document.getElementById('early-bot-toggle').checked;
  var days = earlyEnabled ? parseInt(document.getElementById('bot_active_days_before').value) : 0;
  var result = await sb.from('properties').update({ bot_active_days_before: days }).eq('id', currentProperty.id);
  if (result.error) return showToast('Errore nel salvataggio', 'error');
  currentProperty.bot_active_days_before = days;
  showToast('Impostazioni salvate ✓', 'success');
}

// GUESTS
async function loadGuests() {
  var result = await sb.from('guests').select('*').order('checkin', { ascending: false });
  var guests = result.data;
  var tbody = document.getElementById('guests-tbody');
  if (!guests || guests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text3);text-align:center;padding:32px">Nessun ospite registrato</td></tr>';
    return;
  }
  var today = new Date(); today.setHours(0,0,0,0);
  var months = {gen:0,feb:1,mar:2,apr:3,mag:4,giu:5,lug:6,ago:7,set:8,ott:9,nov:10,dic:11};
  function parseDate(d) {
    if (!d) return null;
    var p = d.split(' ');
    return new Date(parseInt(p[2]), months[p[1]], parseInt(p[0]));
  }
  tbody.innerHTML = guests.map(function(g) {
    var cin = parseDate(g.checkin);
    var cout = parseDate(g.checkout);
    var status = 'future', label = 'In arrivo';
    if (cout && cout < today) { status = 'past'; label = 'Terminato'; }
    else if (cin && cin <= today) { status = 'active'; label = 'In soggiorno'; }
    var channel = g.telegram_chat_id ? '📱 Telegram' : '💬 WhatsApp';
    return '<tr><td><strong>' + escHtml(g.name) + '</strong><br><span style="color:var(--text3);font-size:0.8rem">' + escHtml(g.phone || '') + '</span></td><td>Stanza ' + escHtml(g.room || '') + '</td><td>' + escHtml(g.checkin || '—') + '</td><td>' + escHtml(g.checkout || '—') + '</td><td style="font-size:0.85rem">' + channel + '</td><td><span class="badge badge-' + status + '">' + label + '</span></td></tr>';
  }).join('');
}

// CHAT
async function loadChatList() {
  var result = await sb.from('guests').select('id, name, room, telegram_chat_id, phone');
  var guests = result.data;
  var chatList = document.getElementById('chat-list');
  if (!guests || guests.length === 0) {
    chatList.innerHTML = '<div style="padding:20px;color:var(--text3);font-size:0.85rem">Nessun ospite</div>';
    return;
  }
  chatList.innerHTML = guests.map(function(g) {
    return '<div class="chat-list-item" data-id="' + g.id + '" data-name="' + escHtml(g.name) + '"><div class="chat-list-room">Stanza ' + escHtml(g.room || '') + '</div><div class="chat-list-name">' + escHtml(g.name) + '</div><div class="chat-list-preview">' + (g.telegram_chat_id ? '📱' : '💬') + ' ' + escHtml(g.phone || '') + '</div></div>';
  }).join('');
  chatList.querySelectorAll('.chat-list-item').forEach(function(item) {
    item.addEventListener('click', function() {
      chatList.querySelectorAll('.chat-list-item').forEach(function(i) { i.classList.remove('active'); });
      item.classList.add('active');
      loadChat(item.getAttribute('data-id'), item.getAttribute('data-name'));
    });
  });
}

async function loadChat(guestId, guestName) {
  var result = await sb.from('messages').select('*').eq('guest_id', guestId).order('created_at', { ascending: true });
  var messages = result.data;
  var chatMessages = document.getElementById('chat-messages');
  if (!messages || messages.length === 0) {
    chatMessages.innerHTML = '<div style="margin:auto;color:var(--text3);text-align:center">Nessun messaggio per ' + escHtml(guestName) + '</div>';
    return;
  }
  chatMessages.innerHTML = messages.map(function(m) {
    var time = new Date(m.created_at).toLocaleTimeString('it-IT', {hour:'2-digit',minute:'2-digit'});
    var date = new Date(m.created_at).toLocaleDateString('it-IT', {day:'numeric',month:'short'});
    var role = m.role === 'user' ? 'user' : 'assistant';
    return '<div class="msg msg-' + role + '"><div class="msg-bubble">' + escHtml(m.content) + '</div><div class="msg-meta">' + date + ' ' + time + '</div></div>';
  }).join('');
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// UTILS
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, type) {
  var toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast ' + (type || 'success') + ' show';
  setTimeout(function() { toast.className = 'toast'; }, 3000);
}

// INIT
checkSession();
