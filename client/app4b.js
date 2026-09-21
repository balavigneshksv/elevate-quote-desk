
/* ================= team & access (admin) and my account ================= */
const PERM_DEFAULTS = { interiors: true, paints: true, leads: true, quotes: true, deals: false, totals: false, delete: false, scope: 'all' };
const PERM_GROUPS = [
  ['Sections', [
    ['interiors', 'Interiors', 'Can work in the Interiors section.'],
    ['paints', 'Paints', 'Can work in the Paints section.']]],
  ['What they can open', [
    ['leads', 'Leads sheet', 'See and update leads, post progress notes and reply to your questions.'],
    ['quotes', 'Quotations, estimates and bills', 'Create, edit, preview and print them.'],
    ['deals', 'Work orders and agreements', 'See and prepare them, including the deal amount you set. Off keeps the amount hidden from this login.'],
    ['totals', 'Summary figures', 'Pipeline value, approved value and bills outstanding on the Overview and list pages.']]],
  ['What they can change', [
    ['delete', 'Delete records', 'Delete leads, quotations and bills. Off is safer: they can still edit everything else.']]]
];
const permList = p => {
  const yes = [], no = [], add = (ok, t) => (ok ? yes : no).push(t);
  const divs = [p.interiors && 'Interiors', p.paints && 'Paints'].filter(Boolean);
  add(divs.length > 0, divs.length ? 'work in ' + divs.join(' and ') : 'work in Interiors or Paints');
  add(!!p.leads, 'see and update the leads sheet');
  add(!!p.quotes, 'create and edit quotations, estimates and bills');
  add(!!p.deals, 'see and prepare work orders and agreements, including the deal amount');
  add(!!p.totals, 'see summary figures such as pipeline and totals');
  add(!!p.delete, 'delete leads, quotations and bills');
  yes.push(p.scope === 'own' ? 'see only the leads and quotations they created or are named on under “Handled by”' : 'see every record in the sections above');
  return { yes, no };
};
function permSummary(name, p) {
  const { yes, no } = permList(p), who = esc(name || 'This login');
  return `<div class="ps-col ps-yes"><h4>${who} can</h4><ul>${yes.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
    <div class="ps-col ps-no"><h4>${who} cannot</h4>${no.length ? `<ul>${no.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p class="hint">Nothing is switched off.</p>'}</div>`;
}
const staffDraft = u => ({
  name: u ? u.name : '', username: u ? u.username : '', password: '', active: u ? u.active !== false : true,
  perms: { ...PERM_DEFAULTS, ...(u ? u.perms : {}) }
});
const genPassword = () => {
  const cs = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789', a = new Uint32Array(12);
  crypto.getRandomValues(a); return [...a].map(n => cs[n % cs.length]).join('');
};
const errText = e => (e && e.message) || 'Something went wrong';

async function loadTeam() {
  S.team = { loading: true, users: [], staff: null, admin: null, draft: null, adm: null, maxStaff: 1, err: '' };
  if (S.view === 'home' && S.tab === 'team') rerenderTeam();
  try {
    const r = await API.req('GET', '/api/admin/users');
    const T = S.team; T.users = r.users; T.maxStaff = r.maxStaff;
    T.staff = r.users.find(u => u.role === 'staff') || null; T.admin = r.users.find(u => u.role === 'admin') || null;
    T.draft = staffDraft(T.staff); T.adm = T.admin ? { name: T.admin.name, username: T.admin.username } : { name: '', username: '' };
    T.loading = false; T.err = '';
  } catch (e) { S.team.loading = false; S.team.err = errText(e); }
  if (S.view === 'home' && S.tab === 'team') rerenderTeam();
}
function rerenderTeam() { const m = $('#main'); if (!m) return; const y = window.scrollY; m.innerHTML = teamHtml(); window.scrollTo(0, y); }
const fmtLast = ts => (ts ? ago(ts) : 'never');

function teamHtml() {
  if (!S.isOwner) return `<div class="banner">Only the admin can manage logins.</div>`;
  const T = S.team;
  const head = `<div class="pagehead"><div><h1>Team &amp; access</h1><p class="sub">Create the staff login and choose exactly what it can see. The server enforces these rules, so hidden things are never sent to that login.</p></div></div>`;
  if (!T || T.loading) return head + `<div class="empty"><p>Loading…</p></div>`;
  if (T.err) return head + `<div class="banner">${esc(T.err)}</div><button class="btn" data-act="team-reload">Try again</button>`;
  const d = T.draft, st = T.staff, isNew = !st;
  const groups = PERM_GROUPS.map(([g, rows]) => `<div class="pg"><div class="lbl">${g}</div>${rows.map(([k, t, h]) => `<label class="toggle"><input type="checkbox" data-team="p.${k}" ${d.perms[k] ? 'checked' : ''}><span><b>${t}</b><br><span class="hint">${h}</span></span></label>`).join('')}</div>`).join('');
  const scope = `<div class="pg"><div class="lbl">Which records</div><select class="text" data-team="p.scope" aria-label="Which records">
      <option value="all" ${d.perms.scope !== 'own' ? 'selected' : ''}>All records in the sections above</option>
      <option value="own" ${d.perms.scope === 'own' ? 'selected' : ''}>Only records they created or handle</option></select>
      <p class="hint" style="margin-top:6px">“Handle” means their name is in the “Handled by” box on the lead. Quotations follow their lead.</p></div>`;
  return `${head}
    <section class="blk"><h2>Admin <small>You</small></h2><div class="fgrid">
      <div class="f s3"><label for="adm-name">Name shown on updates</label><input class="text" id="adm-name" data-team="adm.name" value="${esc(T.adm.name)}" autocomplete="off"></div>
      <div class="f s3"><label for="adm-user">Username</label><input class="text" id="adm-user" data-team="adm.username" value="${esc(T.adm.username)}" autocomplete="off" autocapitalize="none" spellcheck="false"></div></div>
      <div class="btnrow" style="margin-top:12px"><button class="btn" data-act="team-save-admin">Save my details</button><button class="btn ghost" data-act="nav" data-to="account">Change my password</button><span class="hint" id="adm-msg"></span></div></section>
    <section class="blk"><h2>Staff login <small>${isNew ? 'Not created yet' : (st.active ? 'Active' : 'Switched off')}${!isNew ? ' · last signed in ' + fmtLast(st.lastLogin) : ''}</small></h2>
      <div class="fgrid">
        <div class="f s2"><label for="tm-name">Staff member’s name</label><input class="text" id="tm-name" data-team="name" value="${esc(d.name)}" autocomplete="off" placeholder="e.g. Ravi Kumar"></div>
        <div class="f s2"><label for="tm-user">Username</label><input class="text" id="tm-user" data-team="username" value="${esc(d.username)}" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="e.g. ravi"></div>
        <div class="f s2"><label for="tm-pass">${isNew ? 'Password' : 'New password (leave empty to keep the current one)'}</label><div class="pwrow"><input class="text" id="tm-pass" data-team="password" type="password" value="${esc(d.password)}" autocomplete="new-password" placeholder="At least 8 characters"><button class="btn small" data-act="team-gen" type="button">Suggest</button></div></div>
      </div>
      ${isNew ? '' : `<label class="toggle" style="margin-top:12px"><input type="checkbox" data-team="active" ${d.active ? 'checked' : ''}><span><b>Login is active</b><br><span class="hint">Switch off to stop this person signing in. They are signed out straight away.</span></span></label>`}
      <h3 class="sub-h">What this login can see and do</h3>
      <div class="permgrid">${groups}${scope}</div>
      <div class="permsum" id="permsum">${permSummary(d.name, d.perms)}</div>
      <div class="btnrow" style="margin-top:16px"><button class="btn primary" data-act="${isNew ? 'team-create' : 'team-save'}">${isNew ? 'Create staff login' : 'Save changes'}</button><span class="hint" id="team-msg"></span></div>
      <p class="hint" style="margin-top:12px">${T.maxStaff === 1 ? 'This version supports one staff login. Adding more people is planned for the next version.' : `You can create up to ${T.maxStaff} staff logins.`} Share the username and password with them directly and ask them to change the password under their name at the top right.</p>
    </section>`;
}

function accountHtml() {
  const A = S.acct || (S.acct = { cur: '', next: '', again: '', msg: '', err: false, busy: false });
  const p = S.isOwner ? null : permList(S.perms || PERM_DEFAULTS);
  return `<div class="pagehead"><div><h1>My account</h1><p class="sub">${esc(S.me.name || '')} · ${S.isOwner ? 'Admin' : 'Staff'}${S.me.username ? ' · username ' + esc(S.me.username) : ''}</p></div></div>
    <section class="blk"><h2>Change password</h2><div class="fgrid">
      <div class="f s2"><label for="ac-cur">Current password</label><input class="text" id="ac-cur" type="password" data-team="acct.cur" autocomplete="current-password" value="${esc(A.cur)}"></div>
      <div class="f s2"><label for="ac-new">New password</label><input class="text" id="ac-new" type="password" data-team="acct.next" autocomplete="new-password" value="${esc(A.next)}" placeholder="At least 8 characters"></div>
      <div class="f s2"><label for="ac-again">New password again</label><input class="text" id="ac-again" type="password" data-team="acct.again" autocomplete="new-password" value="${esc(A.again)}"></div></div>
      <div class="btnrow" style="margin-top:12px"><button class="btn primary" data-act="acct-save">Change password</button><span class="hint" id="acct-msg"></span></div>
      <p class="hint" style="margin-top:10px">Changing it signs you out on your other devices.</p></section>
    ${p ? `<section class="blk"><h2>What your login includes</h2><div class="permsum"><div class="ps-col ps-yes"><h4>You can</h4><ul>${p.yes.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>${p.no.length ? `<div class="ps-col ps-no"><h4>You cannot</h4><ul>${p.no.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}</div>
      <p class="hint" style="margin-top:10px">If you need more access, ask the admin.</p></section>` : ''}
    <div class="btnrow"><button class="btn" data-act="logout">Sign out</button></div>`;
}

/* the staff member's name becomes a suggestion in "Handled by" and "Visited by" */
async function addToTeamList(name) {
  const n = (name || '').trim();
  if (!n || !S.db || !S.isOwner) return;
  if ((S.settings.team || []).some(t => String(t).trim().toLowerCase() === n.toLowerCase())) return;
  try { const st = clone(S.settings); st.team = [...(st.team || []).filter(Boolean), n]; await S.db.doc('settings/company').set(st); } catch { }
}
function setMsg(id, text, bad) { const el = document.getElementById(id); if (!el) return; el.textContent = text || ''; el.style.color = bad ? 'var(--bad)' : 'var(--ok)'; }

function teamField(el, e) {
  const k = el.dataset.team, v = el.type === 'checkbox' ? el.checked : el.value;
  if (k.startsWith('acct.')) { if (S.acct) S.acct[k.slice(5)] = v; return; }
  const T = S.team; if (!T) return;
  if (k.startsWith('adm.')) { T.adm[k.slice(4)] = v; return; }
  if (k.startsWith('p.')) T.draft.perms[k.slice(2)] = v; else T.draft[k] = v;
  if (k.startsWith('p.') || k === 'name') { const s = $('#permsum'); if (s) s.innerHTML = permSummary(T.draft.name, T.draft.perms); }
}

async function teamAct(a, b, d) {
  const T = S.team;
  switch (a) {
    case 'logout':
      await leaveEditor(); await leaveLead();
      try { await API.req('POST', '/api/logout'); } catch { }
      location.replace('/'); return true;
    case 'team-reload': loadTeam(); return true;
    case 'team-gen': {
      if (!T) return true; T.draft.password = genPassword();
      const i = $('#tm-pass'); if (i) { i.value = T.draft.password; i.type = 'text'; } return true;
    }
    case 'team-create': case 'team-save': {
      if (!T || !T.draft || b.disabled) return true;
      const dr = T.draft, isNew = a === 'team-create';
      if (!dr.name.trim()) { setMsg('team-msg', 'Enter the staff member’s name.', true); return true; }
      if (!dr.username.trim()) { setMsg('team-msg', 'Enter a username.', true); return true; }
      if (isNew && !dr.password) { setMsg('team-msg', 'Enter a password (or press Suggest).', true); return true; }
      b.disabled = true; setMsg('team-msg', 'Saving…', false);
      try {
        if (isNew) await API.req('POST', '/api/admin/staff', { name: dr.name, username: dr.username, password: dr.password, perms: dr.perms });
        else {
          const body = { name: dr.name, username: dr.username, active: dr.active, perms: dr.perms };
          if (dr.password) body.password = dr.password;
          await API.req('PATCH', '/api/admin/users/' + T.staff.id, body);
        }
        await addToTeamList(dr.name);
        toast(isNew ? 'Staff login created' : 'Changes saved');
        const shown = dr.password && (isNew || dr.password) ? dr.password : '';
        await loadTeam();
        if (shown) setMsg('team-msg', 'Saved. Password for ' + S.team.draft.username + ' is: ' + shown + ' (copy it now, it is not shown again).', false);
        else setMsg('team-msg', 'Saved.', false);
      } catch (e) { b.disabled = false; setMsg('team-msg', errText(e), true); }
      return true;
    }
    case 'team-save-admin': {
      if (!T || !T.admin) return true;
      setMsg('adm-msg', 'Saving…', false);
      try {
        await API.req('PATCH', '/api/admin/users/' + T.admin.id, { name: T.adm.name, username: T.adm.username });
        S.me.name = T.adm.name.trim() || S.me.name; S.me.username = T.adm.username.trim().toLowerCase();
        refreshBar(); toast('Saved'); setMsg('adm-msg', 'Saved.', false);
      } catch (e) { setMsg('adm-msg', errText(e), true); }
      return true;
    }
    case 'acct-save': {
      const A = S.acct; if (!A || b.disabled) return true;
      if (!A.cur) { setMsg('acct-msg', 'Enter your current password.', true); return true; }
      if (A.next.length < 8) { setMsg('acct-msg', 'The new password must be at least 8 characters.', true); return true; }
      if (A.next !== A.again) { setMsg('acct-msg', 'The two new passwords do not match.', true); return true; }
      b.disabled = true; setMsg('acct-msg', 'Saving…', false);
      try {
        await API.req('POST', '/api/me/password', { current: A.cur, next: A.next });
        S.acct = { cur: '', next: '', again: '', msg: '', err: false, busy: false };
        const m = $('#main'); if (m) m.innerHTML = accountHtml();
        toast('Password changed'); setMsg('acct-msg', 'Password changed.', false);
      } catch (e) { b.disabled = false; setMsg('acct-msg', errText(e), true); }
      return true;
    }
  }
  return false;
}
