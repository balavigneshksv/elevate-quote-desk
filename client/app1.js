(() => {
'use strict';

/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl2br = s => esc(s).replace(/\n/g, '<br>');
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const clone = o => JSON.parse(JSON.stringify(o));
const inr = n => {
  n = Math.round((n + Number.EPSILON) * 100) / 100;
  const p = Math.abs(n % 1) > 0;
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: p ? 2 : 0, maximumFractionDigits: 2 });
};
const inr2 = n => '₹' + (Math.round((n + Number.EPSILON) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfmt = n => (Math.round(num(n) * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const pad = (n, w = 3) => String(n).padStart(w, '0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`;
const today = () => isoDate(new Date());
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return isoDate(d); };
const fmtDate = iso => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return Number.isNaN(+d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtShort = iso => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return Number.isNaN(+d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const fmtStamp = ts => new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
const ago = ts => {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : d < 30 ? d + ' days ago' : fmtDate(isoDate(new Date(ts)));
};
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const two = n => n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
const three = n => { const h = Math.floor(n / 100), r = n % 100; return (h ? ONES[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? two(r) : ''); };
const words = n => {
  n = Math.round(n);
  if (n <= 0) return 'Zero';
  const cr = Math.floor(n / 1e7); n %= 1e7;
  const lk = Math.floor(n / 1e5); n %= 1e5;
  const th = Math.floor(n / 1e3); n %= 1e3;
  const parts = [];
  if (cr) parts.push(three(cr) + ' Crore');
  if (lk) parts.push(two(lk) + ' Lakh');
  if (th) parts.push(two(th) + ' Thousand');
  if (n) parts.push(three(n));
  return parts.join(' ');
};
const phoneDigits = p => { let d = String(p || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '0') d = d.slice(1); if (d.length === 10) d = '91' + d; return d; };
const ICON = {
  plus: '<path d="M12 5v14M5 12h14"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3"/>',
  up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>', img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
  print: '<path d="M7 9V3h10v6M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2"/><rect x="7" y="14" width="10" height="7"/>',
  back: '<path d="M15 6l-6 6 6 6"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>', download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', file: '<path d="M6 3h8l5 5v13H6zM14 3v5h5M9 13h6M9 17h6"/>',
  rev: '<path d="M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5"/>'
};
const ic = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;

/* ================= constants ================= */
const DIVS = ['interiors', 'paints'];
const DIVN = { interiors: 'Interiors', paints: 'Paints' };
const STATUS = {
  quote: [['draft', 'Draft'], ['sent', 'Sent'], ['negotiation', 'Negotiation'], ['approved', 'Approved'], ['lost', 'Lost'], ['revised', 'Revised']],
  bill: [['draft', 'Draft'], ['issued', 'Issued'], ['part', 'Part paid'], ['paid', 'Paid']]
};
const stLabel = (type, s) => (STATUS[type] || []).find(x => x[0] === s)?.[1] || s;
const STCLASS = { draft: 'neutral', sent: 'info', negotiation: 'warn', approved: 'ok', lost: 'bad', revised: 'neutral', issued: 'info', part: 'warn', paid: 'ok', new: 'info', contacted: 'info', visit: 'neutral', rate: 'neutral', measured: 'neutral', quoting: 'neutral', won: 'ok', hold: 'neutral' };
const stClass = s => STCLASS[s] || 'neutral';
const ACTIVE = { quote: ['draft', 'sent', 'negotiation'], bill: ['issued', 'part'] };
const LEAD_STAGES = {
  interiors: [['new', 'New'], ['contacted', 'Contacted'], ['visit', 'Site visit'], ['quoting', 'Preparing quote'], ['sent', 'Quote sent'], ['negotiation', 'Negotiation'], ['won', 'Won'], ['lost', 'Lost'], ['hold', 'On hold']],
  paints: [['new', 'New'], ['contacted', 'Contacted'], ['rate', 'Rate given'], ['measured', 'Site measured'], ['sent', 'Quote sent'], ['negotiation', 'Negotiation'], ['won', 'Won'], ['lost', 'Lost'], ['hold', 'On hold']]
};
const LEAD_ACTIVE = ['new', 'contacted', 'visit', 'rate', 'measured', 'quoting', 'sent', 'negotiation'];
const leadStageLabel = (div, s) => (LEAD_STAGES[div] || []).find(x => x[0] === s)?.[1] || s;
const LEAD_SOURCES = ['Instagram', 'Facebook / Meta ad', 'Google', 'Walk-in', 'Referral', 'Asian Paints enquiry', 'Existing client', 'Other'];
const PROP_TYPES = ['1 BHK', '2 BHK', '3 BHK', '4+ BHK', 'Villa', 'Office', 'Retail / shop', 'Single item / partial work'];
const PAINT_SCOPES = ['Interior', 'Exterior', 'Interior + Exterior', 'Terrace / waterproofing', 'Single room / touch-up'];
const RATE_BASIS = [['approx', 'Approx. rate, no measurement'], ['measured', 'Measured at site']];
const UNITS = ['sq.ft', 'r.ft', 'nos', 'set', 'lot', 'sq.m', 'kg'];
const HEALTH_PRESETS = {
  Interior: ['Cracks', 'Gaps', 'Moisture reading', 'Efflorescence', 'Plastering requirement', 'Undulations', 'Fungus growth', 'Previous paint condition', 'Open tile joints'],
  Exterior: ['Cracks', 'Gaps', 'Moisture', 'Efflorescence', 'Plastering requirement', 'Algae growth', 'Previous paint condition'],
  Terrace: ['Cracks', 'Moisture', 'Damaged floor', 'Algae growth', 'Non-standard surface', 'Uneven floor / water stagnation'],
  Other: ['Cracks', 'Moisture', 'Previous paint condition']
};

const DEFAULT_SETTINGS = {
  name: 'Elevate Interiors',
  tagline: 'Interior design & execution',
  phone: '', email: '', website: '', address: 'Erode, Tamil Nadu', gstin: '',
  logo: '',
  team: [],
  about: 'We design and build homes, offices and retail spaces. Design, carpentry and site execution sit under one team, so what we draw is what you get.',
  paintAbout: 'Elevate Interiors provides professional interior and exterior painting using genuine Asian Paints products, applied by trained painters under supervision, with the surface preparation and painting system agreed in writing before work begins.',
  why: [
    { t: 'Design and build, one team', d: 'Design, carpentry and site execution handled together, so nothing gets lost between drawing and handover.' },
    { t: 'In-house carpentry', d: 'Furniture made by our own carpentry team for a consistent finish and tighter control on timelines.' },
    { t: 'Architect network', d: 'Partner architects for layouts, structural changes and approvals whenever a project needs them.' },
    { t: 'Itemised, clear pricing', d: 'Every room, every item and every rate written down. What you see is what you pay.' },
    { t: 'Materials in writing', d: 'Boards, hardware and finishes are specified in your quotation, never left to assumption.' },
    { t: 'One point of contact', d: 'A single coordinator and regular progress updates from the first measurement to handover.' }
  ],
  paintWhy: [
    { t: 'Genuine Asian Paints products', d: 'Only Asian Paints products, applied as the painting system written in your estimate.' },
    { t: 'Supervised painting', d: 'Every site is supervised so surface preparation and coats are done as specified.' },
    { t: 'Trained painters', d: 'Experienced painters and a site coordinator, not a different crew every day.' },
    { t: 'Masking and covering', d: 'Floors, windows and furniture are covered before work starts.' },
    { t: 'Colour consultation', d: 'Shades are finalised with you before the first coat, not during the work.' },
    { t: 'Site progress updates', d: 'Regular updates with photos, so you always know where the work stands.' }
  ],
  bank: '',
  prefixQuote: 'EQ', prefixBill: 'INV', prefixPaintQuote: 'PQ', prefixPaintBill: 'PINV', gstPct: 18, validityDays: 15, paintValidityDays: 7,
  terms: [
    'This quotation is valid until the date mentioned above.',
    'Rates are based on the specifications and sizes listed. Any change in scope, size or finish will be quoted separately.',
    'Work begins after the advance payment is received.',
    'Materials and finishes will be as specified. An equivalent of the same grade may be used if an item is unavailable, with your approval.',
    'Civil, electrical, plumbing and false-ceiling work is included only where listed.',
    'Delays caused by design changes, site access or held payments will extend the timeline accordingly.'
  ].join('\n'),
  paintTerms: [
    'This estimate is valid for the number of days stated on the first page.',
    'Rates apply to the painting system and paintable area listed. If the area measured at site differs, the final bill is adjusted to the actual measured area at the same rate.',
    'Only Asian Paints products are used, applied as the painting system written against each surface.',
    'Civil work (brickwork, plastering, plumbing, flooring, tile work and similar) is not part of painting work unless listed.',
    'For undulations above 2 mm, a bottom coat of POP or putty levelling is recommended and quoted separately.',
    'No warranty is given on cracks or gaps that redevelop after painting, or on moisture entering through rising damp or seepage through walls.',
    'The client will keep the site accessible, with water and electricity available, and will finalise shades before work starts.',
    'Additional work outside this estimate will be quoted separately and started only after your approval.'
  ].join('\n'),
  billTerms: [
    'Payment is due on receipt of this bill unless agreed otherwise in writing.',
    'Please quote the bill number with every payment.'
  ].join('\n'),
  schedule: [
    { label: 'Advance on confirmation', pct: 50 },
    { label: 'On material delivery at site', pct: 30 },
    { label: 'Before handover', pct: 20 }
  ],
  paintSchedule: [
    { label: 'Advance payment', pct: 40 },
    { label: 'Middle of work', pct: 40 },
    { label: 'End of work', pct: 20 }
  ],
  tools: [{ name: 'Mechanised tool used: sander', rate: 0 }, { name: 'Masking kit usage', rate: 0 }, { name: 'Spray usage', rate: 0 }],
  tiers: ['Basic', 'Classic', 'Premium'],
  rooms: ['Living Room', 'Kitchen', 'Master Bedroom', 'Bedroom 2', 'Kids Room', 'Dining', 'Pooja Room', 'Foyer & Entrance', 'Balcony', 'Bathroom', 'Glass Door / Partition', 'Office Cabin', 'Reception', 'Retail Display'],
  paintAreas: ['Exterior', 'Interior', 'Ceiling', 'Terrace', 'Compound wall'],
  catalog: [
    { desc: 'Modular wardrobe', spec: '18 mm BWP carcass, laminate shutters, soft-close hinges and channels', unit: 'sq.ft', rate: 1800 },
    { desc: 'TV unit with back panel', spec: '18 mm ply carcass, laminate finish, fluted panel, concealed wiring', unit: 'sq.ft', rate: 1600 },
    { desc: 'Modular kitchen (base + wall units)', spec: '18 mm BWP carcass, acrylic shutters, soft-close, tandem drawers', unit: 'sq.ft', rate: 2400 },
    { desc: 'False ceiling with cove lighting', spec: 'Gypsum board, primer and two coats of emulsion, cove profile', unit: 'sq.ft', rate: 120 },
    { desc: 'Glass sliding door', spec: '10 mm toughened glass, aluminium frame, floor guide', unit: 'sq.ft', rate: 650 },
    { desc: 'Wall paneling', spec: 'MDF base with laminate or veneer finish, PU coat', unit: 'sq.ft', rate: 420 },
    { desc: 'Study table with overhead storage', spec: '18 mm ply, laminate finish, cable cutouts', unit: 'nos', rate: 22000 }
  ],
  paintCatalog: [
    { product: 'Ace Exterior Emulsion', spec: '1 coat damp sheath exterior + 2 coats Ace exterior emulsion', rate: 15 },
    { product: 'Tractor Emulsion', spec: '1 coat primer + 2 coats Tractor emulsion', rate: 15 },
    { product: 'Tractor Emulsion (new plaster)', spec: '2 coats wall putty + 1 coat primer + 2 coats Tractor emulsion', rate: 26 },
    { product: 'Apcolite Premium Emulsion', spec: '2 coats wall putty + 1 coat primer + 2 coats Apcolite premium emulsion', rate: 32 },
    { product: 'Royale Luxury Emulsion', spec: '2 coats wall putty + 1 coat primer + 2 coats Royale luxury emulsion', rate: 42 }
  ],
  agreementClauses: [
    { t: 'Scope of Work', d: 'The Contractor shall carry out the interior design and execution works at the Site ({site}) as described in Quotation No. {quote} dated {qdate} and its annexures, which form part of this Agreement.' },
    { t: 'Contract Value', d: 'The total contract value is {amount} ({words}) {gst}. Work beyond the agreed scope is charged separately as set out under Variations.' },
    { t: 'Payment Terms', d: 'The Client shall pay the Contractor in the stages set out in the Payment Schedule. Work at each stage proceeds on receipt of the preceding payment.' },
    { t: 'Timeline', d: 'Work is planned to start on {start} and be completed by {end} ({days} working days). The timeline runs from the later of the start date, receipt of the advance and handover of the Site.' },
    { t: 'Materials and Specifications', d: 'Materials, boards, hardware and finishes shall be as specified in the Quotation. If a specified item is unavailable, an equivalent of the same grade may be used with the Client\'s prior approval.' },
    { t: 'Client\'s Responsibilities', d: 'The Client shall give clear access to the Site, provide water and electricity for the work, and give timely decisions on designs, colours and finishes. Delay in approvals or access extends the timeline.' },
    { t: 'Variations and Changes', d: 'Any change to design, size, material or finish after approval shall be agreed in writing, with its cost and time impact, before work on the change begins.' },
    { t: 'Delays', d: 'The Contractor is not liable for delay caused by Client-side changes, held payments, restricted site access, statutory restrictions or events beyond reasonable control.' },
    { t: 'Defects and Warranty', d: 'The Contractor shall rectify workmanship defects reported in writing within {warranty} months of handover at no cost. Damage from misuse, water leakage, changes by others or normal wear is not covered. Manufacturer warranties apply to branded hardware and appliances.' },
    { t: 'Termination', d: 'Either party may terminate this Agreement by 15 days\' written notice if the other commits a material breach and does not remedy it within that period. On termination the Client shall pay for work done and materials procured up to that date.' },
    { t: 'Dispute Resolution', d: 'The parties shall first try to settle any dispute amicably. Failing that, the courts at {jurisdiction} shall have jurisdiction.' },
    { t: 'General', d: 'This Agreement, together with the Quotation and Work Order, is the entire understanding between the parties. Changes are valid only if made in writing and signed by both parties.' }
  ],
  paintAgreementClauses: [
    { t: 'Scope of Work', d: 'The Contractor shall carry out the painting works at the Site ({site}) on the surfaces, areas and painting systems set out in Estimate No. {quote} dated {qdate}, which forms part of this Agreement.' },
    { t: 'Contract Value', d: 'The total contract value is {amount} ({words}) {gst}. Work beyond the agreed scope is charged separately as set out under Variations.' },
    { t: 'Payment Terms', d: 'The Client shall pay the Contractor in the stages set out in the Payment Schedule. Work at each stage proceeds on receipt of the preceding payment.' },
    { t: 'Timeline', d: 'Work is planned to start on {start} and be completed by {end} ({days} working days), subject to the site being ready and weather permitting for exterior work.' },
    { t: 'Products and Painting System', d: 'Only Asian Paints products shall be used, applied as the painting system written against each surface in the Estimate.' },
    { t: 'Client\'s Responsibilities', d: 'The Client shall keep the Site accessible, provide water and electricity, and finalise shades before work starts. Furniture and valuables shall be moved or covered as agreed.' },
    { t: 'Measurement and Variations', d: 'Where the area measured at Site differs from the quoted area, the final bill is adjusted at the quoted rate. Additional surfaces or systems are agreed in writing before work begins.' },
    { t: 'Exclusions', d: 'Civil work, plastering, plumbing, tile work and waterproofing are excluded unless listed in the Estimate. Moisture arising from rising damp or seepage through walls is outside this scope.' },
    { t: 'Defects and Warranty', d: 'The Contractor shall rectify workmanship defects reported in writing within {warranty} months of completion at no cost. Product warranty is as provided by the manufacturer. No warranty applies to cracks or gaps that redevelop after painting.' },
    { t: 'Delays', d: 'The Contractor is not liable for delay caused by Client-side changes, held payments, restricted access, weather or events beyond reasonable control.' },
    { t: 'Termination', d: 'Either party may terminate by 15 days\' written notice if the other commits a material breach and does not remedy it within that period. On termination the Client shall pay for work done and materials procured up to that date.' },
    { t: 'Dispute Resolution and General', d: 'The parties shall first try to settle any dispute amicably; failing that, the courts at {jurisdiction} shall have jurisdiction. This Agreement with the Estimate and Work Order is the entire understanding between the parties.' }
  ],
  woNotes: 'Please confirm the start date with the site coordinator. Any change to the scope must be agreed in writing before it is carried out.',
  place: 'Erode', jurisdiction: 'Erode', warrantyMonths: 12
};

/* ================= state ================= */
const S = {
  db: null, assets: null, dl: null, user: null, me: { id: null, name: '' }, isOwner: false,
  quotes: new Map(), leads: new Map(), loaded: false, lloaded: false, settings: clone(DEFAULT_SETTINGS), names: {},
  tab: 'overview', sub: 'leads', view: 'home',
  typeF: 'all', statusF: 'all', q: '', lstageF: 'all', lq: '', lsort: 'follow',
  cur: null, isNew: false, dirty: false, saving: false, saveTimer: null, saveMsg: '', saveErr: false,
  lead: null, lNew: false, ldirty: false, lsaving: false, lTimer: null, lMsg: '', lErr: false,
  doc: 'quote', set: null, setTimer: null, setMsg: '', noDb: false,
  perms: null, role: '', team: null, acct: null
};
/* what this login may see and do (the server enforces the same rules) */
const can = k => S.isOwner || !!(S.perms && S.perms[k]);
const allowedDivs = () => DIVS.filter(d => can(d));
const mergeSettings = d => ({ ...clone(DEFAULT_SETTINGS), ...(d || {}) });

/* ================= calculations ================= */
function calc(q) {
  const secs = (q.sections || []).map(s => ({ s, sub: (s.items || []).reduce((a, i) => a + num(i.qty) * num(i.rate), 0) }));
  const tools = (q.tools || []).reduce((a, t) => a + num(t.qty) * num(t.rate), 0);
  const sub = secs.reduce((a, x) => a + x.sub, 0) + tools;
  const d = q.discount || {};
  let disc = d.mode === 'flat' ? num(d.value) : sub * num(d.value) / 100;
  disc = Math.min(Math.max(disc, 0), sub);
  const taxable = sub - disc;
  const gst = q.gstOn ? taxable * num(q.gstPct) / 100 : 0;
  const exact = taxable + gst;
  const total = Math.round(exact);
  const paid = (q.payments || []).reduce((a, p) => a + num(p.amount), 0);
  return { secs, tools, sub, disc, taxable, gst, total, round: total - exact, paid, balance: total - paid };
}
const dealAmount = q => (q.deal && q.deal.amountAuto === false) ? num(q.deal.amount) : calc(q).total;
const isLate = q => q.followUp && q.followUp < today() && (ACTIVE[q.type] || []).includes(q.status);
const leadAwaiting = l => { const e = [...(l.log || [])].reverse().find(x => x.kind !== 'sys'); return !!(e && e.kind === 'question'); };
const leadLate = l => l.followUp && l.followUp <= today() && LEAD_ACTIVE.includes(l.stage);

function nextNo(type, div) {
  const st = S.settings;
  const prefix = div === 'paints' ? (type === 'bill' ? st.prefixPaintBill : st.prefixPaintQuote) : (type === 'bill' ? st.prefixBill : st.prefixQuote);
  const d = new Date(), key = `${prefix}-${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1, 2)}-`;
  let max = 0;
  for (const q of S.quotes.values()) if (q.no && q.no.startsWith(key)) max = Math.max(max, parseInt(q.no.slice(key.length), 10) || 0);
  return key + pad(max + 1);
}
const newItem = div => div === 'paints'
  ? { id: uid(), desc: '', product: '', spec: '', size: '', qty: 0, unit: 'sq.ft', rate: 0, imgs: [] }
  : { id: uid(), desc: '', spec: '', size: '', qty: 1, unit: 'sq.ft', rate: 0, imgs: [] };
const newSection = (name, div) => ({ id: uid(), name: name || '', dims: '', hero: '', items: [newItem(div)] });
const newHealthArea = kind => ({ id: uid(), area: kind, name: '', obs: '', rows: (HEALTH_PRESETS[kind] || HEALTH_PRESETS.Other).map(s => ({ sym: s, sev: '', area: '', rec: '' })) });

function newQuote(type, div, lead) {
  const st = S.settings, t = today(), isQ = type === 'quote', pt = div === 'paints';
  const valid = pt ? num(st.paintValidityDays) || 7 : num(st.validityDays) || 15;
  const q = {
    id: uid(), type, div, no: nextNo(type, div), status: 'draft', date: t, validUntil: isQ ? addDays(t, valid) : '',
    followUp: '', title: '', site: '', client: { name: '', phone: '', email: '', address: '' },
    sections: [], discount: { mode: 'pct', value: 0 }, gstOn: true, gstPct: num(st.gstPct),
    notes: '', terms: isQ ? (pt ? st.paintTerms : st.terms) : st.billTerms,
    schedule: clone(pt ? st.paintSchedule : st.schedule).map(r => ({ ...r, date: '' })), payments: [],
    opts: pt ? { cover: isQ, why: true, health: isQ, photos: isQ, annexure: false } : { cover: isQ, why: true, annexure: isQ, health: false, photos: false },
    leadId: lead ? lead.id : '', rev: 0, parent: '',
    createdBy: S.me.id, createdAt: Date.now(), updatedAt: Date.now(), history: [{ s: 'draft', at: Date.now(), by: S.me.id }], total: 0
  };
  if (pt) {
    q.paint = { visitDate: t, visitedBy: '', city: '', tier: (st.tiers && st.tiers[1]) || (st.tiers && st.tiers[0]) || 'Classic', basis: 'measured', days: '', start: '', end: '' };
    q.health = []; q.photos = []; q.tools = clone(st.tools).map(x => ({ ...x, qty: 0 }));
  }
  if (lead) {
    q.client = { name: lead.name || '', phone: lead.phone || '', email: lead.email || '', address: lead.address || '' };
    q.site = lead.address || '';
    if (pt && q.paint) { q.paint.city = lead.city || ''; q.paint.visitedBy = lead.assignee || ''; }
    q.title = pt ? (lead.scope ? lead.scope + ' painting' : '') : (lead.propType ? lead.propType + ' interiors' : '');
  }
  return q;
}
function newLead(div) {
  return {
    id: uid(), div, name: '', phone: '', email: '', city: '', address: '', source: 'Instagram', assignee: '', stage: 'new',
    followUp: addDays(today(), 1), requirement: '', propType: '', budget: '', scope: '', area: '', rates: [], log: [],
    createdBy: S.me.id, createdAt: Date.now(), updatedAt: Date.now()
  };
}
