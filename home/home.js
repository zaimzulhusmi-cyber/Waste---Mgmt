document.getElementById('nav').innerHTML = nav('home');
initApp(async () => {
  const el = document.getElementById('app'), $ = id => document.getElementById(id), ks = Object.keys(CATS);
  el.innerHTML = `<form id="f" class="panel"><h2>Log landfill waste</h2>
  <div class="grid"><label>Date<input type="date" id="d" required></label><label>Source or site<input id="s"></label><label>Logged by<input id="by"></label></div>
  <div class="grid"><label>Total weight (kg)<input type="number" id="tw" min="0" step="any" required></label><label>Total volume (m³)<input type="number" id="tv" min="0" step="any" required></label></div>
  <div class="tw"><table class="seg"><thead><tr><th>Category</th><th>Weight (kg)</th><th>Volume (m³)</th><th>Share of weight</th></tr></thead><tbody>
  ${ks.map(k => `<tr><td><i style="background:${COLORS[k]}"></i>${CATS[k]}</td><td><input type="number" min="0" step="any" data-k="${k}" data-f="w" aria-label="${CATS[k]} weight"></td><td><input type="number" min="0" step="any" data-k="${k}" data-f="v" aria-label="${CATS[k]} volume"></td><td id="p-${k}">0%</td></tr>`).join('')}
  <tr><td>Unsegregated</td><td id="uw">0</td><td id="uv">0</td><td id="up">0%</td></tr></tbody></table></div>
  <p id="warn" class="warn" hidden></p><label>Notes<input id="n"></label><p><button>Save entry</button></p><p id="msg" role="status"></p></form>
  <section class="panel"><h2>Recent entries</h2><div id="list" class="tw"></div></section>`;
  $('d').valueAsDate = new Date();
  const val = (k, f) => num(el.querySelector(`[data-k="${k}"][data-f="${f}"]`).value);
  const calc = () => {
    const tw = num($('tw').value), tv = num($('tv').value);
    let sw = 0, sv = 0;
    ks.forEach(k => { sw += val(k, 'w'); sv += val(k, 'v'); $('p-' + k).textContent = fmt(pct(val(k, 'w'), tw)) + '%'; });
    $('uw').textContent = fmt(tw - sw); $('uv').textContent = fmt(tv - sv); $('up').textContent = fmt(pct(tw - sw, tw)) + '%';
    const over = sw > tw || sv > tv; $('warn').hidden = !over; $('warn').textContent = over ? 'The categories add up to more than the total. Check the weights and volumes.' : '';
    return over;
  };
  el.querySelectorAll('input').forEach(i => i.addEventListener('input', calc));
  const render = async () => {
    try {
      const es = await loadEntries();
      $('list').innerHTML = es.length ? `<table><thead><tr><th>Date</th><th>Source</th><th>Total kg</th><th>Total m³</th><th>Plastic / RDF / Compost (kg)</th><th></th></tr></thead><tbody>${es.slice(0, 20).map(e => { const c = catTotals([e]); return `<tr><td>${esc(e.entry_date)}</td><td>${esc(e.source)}</td><td>${fmt(e.total_weight_kg)}</td><td>${fmt(e.total_volume_m3)}</td><td>${fmt(c.plastic.w, 0)} / ${fmt(c.rdf.w, 0)} / ${fmt(c.compost.w, 0)}</td><td><button class="ghost" data-del="${e.id}">Delete</button></td></tr>`; }).join('')}</tbody></table>` : '<p class="empty">No entries yet. Log your first one above.</p>';
      $('list').querySelectorAll('[data-del]').forEach(b => (b.onclick = async () => { if (!confirm('Delete this entry?')) return; const { error } = await sb.from('waste_entries').delete().eq('id', b.dataset.del); if (error) $('msg').textContent = 'Could not delete: ' + error.message; render(); }));
    } catch (e) { $('list').innerHTML = `<p class="err">Could not load entries: ${esc(e.message)}. Make sure schema.sql has been run.</p>`; }
  };
  $('f').onsubmit = async ev => {
    ev.preventDefault();
    if (calc()) return;
    const { data, error } = await sb.from('waste_entries').insert({ entry_date: $('d').value, source: $('s').value, created_by: $('by').value, total_weight_kg: num($('tw').value), total_volume_m3: num($('tv').value), notes: $('n').value }).select().single();
    if (error) return ($('msg').textContent = 'Could not save: ' + error.message);
    const rows = ks.filter(k => val(k, 'w') || val(k, 'v')).map(k => ({ entry_id: data.id, category: k, weight_kg: val(k, 'w'), volume_m3: val(k, 'v') }));
    if (rows.length) { const r = await sb.from('waste_segregation').insert(rows); if (r.error) return ($('msg').textContent = 'Entry saved, but the split failed: ' + r.error.message); }
    $('msg').textContent = 'Entry saved.'; $('f').reset(); $('d').valueAsDate = new Date(); calc(); render();
  };
  render();
});
