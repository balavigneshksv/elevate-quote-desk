
/* ================= editor: shared bits ================= */
const objOf = root => root === 'cur' ? S.cur : root === 'lead' ? S.lead : S.set;
function fld(root, path, label, o = {}) {
  const obj = objOf(root);
  const v = getPath(obj, path);
  const id = `f-${root}-${path.replace(/\./g, '-')}`;
  const attrs = `id="${id}" data-root="${root}" data-p="${path}"${o.num ? ' data-num="1"' : ''}${o.lines ? ' data-lines="1"' : ''}`;
  let inner;
  const val = o.lines && Array.isArray(v) ? v.join('\n') : (v ?? '');
  if (o.area) inner = `<textarea class="text" rows="${o.rows || 3}" ${attrs} placeholder="${esc(o.ph || '')}">${esc(val)}</textarea>`;
  else if (o.sel) inner = `<select class="text" ${attrs}>${o.sel.map(x => { const [ov, ol] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(ov)}" ${ov === v ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select>`;
  else inner = `<input class="text ${o.num ? 'num' : ''}" type="${o.type || (o.num ? 'number' : 'text')}" ${o.num ? 'step="any" min="0" inputmode="decimal"' : ''} ${o.list ? `list="${o.list}"` : ''} ${attrs} value="${esc(val)}" placeholder="${esc(o.ph || '')}" autocomplete="off">`;
  return `<div class="f ${o.cls || ''}">${label ? `<label for="${id}">${label}</label>` : ''}${inner}</div>`;
}
const delBtn = (act, extra = '', t = 'Remove') => `<button class="btn ghost icon danger" data-act="${act}" ${extra} title="${t}" aria-label="${t}">${ic('trash')}</button>`;
const toggle = (root, path, checked, title, hint) => `<label class="toggle"><input type="checkbox" data-root="${root}" data-p="${path}" ${checked ? 'checked' : ''}><span><b>${title}</b>${hint ? `<br><span class="hint">${hint}</span>` : ''}</span></label>`;
const teamList = () => `<datalist id="team">${(S.settings.team || []).filter(Boolean).map(t => `<option value="${esc(t)}">`).join('')}</datalist>`;

/* ================= quotation editor ================= */
function editHtml() {
  const q = S.cur, isQ = q.type === 'quote', pt = q.div === 'paints';
  const word = pt ? (isQ ? 'Estimate' : 'Bill') : (isQ ? 'Quotation' : 'Bill');
  const lead = q.leadId ? S.leads.get(q.leadId) : null;
  return `<div class="edbar">
      <button class="btn ghost" data-act="back">${ic('back')}${DIVN[q.div]}</button><div class="grow"></div>
      <span class="savestate" id="savestate"></span>
      <button class="btn primary" data-act="to-preview" data-kind="quote">${ic('eye')}Preview &amp; PDF</button></div>
    <div class="pagehead"><div><h1>${word} <span class="num">${esc(q.no)}</span>${q.rev ? `<span class="tag lg">Revision ${q.rev}</span>` : ''}</h1>
      <p class="sub">Everything here stays editable, before and after the client confirms. Changes save automatically and the layout stays fixed.</p></div></div>
    ${teamList()}
    <datalist id="rooms">${S.settings.rooms.map(r => `<option value="${esc(r)}">`).join('')}</datalist>
    <datalist id="catalog">${S.settings.catalog.map(c => `<option value="${esc(c.desc)}">`).join('')}</datalist>
    <datalist id="pcat">${S.settings.paintCatalog.map(c => `<option value="${esc(c.product)}">`).join('')}</datalist>
    <datalist id="pareas">${S.settings.paintAreas.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
    <div class="edgrid"><div>
      ${clientBlock(q, isQ, pt)}
      ${pt ? visitBlock(q) : ''}
      ${includeBlock(q, pt)}
      ${pt ? healthBlock(q) + photosBlock(q) + areasBlock(q) + toolsBlock(q) : roomsBlock(q)}
      ${adjustBlock(q)}
      ${isQ ? scheduleBlock(q) : paymentsBlock(q)}
      <section class="blk"><h2>Notes &amp; terms</h2><div class="fgrid">
        ${fld('cur', 'notes', `Notes for the client (shown on the ${pt ? 'quotation' : 'summary'} page)`, { cls: 's6', area: true, rows: 3, ph: 'Anything special: site conditions, exclusions, delivery timeline…' })}
        ${fld('cur', 'terms', 'Terms and conditions (one per line)', { cls: 's6', area: true, rows: 7 })}
      </div></section>
      ${dealBlock(q, pt)}
    </div>
    <aside class="side">
      <section class="blk"><h2>Tracking</h2>
        <div class="f"><label for="f-status">Status</label><select id="f-status" class="pill ${stClass(q.status)}" data-root="cur" data-p="status">${STATUS[q.type].map(([v, l]) => `<option value="${v}" ${v === q.status ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="f" style="margin-top:12px"><label for="f-followUp">Follow up on</label><input class="text" type="date" id="f-followUp" data-root="cur" data-p="followUp" value="${esc(q.followUp)}"></div>
        <div class="chips" style="margin-top:8px">${[[1, 'Tomorrow'], [3, '+3 days'], [7, '+1 week']].map(([n, l]) => `<button class="chip" data-act="qfu" data-days="${n}">${l}</button>`).join('')}</div>
        ${lead ? `<p class="hint" style="margin-top:12px">Lead: <button class="linkbtn" data-act="open-lead" data-id="${lead.id}">${esc(lead.name || 'Unnamed lead')}</button></p>` : ''}
      </section>
      <section class="blk"><h2>Live total</h2><div id="live"></div></section>
      <section class="blk"><h2>Documents</h2>
        <div class="stack">
          <button class="btn" data-act="to-preview" data-kind="quote">${ic('eye')}${word} preview</button>
          ${isQ && can('deals') ? `<button class="btn" data-act="to-preview" data-kind="wo">${ic('file')}Work order</button><button class="btn" data-act="to-preview" data-kind="ag">${ic('file')}Agreement</button>` : ''}
          ${isQ && !S.isNew ? `<button class="btn" data-act="revise" data-id="${q.id}">${ic('rev')}Save as new revision</button>` : ''}
        </div>
        ${isQ ? '<p class="hint" style="margin-top:8px">A revision keeps this version as it was and opens a fresh copy to change.</p>' : ''}
      </section>
    </aside></div>`;
}
function clientBlock(q, isQ, pt) {
  return `<section class="blk"><h2>Client &amp; project</h2><div class="fgrid">
    ${fld('cur', 'client.name', 'Client name', { cls: 's3', ph: 'e.g. Mr. Arun Kumar' })}
    ${fld('cur', 'client.phone', 'Phone', { cls: 's3' })}
    ${fld('cur', 'title', isQ ? (pt ? 'Subject' : 'Project') : 'Bill for', { cls: 's3', ph: pt ? 'Interior and exterior painting' : '3 BHK interiors, Anna Nagar' })}
    ${fld('cur', 'client.email', 'Email', { cls: 's3' })}
    ${fld('cur', 'site', pt ? 'Customer address / site' : 'Site address', { cls: 's6' })}
    ${fld('cur', 'no', isQ ? (pt ? 'Estimate no.' : 'Quotation no.') : 'Bill no.', { cls: 's2' })}
    ${fld('cur', 'date', 'Date', { cls: 's2', type: 'date' })}
    ${isQ ? fld('cur', 'validUntil', 'Valid until', { cls: 's2', type: 'date' }) : '<div class="s2"></div>'}
  </div></section>`;
}
function visitBlock(q) {
  return `<section class="blk"><h2>Site visit &amp; schedule</h2><div class="fgrid">
    ${fld('cur', 'paint.visitDate', 'Date of site visit', { cls: 's2', type: 'date' })}
    ${fld('cur', 'paint.visitedBy', 'Visited by', { cls: 's2', list: 'team' })}
    ${fld('cur', 'paint.city', 'City', { cls: 's2' })}
    ${fld('cur', 'paint.tier', 'Service tier', { cls: 's2', sel: S.settings.tiers.length ? S.settings.tiers : ['Classic'] })}
    ${fld('cur', 'paint.basis', 'Area basis', { cls: 's2', sel: RATE_BASIS })}
    ${fld('cur', 'paint.days', 'Working days', { cls: 's2', num: true })}
    ${fld('cur', 'paint.start', 'Start date', { cls: 's3', type: 'date' })}
    ${fld('cur', 'paint.end', 'End date', { cls: 's3', type: 'date' })}
  </div></section>`;
}
function includeBlock(q, pt) {
  return `<section class="blk"><h2>What to include <small>Switch parts off for a small job</small></h2>
    ${toggle('cur', 'opts.cover', q.opts.cover, 'Cover page with company introduction', 'Full first page with client name and project title.')}
    ${toggle('cur', 'opts.why', q.opts.why, '“Why choose us” points on the cover')}
    ${pt ? toggle('cur', 'opts.health', q.opts.health, 'Site health card', 'The symptoms recorded at the site, with recommendations.') + toggle('cur', 'opts.photos', q.opts.photos, 'Site photos')
      : toggle('cur', 'opts.annexure', q.opts.annexure, 'Annexure with photos and specifications', 'One page per room, after the summary.')}
  </section>`;
}
/* --- interiors rooms --- */
function roomsBlock(q) {
  return `<section class="blk"><h2>Rooms &amp; items</h2>
    <div id="secs">${q.sections.map((s, i) => secHtml(s, i)).join('')}</div>
    <div class="lbl">Add a room or section</div>
    <div class="presets">${S.settings.rooms.map(r => `<button class="chip" data-act="add-sec" data-name="${esc(r)}">+ ${esc(r)}</button>`).join('')}<button class="chip" data-act="add-sec" data-name="">+ Other</button></div>
  </section>`;
}
function secTools(si, n) {
  return `<div class="sec-tools">
    <button class="btn ghost icon" data-act="up-sec" data-si="${si}" title="Move up" aria-label="Move up" ${si === 0 ? 'disabled' : ''}>${ic('up')}</button>
    <button class="btn ghost icon" data-act="down-sec" data-si="${si}" title="Move down" aria-label="Move down" ${si === n - 1 ? 'disabled' : ''}>${ic('down')}</button>
    ${delBtn('del-sec', `data-si="${si}"`, 'Delete this section')}</div>`;
}
function secHtml(s, si) {
  const pre = `sections.${si}`, n = S.cur.sections.length;
  const hero = s.hero
    ? `<img src="/_blob/${esc(s.hero)}" alt=""><span>Cover image for this room's annexure page</span><button class="btn small" data-act="add-hero" data-si="${si}">Replace</button><button class="btn small ghost" data-act="del-hero" data-si="${si}">Remove</button>`
    : `<span>Optional cover image for this room's annexure page</span><button class="btn small" data-act="add-hero" data-si="${si}">${ic('img')}Add image</button>`;
  return `<div class="sec">
    <div class="sec-h">
      <div class="ann" title="Annexure ${letter(si)}">${letter(si)}</div>
      ${fld('cur', pre + '.name', 'Room / section', { list: 'rooms', ph: 'e.g. Master Bedroom', cls: 'sec-name' })}
      ${fld('cur', pre + '.dims', 'Size / note', { ph: `12' × 14'`, cls: 'sec-dims' })}
      <div class="sub"><small>Section total</small><span id="sub-${si}"></span></div>
      ${secTools(si, n)}
    </div>
    <div class="hero-row">${hero}</div>
    ${s.items.map((it, ii) => itemHtml(it, si, ii, s.items.length)).join('')}
    <div class="addbar"><button class="btn small" data-act="add-item" data-si="${si}">${ic('plus')}Add item</button></div>
  </div>`;
}
const itemTools = (si, ii, n) => `<div class="it-tools">
  <button class="btn ghost icon" data-act="up-item" data-si="${si}" data-ii="${ii}" title="Move up" aria-label="Move up" ${ii === 0 ? 'disabled' : ''}>${ic('up')}</button>
  <button class="btn ghost icon" data-act="down-item" data-si="${si}" data-ii="${ii}" title="Move down" aria-label="Move down" ${ii === n - 1 ? 'disabled' : ''}>${ic('down')}</button>
  ${delBtn('del-item', `data-si="${si}" data-ii="${ii}"`, 'Delete item')}</div>`;
function itemHtml(it, si, ii, n) {
  const p = `sections.${si}.items.${ii}`;
  return `<div class="it">
    <div class="it-g">
      ${fld('cur', p + '.desc', 'Item', { list: 'catalog', ph: 'e.g. Sliding wardrobe' })}
      ${fld('cur', p + '.size', 'Size', { ph: `8' × 7'` })}
      ${fld('cur', p + '.qty', 'Qty', { num: true })}
      ${fld('cur', p + '.unit', 'Unit', { sel: UNITS })}
      ${fld('cur', p + '.rate', 'Rate (₹)', { num: true })}
      <div class="f"><label>Amount</label><div class="it-amt" id="amt-${si}-${ii}"></div></div>
    </div>
    <div class="it-2">
      ${fld('cur', p + '.spec', 'Specification: material, finish, hardware', { area: true, rows: 2 })}
      <div style="padding-top:20px">${itemTools(si, ii, n)}</div>
    </div>
    <div class="thumbs" style="margin-top:10px">
      ${(it.imgs || []).map((id, k) => `<div class="thumb"><img src="/_blob/${esc(id)}" alt=""><button data-act="del-img" data-si="${si}" data-ii="${ii}" data-k="${k}" aria-label="Remove photo">×</button></div>`).join('')}
      ${(it.imgs || []).length < 3 ? `<button class="addimg" data-act="add-img" data-si="${si}" data-ii="${ii}">${ic('img')}Add photo</button>` : ''}
    </div>
  </div>`;
}
/* --- paints --- */
function healthBlock(q) {
  const areas = q.health.map((h, hi) => {
    const p = `health.${hi}`;
    return `<div class="sec"><div class="sec-h hh">
      ${fld('cur', p + '.area', 'Surface type', { sel: ['Interior', 'Exterior', 'Terrace', 'Other'] })}
      ${fld('cur', p + '.name', 'Area / rooms', { ph: 'e.g. Hall, bedrooms, kitchen' })}
      ${delBtn('del-health', `data-i="${hi}"`, 'Delete this area')}</div>
      <div class="it">${(h.rows || []).map((r, ri) => `<div class="rowtab rt-hl">
        ${fld('cur', `${p}.rows.${ri}.sym`, ri ? '' : 'Symptom')}${fld('cur', `${p}.rows.${ri}.sev`, ri ? '' : 'Severity', { sel: [['', '—'], ['Low', 'Low'], ['Medium', 'Medium'], ['High', 'High']] })}
        ${fld('cur', `${p}.rows.${ri}.area`, ri ? '' : 'Affected area (sq.ft)')}${fld('cur', `${p}.rows.${ri}.rec`, ri ? '' : 'Recommendation')}${delBtn('del-hrow', `data-i="${hi}" data-k="${ri}"`)}</div>`).join('')}
        <button class="btn small" data-act="add-hrow" data-i="${hi}">${ic('plus')}Add symptom</button>
        <div style="margin-top:10px">${fld('cur', p + '.obs', 'Observations', { area: true, rows: 2 })}</div></div></div>`;
  }).join('');
  return `<section class="blk"><h2>Site health card <small>Record what you see at the site. Only rows with something filled in are printed.</small></h2>
    ${areas || '<p class="hint" style="margin-bottom:10px">No areas yet. Add one below for each surface type you inspected.</p>'}
    <div class="lbl">Add an area</div><div class="presets">${['Interior', 'Exterior', 'Terrace', 'Other'].map(k => `<button class="chip" data-act="add-health" data-kind="${k}">+ ${k}</button>`).join('')}</div></section>`;
}
function photosBlock(q) {
  return `<section class="blk"><h2>Site photos <small>Shown on their own page of the estimate</small></h2><div class="pgrid">
    ${q.photos.map((p, i) => `<div class="pcard"><div class="thumb big"><img src="/_blob/${esc(p.id)}" alt=""><button data-act="del-photo" data-i="${i}" aria-label="Remove photo">×</button></div>${fld('cur', `photos.${i}.cap`, '', { ph: 'Caption (optional)' })}</div>`).join('')}
    <button class="addimg big" data-act="add-photos">${ic('img')}Add photos</button></div></section>`;
}
function areasBlock(q) {
  const n = q.sections.length;
  return `<section class="blk"><h2>Areas &amp; painting systems <small>The rate is per sq.ft. Choosing an Asian Paints product fills the painting system and rate from your catalog.</small></h2>
    <div id="secs">${q.sections.map((s, si) => `<div class="sec">
      <div class="sec-h ph">
        <div class="ann" title="Area ${letter(si)}">${letter(si)}</div>
        ${fld('cur', `sections.${si}.name`, 'Area', { list: 'pareas', ph: 'e.g. Exterior', cls: 'sec-name' })}
        <div class="sub"><small>Area total</small><span id="sub-${si}"></span></div>
        ${secTools(si, n)}
      </div>
      ${s.items.map((it, ii) => paintItemHtml(it, si, ii, s.items.length)).join('')}
      <div class="addbar"><button class="btn small" data-act="add-item" data-si="${si}">${ic('plus')}Add surface</button></div>
    </div>`).join('')}</div>
    <div class="lbl">Add an area</div><div class="presets">${S.settings.paintAreas.map(r => `<button class="chip" data-act="add-sec" data-name="${esc(r)}">+ ${esc(r)}</button>`).join('')}<button class="chip" data-act="add-sec" data-name="">+ Other</button></div>
  </section>`;
}
function paintItemHtml(it, si, ii, n) {
  const p = `sections.${si}.items.${ii}`;
  return `<div class="it"><div class="it-g pt">
      ${fld('cur', p + '.desc', 'Paintable surface', { ph: 'e.g. Exterior walls' })}
      ${fld('cur', p + '.product', 'Asian Paints product', { list: 'pcat', ph: 'e.g. Tractor Emulsion' })}
      ${fld('cur', p + '.qty', 'Area', { num: true })}
      ${fld('cur', p + '.unit', 'Unit', { sel: UNITS })}
      ${fld('cur', p + '.rate', 'Rate (₹)', { num: true })}
      <div class="f"><label>Cost</label><div class="it-amt" id="amt-${si}-${ii}"></div></div></div>
    <div class="it-2">${fld('cur', p + '.spec', 'Painting system (coats and preparation)', { area: true, rows: 2 })}<div style="padding-top:20px">${itemTools(si, ii, n)}</div></div></div>`;
}
function toolsBlock(q) {
  return `<section class="blk"><h2>Tools &amp; extras <small>Charged only where a quantity is entered</small></h2>
    ${(q.tools || []).map((t, i) => `<div class="rowtab rt-tool">${fld('cur', `tools.${i}.name`, i ? '' : 'Item')}${fld('cur', `tools.${i}.qty`, i ? '' : 'Quantity', { num: true })}${fld('cur', `tools.${i}.rate`, i ? '' : 'Rate (₹)', { num: true })}<div class="f">${i ? '' : '<label>Amount</label>'}<div class="it-amt" style="text-align:left" id="tamt-${i}"></div></div>${delBtn('del-tool', `data-i="${i}"`)}</div>`).join('')}
    <button class="btn small" data-act="add-tool">${ic('plus')}Add item</button></section>`;
}
/* --- shared --- */
function adjustBlock(q) {
  return `<section class="blk"><h2>Price adjustments</h2><div class="fgrid">
    ${fld('cur', 'discount.mode', 'Discount type', { cls: 's2', sel: [['pct', 'Percent (%)'], ['flat', 'Flat amount (₹)']] })}
    ${fld('cur', 'discount.value', 'Discount (% or ₹)', { cls: 's2', num: true })}
    <div class="f s1"><label for="o-gst">GST</label><label class="toggle" style="padding:8px 0"><input type="checkbox" id="o-gst" data-root="cur" data-p="gstOn" ${q.gstOn ? 'checked' : ''}><span>On</span></label></div>
    ${fld('cur', 'gstPct', 'GST %', { cls: 's1', num: true })}
  </div></section>`;
}
function scheduleBlock(q) {
  return `<section class="blk"><h2>Payment schedule <small>Printed below the summary</small></h2><div id="sched">
    ${q.schedule.map((r, i) => `<div class="rowtab rt-sch">
      ${fld('cur', `schedule.${i}.label`, i === 0 ? 'Stage' : '')}${fld('cur', `schedule.${i}.pct`, i === 0 ? '%' : '', { num: true })}
      <div class="f">${i === 0 ? '<label>Amount</label>' : ''}<div class="it-amt" style="text-align:left" id="sch-${i}"></div></div>${fld('cur', `schedule.${i}.date`, i === 0 ? 'Milestone date' : '', { type: 'date' })}${delBtn('del-sch', `data-i="${i}"`)}</div>`).join('')}
    </div><button class="btn small" data-act="add-sch">${ic('plus')}Add stage</button><p class="hint" id="sch-hint" style="margin-top:8px"></p></section>`;
}
function paymentsBlock(q) {
  return `<section class="blk"><h2>Payments received</h2><div>
    ${q.payments.map((r, i) => `<div class="rowtab rt-pay">
      ${fld('cur', `payments.${i}.date`, i === 0 ? 'Date' : '', { type: 'date' })}${fld('cur', `payments.${i}.amount`, i === 0 ? 'Amount (₹)' : '', { num: true })}
      ${fld('cur', `payments.${i}.mode`, i === 0 ? 'Mode' : '', { sel: ['UPI', 'Bank transfer', 'Cash', 'Cheque'] })}${fld('cur', `payments.${i}.note`, i === 0 ? 'Reference' : '')}${delBtn('del-pay', `data-i="${i}"`)}</div>`).join('')}
    </div><button class="btn small" data-act="add-pay">${ic('plus')}Record a payment</button></section>`;
}
/* --- work order & agreement settings --- */
function ensureDealNo(kind, pt) {
  const pre = (pt ? 'P' : '') + kind, d = new Date(), key = `${pre}-${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1, 2)}-`;
  let max = 0;
  for (const q of S.quotes.values()) { const n = q.deal && q.deal[kind === 'WO' ? 'woNo' : 'agNo']; if (n && n.startsWith(key)) max = Math.max(max, parseInt(n.slice(key.length), 10) || 0); }
  return key + pad(max + 1);
}
function newDeal(q) {
  const st = S.settings, pt = q.div === 'paints', t = today(), p = q.paint || {};
  return {
    amountAuto: true, amount: calc(q).total, gst: q.gstOn ? 'incl' : 'na',
    woNo: ensureDealNo('WO', pt), woDate: t, agNo: ensureDealNo('AG', pt), agDate: t,
    start: p.start || '', end: p.end || '', days: p.days || '', place: st.place || '', jurisdiction: st.jurisdiction || '', warranty: num(st.warrantyMonths) || 12,
    signatory: '', clientSig: '', woNotes: st.woNotes || '', clauses: clone(pt ? st.paintAgreementClauses : st.agreementClauses)
  };
}
function dealBlock(q, pt) {
  if (q.type !== 'quote' || !can('deals')) return '';
  const word = pt ? 'estimate' : 'quotation';
  if (!q.deal) return `<section class="blk" id="deal"><h2>Work order &amp; agreement</h2>
    <p class="hint" style="margin-bottom:12px">When the client confirms, prepare the work order and agreement here. They are filled in from this ${word}, you can set a different contract amount, and everything stays editable and downloadable.</p>
    <button class="btn primary" data-act="make-deal">${ic('file')}Prepare work order &amp; agreement</button></section>`;
  const d = q.deal, auto = d.amountAuto !== false;
  const clauses = (d.clauses || []).map((c, i) => `<div class="clause"><div class="cl-n">${i + 1}</div><div class="cl-f">
      ${fld('cur', `deal.clauses.${i}.t`, '')}${fld('cur', `deal.clauses.${i}.d`, '', { area: true, rows: 3 })}</div>
      <div class="it-tools" style="flex-direction:column"><button class="btn ghost icon" data-act="up-cl" data-i="${i}" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${ic('up')}</button><button class="btn ghost icon" data-act="down-cl" data-i="${i}" aria-label="Move down" ${i === d.clauses.length - 1 ? 'disabled' : ''}>${ic('down')}</button>${delBtn('del-cl', `data-i="${i}"`, 'Delete clause')}</div></div>`).join('');
  return `<section class="blk" id="deal"><h2>Work order &amp; agreement <small>Editable at any time. Preview them, then download as Word or save as PDF.</small></h2>
    <div class="fgrid">
      <div class="f s3"><label>Contract amount</label>
        <label class="toggle" style="padding:4px 0"><input type="checkbox" data-root="cur" data-p="deal.amountAuto" ${auto ? 'checked' : ''}><span>Same as the ${word} total <b id="deal-amt"></b></span></label>
        ${auto ? '' : fld('cur', 'deal.amount', '', { num: true })}</div>
      ${fld('cur', 'deal.gst', 'GST on this amount', { cls: 's3', sel: [['incl', 'Amount includes GST'], ['excl', 'Amount is plus GST'], ['na', 'No GST mentioned']] })}
      ${fld('cur', 'deal.woNo', 'Work order no.', { cls: 's2' })}${fld('cur', 'deal.woDate', 'Work order date', { cls: 's2', type: 'date' })}${fld('cur', 'deal.place', 'Place of signing', { cls: 's2' })}
      ${fld('cur', 'deal.agNo', 'Agreement no.', { cls: 's2' })}${fld('cur', 'deal.agDate', 'Agreement date', { cls: 's2', type: 'date' })}${fld('cur', 'deal.jurisdiction', 'Court jurisdiction (city)', { cls: 's2' })}
      ${fld('cur', 'deal.start', 'Start date', { cls: 's2', type: 'date' })}${fld('cur', 'deal.end', 'Completion date', { cls: 's2', type: 'date' })}${fld('cur', 'deal.days', 'Working days', { cls: 's1', num: true })}${fld('cur', 'deal.warranty', 'Warranty (months)', { cls: 's1', num: true })}
      ${fld('cur', 'deal.signatory', 'Signing for the company', { cls: 's3', ph: 'Name and designation' })}${fld('cur', 'deal.clientSig', 'Signing for the client, if different', { cls: 's3', ph: 'Leave empty to use the client name' })}
      ${fld('cur', 'deal.woNotes', 'Special instructions on the work order', { cls: 's6', area: true, rows: 3 })}
    </div>
    <div class="lbl" style="margin:18px 0 6px">Agreement clauses</div>
    <p class="hint" style="margin-bottom:10px">Edit, reorder or delete any clause. These words fill in automatically: {client} {company} {site} {quote} {qdate} {amount} {words} {gst} {start} {end} {days} {warranty} {jurisdiction}.</p>
    ${clauses}
    <div class="btnrow" style="margin-top:8px"><button class="btn small" data-act="add-cl">${ic('plus')}Add clause</button><button class="btn small ghost" data-act="reset-cl">Restore default clauses</button></div>
    <div class="btnrow" style="margin-top:16px"><button class="btn primary" data-act="to-preview" data-kind="wo">${ic('file')}Work order</button><button class="btn primary" data-act="to-preview" data-kind="ag">${ic('file')}Agreement</button></div>
  </section>`;
}
/* --- live figures --- */
function liveHtml(q) {
  const c = calc(q), pt = q.div === 'paints';
  const secs = c.secs.map((x, i) => `<div class="live-row"><span>${letter(i)} · ${esc(x.s.name || 'Untitled')}</span><span>${inr(x.sub)}</span></div>`).join('');
  return `${secs || `<p class="hint">Add ${pt ? 'an area' : 'a room'} to start.</p>`}
    ${c.tools ? `<div class="live-row"><span>Tools &amp; extras</span><span>${inr(c.tools)}</span></div>` : ''}
    <div class="live-row" style="border-top:1px solid var(--line);margin-top:6px;padding-top:8px"><span>Subtotal</span><span>${inr(c.sub)}</span></div>
    ${c.disc ? `<div class="live-row"><span>Discount</span><span>− ${inr(c.disc)}</span></div>` : ''}
    ${q.gstOn ? `<div class="live-row"><span>GST @ ${num(q.gstPct)}%</span><span>${inr(c.gst)}</span></div>` : ''}
    <div class="live-row tot"><span>Total</span><span>${inr(c.total)}</span></div>
    ${q.type === 'bill' ? `<div class="live-row sm"><span>Received</span><span>${inr(c.paid)}</span></div><div class="live-row"><span><b>Balance due</b></span><span><b>${inr(c.balance)}</b></span></div>` : ''}`;
}
function refreshLive() {
  const q = S.cur;
  if (!q || S.view !== 'edit') return;
  const c = calc(q);
  q.sections.forEach((s, si) => {
    s.items.forEach((it, ii) => { const e = $(`#amt-${si}-${ii}`); if (e) e.textContent = inr(num(it.qty) * num(it.rate)); });
    const e = $(`#sub-${si}`); if (e) e.textContent = inr(c.secs[si] ? c.secs[si].sub : 0);
  });
  (q.tools || []).forEach((t, i) => { const e = $('#tamt-' + i); if (e) e.textContent = inr(num(t.qty) * num(t.rate)); });
  const live = $('#live'); if (live) live.innerHTML = liveHtml(q);
  const da = $('#deal-amt'); if (da) da.textContent = inr(c.total);
  if (q.type === 'quote') {
    q.schedule.forEach((r, i) => { const e = $('#sch-' + i); if (e) e.textContent = inr(c.total * num(r.pct) / 100); });
    const tot = q.schedule.reduce((a, r) => a + num(r.pct), 0), h = $('#sch-hint');
    if (h) { h.textContent = q.schedule.length ? (tot === 100 ? '' : `Stages add up to ${tot}%. They should total 100%.`) : ''; h.classList.toggle('warn', tot !== 100); }
  }
}

/* ================= lead editor ================= */
const linkedQuotes = l => [...S.quotes.values()].filter(q => q.leadId === l.id).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
function leadHtml() {
  const l = S.lead, pt = l.div === 'paints', div = l.div;
  const stageOpts = LEAD_STAGES[div].map(([v, t]) => `<option value="${v}" ${v === l.stage ? 'selected' : ''}>${t}</option>`).join('');
  const qs = linkedQuotes(l), word = pt ? 'estimate' : 'quotation';
  const req = pt
    ? `${fld('lead', 'scope', 'Work wanted', { cls: 's2', sel: [['', 'Select'], ...PAINT_SCOPES] })}${fld('lead', 'area', 'Approx. area (sq.ft)', { cls: 's2', num: true })}<div class="s2"></div>`
    : `${fld('lead', 'propType', 'Property / work', { cls: 's2', sel: [['', 'Select'], ...PROP_TYPES] })}${fld('lead', 'budget', 'Budget', { cls: 's2', ph: 'e.g. 12–15 lakh' })}<div class="s2"></div>`;
  return `<div class="edbar"><button class="btn ghost" data-act="back-lead">${ic('back')}${DIVN[div]} leads</button><div class="grow"></div>
      <span class="savestate" id="savestate"></span></div>
    <div class="pagehead"><div><h1>${esc(l.name || 'New lead')}<span class="dtag ${div} lg">${DIVN[div]}</span></h1>
      <p class="sub">Added ${fmtDate(isoDate(new Date(l.createdAt || Date.now())))}${l.createdBy && nameOf(l.createdBy) ? ' by ' + esc(nameOf(l.createdBy)) : ''}. Progress notes below are visible to the owner.</p></div></div>
    ${teamList()}
    <div class="edgrid"><div>
      <section class="blk"><h2>Customer</h2><div class="fgrid">
        ${fld('lead', 'name', 'Name', { cls: 's3', ph: 'e.g. Mr. Arun Kumar' })}${fld('lead', 'phone', 'Phone', { cls: 's3' })}
        ${fld('lead', 'email', 'Email', { cls: 's3' })}${fld('lead', 'city', 'City / area', { cls: 's3' })}
        ${fld('lead', 'address', 'Site address', { cls: 's6' })}
        ${fld('lead', 'source', 'Lead source', { cls: 's3', sel: LEAD_SOURCES })}${fld('lead', 'assignee', 'Handled by', { cls: 's3', list: 'team' })}
      </div></section>
      <section class="blk"><h2>Requirement</h2><div class="fgrid">${req}
        ${fld('lead', 'requirement', 'What the customer wants', { cls: 's6', area: true, rows: 3, ph: pt ? 'Rooms, exterior, colours, timeline…' : 'Rooms, style, timeline, must-haves…' })}</div></section>
      ${pt ? ratesBlock(l) : ''}
      <section class="blk" id="log-blk"><h2>Progress &amp; questions</h2>
        <div class="composer"><textarea id="log-text" class="text" rows="3" placeholder="${S.isOwner ? 'Write an update, or ask your team a question…' : 'What happened? What did the customer say? What is the next step?'}"></textarea>
          <div class="btnrow"><button class="btn primary" data-act="log-add">Post update</button>${S.isOwner ? '<button class="btn" data-act="log-ask">Ask a question</button>' : ''}</div></div>
        <div id="lead-log"></div></section>
    </div>
    <aside class="side">
      <section class="blk"><h2>Tracking</h2>
        <div class="f"><label for="f-lead-stage">Stage</label><select id="f-lead-stage" class="pill ${stClass(l.stage)}" data-root="lead" data-p="stage">${stageOpts}</select></div>
        <div class="f" style="margin-top:12px"><label for="f-lead-followUp">Follow up on</label><input class="text" type="date" id="f-lead-followUp" data-root="lead" data-p="followUp" value="${esc(l.followUp)}"></div>
        <div class="chips" style="margin-top:8px">${[[1, 'Tomorrow'], [3, '+3 days'], [7, '+1 week']].map(([n, t]) => `<button class="chip" data-act="lfu" data-days="${n}">${t}</button>`).join('')}</div>
        ${l.stage === 'lost' ? `<div style="margin-top:12px">${fld('lead', 'lostReason', 'Why was it lost?', { ph: 'Price, timing, chose someone else…' })}</div>` : ''}
      </section>
      <section class="blk"><h2>Contact</h2><div class="btnrow">${phoneDigits(l.phone) ? `<a class="btn" href="tel:+${phoneDigits(l.phone)}">${ic('phone')}Call</a><a class="btn" href="https://wa.me/${phoneDigits(l.phone)}?text=${encodeURIComponent(leadMsg(l))}" target="_blank" rel="noopener">${ic('chat')}WhatsApp</a>` : '<span class="hint">Add a phone number to call or message.</span>'}</div>
        ${phoneDigits(l.phone) ? '<p class="hint" style="margin-top:8px">The message button opens WhatsApp with a ready follow-up note.</p>' : ''}</section>
      ${can('quotes') ? `<section class="blk"><h2>${pt ? 'Estimates' : 'Quotations'}</h2>
        ${qs.length ? qs.map(q => `<div class="live-row"><span><button class="linkbtn" data-act="open" data-id="${q.id}">${esc(q.no)}</button> · ${esc(stLabel(q.type, q.status))}</span><span>${inr(calc(q).total)}</span></div>`).join('') : `<p class="hint" style="margin-bottom:10px">No ${word} for this lead yet.</p>`}
        <div class="btnrow" style="margin-top:10px"><button class="btn primary" data-act="quote-from-lead" ${S.lNew && !l.name ? 'disabled' : ''}>${ic('plus')}Create ${word}</button></div></section>` : ''}
      ${can('delete') && !S.lNew ? `<div class="btnrow"><button class="btn ghost danger" data-act="del-lead" data-id="${l.id}">${ic('trash')}Delete this lead</button></div>` : ''}
    </aside></div>`;
}
function ratesBlock(l) {
  return `<section class="blk"><h2>Rates given <small>Every per sq.ft rate quoted to this customer, with or without a site measurement</small></h2>
    ${(l.rates || []).map((r, i) => `<div class="rowtab rt-rate">
      ${fld('lead', `rates.${i}.date`, i ? '' : 'Date', { type: 'date' })}${fld('lead', `rates.${i}.perSqft`, i ? '' : 'Rate (₹/sq.ft)', { num: true })}
      ${fld('lead', `rates.${i}.basis`, i ? '' : 'How it was given', { sel: RATE_BASIS })}${fld('lead', `rates.${i}.area`, i ? '' : 'Measured area', { num: true })}
      <div class="f">${i ? '' : '<label>Value</label>'}<div class="it-amt" style="text-align:left" id="rate-${i}"></div></div>
      ${fld('lead', `rates.${i}.note`, i ? '' : 'Note')}${delBtn('del-rate', `data-i="${i}"`)}</div>`).join('') || '<p class="hint" style="margin-bottom:10px">No rate given yet. Record it the moment you quote a per sq.ft figure.</p>'}
    <button class="btn small" data-act="add-rate">${ic('plus')}Record a rate</button></section>`;
}
function refreshLeadCalc() {
  const l = S.lead;
  if (!l || S.view !== 'lead') return;
  const qb = $('[data-act="quote-from-lead"]'); if (qb) qb.disabled = !!(S.lNew && !(l.name || '').trim());
  (l.rates || []).forEach((r, i) => { const e = $('#rate-' + i); if (e) e.textContent = r.basis === 'measured' && num(r.area) && num(r.perSqft) ? inr(num(r.area) * num(r.perSqft)) : '—'; });
}
function paintLog() {
  const el = $('#lead-log'), l = S.lead;
  if (!el || !l) return;
  const log = [...(l.log || [])].reverse();
  const ask = leadAwaiting(l), lastQ = ask ? log.find(e => e.kind !== 'sys') : null;
  const banner = ask ? `<div class="askban"><b>${S.isOwner ? 'Waiting for your team’s reply' : 'The owner asked a question'}</b><span>“${esc(lastQ.text)}”</span>${S.isOwner ? '' : '<small>Reply by posting an update below.</small>'}</div>` : '';
  el.innerHTML = banner + (log.length ? log.map(e => e.kind === 'sys'
    ? `<div class="lgi sys"><span>${esc(e.text)}</span><small>${fmtStamp(e.at)}</small></div>`
    : `<div class="lgi ${e.kind}"><div class="lgi-h"><b>${esc(nameOf(e.by) || 'Team')}</b>${e.kind === 'question' ? '<span class="qtag">Question</span>' : ''}<small>${fmtStamp(e.at)}</small></div><p>${nl2br(e.text)}</p></div>`).join('') : '<p class="hint">No updates yet. Post the first one above.</p>');
}
function rerenderLead(focusId) {
  const y = window.scrollY, m = $('#main'), keep = $('#log-text') ? $('#log-text').value : '';
  if (!m || S.view !== 'lead') return;
  m.innerHTML = leadHtml();
  window.scrollTo(0, y);
  const t = $('#log-text'); if (t) t.value = keep;
  paintSave(); paintLog(); refreshLeadCalc();
  if (focusId) { const e = document.getElementById(focusId); if (e) e.focus(); }
}
