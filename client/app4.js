
/* ================= documents ================= */
function brandMark(sz = 28, ring) {
  return `<svg class="mark" width="${sz}" height="${sz}" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#121c45" ${ring ? `stroke="${ring}" stroke-width="1.4"` : ''}/><path d="M9.5 19.5 20 9.5l10.5 10" fill="none" stroke="#8cc9f2" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.5 31V20.5M14.5 31h11M14.5 25.7h8M14.5 20.5h11" fill="none" stroke="#8cc9f2" stroke-width="2.3" stroke-linecap="round"/></svg>`;
}
function brandBlock(mark) {
  const st = S.settings;
  const m = st.logo ? `<img class="logo" src="/_blob/${esc(st.logo)}" alt="">` : brandMark(mark || 30);
  return `<div class="brand">${m}<div><div class="bn">${esc(st.name)}</div><div class="bt">${esc(st.tagline)}</div></div></div>`;
}
const docLabel = q => q.type === 'bill' ? (q.gstOn ? 'Tax Invoice' : 'Invoice') : (q.div === 'paints' ? 'Service Estimate' : 'Quotation');
const liveItems = s => (s.items || []).filter(i => (i.desc || '').trim() || (i.product || '').trim() || num(i.rate));
const contactLine = () => [S.settings.phone, S.settings.email, S.settings.website].filter(Boolean).map(esc).join('  ·  ');

function docHtml(q) {
  const c = calc(q), label = docLabel(q);
  if (q.div === 'paints') {
    let out = '';
    if (q.opts.cover) out += paintCover(q, c);
    if (q.type === 'quote' && q.opts.health && (q.health || []).length) out += healthPage(q);
    if (q.type === 'quote' && q.opts.photos && (q.photos || []).length) out += photosPage(q);
    out += paintQuotePage(q, c, label);
    out += termsPage(q, c, label);
    return out;
  }
  let out = '';
  if (q.opts.cover) out += coverHtml(q, label);
  out += summaryHtml(q, c, label);
  if (q.opts.annexure) c.secs.forEach((x, i) => { out += annexHtml(x, i); });
  return out;
}
function pageHead(q, label) {
  const isQ = q.type === 'quote';
  return q.opts.cover
    ? `<div class="runhead">${brandBlock(22)}<span>${esc(label)} ${esc(q.no)}  ·  ${fmtDate(q.date)}</span></div>`
    : `<div class="lh">${brandBlock(34)}<div class="ref"><span class="eyebrow">${esc(label)}</span><b>${esc(q.no)}</b>${fmtDate(q.date)}${isQ && q.validUntil ? `<br>Valid until ${fmtDate(q.validUntil)}` : ''}</div></div>`;
}
/* --- shared money blocks --- */
function totalsHtml(q, c) {
  const isQ = q.type === 'quote';
  return `<div class="totals block-avoid">
    <div class="trow"><span>Sub-total</span><span>${inr2(c.sub)}</span></div>
    ${c.disc ? `<div class="trow neg"><span>Discount${q.discount.mode === 'pct' ? ` (${num(q.discount.value)}%)` : ''}</span><span>− ${inr2(c.disc)}</span></div>` : ''}
    ${c.disc && q.gstOn ? `<div class="trow"><span>Taxable value</span><span>${inr2(c.taxable)}</span></div>` : ''}
    ${q.gstOn ? `<div class="trow"><span>GST @ ${num(q.gstPct)}%</span><span>${inr2(c.gst)}</span></div>` : ''}
    ${Math.abs(c.round) >= 0.005 ? `<div class="trow"><span>Round off</span><span>${c.round < 0 ? '− ' : ''}${inr2(Math.abs(c.round))}</span></div>` : ''}
    <div class="grand"><span>${isQ ? (q.div === 'paints' ? 'Total estimate' : 'Total investment') : 'Total'}</span><b>${inr(c.total)}</b></div>
    <div class="inwords">Rupees ${words(c.total)} only${!q.gstOn && q.div === 'paints' ? '<br>* Cost excluding GST' : ''}</div>
    ${!isQ ? `<div class="balance"><span>Balance due</span><b>${inr(c.balance)}</b></div>` : ''}
  </div>`;
}
function scheduleDoc(q, c) {
  if (q.type === 'quote') {
    if (!(q.schedule || []).length) return '';
    return `<div class="block-avoid" style="margin-top:7mm"><div class="dh">Payment schedule</div>
      <table class="paytab"><thead><tr><th>Stage</th><th class="pc">Share</th><th class="am">Amount</th><th class="dd">Due by</th></tr></thead><tbody>
      ${q.schedule.map(r => `<tr><td>${esc(r.label)}</td><td class="pc">${num(r.pct)}%</td><td class="am">${inr(Math.round(c.total * num(r.pct) / 100))}</td><td class="dd">${r.date ? fmtDate(r.date) : '<span class="dash">To be confirmed</span>'}</td></tr>`).join('')}
      </tbody></table></div>`;
  }
  if (!(q.payments || []).length) return '';
  return `<div class="block-avoid" style="margin-top:7mm"><div class="dh">Payments received</div>
    <table class="paytab"><thead><tr><th>Date</th><th>Mode and reference</th><th class="am">Amount</th></tr></thead><tbody>
    ${q.payments.map(r => `<tr><td>${fmtDate(r.date)}</td><td>${esc(r.mode || '')}${r.note ? ' · ' + esc(r.note) : ''}</td><td class="am">${inr(num(r.amount))}</td></tr>`).join('')}
    </tbody></table></div>`;
}
function notesBank(q) {
  const st = S.settings;
  const bankTxt = [st.gstin ? 'GSTIN: ' + st.gstin : '', (st.bank || '').trim()].filter(Boolean).join('\n');
  const notes = (q.notes || '').trim() ? `<div><div class="dh">Notes</div><div class="notes">${esc(q.notes)}</div></div>` : '';
  const bank = bankTxt ? `<div><div class="dh">Bank &amp; tax details</div><div class="bank">${esc(bankTxt)}</div></div>` : '';
  return (notes || bank) ? `<div class="two block-avoid">${notes}${bank}</div>` : '';
}
const termsList = q => (q.terms || '').split('\n').map(x => x.trim()).filter(Boolean);
const termsBlock = q => { const t = termsList(q); return t.length ? `<div class="block-avoid" style="margin-top:7mm"><div class="dh">Terms &amp; conditions</div><ol class="terms">${t.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''; };
const signBlock = q => `<div class="sign"><div><b>For ${esc(S.settings.name)}</b>Authorised signatory</div><div><b>${q.type === 'quote' ? 'Client acceptance' : 'Received by'}</b>Signature and date</div></div>`;

/* --- interiors --- */
function coverHtml(q, label) {
  const st = S.settings, short = (st.name || '').split(' ')[0] || 'us';
  const why = (st.why || []).filter(w => (w.t || '').trim()).slice(0, 6);
  return `<section class="sheet cover">
    <div class="cv-band">
      <div class="cv-top">${brandBlock(34)}<div class="cv-ref"><span>${esc(label)}</span><b>${esc(q.no)}</b>${fmtDate(q.date)}${q.type === 'quote' && q.validUntil ? `<br>Valid until ${fmtDate(q.validUntil)}` : ''}</div></div>
      <div class="cv-hero"><div class="eyebrow">Prepared for</div><h1>${esc(q.client.name || 'Client name')}</h1>
        <p class="cv-proj">${esc(q.title || 'Project title')}</p>${q.site ? `<p class="cv-site">${esc(q.site)}</p>` : ''}</div>
    </div>
    <div class="cv-body">
      <div class="cv-about"><div class="eyebrow dark">About us</div><p>${esc(st.about)}</p></div>
      ${q.opts.why && why.length ? `<div class="cv-why"><div class="eyebrow dark">Why ${esc(short)}</div><div class="why-grid">${why.map(w => `<div class="why"><h3>${esc(w.t)}</h3><p>${esc(w.d)}</p></div>`).join('')}</div></div>` : ''}
    </div>
    <div class="cv-foot"><span><b>${esc(st.name)}</b>${st.address ? '  ·  ' + esc(st.address) : ''}</span><span>${contactLine()}</span></div>
  </section>`;
}
function summaryHtml(q, c, label) {
  const isQ = q.type === 'quote', an = q.opts.annexure, cl = q.client;
  const parties = `<div class="parties">
    <div><div class="eyebrow dark">${isQ ? 'Prepared for' : 'Billed to'}</div><h3>${esc(cl.name || 'Client name')}</h3>${[cl.address, cl.phone, cl.email].filter(Boolean).map(x => `<p>${esc(x)}</p>`).join('')}</div>
    <div><div class="eyebrow dark">${isQ ? 'Project' : 'Work'}</div><h3>${esc(q.title || 'Project')}</h3>${q.site ? `<p>${esc(q.site)}</p>` : ''}</div></div>`;
  const rows = c.secs.map((x, i) => {
    const names = liveItems(x.s).map(t => t.desc.trim()).filter(Boolean);
    const line = names.slice(0, 6).join('  ·  ') + (names.length > 6 ? `  ·  +${names.length - 6} more` : '');
    return `<tr>${an ? `<td class="ref">${letter(i)}</td>` : ''}<td class="rm"><div class="n">${esc(x.s.name || 'Untitled')}</div><div class="d">${[x.s.dims, line].filter(Boolean).map(esc).join('  ·  ')}</div></td><td class="am">${inr(x.sub)}</td></tr>`;
  }).join('');
  const table = `<table class="sumtab"><thead><tr>${an ? '<th>Ref</th>' : ''}<th>Room / scope</th><th>Amount</th></tr></thead><tbody>${rows || `<tr><td colspan="3" class="rm"><div class="d">No rooms added yet.</div></td></tr>`}</tbody></table>`;
  return `<section class="sheet summary">${pageHead(q, label)}${parties}<h2 class="doc-title">${isQ ? 'Quotation summary' : 'Bill summary'}</h2>${table}
    <div class="tot-wrap">${totalsHtml(q, c)}</div>${scheduleDoc(q, c)}${notesBank(q) ? `<div style="margin-top:7mm">${notesBank(q)}</div>` : ''}${termsBlock(q)}${signBlock(q)}</section>`;
}
function annexHtml(x, i) {
  const s = x.s, its = liveItems(s);
  return `<section class="sheet annex">
    <div class="an-head"><div><div class="eyebrow">Annexure ${letter(i)}</div><h2>${esc(s.name || 'Untitled room')}</h2>${s.dims ? `<div class="dim">${esc(s.dims)}</div>` : ''}</div>
      <div class="tot"><small>Room total</small><b>${inr(x.sub)}</b></div></div>
    ${s.hero ? `<img class="hero" src="/_blob/${esc(s.hero)}" alt="">` : ''}
    ${its.map((it, k) => itemDoc(it, letter(i) + '.' + (k + 1))).join('') || '<p class="hint">No items in this room yet.</p>'}
  </section>`;
}
function itemDoc(it, code) {
  const imgs = (it.imgs || []).slice(0, 3), amt = num(it.qty) * num(it.rate);
  return `<article class="item ${imgs.length ? '' : 'noimg'}">
    ${imgs.length ? `<div class="imgs ${imgs.length === 1 ? 'one' : imgs.length === 2 ? 'n2' : ''}">${imgs.map(id => `<img src="/_blob/${esc(id)}" alt="">`).join('')}</div>` : ''}
    <div><div class="code">${code}</div><h3>${esc(it.desc)}</h3>${(it.spec || '').trim() ? `<div class="spec">${esc(it.spec)}</div>` : ''}
      <div class="fig"><span>${it.size ? esc(it.size) + '  ·  ' : ''}${num(it.qty)} ${esc(it.unit)} × ${inr(num(it.rate))}</span><b>${inr(amt)}</b></div></div>
  </article>`;
}

/* --- paints --- */
function paintCover(q, c) {
  const st = S.settings, p = q.paint || {}, cl = q.client;
  const why = (st.paintWhy || []).filter(w => (w.t || '').trim()).slice(0, 6);
  const rows = [['Date', fmtDate(q.date)], ['Total estimated value', `${inr(c.total)}${q.gstOn ? '' : ' (excluding GST)'}`], ['This estimate is valid for', q.validUntil ? `${Math.max(0, Math.round((new Date(q.validUntil) - new Date(q.date)) / 864e5))} days, until ${fmtDate(q.validUntil)}` : '—'],
    ['Estimated working days', p.days ? String(p.days) : '—'], ['Start date', p.start ? fmtDate(p.start) : '—'], ['End date', p.end ? fmtDate(p.end) : '—'], ['Customer address', q.site || cl.address || '—']];
  return `<section class="sheet cover pcover">
    <div class="pc-top">
      <div class="pc-c"><div class="kv"><span>Customer name</span><b>${esc(cl.name || '—')}</b></div><div class="kv"><span>Mobile no.</span><b>${esc(cl.phone || '—')}</b></div>
        <div class="kv"><span>Date of site visit</span><b>${p.visitDate ? fmtDate(p.visitDate) : '—'}</b></div><div class="kv"><span>Visited by</span><b>${esc(p.visitedBy || '—')}</b></div><div class="kv"><span>City</span><b>${esc(p.city || '—')}</b></div></div>
      <div class="pc-logo">${brandBlock(40)}</div>
      <div class="pc-c r"><div class="kv"><span>Service provider</span><b>${esc(st.name)}</b></div><div class="kv"><span>Address</span><b>${esc(st.address || '—')}</b></div>
        <div class="kv"><span>Phone</span><b>${esc(st.phone || '—')}</b></div>${st.email ? `<div class="kv"><span>Email</span><b>${esc(st.email)}</b></div>` : ''}${st.gstin ? `<div class="kv"><span>GSTIN</span><b>${esc(st.gstin)}</b></div>` : ''}</div>
    </div>
    <div class="pc-main"><div class="eyebrow dark">Interior &amp; exterior painting</div><h1>Service Estimate</h1><p class="pc-est">Estimate no. ${esc(q.no)}</p>
      <div class="pc-cols">
        <div class="pc-panel"><div class="eyebrow">Our promise</div><p>${esc(st.paintAbout)}</p><div class="pc-brand">Asian Paints products only</div></div>
        <div class="pc-list"><p class="pc-greet">Greetings, <b>${esc(cl.name || 'Customer')}</b>.<br>Thank you for your interest in painting services from ${esc(st.name)}.</p>
          ${rows.map(([k, v]) => `<div class="pc-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
      </div>
      <div class="pc-tier"><span>You have selected</span><b>${esc(p.tier || 'Classic')}</b></div>
      ${q.opts.why && why.length ? `<div class="pc-feat">${why.map(w => `<div class="why"><h3>${esc(w.t)}</h3><p>${esc(w.d)}</p></div>`).join('')}</div>` : ''}
    </div>
    <div class="cv-foot"><span>This estimate also contains ${[q.opts.health && q.health.length ? 'the site health card' : '', q.opts.photos && q.photos.length ? 'site photos' : '', 'the value break-up, payment schedule and terms and conditions'].filter(Boolean).join(', ')}.</span><span>${contactLine()}</span></div>
  </section>`;
}
function healthPage(q) {
  const areas = q.health.map(h => {
    const filled = (h.rows || []).filter(r => r.sev || (r.area + '').trim() || (r.rec || '').trim());
    const rows = filled.length ? filled : (h.rows || []);
    return `<div class="hc-area block-avoid"><div class="hc-h"><b>${esc(h.area)} surface</b>${h.name ? `<span>${esc(h.name)}</span>` : ''}</div>
      <table class="hc-tab"><thead><tr><th>Symptom</th><th>Severity</th><th class="am">Affected area (sq.ft)</th><th>Recommendation</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${esc(r.sym)}</td><td>${esc(r.sev || '')}</td><td class="am">${esc(r.area || '')}</td><td>${esc(r.rec || '')}</td></tr>`).join('')}
      <tr><td class="ob-l">Observations</td><td colspan="3">${esc(h.obs || '')}</td></tr></tbody></table></div>`;
  }).join('');
  return `<section class="sheet health">${pageHead(q, docLabel(q))}<h2 class="doc-title">Site health card</h2><p class="lede">A scientific evaluation of the surfaces at your home, recorded during the site visit${q.paint && q.paint.visitDate ? ' on ' + fmtDate(q.paint.visitDate) : ''}.</p>${areas}</section>`;
}
function photosPage(q) {
  return `<section class="sheet photos">${pageHead(q, docLabel(q))}<h2 class="doc-title">Site photographs</h2><p class="lede">Images captured during the site visit, of the areas to be painted.</p>
    <div class="ph-grid">${q.photos.map(p => `<figure><img src="/_blob/${esc(p.id)}" alt="">${(p.cap || '').trim() ? `<figcaption>${esc(p.cap)}</figcaption>` : ''}</figure>`).join('')}</div></section>`;
}
function paintQuotePage(q, c, label) {
  const isQ = q.type === 'quote', p = q.paint || {}, cl = q.client;
  const info = [['Date', fmtDate(q.date)], ['Customer name', cl.name || '—'], ['Subject', q.title || (isQ ? 'Quotation for painting services' : 'Painting services')], ['Service tier', p.tier || '—'], [isQ ? 'Estimate no.' : 'Bill no.', q.no]];
  const basis = p.basis === 'approx'
    ? 'Areas and rates in this estimate are approximate and were given without a measurement at site. The final bill is adjusted to the area actually measured at site, at the same rate.'
    : `This estimate is based on the site inspection${p.visitDate ? ' of ' + fmtDate(p.visitDate) : ''}, the workable area measured at site and the product and painting system finalised.`;
  const groups = c.secs.map(x => {
    const its = liveItems(x.s);
    if (!its.length) return '';
    return `<tr class="grp"><td colspan="6">${esc(x.s.name || 'Area')}</td></tr>` + its.map(i => `<tr><td class="pr">${esc(i.product)}</td><td>${esc(i.desc)}</td><td class="sy">${esc(i.spec)}</td><td class="am">${nfmt(i.qty)} ${esc(i.unit)}</td><td class="am">${inr(num(i.rate))}</td><td class="am">${inr(num(i.qty) * num(i.rate))}</td></tr>`).join('');
  }).join('');
  const tools = (q.tools || []).filter(t => num(t.qty) && (t.name || '').trim());
  const toolT = tools.length ? `<table class="ptab tools"><thead><tr><th colspan="3">Tools &amp; extras</th><th class="am">Quantity</th><th class="am">Rate</th><th class="am">Amount</th></tr></thead><tbody>
    ${tools.map(t => `<tr><td colspan="3">${esc(t.name)}</td><td class="am">${nfmt(t.qty)}</td><td class="am">${inr(num(t.rate))}</td><td class="am">${inr(num(t.qty) * num(t.rate))}</td></tr>`).join('')}</tbody></table>` : '';
  return `<section class="sheet pquote">${pageHead(q, label)}
    <h2 class="doc-title">${isQ ? 'Quotation for services' : 'Bill for services'}</h2>
    <div class="pinfo">${info.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
    <p class="pbasis">${esc(basis)}</p>
    <table class="ptab"><thead><tr><th>Product</th><th>Paintable surface</th><th>Painting system</th><th class="am">Area</th><th class="am">Rate / sq.ft</th><th class="am">Cost</th></tr></thead>
      <tbody>${groups || `<tr><td colspan="6" class="sy">No areas added yet.</td></tr>`}</tbody></table>
    ${toolT}
    <div class="tot-wrap">${totalsHtml(q, c)}</div>${scheduleDoc(q, c)}</section>`;
}
function termsPage(q, c, label) {
  const nb = notesBank(q), tb = termsBlock(q);
  if (!nb && !tb) return '';
  return `<section class="sheet pterms">${pageHead(q, label)}${nb}${tb}${signBlock(q)}
    ${S.settings.phone ? `<p class="lede" style="margin-top:8mm">For any assistance please call ${esc(S.settings.phone)}.</p>` : ''}</section>`;
}

/* ================= work order & agreement (block model) ================= */
function dealCtx(q) {
  const d = q.deal || {}, amt = dealAmount(q), cl = q.client || {};
  return {
    amt, client: cl.name || '____', company: S.settings.name, site: q.site || cl.address || '____', quote: q.no, qdate: fmtDate(q.date),
    amount: inr(amt), words: 'Rupees ' + words(amt) + ' only', gst: { incl: 'inclusive of GST', excl: 'plus applicable GST', na: '' }[d.gst] || '',
    start: fmtDate(d.start) || '____', end: fmtDate(d.end) || '____', days: d.days ? String(d.days) : '____', warranty: String(d.warranty || 12), jurisdiction: d.jurisdiction || '____'
  };
}
const fillTokens = (s, ctx) => String(s || '').replace(/\{(\w+)\}/g, (m, k) => (k in ctx ? ctx[k] : m)).replace(/\s+\./g, '.').replace(/\s{2,}/g, ' ').trim();
function partyBlocks(q, forAgreement) {
  const st = S.settings, cl = q.client || {}, ctor = [st.address, st.phone && 'Phone: ' + st.phone, st.gstin && 'GSTIN: ' + st.gstin].filter(Boolean);
  const cli = [cl.address || q.site, cl.phone && 'Phone: ' + cl.phone, cl.email].filter(Boolean);
  return forAgreement
    ? { t: 'parties', l: { h: 'Contractor (First Party)', name: st.name, lines: ctor }, r: { h: 'Client (Second Party)', name: cl.name || '____', lines: cli } }
    : { t: 'parties', l: { h: 'Issued to (Client)', name: cl.name || '____', lines: cli }, r: { h: 'Contractor', name: st.name, lines: ctor } };
}
function payRows(q) {
  const amt = dealAmount(q);
  return (q.schedule || []).map(r => [r.label, num(r.pct) + '%', inr(Math.round(amt * num(r.pct) / 100)), r.date ? fmtDate(r.date) : 'To be confirmed']);
}
function scopeTable(q) {
  const pt = q.div === 'paints', c = calc(q), rows = [];
  if (pt) {
    c.secs.forEach(x => {
      const its = liveItems(x.s); if (!its.length) return;
      rows.push({ g: x.s.name || 'Area' });
      its.forEach(i => rows.push([i.desc, [i.product, i.spec].filter(Boolean).join(' — '), nfmt(i.qty) + ' ' + i.unit, inr(num(i.rate)) + ' / ' + i.unit]));
    });
    (q.tools || []).filter(t => num(t.qty) && (t.name || '').trim()).forEach(t => rows.push([t.name, '', nfmt(t.qty), inr(num(t.rate))]));
    return { t: 'table', head: ['Surface', 'Product and painting system', 'Area', 'Rate'], w: [24, 46, 14, 16], al: ['l', 'l', 'r', 'r'], rows };
  }
  c.secs.forEach((x, si) => {
    const its = liveItems(x.s); if (!its.length) return;
    rows.push({ g: `${letter(si)}.  ${x.s.name || 'Room'}${x.s.dims ? '  (' + x.s.dims + ')' : ''}` });
    its.forEach((i, k) => rows.push([letter(si) + '.' + (k + 1), i.desc + (i.size ? ' — ' + i.size : ''), i.spec || '', nfmt(i.qty) + ' ' + i.unit]));
  });
  return { t: 'table', head: ['Ref', 'Item', 'Specification', 'Qty'], w: [9, 30, 47, 14], al: ['l', 'l', 'l', 'r'], rows };
}
function woDoc(q) {
  const st = S.settings, d = q.deal, ctx = dealCtx(q), pt = q.div === 'paints', B = [];
  B.push({ t: 'meta', rows: [['Work order no.', d.woNo], ['Date', fmtDate(d.woDate)], ['Reference', `${pt ? 'Estimate' : 'Quotation'} ${q.no} dated ${fmtDate(q.date)}`]] });
  B.push(partyBlocks(q, false));
  B.push({ t: 'kv', rows: [['Project', q.title || '—'], ['Site address', ctx.site], ['Work order value', `${ctx.amount}  (${ctx.words}) ${ctx.gst}`.trim()], ['Start date', d.start ? fmtDate(d.start) : 'To be confirmed'], ['Completion date', d.end ? fmtDate(d.end) : 'To be confirmed'], ['Working days', d.days ? String(d.days) : 'To be confirmed']] });
  B.push({ t: 'h', x: 'Scope of work' }, scopeTable(q));
  if (pt && q.paint && q.paint.basis === 'approx') B.push({ t: 'p', x: 'Areas are approximate. The final bill is adjusted to the area measured at site, at the rates above.' });
  const pr = payRows(q);
  if (pr.length) B.push({ t: 'h', x: 'Payment schedule' }, { t: 'table', head: ['Stage', 'Share', 'Amount', 'Due by'], w: [46, 12, 20, 22], al: ['l', 'r', 'r', 'l'], rows: pr });
  if ((d.woNotes || '').trim()) B.push({ t: 'h', x: 'Special instructions' }, { t: 'p', x: d.woNotes });
  B.push({ t: 'p', x: 'This work order is issued against the accepted ' + (pt ? 'estimate' : 'quotation') + ' and the terms stated in it. Please sign and return a copy to confirm.' });
  B.push({ t: 'sign', l: ['For ' + st.name, d.signatory || 'Authorised signatory'], r: ['Client acceptance', d.clientSig || (q.client && q.client.name) || 'Signature and date'] });
  return { title: 'Work Order', short: 'Work order', no: d.woNo, date: d.woDate, blocks: B };
}
function agDoc(q) {
  const st = S.settings, d = q.deal, ctx = dealCtx(q), pt = q.div === 'paints', B = [];
  B.push({ t: 'meta', rows: [['Agreement no.', d.agNo], ['Date', fmtDate(d.agDate)], ['Place', d.place || '—']] });
  B.push({ t: 'p', x: `This Agreement is made on ${fmtDate(d.agDate) || '____'}${d.place ? ' at ' + d.place : ''} between the parties named below.` });
  B.push(partyBlocks(q, true));
  B.push({ t: 'p', x: `The Client has engaged the Contractor for ${q.title ? q.title : (pt ? 'painting works' : 'interior works')} at the Site, and both parties agree to the following terms.` });
  const cl = (d.clauses || []).filter(c => (c.t || '').trim() || (c.d || '').trim());
  let payAt = cl.findIndex(c => /payment/i.test(c.t || ''));
  cl.forEach((c, i) => {
    B.push({ t: 'clause', n: i + 1, title: fillTokens(c.t, ctx), text: fillTokens(c.d, ctx) });
    if (i === payAt) { const pr = payRows(q); if (pr.length) B.push({ t: 'table', head: ['Stage', 'Share', 'Amount', 'Due by'], w: [46, 12, 20, 22], al: ['l', 'r', 'r', 'l'], rows: pr }); }
  });
  if (payAt < 0) { const pr = payRows(q); if (pr.length) B.push({ t: 'h', x: 'Payment schedule' }, { t: 'table', head: ['Stage', 'Share', 'Amount', 'Due by'], w: [46, 12, 20, 22], al: ['l', 'r', 'r', 'l'], rows: pr }); }
  B.push({ t: 'p', x: 'In witness whereof the parties have signed this Agreement on the date written above.' });
  B.push({ t: 'sign', l: ['For ' + st.name + ' (Contractor)', d.signatory || 'Authorised signatory'], r: ['Client', d.clientSig || (q.client && q.client.name) || 'Signature and date'] });
  B.push({ t: 'sign', l: ['Witness 1', 'Name and signature'], r: ['Witness 2', 'Name and signature'] });
  return { title: pt ? 'Painting Agreement' : 'Interior Works Agreement', short: 'Agreement', no: d.agNo, date: d.agDate, blocks: B };
}
const dealDoc = q => S.doc === 'wo' ? woDoc(q) : agDoc(q);

function blockHtml(b) {
  switch (b.t) {
    case 'meta': return `<div class="meta">${b.rows.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>`;
    case 'parties': return `<div class="parties">${[b.l, b.r].map(p => `<div><div class="eyebrow dark">${esc(p.h)}</div><h3>${esc(p.name)}</h3>${p.lines.map(x => `<p>${esc(x)}</p>`).join('')}</div>`).join('')}</div>`;
    case 'kv': return `<table class="kvt">${b.rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>`;
    case 'h': return `<h3 class="fh">${esc(b.x)}</h3>`;
    case 'p': return `<p class="fp">${nl2br(b.x)}</p>`;
    case 'clause': return `<div class="cl"><b>${b.n}.  ${esc(b.title)}</b><p>${nl2br(b.text)}</p></div>`;
    case 'table': return `<table class="ftab"><thead><tr>${b.head.map((h, i) => `<th class="${b.al[i] === 'r' ? 'am' : ''}" style="width:${b.w[i]}%">${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => Array.isArray(r)
      ? `<tr>${r.map((x, i) => `<td class="${b.al[i] === 'r' ? 'am' : ''}">${nl2br(x)}</td>`).join('')}</tr>` : `<tr class="grp"><td colspan="${b.head.length}">${esc(r.g)}</td></tr>`).join('') || `<tr><td colspan="${b.head.length}" class="dash">Nothing listed yet.</td></tr>`}</tbody></table>`;
    case 'sign': return `<div class="sign">${[b.l, b.r].map(s => `<div><b>${esc(s[0])}</b>${esc(s[1])}</div>`).join('')}</div>`;
  }
  return '';
}
function flowHtml(d) {
  return `<section class="sheet flow"><div class="lh">${brandBlock(34)}<div class="ref"><span class="eyebrow">${esc(d.short)}</span><b>${esc(d.no)}</b>${fmtDate(d.date)}</div></div>
    <h2 class="doc-title">${esc(d.title)}</h2>${d.blocks.map(blockHtml).join('')}</section>`;
}

/* --- Word (.docx) --- */
const X = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const NAVY = '121C45', ACC = '2B6A9A', MUT = '5D6A72', LINE = 'D5DBE3', TINT = 'EEF3F8', TW = 9638;
function wRun(text, o = {}) {
  const pr = `<w:rPr><w:rFonts w:ascii="${o.font || 'Calibri'}" w:hAnsi="${o.font || 'Calibri'}" w:cs="${o.font || 'Calibri'}"/>${o.b ? '<w:b/>' : ''}${o.i ? '<w:i/>' : ''}${o.caps ? '<w:caps/>' : ''}<w:color w:val="${o.color || '17222B'}"/>${o.sp ? `<w:spacing w:val="${o.sp}"/>` : ''}<w:sz w:val="${o.sz || 21}"/><w:szCs w:val="${o.sz || 21}"/></w:rPr>`;
  return String(text ?? '').split('\n').map((line, i) => `<w:r>${pr}${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${X(line)}</w:t></w:r>`).join('');
}
function wPara(runs, o = {}) {
  return `<w:p><w:pPr>${o.keep ? '<w:keepNext/>' : ''}${o.bdr ? `<w:pBdr><w:${o.bdr} w:val="single" w:sz="6" w:space="2" w:color="${o.bdrc || LINE}"/></w:pBdr>` : ''}<w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 80}" w:line="${o.line || 276}" w:lineRule="auto"/>${o.ind ? `<w:ind w:left="${o.ind}"/>` : ''}${o.al ? `<w:jc w:val="${o.al}"/>` : ''}</w:pPr>${runs}</w:p>`;
}
function wCell(inner, w, o = {}) {
  return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${o.span ? `<w:gridSpan w:val="${o.span}"/>` : ''}${o.bt ? `<w:tcBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="17222B"/></w:tcBorders>` : ''}${o.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.fill}"/>` : ''}</w:tcPr>${inner || wPara('')}</w:tc>`;
}
function wTbl(cols, rows, o = {}) {
  const bd = o.noBorder ? '' : `<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="${LINE}"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="${LINE}"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="${LINE}"/></w:tblBorders>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${cols.reduce((a, b) => a + b, 0)}" w:type="dxa"/>${bd}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${cols.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.join('')}</w:tbl>`;
}
const wRow = (cells, o = {}) => `<w:tr><w:trPr><w:cantSplit/>${o.head ? '<w:tblHeader/>' : ''}</w:trPr>${cells.join('')}</w:tr>`;
const wGap = (n = 120) => `<w:p><w:pPr><w:spacing w:before="0" w:after="${n}"/></w:pPr></w:p>`;
function wBlock(b) {
  const lab = (t) => wRun(t, { sz: 15, color: ACC, caps: true, sp: 30, b: true });
  switch (b.t) {
    case 'meta': { const c = [1900, TW - 1900]; return wTbl(c, b.rows.map(([k, v]) => wRow([wCell(wPara(wRun(k, { sz: 16, color: MUT, caps: true, sp: 20 }), { after: 0 }), c[0]), wCell(wPara(wRun(v, { b: true }), { after: 0 }), c[1])])), { noBorder: true }) + wGap(160); }
    case 'parties': { const c = [Math.floor(TW / 2), Math.floor(TW / 2)]; return wTbl(c, [wRow([b.l, b.r].map((p, i) => wCell(wPara(lab(p.h), { after: 40 }) + wPara(wRun(p.name, { font: 'Cambria', b: true, sz: 26 }), { after: 40 }) + p.lines.map(x => wPara(wRun(x, { color: MUT, sz: 19 }), { after: 20 })).join(''), c[i])))], { noBorder: true }) + wGap(160); }
    case 'kv': { const c = [2300, TW - 2300]; return wTbl(c, b.rows.map(([k, v]) => wRow([wCell(wPara(wRun(k, { color: MUT, sz: 19 }), { after: 0 }), c[0]), wCell(wPara(wRun(v), { after: 0 }), c[1])]))) + wGap(120); }
    case 'h': return wPara(wRun(b.x, { font: 'Cambria', b: true, sz: 26, color: NAVY }), { before: 240, after: 100, keep: true, bdr: 'bottom', bdrc: ACC });
    case 'p': return wPara(wRun(b.x, { sz: 20 }), { after: 120, before: 60 });
    case 'clause': return wPara(wRun(`${b.n}.  ${b.title}`, { b: true, color: NAVY }), { before: 140, after: 30, keep: true }) + wPara(wRun(b.text, { sz: 20 }), { after: 60, ind: 340 });
    case 'table': {
      const cols = b.w.map(p => Math.floor(TW * p / 100));
      const head = wRow(b.head.map((h, i) => wCell(wPara(wRun(h, { b: true, color: 'FFFFFF', sz: 18 }), { after: 0, al: b.al[i] === 'r' ? 'right' : undefined }), cols[i], { fill: NAVY })), { head: true });
      const rows = b.rows.map(r => Array.isArray(r)
        ? wRow(r.map((x, i) => wCell(wPara(wRun(x, { sz: 19 }), { after: 0, al: b.al[i] === 'r' ? 'right' : undefined }), cols[i])))
        : wRow([wCell(wPara(wRun(r.g, { b: true, color: NAVY, sz: 19 }), { after: 0 }), TW, { span: b.head.length, fill: TINT })]));
      return wTbl(cols, [head, ...rows]) + wGap(120);
    }
    case 'sign': { const c = [Math.floor(TW / 2 - 300), 600, Math.floor(TW / 2 - 300)];
      return wPara('', { before: 500, after: 0 }) + wTbl(c, [wRow([wCell(wPara(wRun(b.l[0], { b: true, sz: 19 }), { after: 0 }) + wPara(wRun(b.l[1], { color: MUT, sz: 18 }), { after: 0 }), c[0], { bt: true }), wCell('', c[1]), wCell(wPara(wRun(b.r[0], { b: true, sz: 19 }), { after: 0 }) + wPara(wRun(b.r[1], { color: MUT, sz: 18 }), { after: 0 }), c[2], { bt: true })])], { noBorder: true }) + wGap(60); }
  }
  return '';
}
async function fetchLogo() {
  const id = S.settings.logo; if (!id) return null;
  try {
    const r = await fetch('/_blob/' + id); if (!r.ok) return null;
    const blob = await r.blob(), ext = /png/.test(blob.type) ? 'png' : /jpe?g/.test(blob.type) ? 'jpeg' : '';
    if (!ext) return null;
    const bmp = await createImageBitmap(blob);
    return { buf: await blob.arrayBuffer(), ext, w: bmp.width, h: bmp.height };
  } catch { return null; }
}
async function buildDocx(d) {
  const JS = window.JSZip; if (!JS) throw new Error('nozip');
  const st = S.settings, logo = await fetchLogo();
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  let logoRun = '';
  if (logo) {
    const H = 620000, W = Math.round(H * logo.w / logo.h);
    logoRun = `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${W}" cy="${H}"/><wp:docPr id="1" name="Logo"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="logo"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId10"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${W}" cy="${H}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  }
  const hc = [Math.floor(TW * .58), TW - Math.floor(TW * .58)];
  const header = wTbl(hc, [wRow([
    wCell(wPara(logoRun + wRun(logo ? '  ' : '', {}) + wRun(st.name, { font: 'Cambria', b: true, sz: 30, color: NAVY }), { after: 20 }) + wPara(wRun(st.tagline || '', { sz: 16, color: MUT, caps: true, sp: 30 }), { after: 0 }), hc[0]),
    wCell(wPara(wRun(d.short, { sz: 16, color: ACC, caps: true, sp: 40, b: true }), { al: 'right', after: 0 }) + wPara(wRun(d.no, { font: 'Cambria', b: true, sz: 30 }), { al: 'right', after: 0 }) + wPara(wRun(fmtDate(d.date), { sz: 18, color: MUT }), { al: 'right', after: 0 }), hc[1])])], { noBorder: true })
    + wPara('', { after: 0, bdr: 'bottom', bdrc: ACC }) + wGap(160)
    + wPara(wRun(d.title, { font: 'Cambria', b: true, sz: 44, color: NAVY }), { after: 160 });
  const body = header + d.blocks.map(wBlock).join('');
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}<w:sectPr><w:footerReference w:type="default" r:id="rId3"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const ftr = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}><w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="${LINE}"/></w:pBdr><w:tabs><w:tab w:val="right" w:pos="${TW}"/></w:tabs></w:pPr>${wRun(`${st.name}  ·  ${d.short} ${d.no}`, { sz: 16, color: MUT })}<w:r><w:tab/></w:r>${wRun('Page ', { sz: 16, color: MUT })}<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="${MUT}"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="${MUT}"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="en-IN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`;
  const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const drels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>${logo ? `<Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.${logo.ext}"/>` : ''}</Relationships>`;
  const z = new JS();
  z.file('[Content_Types].xml', ct); z.file('_rels/.rels', rels);
  z.file('word/document.xml', doc); z.file('word/styles.xml', styles); z.file('word/footer1.xml', ftr); z.file('word/_rels/document.xml.rels', drels);
  if (logo) z.file('word/media/logo.' + logo.ext, logo.buf);
  return z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
async function downloadDoc() {
  const q = S.cur;
  if (!q || !q.deal || S.doc === 'quote') return;
  if (!S.dl) { toast('Downloads are not available in this view. Use Print / Save as PDF.'); return; }
  const d = dealDoc(q);
  toast('Preparing Word file…');
  try {
    const blob = await buildDocx(d);
    const nm = `${d.short.replace(/\s+/g, '-')}-${d.no}-${(q.client.name || 'client').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '')}.docx`;
    await S.dl.save({ filename: nm, data: blob });
    toast('Word file ready');
  } catch (e) {
    if (e && e.code === 'declined') return;
    toast(e && e.message === 'nozip' ? 'Word export could not load. Use Print / Save as PDF.' : 'Could not create the Word file');
  }
}

/* ================= preview ================= */
function setPageFoot(q) {
  let el = $('#pagefoot');
  if (!el) { el = document.createElement('style'); el.id = 'pagefoot'; document.head.appendChild(el); }
  let lab = docLabel(q), no = q.no;
  if (S.doc !== 'quote' && q.deal) { lab = S.doc === 'wo' ? 'Work order' : 'Agreement'; no = S.doc === 'wo' ? q.deal.woNo : q.deal.agNo; }
  const t = `${S.settings.name}  ·  ${lab} ${no}`.replace(/["\\\n]/g, '');
  el.textContent = `@page{@bottom-left{content:"${t}";font:8pt 'Source Sans 3',sans-serif;color:#7a848a;margin-left:16mm;vertical-align:top;padding-top:4mm}@bottom-right{content:counter(page);font:8pt 'Source Sans 3',sans-serif;color:#7a848a;margin-right:16mm;vertical-align:top;padding-top:4mm}}@page cover{@bottom-left{content:none}@bottom-right{content:none}}`;
}
function previewHtml() {
  const q = S.cur, isQ = q.type === 'quote', kind = isQ && can('deals') ? S.doc : 'quote';
  const pt = q.div === 'paints';
  const tabs = isQ && can('deals') ? `<div class="seg" role="group" aria-label="Document">${[['quote', pt ? 'Estimate' : 'Quotation'], ['wo', 'Work order'], ['ag', 'Agreement']].map(([k, l]) => `<button data-act="doc" data-kind="${k}" aria-pressed="${kind === k}">${l}</button>`).join('')}</div>` : '';
  const body = kind === 'quote' ? docHtml(q) : flowHtml(dealDoc(q));
  return `<div class="edbar"><button class="btn ghost" data-act="back-edit">${ic('back')}Back to edit</button>${tabs}<div class="grow"></div>
    ${kind !== 'quote' ? `<button class="btn" data-act="edit-deal">Edit details</button><button class="btn" data-act="download-doc">${ic('download')}Download Word</button>` : ''}
    <button class="btn primary" data-act="print">${ic('print')}Print / Save as PDF</button></div>
    <p class="pv-note">${kind === 'quote' ? 'This is exactly what the client will get.' : 'Filled in from the ' + (pt ? 'estimate' : 'quotation') + '. Use Edit details to change the amount, dates or clauses, or download the Word file to change any wording freely.'} In the print window choose <b>Save as PDF</b>, paper <b>A4</b>, and switch on <b>Background graphics</b>.</p>
    <div class="docwrap" id="docwrap"><div class="doc" id="doc">${body}</div></div>`;
}
function fitDoc() {
  const w = $('#docwrap'), d = $('#doc');
  if (!w || !d) return;
  const z = Math.min(1, (w.clientWidth) / (210 * 96 / 25.4));
  d.style.zoom = z >= 0.999 ? '' : String(z);
}
