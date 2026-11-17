const CATS = { plastic: 'Plastic', rdf: 'RDF', compost: 'Compost' };
const COLORS = { plastic: '#2a7fa8', rdf: '#d79a2b', compost: '#4f8a4a' };
const num = v => Number(v) || 0;
const fmt = (n, d = 1) => num(n).toLocaleString(undefined, { maximumFractionDigits: d });
const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
let sb = null;

async function getConfig() {
  let c = { url: null, key: null, found: { SUPABASE_URL: false, SUPABASE_ANON_KEY: false } };
  try { const r = await fetch('/api/config'); if (r.ok) c = await r.json(); } catch (e) {}
  return { url: c.url || store.get('wt_url'), key: c.key || store.get('wt_key'), found: c.found };
}
async function initApp(onReady) {
  const c = await getConfig();
  if (c.url && c.key) { sb = supabase.createClient(c.url, c.key); return onReady(sb); }
  showConnect(c, onReady);
}
function showConnect(c, onReady) {
  const el = document.getElementById('app'), st = f => (f ? '<li class="ok">Found</li>' : '<li class="miss">Missing</li>');
  el.innerHTML = `<section class="panel"><h2>Connect your Supabase</h2>
  <p>Required keys</p><ul class="keys"><li>SUPABASE_URL: ${c.found.SUPABASE_URL ? 'Found' : 'Missing'}</li><li>SUPABASE_ANON_KEY: ${c.found.SUPABASE_ANON_KEY ? 'Found' : 'Missing'}</li></ul>
  <div class="grid"><label>Project URL<input id="cu" placeholder="https://xxxx.supabase.co"></label><label>Anon key<input id="ck"></label></div>
  <p class="note">Demo only: these are saved in this browser. Don't enter keys on a shared computer. For real use, set them as Vercel env vars.</p>
  <button id="ct">Test connection</button> <button id="cs" class="ghost">Copy schema.sql</button>
  <a href="https://supabase.com/dashboard/new" target="_blank" rel="noopener">Create a free Supabase project</a><p id="cm" role="status"></p></section>`;
  const m = t => (document.getElementById('cm').textContent = t);
  document.getElementById('cs').onclick = async () => {
    try { await navigator.clipboard.writeText(await (await fetch('/supabase/schema.sql')).text()); m('Schema copied. Paste it into the Supabase SQL editor and run it.'); } catch (e) { m('Could not copy. Open /supabase/schema.sql and copy it manually.'); }
  };
  document.getElementById('ct').onclick = async () => {
    const u = document.getElementById('cu').value.trim(), k = document.getElementById('ck').value.trim();
    if (!u || !k) return m('Enter both the Project URL and the anon key.');
    const t = supabase.createClient(u, k), { error } = await t.from('waste_entries').select('id').limit(1);
    if (error) return m('Connection failed: ' + error.message + '. Check the keys and that schema.sql has been run.');
    store.set('wt_url', u); store.set('wt_key', k); sb = t; onReady(sb);
  };
}
async function loadEntries() {
  const { data, error } = await sb.from('waste_entries').select('*, waste_segregation(*)').order('entry_date', { ascending: false });
  if (error) throw error;
  return data || [];
}
const catTotals = es => { const t = {}; Object.keys(CATS).forEach(k => (t[k] = { w: 0, v: 0 })); es.forEach(e => (e.waste_segregation || []).forEach(s => { if (t[s.category]) { t[s.category].w += num(s.weight_kg); t[s.category].v += num(s.volume_m3); } })); return t; };
const nav = cur => `<header><b>Landfill Waste Tracker</b><a href="/home/" ${cur === 'home' ? 'aria-current="page"' : ''}>Home</a><a href="/dashboard/" ${cur === 'dash' ? 'aria-current="page"' : ''}>Dashboard</a></header>`;
