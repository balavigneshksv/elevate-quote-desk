'use strict';
/*
 * What each login may see and do. Everything here is enforced on the SERVER,
 * so hiding a button in the browser is never the only protection.
 *
 *   interiors  can work with the Interiors division
 *   paints     can work with the Paints division
 *   leads      can see and update the Leads sheet
 *   quotes     can see and create quotations, estimates and bills
 *   deals      can see and prepare work orders and agreements (the deal amount)
 *   totals     sees the summary figures (pipeline, approved, bills outstanding)
 *   delete     can delete leads, quotations and bills
 *   scope      "all" = everything in the divisions above, "own" = only the leads
 *              and quotations this person created or is named as handling
 *
 * The admin always has everything and is the only one who can change Settings,
 * ask questions on a lead, and manage logins.
 */
const FLAGS = ['interiors', 'paints', 'leads', 'quotes', 'deals', 'totals', 'delete'];
const DIVS = ['interiors', 'paints'];

const STAFF_DEFAULTS = Object.freeze({
  interiors: true, paints: true, leads: true, quotes: true,
  deals: false, totals: false, delete: false, scope: 'all'
});

function normalizePerms(p) {
  const out = { ...STAFF_DEFAULTS };
  if (p && typeof p === 'object') {
    for (const k of FLAGS) if (typeof p[k] === 'boolean') out[k] = p[k];
    if (p.scope === 'own' || p.scope === 'all') out.scope = p.scope;
  }
  return out;
}

const ADMIN_PERMS = Object.freeze({
  interiors: true, paints: true, leads: true, quotes: true, deals: true, totals: true, delete: true, scope: 'all'
});

const isAdmin = u => !!u && u.role === 'admin';
const effective = u => (isAdmin(u) ? { ...ADMIN_PERMS } : normalizePerms(u && u.perms));
const norm = s => String(s || '').trim().toLowerCase();
const divOf = d => (d && d.div === 'paints' ? 'paints' : 'interiors');

/* Can this user see this document? `getLead` is used to follow a quotation back to its lead. */
async function visible(user, c, data, getLead) {
  if (c === 'settings') return true;
  if (isAdmin(user)) return true;
  if (!data) return false;
  const p = effective(user);
  if (!p[divOf(data)]) return false;
  if (c === 'leads' && !p.leads) return false;
  if (c === 'quotes' && !p.quotes) return false;
  if (p.scope === 'own') {
    if (data.createdBy && data.createdBy === user.id) return true;
    if (c === 'leads') return norm(data.assignee) !== '' && norm(data.assignee) === norm(user.name);
    if (c === 'quotes') {
      if (data.leadId && getLead) {
        const l = await getLead(data.leadId);
        if (l && ((l.createdBy && l.createdBy === user.id) || (norm(l.assignee) !== '' && norm(l.assignee) === norm(user.name)))) return true;
      }
      return false;
    }
    return false;
  }
  return true;
}

/* What the user is allowed to receive: internal fields removed, and the deal
   (work order / agreement amount) removed for anyone without that access. */
function present(user, c, data) {
  if (!data) return data;
  const out = { ...data };
  delete out._id; delete out._ts; delete out._del;
  if (c === 'quotes' && !isAdmin(user) && !effective(user).deals) delete out.deal;
  return out;
}

/* May this user write to (create or change) documents of this collection and division? */
function writeError(user, c, data) {
  if (c === 'settings') return isAdmin(user) ? null : 'Only the admin can change company settings';
  if (isAdmin(user)) return null;
  const p = effective(user);
  if (c === 'leads' && !p.leads) return 'Your login does not include the leads sheet';
  if (c === 'quotes' && !p.quotes) return 'Your login does not include quotations';
  if (!p[divOf(data)]) return `Your login does not include ${divOf(data) === 'paints' ? 'Paints' : 'Interiors'}`;
  return null;
}

module.exports = { FLAGS, DIVS, STAFF_DEFAULTS, ADMIN_PERMS, normalizePerms, effective, isAdmin, divOf, visible, present, writeError };
