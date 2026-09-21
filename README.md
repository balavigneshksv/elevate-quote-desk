# Elevate Quote Desk (v2, with logins)

Leads, quotations, work orders, agreements and bills for Elevate Interiors and Elevate Paints.
One admin login (you) and one staff login. The admin decides what the staff login can see.

Everything is saved in your own MongoDB Atlas database. Nothing depends on claude.ai.

---

## Go live in about 30 minutes

You need three free accounts you probably already have: GitHub, MongoDB Atlas and Render (plus Netlify for the domain).

### Step 1. Database (MongoDB Atlas)

1. In Atlas, open your project (or create a new free cluster).
2. Database Access > Add New Database User. Username `quotedesk`, choose a strong password (letters and numbers only, so it drops into the connection string without trouble). Under Database User Privileges choose "Add Specific Privilege": role `readWrite`, database `elevate_quote_desk`, collection left empty. Remove any "read and write to any database" role. This way the quote desk can only ever touch its own database. Note the password.
3. Network Access > Add IP Address > "Allow access from anywhere" (0.0.0.0/0). Render's free plan does not have a fixed IP, so this is needed. The database is still protected by the username and password.
4. Connect > Drivers > copy the connection string. It looks like
   `mongodb+srv://quotedesk:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   Replace `<password>` with the real password. Keep this text for Step 3.

The app creates its own collections (they start with `qd_`), so it will not touch your website's data even if you reuse the same cluster.

### Step 2. Put the files on GitHub

1. Create a new **private** repository, for example `elevate-quote-desk`.
2. Upload everything from this folder (drag and drop on the GitHub page works). Do not upload a `.env` file or `node_modules`.
3. Check that `server.js`, `package.json`, `app/`, `public/` and `src/` are visible at the top of the repository.

### Step 3. Render

1. Render > New > Web Service > connect the GitHub repository.
2. Settings: Runtime `Node`, Build Command `npm install`, Start Command `npm start`, Health Check Path `/healthz`, Region Singapore, Plan Free.
   (Or use New > Blueprint, which reads `render.yaml` and fills these in.)
3. Environment variables (Environment tab):

   | Name | Value |
   |---|---|
   | `MONGODB_URI` | the connection string from Step 1 |
   | `MONGODB_DB` | `elevate_quote_desk` |
   | `JWT_SECRET` | any long random text (30+ characters). Never share it. |
   | `ADMIN_USERNAME` | `admin` (or what you like) |
   | `ADMIN_PASSWORD` | a strong password for your admin login |
   | `ADMIN_NAME` | your name, e.g. `Bala` |
   | `MAX_STAFF` | `1` |

4. Deploy. When the log says "Elevate Quote Desk is running", open the `.onrender.com` address Render gives you and sign in as admin.
5. Once you are in: click your name at the top right (Account) and change the admin password to one only you know. Then delete `ADMIN_PASSWORD` from Render's environment variables (it is only used the first time).

### Step 4. Your own address (quotes.elevateinteriors.org)

1. Render > your service > Settings > Custom Domains > Add `quotes.elevateinteriors.org`.
2. Netlify > Domains > elevateinteriors.org > DNS records > Add record: type `CNAME`, name `quotes`, value = your Render address (for example `elevate-quote-desk.onrender.com`).
3. Wait a few minutes. Render shows "Verified" and issues the HTTPS certificate on its own.

### Step 5. First-day checklist

1. Sign in as admin > **Settings**: check the company name, phone, address, GST, bank details and the logo (the Elevate logo is already in).
2. Open **Team** > create the staff login (name, username, password). Tick what they may see, then Save.
3. Sign in as staff in a private/incognito window and confirm the tabs match what you allowed.
4. Add one test lead, make a quotation, download the Word and PDF, then delete the test items.
5. Run a backup (see below) and keep the file somewhere safe.

---

## What the admin controls for staff

In **Team**, the admin can switch each of these on or off, and the change reaches the staff screen within a few seconds:

- Interiors and Paints: which division(s) the staff can work in
- Leads sheet, Quotations and bills
- Work orders and agreements (the deal amount). Off by default; when off, the amount is not even sent to the staff browser.
- Summary totals (pipeline, approved, outstanding). Off by default. This hides the figures on the screen; it is not a data lock, because staff can still open the quotations they are allowed to see.
- Delete. Off by default.
- Whose items: "everything in the divisions above" or "only leads and quotations they created or are assigned to". Assigning works by writing the staff member's name in the lead's "Handled by" field.

Settings, questions on leads and the Team screen are admin-only.
All of this is checked on the server, not just hidden on the screen.

The admin can also disable the staff login, reset its password (this signs the staff out everywhere) and see the last sign-in.

## Limits of this version

- One staff login. `MAX_STAFF=1` matches the screen. The server side already supports many staff; the next version adds the "add staff" list and can raise this number.
- Render's free plan sleeps after about 15 minutes without traffic, and the first visit after that takes about a minute. Also, the 750 free hours a month are shared by ALL free web services in one Render workspace, and when they run out Render suspends all of them until next month. If another website of yours already runs on a free Render service, put this app on a paid instance (they do not sleep and do not use the free hours), or keep an eye on Render's usage page.
- The agreement wording in the app is a template. Have your lawyer read it before you use it with customers.
- Data created in the earlier claude.ai preview is not carried over. Start fresh here.

## Backups

Atlas free clusters do not keep automatic backups, so take your own now and then (weekly is sensible).

On any computer with Node 18 or newer: download this folder, run `npm install`, copy `env-example.txt` to `.env`, fill in `MONGODB_URI` (and `MONGODB_DB`), then:

```
node scripts/backup.js            # saves backup-YYYY-MM-DD.json
node scripts/backup.js --photos   # also includes photos and the logo (bigger)
node scripts/backup.js restore backup-2026-09-21.json
```

The backup contains customer details and password hashes. Keep it private.

## Forgot the admin password

In Render's Environment, add `FORCE_ADMIN_RESET=1` and set `ADMIN_PASSWORD` to a new one. Deploy, sign in, change the password under your name at the top right, then remove both variables.

## Run on your own computer (optional)

```
npm install
STORE=memory JWT_SECRET=some-long-random-text ADMIN_PASSWORD=test-password npm start
```

That uses temporary memory storage (everything vanishes on stop) at http://localhost:3000. With a `.env` file containing `MONGODB_URI` it uses the real database instead.

`npm test` runs the automated checks (46 of them) against memory storage.

## Folder guide

- `server.js`, `src/`: the server, sign-in, permissions, storage
- `app/index.html`: the app screen. Only signed-in people receive it.
- `public/`: login page, logo, one small library
- `client/` and `scripts/build-client.js`: source of the app screen. Change these, then run `npm run build:client`. Do not edit `app/index.html` by hand.
- `scripts/backup.js`: backup and restore
- `test/`: automated checks
- `render.yaml`, `env-example.txt`: hosting settings

## Security notes

- Passwords are stored hashed (bcrypt). Sessions are a secure, HTTP-only cookie that lasts 7 days and is cancelled when a password is reset or a login is disabled.
- Too many wrong passwords from one place slows sign-in down for 15 minutes.
- Never put real passwords in files you upload to GitHub. Use Render's Environment tab.
