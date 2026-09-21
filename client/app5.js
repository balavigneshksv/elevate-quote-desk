
/* ================= settings ================= */
const TPL = {
  why: () => ({ t: '', d: '' }), paintWhy: () => ({ t: '', d: '' }), schedule: () => ({ label: '', pct: 0 }), paintSchedule: () => ({ label: '', pct: 0 }),
  catalog: () => ({ desc: '', spec: '', unit: 'sq.ft', rate: 0 }), paintCatalog: () => ({ product: '', spec: '', rate: 0 }), tools: () => ({ name: '', rate: 0 }),
  agreementClauses: () => ({ t: '', d: '' }), paintAgreementClauses: () => ({ t: '', d: '' })
};
function setRows(list, cols, addLabel) {
  return S.set[list].map((r, i) => `<div class="rowtab rt-${list}">${cols.map(([k, l, o]) => fld('set', `${list}.${i}.${k}`, i ? '' : l, o || {})).join('')}${delBtn('s-del', `data-list="${list}" data-i="${i}"`)}</div>`).join('')
    + `<button class="btn small" data-act="s-add" data-list="${list}">${ic('plus')}${addLabel}</button>`;
}
function setClauses(list) {
  return S.set[list].map((c, i) => `<div class="clause"><div class="cl-n">${i + 1}</div><div class="cl-f">${fld('set', `${list}.${i}.t`, '')}${fld('set', `${list}.${i}.d`, '', { area: true, rows: 3 })}</div>
    <div class="it-tools" style="flex-direction:column">${delBtn('s-del', `data-list="${list}" data-i="${i}"`, 'Delete clause')}</div></div>`).join('')
    + `<button class="btn small" data-act="s-add" data-list="${list}">${ic('plus')}Add clause</button>`;
}
function settingsHtml() {
  if (!S.isOwner) return `<div class="banner">Company settings can only be changed by the admin.</div>`;
  const st = S.set;
  return `<div class="edbar"><div class="grow"></div><span class="savestate" id="setstate"></span></div>
    <div class="pagehead"><div><h1>Company settings</h1><p class="sub">These fill every new document: introductions, terms, payment stages, rate catalogs and the work order and agreement wording. Existing documents are not changed.</p></div></div>
    <section class="blk"><h2>Company</h2><div class="fgrid">
      ${fld('set', 'name', 'Company name', { cls: 's3' })}${fld('set', 'tagline', 'Tagline', { cls: 's3' })}
      ${fld('set', 'phone', 'Phone', { cls: 's2' })}${fld('set', 'email', 'Email', { cls: 's2' })}${fld('set', 'website', 'Website', { cls: 's2' })}
      ${fld('set', 'address', 'Address', { cls: 's4' })}${fld('set', 'gstin', 'GSTIN', { cls: 's2' })}
      <div class="f s6"><label>Logo <span class="hint" style="text-transform:none;letter-spacing:0">(PNG or JPG, shown on every document and in the app bar)</span></label>
        <div class="thumbs">${st.logo ? `<div class="thumb" style="width:70px;height:70px;border-radius:50%"><img src="/_blob/${esc(st.logo)}" alt="" style="object-fit:contain"></div><button class="btn small ghost" data-act="del-logo">Remove logo</button>` : ''}
        <button class="btn small" data-act="upload-logo">${ic('img')}${st.logo ? 'Replace' : 'Upload logo'}</button></div></div>
      ${fld('set', 'team', 'Team members (one name per line). These appear as suggestions for “Handled by” and “Visited by”.', { cls: 's6', area: true, rows: 3, lines: true })}
    </div></section>
    <section class="blk"><h2>Interiors: first page</h2><div class="fgrid">${fld('set', 'about', 'About us (two or three sentences)', { cls: 's6', area: true, rows: 3 })}</div>
      <div class="lbl" style="margin:16px 0 8px">Why choose us <span class="hint" style="text-transform:none;letter-spacing:0">(the first six with a title are printed)</span></div>
      ${setRows('why', [['t', 'Title'], ['d', 'One-line reason']], 'Add a point')}</section>
    <section class="blk"><h2>Paints: first page</h2><div class="fgrid">${fld('set', 'paintAbout', 'About our painting service', { cls: 's6', area: true, rows: 3 })}</div>
      <div class="lbl" style="margin:16px 0 8px">Service highlights</div>
      ${setRows('paintWhy', [['t', 'Title'], ['d', 'One-line reason']], 'Add a point')}</section>
    <section class="blk"><h2>Numbering &amp; defaults</h2><div class="fgrid">
      ${fld('set', 'prefixQuote', 'Interiors quotation prefix', { cls: 's2' })}${fld('set', 'prefixBill', 'Interiors bill prefix', { cls: 's2' })}${fld('set', 'gstPct', 'Default GST %', { cls: 's1', num: true })}${fld('set', 'validityDays', 'Valid (days)', { cls: 's1', num: true })}
      ${fld('set', 'prefixPaintQuote', 'Paint estimate prefix', { cls: 's2' })}${fld('set', 'prefixPaintBill', 'Paint bill prefix', { cls: 's2' })}${fld('set', 'paintValidityDays', 'Paint estimate valid (days)', { cls: 's2', num: true })}
      ${fld('set', 'place', 'Place of signing', { cls: 's2' })}${fld('set', 'jurisdiction', 'Court jurisdiction', { cls: 's2' })}${fld('set', 'warrantyMonths', 'Warranty (months)', { cls: 's2', num: true })}
      ${fld('set', 'bank', 'Bank details shown on documents', { cls: 's6', area: true, rows: 4, ph: 'Account name, bank and branch, account number, IFSC, UPI id' })}</div></section>
    <section class="blk"><h2>Terms &amp; conditions</h2><div class="fgrid">
      ${fld('set', 'terms', 'Interiors quotation terms (one per line)', { cls: 's6', area: true, rows: 6 })}
      ${fld('set', 'paintTerms', 'Paint estimate terms (one per line)', { cls: 's6', area: true, rows: 7 })}
      ${fld('set', 'billTerms', 'Bill terms (one per line)', { cls: 's6', area: true, rows: 3 })}</div></section>
    <section class="blk"><h2>Default payment stages</h2>
      <div class="lbl" style="margin-bottom:8px">Interiors</div>${setRows('schedule', [['label', 'Stage'], ['pct', '%', { num: true }]], 'Add stage')}
      <div class="lbl" style="margin:16px 0 8px">Paints</div>${setRows('paintSchedule', [['label', 'Stage'], ['pct', '%', { num: true }]], 'Add stage')}</section>
    <section class="blk"><h2>Presets</h2><div class="fgrid">
      ${fld('set', 'rooms', 'Interiors: rooms (one per line). These become the quick-add buttons.', { cls: 's3', area: true, rows: 7, lines: true })}
      <div class="s3" style="display:grid;gap:12px;align-content:start">${fld('set', 'paintAreas', 'Paints: areas (one per line)', { area: true, rows: 3, lines: true })}${fld('set', 'tiers', 'Paints: service tiers (one per line)', { area: true, rows: 3, lines: true })}</div></div></section>
    <section class="blk"><h2>Interiors rate catalog <small>Type an item name in a quotation and its unit, rate and specification fill in. These rates are examples: replace them with yours.</small></h2>
      ${setRows('catalog', [['desc', 'Item'], ['spec', 'Specification'], ['unit', 'Unit', { sel: UNITS }], ['rate', 'Rate (₹)', { num: true }]], 'Add item')}</section>
    <section class="blk"><h2>Asian Paints products <small>Choosing a product in an estimate fills the painting system and rate per sq.ft. Replace the example rates with yours.</small></h2>
      ${setRows('paintCatalog', [['product', 'Product'], ['spec', 'Painting system'], ['rate', 'Rate (₹/sq.ft)', { num: true }]], 'Add product')}</section>
    <section class="blk"><h2>Tools &amp; extras <small>Added to every new paint estimate. The rate is used when a quantity is entered.</small></h2>
      ${setRows('tools', [['name', 'Item'], ['rate', 'Rate (₹)', { num: true }]], 'Add item')}</section>
    <section class="blk"><h2>Work order &amp; agreement wording</h2>
      ${fld('set', 'woNotes', 'Default special instructions on the work order', { area: true, rows: 3 })}
      <p class="hint" style="margin:14px 0 10px">Default clauses copied into each new agreement, which can then be changed for that client. Have a lawyer review this wording before you rely on it. Words in braces such as {client}, {site}, {amount}, {start} and {end} fill in automatically.</p>
      <div class="lbl" style="margin-bottom:8px">Interiors agreement</div>${setClauses('agreementClauses')}
      <div class="lbl" style="margin:18px 0 8px">Paints agreement</div>${setClauses('paintAgreementClauses')}</section>`;
}
function rerenderSettings() {
  const y = window.scrollY, m = $('#main');
  if (!m || S.tab !== 'settings') return;
  m.innerHTML = settingsHtml();
  window.scrollTo(0, y); paintSet();
}

/* ================= images ================= */
function pickImages(multiple) {
  return new Promise(res => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = 'image/png,image/jpeg,image/webp,image/gif'; i.multiple = !!multiple;
    i.onchange = () => res([...i.files]);
    i.oncancel = () => res([]);
    i.click();
  });
}
async function downscale(file, max = 1600) {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
    const b = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.86));
    return b || file;
  } catch { return file; }
}
async function uploadOne(file, raw) {
  const blob = raw ? file : await downscale(file);
  const r = await S.assets.upload(blob, { type: blob.type || file.type });
  return r.id;
}
async function addImages(kind, si, ii) {
  if (!S.assets) { toast('Adding photos needs edit access to this page'); return; }
  let files = await pickImages(kind === 'item' || kind === 'photos');
  if (!files.length) return;
  const it = kind === 'item' ? S.cur.sections[si].items[ii] : null;
  if (it) files = files.slice(0, 3 - (it.imgs || []).length);
  if (kind === 'photos') files = files.slice(0, Math.max(0, 12 - S.cur.photos.length));
  toast('Uploading…');
  try {
    for (const f of files) {
      const id = await uploadOne(f);
      if (kind === 'photos') S.cur.photos.push({ id, cap: '' });
      else if (it) it.imgs.push(id); else S.cur.sections[si].hero = id;
    }
    touch(); rerenderEdit(); toast(files.length > 1 ? 'Photos added' : 'Photo added');
  } catch (e) { toast('Upload failed: ' + ((e && (e.message || e.code)) || 'try again')); }
}

/* ================= actions ================= */
function rerenderEdit(focusId) {
  const y = window.scrollY, m = $('#main');
  if (!m || S.view !== 'edit') return;
  m.innerHTML = editHtml();
  window.scrollTo(0, y);
  paintSave(); refreshLive();
  if (focusId) { const e = document.getElementById(focusId); if (e) e.focus(); }
}
function move(arr, i, d) { const j = i + d; if (j < 0 || j >= arr.length) return false;[arr[i], arr[j]] = [arr[j], arr[i]]; return true; }
function armed(b) {
  if (b.dataset.armed === '1') return true;
  b.dataset.armed = '1'; b.dataset.old = b.innerHTML; b.textContent = 'Sure?'; b.style.width = 'auto';
  setTimeout(() => { if (b.isConnected) { b.dataset.armed = ''; b.innerHTML = b.dataset.old; b.style.width = ''; } }, 2500);
  return false;
}
function normalize(q) {
  q.type = q.type === 'bill' ? 'bill' : 'quote';
  q.div = q.div === 'paints' ? 'paints' : 'interiors';
  const pt = q.div === 'paints';
  q.client = { name: '', phone: '', email: '', address: '', ...(q.client || {}) };
  q.sections = (q.sections || []).map(s => ({
    id: s.id || uid(), name: '', dims: '', hero: '', ...s,
    items: (s.items || []).map(i => ({ id: i.id || uid(), desc: '', spec: '', size: '', qty: pt ? 0 : 1, unit: 'sq.ft', rate: 0, ...(pt ? { product: '' } : {}), ...i, imgs: Array.isArray(i.imgs) ? i.imgs : [] }))
  }));
  q.discount = { mode: 'pct', value: 0, ...(q.discount || {}) };
  q.gstOn = q.gstOn !== false; if (q.gstPct == null) q.gstPct = 18;
  q.opts = pt ? { cover: true, why: true, health: true, photos: true, annexure: false, ...(q.opts || {}) } : { cover: true, why: true, annexure: true, health: false, photos: false, ...(q.opts || {}) };
  q.schedule = (q.schedule || []).map(r => ({ date: '', ...r })); q.payments = q.payments || []; q.history = q.history || [];
  if (pt) {
    q.paint = { visitDate: '', visitedBy: '', city: '', tier: 'Classic', basis: 'measured', days: '', start: '', end: '', ...(q.paint || {}) };
    q.health = (q.health || []).map(h => ({ id: h.id || uid(), area: 'Interior', name: '', obs: '', ...h, rows: (h.rows || []).map(r => ({ sym: '', sev: '', area: '', rec: '', ...r })) }));
    q.photos = (q.photos || []).map(p => typeof p === 'string' ? { id: p, cap: '' } : { cap: '', ...p });
    q.tools = (q.tools || []).map(t => ({ name: '', qty: 0, rate: 0, ...t }));
  }
  if (q.deal) q.deal = { amountAuto: true, amount: 0, gst: 'incl', clauses: [], ...q.deal, clauses: Array.isArray(q.deal.clauses) ? q.deal.clauses : [] };
  for (const k of ['notes', 'terms', 'title', 'site', 'no', 'date', 'validUntil', 'followUp', 'leadId', 'parent']) q[k] = q[k] || '';
  q.rev = q.rev || 0; q.status = q.status || 'draft'; q.updatedAt = q.updatedAt || 0;
  return q;
}
function normLead(l) {
  return { div: 'interiors', name: '', phone: '', email: '', city: '', address: '', source: '', assignee: '', stage: 'new', followUp: '', requirement: '', propType: '', budget: '', scope: '', area: '', ...l, rates: Array.isArray(l.rates) ? l.rates : [], log: Array.isArray(l.log) ? l.log : [], updatedAt: l.updatedAt || 0 };
}
async function leaveEditor() {
  if (S.cur && S.dirty) { clearTimeout(S.saveTimer); await flushSave(); }
  for (let i = 0; i < 20 && S.saving; i++) await new Promise(r => setTimeout(r, 150));
  S.cur = null; S.isNew = false; S.dirty = false;
}
async function leaveLead() {
  if (S.lead && S.ldirty) { clearTimeout(S.lTimer); await flushLead(); }
  for (let i = 0; i < 20 && S.lsaving; i++) await new Promise(r => setTimeout(r, 150));
  S.lead = null; S.lNew = false; S.ldirty = false;
}
function ensureDeal() { if (S.cur && S.cur.type === 'quote' && !S.cur.deal) { S.cur.deal = newDeal(S.cur); touch(); } }
function openQ(id, view, doc) {
  const q = S.quotes.get(id);
  if (!q) return;
  S.cur = normalize(clone(q)); S.isNew = false; S.dirty = false; S.saveMsg = ''; S.saveErr = false; S.view = view; S.doc = doc || 'quote'; S.tab = q.div;
  if (S.doc !== 'quote') ensureDeal();
  render();
}
async function changeLeadStage(stage) {
  const l = S.lead;
  if (!l || l.stage === stage) return;
  l.stage = stage; touchLead();
  try { await appendLog(l.id, { kind: 'sys', text: `Stage changed to ${leadStageLabel(l.div, stage)}` }); } catch { }
  if (S.view === 'lead') paintLog();
}
function scrollToEl(id) { setTimeout(() => { const e = document.getElementById(id); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30); }

async function act(b) {
  const d = b.dataset, a = d.act, cur = S.cur;
  const si = d.si !== undefined ? +d.si : -1, ii = d.ii !== undefined ? +d.ii : -1, i = d.i !== undefined ? +d.i : -1;
  switch (a) {
    case 'nav':
      await leaveEditor(); await leaveLead();
      if ((d.to === 'settings' || d.to === 'team') && !S.isOwner) break;
      if (DIVS.includes(d.to) && !can(d.to)) break;
      S.tab = d.to; S.view = 'home'; S.lstageF = 'all'; S.statusF = 'all'; S.typeF = 'all'; S.q = ''; S.lq = '';
      if (d.to === 'settings') { S.set = clone(S.settings); S.setMsg = ''; }
      if (d.to === 'team') { loadTeam(); }
      if (d.to === 'account') { S.acct = { cur: '', next: '', again: '', msg: '', err: false, busy: false }; }
      render(); break;
    case 'goto': S.tab = d.div; S.sub = 'leads'; S.lstageF = d.stage || 'all'; S.lq = ''; render(); break;
    case 'sub': S.sub = d.v; render(); break;
    /* leads */
    case 'new-lead':
      S.lead = newLead(S.tab); S.lNew = true; S.ldirty = false; S.lErr = false; S.lMsg = 'Saving starts as soon as you type'; S.view = 'lead'; render();
      setTimeout(() => { const e = $('#f-lead-name'); if (e) e.focus(); }, 30); break;
    case 'open-lead': {
      const l = S.leads.get(d.id); if (!l) break;
      await leaveEditor(); await leaveLead();
      S.lead = clone(l); S.lNew = false; S.ldirty = false; S.lMsg = ''; S.lErr = false; S.tab = l.div; S.view = 'lead'; render(); break;
    }
    case 'back-lead': { const div = S.lead ? S.lead.div : S.tab; await leaveLead(); S.tab = div; S.sub = 'leads'; S.view = 'home'; render(); break; }
    case 'lfilter': S.lstageF = (S.lstageF === d.v && d.v !== 'all') ? 'all' : d.v; refreshLeads(); break;
    case 'lsort': S.lsort = d.v; refreshLeads(); break;
    case 'lfu': if (S.lead) { S.lead.followUp = addDays(today(), +d.days); const e = $('#f-lead-followUp'); if (e) e.value = S.lead.followUp; touchLead(); } break;
    case 'add-rate': {
      const l = S.lead, last = latestRate(l);
      l.rates.push({ id: uid(), date: today(), perSqft: last ? last.perSqft : '', basis: 'approx', area: '', note: '' });
      if (['new', 'contacted'].includes(l.stage)) await changeLeadStage('rate'); else touchLead();
      rerenderLead(`f-lead-rates-${l.rates.length - 1}-perSqft`); break;
    }
    case 'del-rate': S.lead.rates.splice(i, 1); touchLead(); rerenderLead(); break;
    case 'log-add': case 'log-ask': {
      const ta = $('#log-text'), text = ta ? ta.value.trim() : '';
      if (!text) { toast('Write something first'); break; }
      if (S.lNew && !S.lead.name.trim()) { toast('Add the customer name first'); break; }
      b.disabled = true;
      try {
        const e = await appendLog(S.lead.id, { kind: a === 'log-ask' ? 'question' : 'update', text });
        if (!S.lNew && !(S.lead.log || []).some(x => x.id === e.id)) S.lead.log = [...(S.lead.log || []), e];
        ta.value = ''; paintLog(); toast(a === 'log-ask' ? 'Question sent to your team' : 'Update posted');
      } catch { toast('Could not post. Try again.'); }
      b.disabled = false; break;
    }
    case 'del-lead':
      if (!armed(b)) break;
      try { await S.db.doc('leads/' + d.id).delete(); S.lead = null; S.ldirty = false; S.view = 'home'; S.sub = 'leads'; toast('Lead deleted'); render(); } catch { toast('Could not delete'); }
      break;
    case 'quote-from-lead': {
      const l = S.lead;
      if (!l.name.trim()) { toast('Add the customer name first'); break; }
      clearTimeout(S.lTimer); S.ldirty = true; await flushLead();
      if (l.div === 'interiors' && ['new', 'contacted', 'visit'].includes(l.stage)) {
        try { await S.db.doc('leads/' + l.id).update({ stage: 'quoting', updatedAt: Date.now() }); await appendLog(l.id, { kind: 'sys', text: 'Quotation started. Lead moved to Preparing quote.' }); } catch { }
      }
      const q = newQuote('quote', l.div, l), r = latestRate(l);
      if (l.div === 'paints' && r) {
        const s = newSection('Interior', 'paints'); s.items[0].rate = num(r.perSqft); s.items[0].qty = num(r.area) || num(l.area); q.sections = [s]; q.paint.basis = r.basis === 'measured' ? 'measured' : 'approx';
      }
      await leaveLead();
      S.cur = normalize(q); S.isNew = true; S.dirty = false; S.saveErr = false; S.saveMsg = 'Saving starts as soon as you type'; S.doc = 'quote'; S.tab = q.div; S.view = 'edit'; render(); break;
    }
    /* quotes */
    case 'new-quote': case 'new-bill':
      S.cur = normalize(newQuote(a === 'new-bill' ? 'bill' : 'quote', S.tab)); S.isNew = true; S.dirty = false; S.saveErr = false; S.doc = 'quote';
      S.saveMsg = 'Saving starts as soon as you type'; S.view = 'edit'; render();
      setTimeout(() => { const e = $('#f-cur-client-name'); if (e) e.focus(); }, 30); break;
    case 'open': await leaveLead(); openQ(d.id, 'edit'); break;
    case 'preview': openQ(d.id, 'preview', 'quote'); break;
    case 'open-doc': openQ(d.id, 'preview', d.kind); break;
    case 'dup': {
      const src = S.quotes.get(d.id); if (!src) break;
      const q = normalize(clone(src));
      q.id = uid(); q.no = nextNo(q.type, q.div); q.status = 'draft'; q.date = today(); q.followUp = ''; q.payments = []; q.leadId = ''; q.parent = ''; q.rev = 0; delete q.deal;
      q.validUntil = q.type === 'quote' ? addDays(q.date, (q.div === 'paints' ? num(S.settings.paintValidityDays) : num(S.settings.validityDays)) || 15) : '';
      q.createdBy = S.me.id; q.createdAt = q.updatedAt = Date.now(); q.history = [{ s: 'draft', at: Date.now(), by: S.me.id }];
      try { await S.db.doc('quotes/' + q.id).set(strip(q)); toast('Copied as ' + q.no); } catch { toast('Could not duplicate'); }
      break;
    }
    case 'revise': {
      if (S.cur && S.cur.id === d.id) { clearTimeout(S.saveTimer); S.dirty = true; await flushSave(); }
      const src = S.cur && S.cur.id === d.id ? S.cur : S.quotes.get(d.id); if (!src) break;
      const base = normalize(clone(src)), rev = (base.rev || 0) + 1, root = (base.no || '').replace(/-R\d+$/, '');
      const q = clone(base);
      q.id = uid(); q.no = `${root}-R${rev}`; q.rev = rev; q.parent = base.id; q.status = 'draft'; q.date = today(); q.followUp = '';
      q.validUntil = q.type === 'quote' ? addDays(q.date, (q.div === 'paints' ? num(S.settings.paintValidityDays) : num(S.settings.validityDays)) || 15) : '';
      q.createdBy = S.me.id; q.createdAt = q.updatedAt = Date.now(); q.history = [{ s: 'draft', at: Date.now(), by: S.me.id }];
      const old = clone(base); applyStatus(old, 'revised');
      try {
        await S.db.doc('quotes/' + q.id).set(strip(q));
        await S.db.doc('quotes/' + base.id).update({ status: old.status, history: old.history, updatedAt: Date.now() });
        await leaveEditor(); S.cur = normalize(q); S.isNew = false; S.dirty = false; S.saveMsg = ''; S.doc = 'quote'; S.view = 'edit'; render(); toast(`Revision ${q.no} created. The earlier version is kept.`);
      } catch { toast('Could not create a revision'); }
      break;
    }
    case 'del':
      if (!armed(b)) break;
      try { await S.db.doc('quotes/' + d.id).delete(); toast('Deleted'); } catch { toast('Could not delete'); }
      break;
    case 'type': S.typeF = d.v; S.statusF = 'all'; refreshList(); break;
    case 'filter': S.statusF = (S.statusF === d.v && d.v !== 'all') ? 'all' : d.v; refreshList(); break;
    case 'back': { const div = cur ? cur.div : S.tab; await leaveEditor(); S.tab = div; S.sub = 'quotes'; S.view = 'home'; render(); break; }
    case 'to-preview': S.doc = d.kind || 'quote'; if (S.doc !== 'quote') ensureDeal(); S.view = 'preview'; render(); break;
    case 'doc': S.doc = d.kind; if (S.doc !== 'quote') ensureDeal(); render(); break;
    case 'back-edit': S.view = 'edit'; render(); break;
    case 'edit-deal': S.view = 'edit'; render(); scrollToEl('deal'); break;
    case 'download-doc': await downloadDoc(); break;
    case 'print':
      try { window.print(); } catch { toast('Press Ctrl+P (Cmd+P on Mac) to print'); }
      break;
    case 'qfu': cur.followUp = addDays(today(), +d.days); { const e = $('#f-followUp'); if (e) e.value = cur.followUp; } touch(); break;
    /* editor structure */
    case 'add-sec': { cur.sections.push(newSection(d.name, cur.div)); touch(); const n = cur.sections.length - 1; rerenderEdit(d.name ? `f-cur-sections-${n}-items-0-${cur.div === 'paints' ? 'desc' : 'desc'}` : `f-cur-sections-${n}-name`); break; }
    case 'del-sec': {
      const s = cur.sections[si], has = s.items.some(t => t.desc || t.product || num(t.rate));
      if (has && !armed(b)) break;
      cur.sections.splice(si, 1); touch(); rerenderEdit(); break;
    }
    case 'up-sec': if (move(cur.sections, si, -1)) { touch(); rerenderEdit(); } break;
    case 'down-sec': if (move(cur.sections, si, 1)) { touch(); rerenderEdit(); } break;
    case 'add-item': { const s = cur.sections[si]; s.items.push(newItem(cur.div)); touch(); rerenderEdit(`f-cur-sections-${si}-items-${s.items.length - 1}-desc`); break; }
    case 'del-item': cur.sections[si].items.splice(ii, 1); touch(); rerenderEdit(); break;
    case 'up-item': if (move(cur.sections[si].items, ii, -1)) { touch(); rerenderEdit(); } break;
    case 'down-item': if (move(cur.sections[si].items, ii, 1)) { touch(); rerenderEdit(); } break;
    case 'add-img': await addImages('item', si, ii); break;
    case 'del-img': cur.sections[si].items[ii].imgs.splice(+d.k, 1); touch(); rerenderEdit(); break;
    case 'add-hero': await addImages('hero', si); break;
    case 'del-hero': cur.sections[si].hero = ''; touch(); rerenderEdit(); break;
    case 'add-photos': await addImages('photos'); break;
    case 'del-photo': cur.photos.splice(i, 1); touch(); rerenderEdit(); break;
    case 'add-health': cur.health.push(newHealthArea(d.kind)); cur.health[cur.health.length - 1].name = ''; touch(); rerenderEdit(); break;
    case 'del-health': cur.health.splice(i, 1); touch(); rerenderEdit(); break;
    case 'add-hrow': cur.health[i].rows.push({ sym: '', sev: '', area: '', rec: '' }); touch(); rerenderEdit(`f-cur-health-${i}-rows-${cur.health[i].rows.length - 1}-sym`); break;
    case 'del-hrow': cur.health[i].rows.splice(+d.k, 1); touch(); rerenderEdit(); break;
    case 'add-tool': cur.tools.push({ name: '', qty: 0, rate: 0 }); touch(); rerenderEdit(`f-cur-tools-${cur.tools.length - 1}-name`); break;
    case 'del-tool': cur.tools.splice(i, 1); touch(); rerenderEdit(); break;
    case 'add-sch': cur.schedule.push({ label: '', pct: 0, date: '' }); touch(); rerenderEdit(`f-cur-schedule-${cur.schedule.length - 1}-label`); break;
    case 'del-sch': cur.schedule.splice(i, 1); touch(); rerenderEdit(); break;
    case 'add-pay': cur.payments.push({ date: today(), amount: '', mode: 'UPI', note: '' }); touch(); rerenderEdit(`f-cur-payments-${cur.payments.length - 1}-amount`); break;
    case 'del-pay': cur.payments.splice(i, 1); touch(); rerenderEdit(); break;
    /* work order & agreement */
    case 'make-deal': cur.deal = newDeal(cur); touch(); rerenderEdit(); scrollToEl('deal'); break;
    case 'add-cl': cur.deal.clauses.push({ t: '', d: '' }); touch(); rerenderEdit(`f-cur-deal-clauses-${cur.deal.clauses.length - 1}-t`); break;
    case 'del-cl': cur.deal.clauses.splice(i, 1); touch(); rerenderEdit(); break;
    case 'up-cl': if (move(cur.deal.clauses, i, -1)) { touch(); rerenderEdit(); } break;
    case 'down-cl': if (move(cur.deal.clauses, i, 1)) { touch(); rerenderEdit(); } break;
    case 'reset-cl': if (!armed(b)) break; cur.deal.clauses = clone(cur.div === 'paints' ? S.settings.paintAgreementClauses : S.settings.agreementClauses); touch(); rerenderEdit(); break;
    /* settings */
    case 's-add': S.set[d.list].push(TPL[d.list]()); S.settings = mergeSettings(clone(S.set)); touchSettings(); rerenderSettings(); break;
    case 's-del': S.set[d.list].splice(i, 1); S.settings = mergeSettings(clone(S.set)); touchSettings(); rerenderSettings(); break;
    case 'upload-logo': {
      if (!S.assets) { toast('Uploading needs edit access to this page'); break; }
      const f = (await pickImages(false))[0]; if (!f) break;
      toast('Uploading…');
      try { S.set.logo = await uploadOne(f, true); S.settings = mergeSettings(clone(S.set)); touchSettings(); rerenderSettings(); refreshBar(); } catch (e) { toast('Upload failed: ' + ((e && (e.message || e.code)) || 'try again')); }
      break;
    }
    case 'del-logo': S.set.logo = ''; S.settings = mergeSettings(clone(S.set)); touchSettings(); rerenderSettings(); refreshBar(); break;
    default: await teamAct(a, b, d);
  }
}

function onField(e) {
  const el = e.target;
  if (el.dataset && el.dataset.team !== undefined) { teamField(el, e); return; }
  if (el.id === 'l-search') { S.q = el.value; refreshList(); return; }
  if (el.id === 'ls-search') { S.lq = el.value; refreshLeads(); return; }
  if (el.dataset && el.dataset.act === 'status' && e.type === 'change') { el.className = 'pill ' + stClass(el.value); setStatusFromList(el.dataset.id, el.value); return; }
  if (el.dataset && el.dataset.act === 'lstage' && e.type === 'change') { el.className = 'pill ' + stClass(el.value); setLeadStage(el.dataset.id, el.value); return; }
  if (!el.dataset || !el.dataset.p) return;
  const rootN = el.dataset.root, p = el.dataset.p, root = objOf(rootN);
  if (!root) return;
  let v;
  if (el.type === 'checkbox') v = el.checked;
  else if (el.dataset.num) v = el.value === '' ? '' : num(el.value);
  else if (el.dataset.lines) v = el.value.split('\n').map(x => x.trim()).filter(Boolean);
  else v = el.value;
  if (rootN === 'set') { setPath(root, p, v); S.settings = mergeSettings(clone(S.set)); touchSettings(); return; }
  if (rootN === 'lead') {
    if (p === 'stage') { el.className = 'pill ' + stClass(v); if (e.type === 'change') { changeLeadStage(v).then(() => { if (S.view === 'lead' && (v === 'lost' || root.stage === 'lost')) rerenderLead(); }); } return; }
    setPath(root, p, v);
    if (e.type === 'change' && /^rates\.\d+\.basis$/.test(p) && v === 'measured' && ['new', 'contacted', 'rate'].includes(root.stage)) { changeLeadStage('measured').then(() => rerenderLead()); }
    touchLead(); refreshLeadCalc(); return;
  }
  if (p === 'status') {
    const was = S.cur.status; applyStatus(S.cur, v); el.className = 'pill ' + stClass(v); touch();
    if (v !== was) { leadFollow(S.cur); if (v === 'approved') toast('Approved. You can prepare the work order and agreement below.'); }
    return;
  }
  setPath(root, p, v);
  if (p === 'deal.amountAuto') { if (v === false && !num(S.cur.deal.amount)) S.cur.deal.amount = calc(S.cur).total; touch(); rerenderEdit(); return; }
  if (e.type === 'change' && /^sections\.\d+\.items\.\d+\.(desc|product)$/.test(p)) catalogFill(p);
  touch(); refreshLive();
}
function catalogFill(p) {
  const base = p.replace(/\.(desc|product)$/, ''), it = getPath(S.cur, base), pt = S.cur.div === 'paints';
  const id = k => document.getElementById(`f-cur-${base.replace(/\./g, '-')}-${k}`);
  if (pt) {
    if (!p.endsWith('.product')) return;
    const hit = S.settings.paintCatalog.find(c => c.product && c.product.trim().toLowerCase() === (it.product || '').trim().toLowerCase());
    if (!hit) return;
    if (!(it.spec || '').trim() && hit.spec) { it.spec = hit.spec; if (id('spec')) id('spec').value = hit.spec; }
    if (!num(it.rate)) { it.rate = num(hit.rate); it.unit = 'sq.ft'; if (id('rate')) id('rate').value = it.rate; if (id('unit')) id('unit').value = it.unit; }
    return;
  }
  if (!p.endsWith('.desc')) return;
  const hit = S.settings.catalog.find(c => c.desc && c.desc.trim().toLowerCase() === (it.desc || '').trim().toLowerCase());
  if (!hit) return;
  if (!(it.spec || '').trim() && hit.spec) { it.spec = hit.spec; if (id('spec')) id('spec').value = hit.spec; }
  if (!num(it.rate)) { it.rate = num(hit.rate); it.unit = hit.unit; if (id('rate')) id('rate').value = it.rate; if (id('unit')) id('unit').value = it.unit; }
}

/* ================= boot ================= */
let namesKey = '';
function resolveNames() {
  if (!S.user) return;
  const set = new Set();
  S.quotes.forEach(q => q.createdBy && set.add(q.createdBy));
  S.leads.forEach(l => { if (l.createdBy) set.add(l.createdBy); (l.log || []).forEach(e => e.by && set.add(e.by)); });
  const ids = [...set].sort(), key = ids.join(',');
  if (!ids.length || key === namesKey) return;
  namesKey = key;
  S.user.profiles(ids).then(ps => { ids.forEach(id => { S.names[id] = (ps[id] && ps[id].name) || ''; }); refreshHome(); if (S.view === 'lead') paintLog(); }).catch(() => { });
}
async function boot() {
  render();
  const use = n => (window.claude && window.claude.use) ? window.claude.use(n).catch(() => null) : Promise.resolve(null);
  const [db, assets, user, dl] = await Promise.all([use('db'), use('assets'), use('user'), use('downloads')]);
  S.db = db; S.assets = assets; S.user = user; S.dl = dl;
  if (!db) { S.noDb = true; render(); return; }
  if (user) { try { const me = await user.me(); S.me = { id: me.id, name: me.name, username: me.username }; S.isOwner = !!me.isOwner; S.role = me.role; S.perms = me.perms; } catch { } }
  db.collection('quotes').onSnapshot(snap => {
    const m = new Map();
    snap.docs.forEach(d => m.set(d.id, normalize({ ...clone(d.data()), id: d.id })));
    S.quotes = m; S.loaded = true; resolveNames(); refreshHome();
  }, err => { console.error(err); S.loaded = true; refreshHome(); });
  db.collection('leads').onSnapshot(snap => {
    const m = new Map();
    snap.docs.forEach(d => m.set(d.id, normLead({ ...clone(d.data()), id: d.id })));
    S.leads = m; S.lloaded = true; resolveNames();
    if (S.view === 'lead' && S.lead && !S.lNew) { const r = m.get(S.lead.id); if (r) { S.lead.log = r.log; paintLog(); } }
    refreshHome();
  }, err => { console.error(err); S.lloaded = true; refreshHome(); });
  db.doc('settings/company').onSnapshot(snap => {
    if (snap.exists) { S.settings = mergeSettings(clone(snap.data())); refreshBar(); }
  }, err => console.error(err));
  render();
}
document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && b.tagName !== 'SELECT') act(b); });
document.addEventListener('input', onField);
document.addEventListener('change', onField);
window.addEventListener('resize', fitDoc);
boot();
})();
