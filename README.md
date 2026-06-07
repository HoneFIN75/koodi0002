# koodi0002

This repository now contains the first RSS MVP for a deployable plain HTML/CSS/JavaScript site.

The site keeps the existing GitHub Actions SSH deployment flow, adds a feed viewer page that
renders RSS entries as cards, and adds a configurator page that builds viewer URLs without manual
code edits.

## What the RSS MVP does

- keeps the project deployable as a simple site pushed to a generic web server over SSH
- provides an RSS viewer page that reads settings from URL query parameters
- renders feed items as clean cards with title, link, optional publish date, and optional
  description
- provides a configurator page that generates the viewer URL and a simple iframe snippet
- attempts direct browser feed fetching first and falls back to a lightweight same-origin PHP proxy
  when browser CORS rules block the request

## Files and pages

- `/index.html` - simple project home page and deployment marker page
- `/rss.html` - RSS viewer page
- `/config.html` - configurator page for generating viewer URLs
- `/styles.css` - shared styling for all pages
- `/rss.js` - viewer logic, query parsing, feed fetching, and rendering
- `/config.js` - configurator logic
- `/rss-proxy.php` - optional same-origin fallback for servers that can execute PHP
- `/.github/workflows/deploy.yml` - deployment workflow

## Required GitHub Actions secrets

Configure these repository secrets before deploying:

- `SSH_KEY` - private SSH key allowed to connect to the server
- `SSH_HOST` - server hostname or IP
- `SSH_USER` - SSH username
- `SSH_PATH` (optional) - target directory on the server where the site should be published. If
  omitted, deployment uses the SSH user's home directory (`.`).

## How deployment works

Deployment runs automatically on every push to the `main` branch.

The workflow will:

1. check out the repository
2. prepare SSH access using `SSH_KEY`
3. trust the remote host using `ssh-keyscan` and `SSH_HOST`
4. collect deployable root-level site assets (`.html`, `.css`, `.js`, `.php`)
5. stamp `index.html` with GitHub Actions deployment metadata
6. ensure the remote directory exists at `SSH_PATH`
7. upload the site files with `rsync`

## How to test locally

Because the MVP is plain files, the simplest local test is to run a small local web server from the
repository root.

### Static preview

```bash
cd /tmp/workspace/HoneFIN75/koodi0002
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000/index.html`
- `http://localhost:8000/config.html`
- `http://localhost:8000/rss.html`

### Local PHP fallback preview

If you want to test the optional `rss-proxy.php` fallback locally, serve the repository with PHP:

```bash
cd /tmp/workspace/HoneFIN75/koodi0002
php -S 127.0.0.1:8000
```

## How to use query parameters

The viewer page reads these parameters:

- `feed` - encoded RSS or Atom feed URL
- `limit` - number of items to show, clamped to `1-20`
- `showDate` - `1`/`0`, `true`/`false`, `yes`/`no`, `on`/`off`
- `showDescription` - `1`/`0`, `true`/`false`, `yes`/`no`, `on`/`off`

Example:

```text
rss.html?feed=https%3A%2F%2F112.fi%2Fstaattiset-rss-syotteet%2F-%2Fasset_publisher%2Fo7don5OvWPDS%2Frss&limit=6&showDate=1&showDescription=1
```

Once deployed, the same configured URL can be used directly in an iframe.

## How to verify after deployment

1. Push a change to `main`.
2. Open the Actions tab in GitHub and confirm the `Deploy static site` workflow succeeds.
3. Visit the deployed site on your server.
4. Open the home page, viewer page, and configurator page.
5. Confirm the home page deployment marker changed.
6. Confirm the RSS viewer loads entries from the configured feed.

## CORS and proxy limitation

Some feeds do not allow direct browser fetching because of CORS. The viewer therefore tries:

1. direct browser fetch
2. same-origin fetch through `/rss-proxy.php`

The PHP proxy is intentionally lightweight and meant only as a practical MVP fallback. It validates
that feed URLs use `http` or `https`, blocks obvious local/private targets, and works best on a
server with normal outbound DNS access, but it still assumes the deployed server can execute PHP.
If the server is strictly static-only with no PHP support, direct browser fetching must work for the
chosen feed or a different server-side fallback will need to be added later.

## Later extensions

This MVP is intentionally simple. More advanced visualizations, richer embed tooling, and broader
feed customization can be added later without changing the basic deployment model.
