# Putting Sehaj Paath on your iPhone

The app is plain files, so any free static host works. Steps below use GitHub Pages. Do this before **Fri 13 Nov** so you have a week to test.

## 1. One-time: GitHub account and repository

1. Sign in at https://github.com (create a free account if needed).
2. Click **+** (top right) > **New repository**.
3. Name it `sehaj-paath`. Choose **Public** (GitHub Pages is free for public repositories). The site holds only Gurbani and English, no personal data. Tick **Add a README file**. Click **Create repository**.

## 2. Upload the app

Do not run git inside the Google Drive folder (Drive can corrupt a `.git` folder). Use the browser upload:

1. In your new repository click **Add file > Upload files**.
2. Open `G:\My Drive\Gurbani App\app\sehaj-paath\` in File Explorer. Select everything **except** `DEPLOY.md`, `VERIFICATION.md` and `ang-line-counts.csv` (those are optional; uploading them is harmless): `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest`, and the folders `data`, `fonts`, `icons`.
3. Drag them into the browser window. Browsers cap an upload at 100 files, and `data` holds 143. Upload in two commits: first everything except `data`, then the `data` folder in two halves (angs up to 700, then the rest). Click **Commit changes** after each batch.
   - Easier alternative: install **GitHub Desktop**, clone the repository to `C:\Users\<you>\sehaj-paath`, copy the files in, then **Commit** and **Push**. This handles any number of files.

## 3. Turn on Pages

1. In the repository go to **Settings > Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**, branch **main**, folder **/ (root)**. Click **Save**.
3. Wait 1 to 2 minutes. The page shows your address: `https://<your-username>.github.io/sehaj-paath/`.

Confirm that `index.html`, `sw.js` and the `data` folder are at the top level of the repository (not inside another folder), or the site will show a 404.

## 4. Add it to the iPhone Home Screen (iOS 17/18/26)

1. Open the address in **Safari** (it must be Safari; other browsers do not install offline apps).
2. Tap **Share** (square with arrow) > **Add to Home Screen** > **Add**.
3. Open it from the **Home Screen icon**, once, **on Wi-Fi**. The first open downloads the whole Granth (about 3 MB transferred, 10.6 MB stored). Wait about 30 seconds.
4. Test offline: turn on **Airplane Mode**, close the app fully (swipe it away), and open it again. Jump to a few angs, for example 505, 900 and 1430.

## 5. Before you fly

- Set your plan in the app (tap the Ang number): first ang 505, last 1430, angs per day, start date 22 Nov.
- Copy the backup code (bottom of the same sheet) into Notes. It restores your place if the app is ever deleted.
- Use the app from the Home Screen icon, not from Safari, so your place and settings stay in the app's own storage.

## Updating later

Upload changed files to GitHub. In `sw.js`, change `VERSION = "sehaj-v1"` to `"sehaj-v2"` so phones fetch the new files, then open the app once on Wi-Fi.
