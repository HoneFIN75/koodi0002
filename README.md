# koodi0002

This repository currently contains a minimal static test site and a GitHub Actions deployment workflow.

The goal of this first version is to verify that deployment from GitHub to your web server works end-to-end before the RSS reader is built.

## What this setup does

- stores the website source in this repository
- deploys the static site automatically when code is pushed to `main`
- connects to your server over SSH
- creates the target directory if needed
- uploads the site files with `rsync`
- stamps the deployed page with GitHub Actions deployment metadata so you can verify a new release reached the server

## Files included

- `/index.html` - simple static verification page
- `/styles.css` - minimal styling for the page
- `/.github/workflows/deploy.yml` - deployment workflow

## Required GitHub Actions secrets

Configure these repository secrets before deploying:

- `SSH_KEY` - private SSH key allowed to connect to the server
- `SSH_HOST` - server hostname or IP
- `SSH_USER` - SSH username
- `SSH_PATH` - target directory on the server where the site should be published

## How deployment works

Deployment runs automatically on every push to the `main` branch.

The workflow will:

1. check out the repository
2. prepare SSH access using `SSH_KEY`
3. trust the remote host using `ssh-keyscan` and `SSH_HOST`
4. ensure the remote directory exists at `SSH_PATH`
5. upload the static site files with `rsync`

## How to verify deployment worked

1. Push a change to `main`.
2. Open the Actions tab in GitHub and confirm the `Deploy static site` workflow succeeds.
3. Visit the deployed site on your server.
4. Confirm the page says it was deployed from GitHub Actions for this repository.
5. Check the visible deployment information area on the page. It shows the workflow timestamp and commit SHA so you can confirm a fresh deploy reached the server.

You can trigger another verification deploy later by making a small content change and pushing it to `main`.

## Next step later

This repository is intentionally minimal for now. The RSS reader and widget functionality will be added after the deployment flow has been verified.
