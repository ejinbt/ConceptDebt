# Deploy the backend on a VPS

Docker Compose runs two containers:

- **api**: the FastAPI backend. SQLite lives on the `api-data` volume.
- **caddy**: HTTPS reverse proxy. It gets and renews a Let's Encrypt certificate automatically.

Result: `https://<DOMAIN>/` (tester), `https://<DOMAIN>/docs`, `https://<DOMAIN>/api/...`

No domain? Use **sslip.io**, which resolves `api.<ip>.sslip.io` to `<ip>`:
`DOMAIN=api.94.249.197.142.sslip.io`

## 1. One-time server setup (Ubuntu / Debian)

```bash
# Docker + compose plugin
curl -fsSL https://get.docker.com | sh

# Firewall: SSH, HTTP (certificate challenge + redirect), HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
```

If your provider has its own firewall panel, open 80 and 443 there too.

## 2. Get the code

The repo is private, so use a GitHub personal access token (repo read) as the
password, or add the server's SSH key as a deploy key.

```bash
git clone -b backend https://github.com/ejinbt/ConceptDebt.git
cd ConceptDebt
```

## 3. Configure

```bash
cp backend/.env.example backend/.env
nano backend/.env          # set AI_API_KEY (Featherless) and AI_MODEL
cp deploy/.env.example deploy/.env
nano deploy/.env           # DOMAIN=api.94.249.197.142.sslip.io (or your domain)
```

Leave `DATABASE_URL` alone. Compose overrides it to keep the database on the volume.

If you use a real domain, point an **A record** at the server IP first and wait
until `ping <domain>` shows the right IP. Caddy needs that to get the certificate.

## 4. Start

```bash
cd deploy
docker compose up -d --build
docker compose ps                 # both "running", api "healthy" after ~30 s
docker compose logs -f caddy      # look for "certificate obtained successfully"
```

Check it:

```bash
curl https://api.94.249.197.142.sslip.io/api/health
```

Then open `https://<DOMAIN>/` and run the demo flow from `docs/checklist.html`.

## Everyday commands (run in `deploy/`)

| Task | Command |
|---|---|
| Update after `git pull` | `git pull && docker compose up -d --build` |
| Live logs (AI warnings show here) | `docker compose logs -f api` |
| Restart | `docker compose restart api` |
| Reset the database | `docker compose exec api python -m app.seed --reset` |
| Back up the database | `docker compose cp api:/data/conceptdebt.db ./backup-$(date +%F).db` |
| Stop everything | `docker compose down` (data stays; `down -v` deletes it) |
| Changed `backend/.env` | `docker compose up -d` (recreates the container with the new values) |

## Auto-deploy with GitHub Actions

`.github/workflows/deploy.yml` runs on every push to `backend` that touches
`backend/`, `deploy/` or the workflow (or by hand: **Actions → Test & deploy backend → Run workflow**):

1. **test**: runs `pytest` on GitHub. If tests fail, nothing is deployed.
2. **deploy**: SSHes into the VPS, `git reset --hard origin/backend`, rebuilds with
   `docker compose up -d --build`, and fails the run if `/api/health` doesn't answer within ~60 s.

`.env` files are gitignored, so the reset never touches your keys or settings.
Don't edit tracked files directly on the server: the next deploy overwrites them.

### One-time setup

Do steps 1–4 above first, so the server has the repo, `.env` files and a working stack.

**a. A deploy key for GitHub Actions to log in to the VPS** (on the VPS, as the user that owns the repo):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/gha_deploy -N "" -C "github-actions"
cat ~/.ssh/gha_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/gha_deploy        # copy this whole private key for the secret below
```

That user must be able to run Docker (`sudo usermod -aG docker $USER`, then log out and in).

**b. Let the VPS pull from the private repo without a password.** Either:
- store the token once: `git config --global credential.helper store`, then `git pull` and
  enter your GitHub username + personal access token, or
- add the server's SSH key as a read-only **Deploy key** (repo Settings → Deploy keys) and
  `git remote set-url origin git@github.com:ejinbt/ConceptDebt.git`.

Check that `git pull` works on the server with no prompt.

**c. GitHub secrets** (repo Settings → Secrets and variables → Actions → New repository secret):

| Secret | Value |
|---|---|
| `VPS_HOST` | `94.249.197.142` |
| `VPS_USER` | the SSH user, e.g. `root` or `deploy` |
| `VPS_SSH_KEY` | the private key from step a (including the BEGIN/END lines) |
| `VPS_APP_DIR` | full path of the clone, e.g. `/root/ConceptDebt` |
| `VPS_PORT` | only if SSH isn't on port 22 |

The deploy job uses a GitHub **environment** called `production` (created
automatically on first run). In Settings → Environments you can add a required
reviewer if you want to approve each deploy.

**d. Test it:** Actions → Test & deploy backend → Run workflow. Both jobs should go green.

## Frontend on Vercel

Give your teammate `https://<DOMAIN>/api` as the API base URL
(`VITE_API_URL=https://<DOMAIN>/api` in Vercel's environment variables).

CORS is open (`*`) by default. To lock it down later, set the Vercel URL in `backend/.env`:

```
CORS_ORIGINS=https://conceptdebt.vercel.app,http://localhost:5173
```

then `docker compose up -d`.

## Troubleshooting

- **Port 80/443 already in use** (another nginx/Caddy on the server): remove the
  `caddy` service, publish the API on localhost only by adding
  `ports: ["127.0.0.1:8000:8000"]` under `api`, and proxy your existing web
  server to `http://127.0.0.1:8000`.
- **No certificate / "connection refused"**: DNS isn't pointing at the server yet,
  or ports 80/443 are blocked (check the provider firewall too). See `docker compose logs caddy`.
- **Let's Encrypt rate limit** on sslip.io (shared domain): try again later,
  or use a real domain or a free one from DuckDNS.
- **`ai_enabled: false`** at `/api/health`: `AI_API_KEY` missing in `backend/.env`;
  fix and run `docker compose up -d`.
