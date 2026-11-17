document.getElementById('nav').innerHTML = nav('dash');
initApp(async () => {
  const el = document.getElementById('app'), $ = id => document.getElementById(id), ks = Object.keys(CATS);
  let all = [];
  try { all = await loadEntries(); } catch (e) { el.innerHTML = `<p class="err">Could not load data: ${esc(e.message)}. Make sure schema.sql has been run.</p>`; return; }
  el.innerHTML = `<section class="panel"><div class="grid"><label>From<input type="date" id="from"></label><label>To<input type="date" id="to"></label></div></section><div id="out"></div>`;
  const draw = () => {
    const f = $('from').value, t = $('to').value, es = all.filter(e => (!f || e.entry_date >= f) && (!t || e.entry_date <= t));
    if (!es.length) return ($('out').innerHTML = '<p class="empty">No entries in this range. Log waste on the Home page to see results here.</p>');
    const tw = es.reduce((a, e) => a + num(e.total_weight_kg), 0), tv = es.reduce((a, e) => a + num(e.total_volume_m3), 0), c = catTotals(es);
    let acc = 0; const stops = ks.map(k => { const s = acc, p = pct(c[k].w, tw); acc += p; return `${COLORS[k]} ${s}% ${acc}%`; }); stops.push(`#e6eae7 ${acc}% 100%`);
    const months = {}; es.forEach(e => { const m = e.entry_date.slice(0, 7); months[m] = months[m] || { plastic: 0, rdf: 0, compost: 0, total: 0 }; months[m].total += num(e.total_weight_kg); (e.waste_segregation || []).forEach(s => { if (months[m][s.category] !== undefined) months[m][s.category] += num(s.weight_kg); }); });
    const mk = Object.keys(months).sort(), mx = Math.max(...mk.map(m => months[m].total));
    $('out').innerHTML = `<div class="cards"><div class="card"><small>Total waste</small><b>${fmt(tw)} kg</b><small>${fmt(tv)} m³</small></div>
    ${ks.map(k => `<div class="card" style="--c:${COLORS[k]}"><small>${CATS[k]}</small><b>${fmt(pct(c[k].w, tw))}%</b><small>${fmt(c[k].w)} kg · ${fmt(c[k].v)} m³</small></div>`).join('')}</div>
    <section class="panel"><h2>Split by weight</h2><div class="split"><div class="donut" role="img" aria-label="Share of weight by category" style="background:conic-gradient(${stops.join(',')})"></div><div>${ks.map(k => `<p><span class="seg"><i style="background:${COLORS[k]}"></i></span>${CATS[k]}: ${fmt(pct(c[k].w, tw))}%</p>`).join('')}<p class="note">Grey is unsegregated waste.</p></div></div></section>
    <section class="panel"><h2>Monthly weight</h2>${mk.map(m => `<div class="mrow"><span>${m}</span><div class="bar" style="width:${pct(months[m].total, mx)}%">${ks.map(k => `<span style="background:${COLORS[k]};width:${pct(months[m][k], months[m].total)}%"></span>`).join('')}</div><span>${fmt(months[m].total, 0)} kg</span></div>`).join('')}</section>
    <section class="panel tw"><h2>Entries</h2><table><thead><tr><th>Date</th><th>Source</th><th>Total kg</th><th>Total m³</th><th>Plastic %</th><th>RDF %</th><th>Compost %</th></tr></thead><tbody>${es.slice(0, 15).map(e => { const x = catTotals([e]), w = num(e.total_weight_kg); return `<tr><td>${esc(e.entry_date)}</td><td>${esc(e.source)}</td><td>${fmt(w)}</td><td>${fmt(e.total_volume_m3)}</td>${ks.map(k => `<td>${fmt(pct(x[k].w, w))}%</td>`).join('')}</tr>`; }).join('')}</tbody></table></section>`;
  };
  $('from').onchange = $('to').onchange = draw; draw();
});
