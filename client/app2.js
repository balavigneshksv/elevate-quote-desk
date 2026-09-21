
/* ================= persistence ================= */
const strip = q => { const o = clone(q); delete o.id; return o; };
const getPath = (root, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), root);
function setPath(root, path, val) {
  const ks = path.split('.'), last = ks.pop();
  const o = ks.reduce((a, k) => a[k], root);
  o[last] = val;
}
const letter = i => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '');
const nameOf = id => (id && S.names[id]) || '';

function paintSave() {
  const el = $('#savestate');
  if (!el) return;
  el.textContent = (S.view === 'lead' ? S.lMsg : S.saveMsg) || '';
  el.classList.toggle('err', !!(S.view === 'lead' ? S.lErr : S.saveErr));
}
/* --- quotes --- */
function touch() {
  const q = S.cur;
  if (!q) return;
  q.updatedAt = Date.now();
  const c = calc(q);
  q.total = c.total;
  if (q.type === 'bill' && ['issued', 'part', 'paid'].includes(q.status)) {
    const st = c.total > 0 && c.paid >= c.total ? 'paid' : c.paid > 0 ? 'part' : 'issued';
    if (st !== q.status) applyStatus(q, st);
  }
  S.dirty = true; S.saveErr = false; S.saveMsg = 'Saving…';
  paintSave();
  clearTimeout(S.saveTimer);
  S.saveTimer = setTimeout(flushSave, 700);
}
async function flushSave() {
  clearTimeout(S.saveTimer);
  if (S.saving || !S.cur || !S.dirty || !S.db) return;
  S.saving = true; S.dirty = false;
  const q = S.cur;
  try {
    await S.db.doc('quotes/' + q.id).set(strip(q));
    S.isNew = false; S.saveMsg = 'All changes saved'; S.saveErr = false;
  } catch (e) {
    S.dirty = true; S.saveErr = true;
    S.saveMsg = e && e.code === 'invalid_argument' ? 'You do not have permission to save here' : 'Could not save. Trying again…';
    S.saveTimer = setTimeout(flushSave, 4000);
  } finally {
    S.saving = false;
  }
  paintSave();
  if (S.dirty && !S.saveErr) flushSave();
}
function applyStatus(q, s) {
  if (q.status === s) return false;
  q.status = s;
  q.history = [...(q.history || []), { s, at: Date.now(), by: S.me.id }].slice(-40);
  return true;
}
async function leadFollow(q) {
  if (!q.leadId) return;
  const l = S.leads.get(q.leadId);
  const map = { sent: 'sent', negotiation: 'negotiation', approved: 'won' };
  const ns = q.type === 'quote' ? map[q.status] : null;
  if (!l || !ns || l.stage === ns || l.stage === 'won') return;
  try {
    await S.db.doc('leads/' + l.id).update({ stage: ns, updatedAt: Date.now() });
    await appendLog(l.id, { kind: 'sys', text: `Quotation ${q.no} marked ${stLabel('quote', q.status)}. Lead moved to ${leadStageLabel(l.div, ns)}.` });
  } catch { }
}
async function setStatusFromList(id, s) {
  const q = clone(S.quotes.get(id));
  if (!q || !applyStatus(q, s)) return;
  q.updatedAt = Date.now();
  try { await S.db.doc('quotes/' + id).update({ status: q.status, history: q.history, updatedAt: q.updatedAt }); toast('Status set to ' + stLabel(q.type, s)); leadFollow(q); }
  catch { toast('Could not change status'); refreshHome(); }
}
/* --- leads --- */
function touchLead() {
  const l = S.lead;
  if (!l) return;
  l.updatedAt = Date.now();
  S.ldirty = true; S.lErr = false; S.lMsg = 'Saving…'; paintSave();
  clearTimeout(S.lTimer);
  S.lTimer = setTimeout(flushLead, 700);
}
async function flushLead() {
  clearTimeout(S.lTimer);
  if (S.lsaving || !S.lead || !S.ldirty || !S.db) return;
  S.lsaving = true; S.ldirty = false;
  const l = S.lead, payload = clone(l);
  delete payload.id; delete payload.log;
  try {
    if (S.lNew) { await S.db.doc('leads/' + l.id).set({ ...payload, log: l.log || [] }); S.lNew = false; }
    else await S.db.doc('leads/' + l.id).update(payload);
    S.lMsg = 'All changes saved'; S.lErr = false;
  } catch (e) {
    S.ldirty = true; S.lErr = true;
    S.lMsg = e && e.code === 'invalid_argument' ? 'You do not have permission to save here' : 'Could not save. Trying again…';
    S.lTimer = setTimeout(flushLead, 4000);
  } finally { S.lsaving = false; }
  paintSave();
  if (S.ldirty && !S.lErr) flushLead();
}
async function appendLog(id, entry) {
  const e = { id: uid(), at: Date.now(), by: S.me.id, ...entry };
  if (S.lead && S.lead.id === id && S.lNew) {
    S.lead.log = [...(S.lead.log || []), e]; S.ldirty = true; await flushLead(); return e;
  }
  if (S.db.appendLog) { const r = await S.db.appendLog(id, e); return r || e; }
  const ref = S.db.doc('leads/' + id), snap = await ref.get();
  const cur = snap.exists ? (snap.data().log || []) : [];
  await ref.update({ log: [...cur, e].slice(-300), updatedAt: Date.now() });
  return e;
}
async function setLeadStage(id, stage) {
  const l = S.leads.get(id);
  if (!l || l.stage === stage) return;
  try {
    await S.db.doc('leads/' + id).update({ stage, updatedAt: Date.now() });
    await appendLog(id, { kind: 'sys', text: `Stage changed to ${leadStageLabel(l.div, stage)}` });
    toast('Stage set to ' + leadStageLabel(l.div, stage));
  } catch { toast('Could not change stage'); refreshHome(); }
}
/* --- settings --- */
function touchSettings() {
  S.setMsg = 'Saving…'; paintSet();
  clearTimeout(S.setTimer);
  S.setTimer = setTimeout(async () => {
    try { await S.db.doc('settings/company').set(clone(S.set)); S.setMsg = 'All changes saved'; }
    catch { S.setMsg = 'Only the owner can change settings'; }
    paintSet();
  }, 900);
}
function paintSet() { const el = $('#setstate'); if (el) el.textContent = S.setMsg || ''; }
function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('on'), 2600);
}

/* ================= shell ================= */
const divDue = div => [...S.leads.values()].filter(l => l.div === div && leadLate(l)).length + [...S.quotes.values()].filter(q => q.div === div && isLate(q)).length;
function appbarHtml() {
  const st = S.settings;
  const tabs = [['overview', 'Overview']].concat(allowedDivs().map(d => [d, DIVN[d]])).concat(S.isOwner ? [['settings', 'Settings'], ['team', 'Team']] : []);
  const logo = st.logo ? `<img class="ab-logo" src="/_blob/${esc(st.logo)}" alt="">` : brandMark(30, '#8cc9f2');
  return `<header class="appbar"><div class="appbar-in">
    <div class="brand">${logo}<div><div class="bn">${esc(st.name)}</div><div class="bt">Quote desk</div></div></div>
    <nav class="bar-nav" aria-label="Sections">${tabs.map(([k, l]) => { const n = DIVS.includes(k) ? divDue(k) : 0; return `<button data-act="nav" data-to="${k}" ${S.tab === k ? 'aria-current="page"' : ''}>${l}${n ? `<span class="nb" title="Follow-ups due">${n}</span>` : ''}</button>`; }).join('')}</nav>
    <div class="bar-spacer"></div>
    <div class="bar-user"><button class="bar-acct" data-act="nav" data-to="account" ${S.tab === 'account' ? 'aria-current="page"' : ''} title="Your account">${esc(S.me.name || 'Account')}<small>${S.isOwner ? 'Admin' : 'Staff'}</small></button><button class="bar-out" data-act="logout">Sign out</button></div>
  </div></header>`;
}
function render() {
  const app = $('#app');
  let main = '';
  if (S.noDb) main = `<div class="banner">Could not connect to the server. Refresh the page, and if it still does not load, check your internet connection.</div>`;
  else if (S.view === 'home') main = homeHtml();
  else if (S.view === 'edit' && S.cur) main = editHtml();
  else if (S.view === 'lead' && S.lead) main = leadHtml();
  else if (S.view === 'preview' && S.cur) main = previewHtml();
  app.innerHTML = appbarHtml() + `<main class="wrap" id="main">${main}</main><div id="toast" class="toast" role="status" aria-live="polite"></div>`;
  window.scrollTo(0, 0);
  if (S.view === 'home') refreshHome();
  if (S.view === 'edit') { paintSave(); refreshLive(); }
  if (S.view === 'lead') { paintSave(); paintLog(); refreshLeadCalc(); }
  if (S.view === 'preview') { fitDoc(); setPageFoot(S.cur); }
  if (S.view === 'home' && S.tab === 'settings') paintSet();
}
function refreshBar() { const b = $('.appbar'); if (b) b.outerHTML = appbarHtml(); }
function refreshHome() {
  if (S.view !== 'home' || S.noDb) return;
  refreshBar();
  if (S.tab === 'overview') { const o = $('#ov'); if (o) o.innerHTML = overviewInner(); }
  else if (DIVS.includes(S.tab)) { if (S.sub === 'leads') refreshLeads(); else refreshList(); }
}
function homeHtml() {
  if (S.tab === 'settings') return settingsHtml();
  if (S.tab === 'team') return teamHtml();
  if (S.tab === 'account') return accountHtml();
  if (S.tab === 'overview') return `<div class="pagehead"><div><h1>Overview</h1><p class="sub">Everything that needs your attention across Interiors and Paints.</p></div></div><div id="ov"></div>`;
  const div = S.tab; ensureSub();
  const isL = S.sub === 'leads';
  const actions = isL
    ? `<button class="btn primary" data-act="new-lead">${ic('plus')}New lead</button>`
    : `${can('quotes') ? `<button class="btn" data-act="new-bill">${ic('plus')}New bill</button><button class="btn primary" data-act="new-quote">${ic('plus')}New ${div === 'paints' ? 'estimate' : 'quotation'}</button>` : ''}`;
  return `<div class="pagehead"><div><h1>${DIVN[div]}</h1><p class="sub">${div === 'paints' ? 'Paint leads, the rates you have given, and painting estimates.' : 'Interior leads, quotations and bills.'}</p></div><div class="btnrow">${actions}</div></div>
    ${can('leads') && can('quotes') ? `<div class="seg subseg" role="group" aria-label="View"><button data-act="sub" data-v="leads" aria-pressed="${isL}">Leads</button><button data-act="sub" data-v="quotes" aria-pressed="${!isL}">${div === 'paints' ? 'Estimates & bills' : 'Quotations & bills'}</button></div>` : ''}
    ${isL ? `<div id="l-stats"></div>
      <div class="toolbar-row"><div class="seg" id="l-sort"></div><input class="text search" id="ls-search" type="search" placeholder="Search name, phone or city" value="${esc(S.lq)}" aria-label="Search leads"></div>
      <div class="chips" id="l-chips" style="margin-bottom:14px"></div><div class="list" id="l-rows"></div>`
      : `<div id="l-stats"></div>
      <div class="toolbar-row"><div class="seg" id="l-type"></div><input class="text search" id="l-search" type="search" placeholder="Search client, project or number" value="${esc(S.q)}" aria-label="Search"></div>
      <div class="chips" id="l-chips" style="margin-bottom:14px"></div><div class="list" id="l-rows"></div>`}`;
}

function ensureSub() {
  if (S.sub === 'leads' && !can('leads') && can('quotes')) S.sub = 'quotes';
  else if (S.sub === 'quotes' && !can('quotes') && can('leads')) S.sub = 'leads';
}

/* ================= contact helpers ================= */
function contactBtns(name, phone, msg) {
  const d = phoneDigits(phone);
  if (!d) return '';
  return `<a class="btn ghost icon" href="tel:+${d}" title="Call" aria-label="Call ${esc(name)}">${ic('phone')}</a><a class="btn ghost icon" href="https://wa.me/${d}?text=${encodeURIComponent(msg || '')}" target="_blank" rel="noopener" title="WhatsApp" aria-label="WhatsApp ${esc(name)}">${ic('chat')}</a>`;
}
const first = n => (String(n || '').replace(/^(mr|mrs|ms|dr)\.?\s+/i, '').trim().split(/\s+/)[0]) || 'there';
const leadMsg = l => `Hello ${first(l.name)}, this is ${S.me.name || 'the team'} from ${S.settings.name}. Following up on your ${l.div === 'paints' ? 'painting' : 'interior'} enquiry. Is this a good time to talk?`;
const quoteMsg = q => `Hello ${first(q.client && q.client.name)}, this is ${S.settings.name}. Just checking if you had a chance to go through ${q.div === 'paints' ? 'our estimate' : 'our quotation'} ${q.no}. Happy to answer questions or make any changes you would like.`;
const latestRate = l => (l.rates || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];

/* ================= overview ================= */
function overviewInner() {
  const leads = [...S.leads.values()], quotes = [...S.quotes.values()], t = today();
  const active = leads.filter(l => LEAD_ACTIVE.includes(l.stage));
  const dueLeads = leads.filter(leadLate), dueQ = quotes.filter(q => q.followUp && q.followUp <= t && (ACTIVE[q.type] || []).includes(q.status));
  const asks = leads.filter(leadAwaiting);
  const wk = Date.now() - 7 * 864e5, fresh = leads.filter(l => (l.createdAt || 0) > wk);
  const sumQ = (arr) => arr.reduce((a, q) => a + calc(q).total, 0);
  const tiles = `<div class="tiles">
    <div class="tile ${dueLeads.length + dueQ.length ? 'alert' : ''}"><div class="k">Follow-ups due</div><div class="v">${dueLeads.length + dueQ.length}</div><div class="s">Today and overdue, leads and quotations</div></div>
    <div class="tile ${asks.length ? 'warnt' : ''}"><div class="k">${S.isOwner ? 'Waiting on your team' : 'Questions to answer'}</div><div class="v">${asks.length}</div><div class="s">${S.isOwner ? 'Questions you asked, not yet answered' : 'Questions from the owner, waiting for your reply'}</div></div>
    <div class="tile"><div class="k">New leads, 7 days</div><div class="v">${fresh.length}</div><div class="s">${fresh.filter(l => l.div === 'interiors').length} interiors · ${fresh.filter(l => l.div === 'paints').length} paints</div></div>
    ${can('totals') ? `<div class="tile"><div class="k">Open pipeline</div><div class="v">${inr(sumQ(quotes.filter(q => q.type === 'quote' && ['sent', 'negotiation'].includes(q.status))))}</div><div class="s">Quotations sent or in negotiation</div></div>`
      : `<div class="tile"><div class="k">Active leads</div><div class="v">${active.length}</div><div class="s">Still being followed up</div></div>`}
  </div>`;
  const divCard = div => {
    const L = leads.filter(l => l.div === div), Q = quotes.filter(q => q.div === div);
    const stages = LEAD_STAGES[div].filter(([k]) => LEAD_ACTIVE.includes(k)).map(([k, l]) => [k, l, L.filter(x => x.stage === k).length]);
    const won = Q.filter(q => q.type === 'quote' && q.status === 'approved'), open = Q.filter(q => q.type === 'quote' && ['sent', 'negotiation'].includes(q.status));
    const bills = Q.filter(q => q.type === 'bill' && ['issued', 'part'].includes(q.status));
    return `<section class="blk dv"><h2>${DIVN[div]}<small>${L.filter(x => LEAD_ACTIVE.includes(x.stage)).length} active leads</small></h2>
      ${!can('leads') ? '' : `<div class="stagebar">${stages.map(([k, l, n]) => `<button class="stg ${n ? '' : 'z'}" data-act="goto" data-div="${div}" data-stage="${k}"><b>${n}</b><span>${l}</span></button>`).join('')}</div>`}
      ${!can('totals') ? '' : `<div class="kv3"><div><span>Open quotations</span><b>${inr(sumQ(open))}</b><small>${open.length} sent or in negotiation</small></div>
        <div><span>Approved</span><b>${inr(sumQ(won))}</b><small>${won.length} won</small></div>
        <div><span>Bills outstanding</span><b>${inr(bills.reduce((a, q) => a + calc(q).balance, 0))}</b><small>${bills.length} unpaid</small></div></div>`}</section>`;
  };
  const rows = [
    ...dueLeads.map(l => ({ d: l.followUp, name: l.name, div: l.div, what: `Lead · ${leadStageLabel(l.div, l.stage)}${l.assignee ? ' · ' + l.assignee : ''}`, phone: l.phone, msg: leadMsg(l), act: 'open-lead', id: l.id })),
    ...dueQ.map(q => ({ d: q.followUp, name: (q.client && q.client.name) || 'Client', div: q.div, what: `${q.div === 'paints' ? 'Estimate' : 'Quotation'} ${q.no} · ${inr(calc(q).total)} · ${stLabel(q.type, q.status)}`, phone: q.client && q.client.phone, msg: quoteMsg(q), act: 'open', id: q.id }))
  ].sort((a, b) => a.d.localeCompare(b.d));
  const fu = rows.length ? rows.map(r => `<div class="frow"><div class="fd ${r.d < t ? 'late' : ''}">${r.d < t ? 'Overdue' : 'Today'}<small>${fmtShort(r.d)}</small></div>
      <div class="fw"><button data-act="${r.act}" data-id="${r.id}"><span class="cn">${esc(r.name)}</span><span class="dtag ${r.div}">${DIVN[r.div]}</span></button><small>${esc(r.what)}</small></div>
      <div class="acts">${contactBtns(r.name, r.phone, r.msg)}<button class="btn small" data-act="${r.act}" data-id="${r.id}">Open</button></div></div>`).join('')
    : `<div class="empty small"><p>No follow-ups due. Nice.</p></div>`;
  const askRows = asks.length ? asks.map(l => { const e = [...l.log].reverse().find(x => x.kind !== 'sys'); return `<div class="frow"><div class="fd late">Asked<small>${ago(e.at)}</small></div>
      <div class="fw"><button data-act="open-lead" data-id="${l.id}"><span class="cn">${esc(l.name)}</span><span class="dtag ${l.div}">${DIVN[l.div]}</span></button><small>“${esc(e.text)}”</small></div>
      <div class="acts"><button class="btn small" data-act="open-lead" data-id="${l.id}">Open</button></div></div>`; }).join('') : `<div class="empty small"><p>No open questions.</p></div>`;
  const feed = leads.flatMap(l => (l.log || []).filter(e => e.kind !== 'sys').map(e => ({ ...e, lead: l }))).sort((a, b) => b.at - a.at).slice(0, 8);
  const feedH = feed.length ? feed.map(e => `<div class="frow"><div class="fd">${ago(e.at)}<small>${esc(nameOf(e.by) || 'Team')}</small></div>
      <div class="fw"><button data-act="open-lead" data-id="${e.lead.id}"><span class="cn">${esc(e.lead.name)}</span><span class="dtag ${e.lead.div}">${DIVN[e.lead.div]}</span>${e.kind === 'question' ? '<span class="qtag">Question</span>' : ''}</button><small>${esc(e.text)}</small></div><div class="acts"></div></div>`).join('') : `<div class="empty small"><p>No updates yet.</p></div>`;
  return `${tiles}${allowedDivs().length ? '' : '<div class="banner">No sections are switched on for your login yet. Please ask the admin.</div>'}<div class="two-col">${allowedDivs().map(divCard).join('')}</div>
    <section class="blk"><h2>Follow up today<small>${rows.length} due</small></h2><div class="flist">${fu}</div></section>
    <div class="two-col"><section class="blk"><h2>${S.isOwner ? 'Questions waiting for a reply' : 'Questions from the owner'}</h2><div class="flist">${askRows}</div></section>
    <section class="blk"><h2>Latest team updates</h2><div class="flist">${feedH}</div></section></div>`;
}

/* ================= leads list ================= */
function refreshLeads() {
  if (!$('#l-rows')) return;
  const div = S.tab, all = [...S.leads.values()].filter(l => l.div === div);
  const wk = Date.now() - 7 * 864e5;
  const due = all.filter(leadLate), asks = all.filter(leadAwaiting);
  $('#l-stats').innerHTML = `<div class="tiles">
    <div class="tile"><div class="k">Active leads</div><div class="v">${all.filter(l => LEAD_ACTIVE.includes(l.stage)).length}</div><div class="s">${all.filter(l => (l.createdAt || 0) > wk).length} new in the last 7 days</div></div>
    <button class="tile ${due.length ? 'alert' : ''}" data-act="lfilter" data-v="due"><div class="k">Follow-ups due</div><div class="v">${due.length}</div><div class="s">Today and overdue</div></button>
    <button class="tile ${asks.length ? 'warnt' : ''}" data-act="lfilter" data-v="ask"><div class="k">Waiting on team</div><div class="v">${asks.length}</div><div class="s">Your questions, unanswered</div></button>
    <button class="tile" data-act="lfilter" data-v="won"><div class="k">Won</div><div class="v">${all.filter(l => l.stage === 'won').length}</div><div class="s">of ${all.length} leads in total</div></button></div>`;
  $('#l-sort').innerHTML = [['follow', 'By follow-up'], ['recent', 'Recently updated']].map(([v, l]) => `<button data-act="lsort" data-v="${v}" aria-pressed="${S.lsort === v}">${l}</button>`).join('');
  const term = S.lq.trim().toLowerCase();
  const base = all.filter(l => !term || [l.name, l.phone, l.city, l.requirement].join(' ').toLowerCase().includes(term));
  const cnt = v => base.filter(l => l.stage === v).length;
  const chips = [['all', 'All', base.length]].concat(LEAD_STAGES[div].map(([v, l]) => [v, l, cnt(v)]));
  if (due.length) chips.push(['due', 'Due', base.filter(leadLate).length]);
  if (asks.length) chips.push(['ask', 'Waiting on team', base.filter(leadAwaiting).length]);
  $('#l-chips').innerHTML = chips.map(([v, l, n]) => `<button class="chip" data-act="lfilter" data-v="${v}" aria-pressed="${S.lstageF === v}">${l}<b>${n}</b></button>`).join('');
  let rows = base.filter(l => S.lstageF === 'all' || (S.lstageF === 'due' ? leadLate(l) : S.lstageF === 'ask' ? leadAwaiting(l) : l.stage === S.lstageF));
  rows.sort(S.lsort === 'recent' ? (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
    : (a, b) => { const ax = LEAD_ACTIVE.includes(a.stage) ? 0 : 1, bx = LEAD_ACTIVE.includes(b.stage) ? 0 : 1; return ax - bx || (a.followUp || '9999').localeCompare(b.followUp || '9999'); });
  const head = `<div class="lrow lead lhead"><div>Lead</div><div>${div === 'paints' ? 'Rate given' : 'Requirement'}</div><div>Stage</div><div>Follow-up</div><div>Latest from team</div><div></div></div>`;
  let body;
  if (!S.lloaded) body = `<div class="empty"><p>Loading…</p></div>`;
  else if (!all.length) body = `<div class="empty"><h2>No leads yet</h2><p>Add a lead as soon as an enquiry comes in. Your team keeps the progress updated here.</p></div>`;
  else if (!rows.length) body = `<div class="empty"><h2>Nothing matches</h2><p>Try a different filter or search.</p></div>`;
  else body = rows.map(leadRow).join('');
  $('#l-rows').innerHTML = (rows.length ? head : '') + body;
}
function leadRow(l) {
  const last = [...(l.log || [])].reverse().find(e => e.kind !== 'sys'), aw = leadAwaiting(l), late = leadLate(l);
  const rate = latestRate(l);
  let need;
  if (l.div === 'paints') {
    need = rate ? `<b>₹${nfmt(rate.perSqft)}/sq.ft</b> <span class="basis ${rate.basis}">${rate.basis === 'measured' ? 'Measured' : 'Approx.'}</span><small>${rate.basis === 'measured' && rate.area ? nfmt(rate.area) + ' sq.ft · ' : ''}${fmtShort(rate.date)}${(l.rates || []).length > 1 ? ' · ' + l.rates.length + ' rates' : ''}</small>`
      : `<span class="hint">${esc(l.scope || 'No rate given yet')}</span>`;
  } else need = `${esc(l.propType || '—')}<small>${esc(l.budget ? 'Budget ' + l.budget : '')}${l.requirement ? (l.budget ? ' · ' : '') + esc(l.requirement.slice(0, 50)) : ''}</small>`;
  const opts = LEAD_STAGES[l.div].map(([v, t]) => `<option value="${v}" ${v === l.stage ? 'selected' : ''}>${t}</option>`).join('');
  return `<div class="lrow lead">
    <div class="who"><button data-act="open-lead" data-id="${l.id}"><div class="cn">${esc(l.name || 'Unnamed lead')}</div><div class="pj">${esc([l.phone, l.city].filter(Boolean).join(' · ') || 'No contact yet')}${l.assignee ? ' · ' + esc(l.assignee) : ''}</div></button></div>
    <div class="need">${need}</div>
    <div class="c-st"><select class="pill ${stClass(l.stage)}" data-act="lstage" data-id="${l.id}" id="ls-${l.id}" aria-label="Stage of ${esc(l.name)}">${opts}</select></div>
    <div class="fu ${late ? 'late' : ''}">${l.followUp ? (late && l.followUp < today() ? 'Overdue · ' : '') + fmtDate(l.followUp) : '<span class="hint">No follow-up</span>'}<small>Updated ${ago(l.updatedAt || 0)}</small></div>
    <div class="latest">${aw ? '<span class="qtag">Question pending</span>' : ''}${last ? `<span class="lt">${esc(last.text.length > 90 ? last.text.slice(0, 90) + '…' : last.text)}</span><small>${esc(nameOf(last.by) || 'Team')} · ${ago(last.at)}</small>` : '<span class="hint">No updates yet</span>'}</div>
    <div class="acts">${contactBtns(l.name, l.phone, leadMsg(l))}<button class="btn ghost icon" data-act="open-lead" data-id="${l.id}" title="Open" aria-label="Open lead">${ic('eye')}</button></div></div>`;
}

/* ================= quotation list ================= */
function filteredQuotes(ignoreStatus) {
  const term = S.q.trim().toLowerCase();
  return [...S.quotes.values()].filter(q =>
    q.div === S.tab &&
    (S.typeF === 'all' || q.type === S.typeF) &&
    (ignoreStatus || S.statusF === 'all' || (S.statusF === 'due' ? isLate(q) : q.status === S.statusF)) &&
    (!term || [q.no, q.client && q.client.name, q.title, q.site].join(' ').toLowerCase().includes(term))
  ).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}
function refreshList() {
  if (!$('#l-rows')) return;
  const pt = S.tab === 'paints', all = [...S.quotes.values()].filter(q => q.div === S.tab);
  const sum = (arr, f) => arr.reduce((a, q) => a + f(calc(q)), 0);
  const pipe = all.filter(q => q.type === 'quote' && ['sent', 'negotiation'].includes(q.status)), won = all.filter(q => q.type === 'quote' && q.status === 'approved');
  const bills = all.filter(q => q.type === 'bill' && ['issued', 'part'].includes(q.status)), due = all.filter(isLate);
  const word = pt ? 'estimate' : 'quotation';
  $('#l-stats').innerHTML = `<div class="tiles">
    <div class="tile"><div class="k">Open pipeline</div><div class="v">${inr(sum(pipe, c => c.total))}</div><div class="s">${pipe.length} ${word}${pipe.length === 1 ? '' : 's'} sent or in negotiation</div></div>
    <div class="tile"><div class="k">Approved</div><div class="v">${inr(sum(won, c => c.total))}</div><div class="s">${won.length} ${word}${won.length === 1 ? '' : 's'} won</div></div>
    <div class="tile"><div class="k">Bills outstanding</div><div class="v">${inr(sum(bills, c => c.balance))}</div><div class="s">${bills.length} bill${bills.length === 1 ? '' : 's'} awaiting payment</div></div>
    <button class="tile ${due.length ? 'alert' : ''}" data-act="filter" data-v="due"><div class="k">Follow-ups overdue</div><div class="v">${due.length}</div><div class="s">${due.length ? 'Click to see which' : 'Nothing pending'}</div></button></div>`;
  $('#l-type').innerHTML = [['all', 'All'], ['quote', pt ? 'Estimates' : 'Quotations'], ['bill', 'Bills']].map(([v, l]) => `<button data-act="type" data-v="${v}" aria-pressed="${S.typeF === v}">${l}</button>`).join('');
  const base = filteredQuotes(true);
  const order = S.typeF === 'quote' ? STATUS.quote : S.typeF === 'bill' ? STATUS.bill : [...STATUS.quote, ...STATUS.bill.filter(b => !STATUS.quote.some(x => x[0] === b[0]))];
  const cnt = v => base.filter(q => q.status === v).length;
  const chips = [['all', 'All', base.length]].concat(order.map(([v, l]) => [v, l, cnt(v)]));
  const dueN = base.filter(isLate).length;
  if (dueN) chips.push(['due', 'Overdue', dueN]);
  $('#l-chips').innerHTML = chips.map(([v, l, n]) => `<button class="chip" data-act="filter" data-v="${v}" aria-pressed="${S.statusF === v}">${l}<b>${n}</b></button>`).join('');
  const rows = filteredQuotes(false);
  const head = `<div class="lrow lhead"><div>Number</div><div>Client &amp; project</div><div style="text-align:right">Value</div><div>Status</div><div>Follow-up</div><div></div></div>`;
  let body;
  if (!S.loaded) body = `<div class="empty"><p>Loading…</p></div>`;
  else if (!all.length) body = `<div class="empty"><h2>No ${word}s yet</h2><p>Create your first ${word} or bill, or start one from a lead so the details carry over.</p></div>`;
  else if (!rows.length) body = `<div class="empty"><h2>Nothing matches</h2><p>Try a different filter or search.</p></div>`;
  else body = rows.map(rowHtml).join('');
  $('#l-rows').innerHTML = (rows.length ? head : '') + body;
}
function rowHtml(q) {
  const c = calc(q), late = isLate(q), by = nameOf(q.createdBy);
  const opts = (STATUS[q.type] || []).map(([v, l]) => `<option value="${v}" ${v === q.status ? 'selected' : ''}>${l}</option>`).join('');
  const docs = q.type === 'quote' && q.status === 'approved' && can('deals')
    ? `<div class="docs"><button data-act="open-doc" data-id="${q.id}" data-kind="wo">Work order</button><button data-act="open-doc" data-id="${q.id}" data-kind="ag">Agreement</button></div>` : '';
  return `<div class="lrow">
    <div class="c-no no">${esc(q.no)}${q.type === 'bill' ? '<span class="tag">Bill</span>' : ''}${q.rev ? `<span class="tag">Rev ${q.rev}</span>` : ''}</div>
    <div class="who"><button data-act="open" data-id="${q.id}"><div class="cn">${esc((q.client && q.client.name) || 'Unnamed client')}</div><div class="pj">${esc(q.title || 'No project title')}</div></button></div>
    <div class="amt">${inr(c.total)}${q.type === 'bill' && c.balance > 0 ? `<small>Due ${inr(c.balance)}</small>` : ''}</div>
    <div class="c-st"><select class="pill ${stClass(q.status)}" data-act="status" data-id="${q.id}" id="st-${q.id}" aria-label="Status of ${esc(q.no)}">${opts}</select>${docs}</div>
    <div class="fu ${late ? 'late' : ''}">${q.followUp ? (late ? 'Overdue · ' : '') + fmtDate(q.followUp) : '<span class="hint">No follow-up</span>'}<small>Edited ${ago(q.updatedAt || 0)}${by ? ' · ' + esc(by) : ''}</small></div>
    <div class="acts">
      ${contactBtns(q.client && q.client.name, q.client && q.client.phone, quoteMsg(q))}
      <button class="btn ghost icon" data-act="preview" data-id="${q.id}" title="Preview and PDF" aria-label="Preview">${ic('eye')}</button>
      <button class="btn ghost icon" data-act="revise" data-id="${q.id}" title="New revision (keeps the original)" aria-label="New revision">${ic('rev')}</button>
      <button class="btn ghost icon" data-act="dup" data-id="${q.id}" title="Duplicate as a new quotation" aria-label="Duplicate">${ic('copy')}</button>
      ${can('delete') ? `<button class="btn ghost icon danger" data-act="del" data-id="${q.id}" title="Delete" aria-label="Delete">${ic('trash')}</button>` : ''}
    </div></div>`;
}
