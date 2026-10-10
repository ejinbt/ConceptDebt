# Deploy the backend on a VPS

Docker Compose runs the FastAPI backend (**api**). SQLite lives on the `api-data` volume.
The API listens on **`127.0.0.1:8000` only**, so it doesn't clash with other apps.
HTTPS comes from a web server in front of it:

- **Option A: you already run nginx (or Caddy, etc.) on 80/443.** Add one site
  that proxies to `127.0.0.1:8000`. Your other apps keep working.
- **Option B: nothing on 80/443.** Turn on the bundled Caddy container (`COMPOSE_PROFILES=caddy`).

Result: `https://<DOMAIN>/` (tester), `https://<DOMAIN>/docs`, `https://<DOMAIN>/api/...`

No domain? Use **sslip.io**, which resolves `api.<ip>.sslip.io` to `<ip>`:
`api.94.249.197.142.sslip.io`

Not sure what's on 80/443? `sudo ss -tlnp | grep -E ':(80|443) '` and `docker ps`.

## 1. One-time server setup (Ubuntu / Debian)

```bash
curl -fsSL https://get.docker.com | sh       # skip if Docker is installed
```

Ports 80 and 443 must be open (they already are if another site works).

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
nano deploy/.env           # API_PORT (default 8000; change if taken)
```

Leave `DATABASE_URL` alone. Compose overrides it to keep the database on the volume.

## 4. Start the API

```bash
cd deploy
docker compose up -d --build
docker compose ps                         # api "healthy" after ~30 s
curl http://127.0.0.1:8000/api/health     # on the server
```

## 5a. HTTPS with your existing nginx

```bash
sudo cp nginx-conceptdebt.conf /etc/nginx/sites-available/conceptdebt
sudo nano /etc/nginx/sites-available/conceptdebt    # server_name / port if different
sudo ln -s /etc/nginx/sites-available/conceptdebt /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.94.249.197.142.sslip.io  # apt install certbot python3-certbot-nginx
```

nginx picks the site by `server_name`, so your other app is untouched.

**Existing Caddy instead of nginx** (installed on the host): add to its Caddyfile and reload:

```
api.94.249.197.142.sslip.io {
	reverse_proxy 127.0.0.1:8000
}
```

If that web server runs **inside Docker**, `127.0.0.1` means its own container.
Use `host.docker.internal:8000` (add `extra_hosts: ["host.docker.internal:host-gateway"]`
to that container) or put both on the same Docker network.

## 5b. HTTPS with the bundled Caddy (only if 80/443 are free)

In `deploy/.env`:

```
COMPOSE_PROFILES=caddy
DOMAIN=api.94.249.197.142.sslip.io
```

then `docker compose up -d` and watch `docker compose logs -f caddy` for
"certificate obtained successfully".

## 6. Check

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

- **`Bind for 0.0.0.0:80 failed: port is already allocated`**: something already
  uses port 80. Remove `COMPOSE_PROFILES=caddy` from `deploy/.env`, run
  `docker compose up -d --remove-orphans`, and use step 5a.
- **`127.0.0.1:8000` already allocated**: set another `API_PORT` in `deploy/.env`
  and use that port in the nginx config.
- **No certificate / "connection refused"**: DNS isn't pointing at the server yet,
  or ports 80/443 are blocked (check the provider firewall too). Check
  `sudo certbot certificates` / `docker compose logs caddy`.
- **Let's Encrypt rate limit** on sslip.io (shared domain): try again later,
  or use a real domain or a free one from DuckDNS.
- **`ai_enabled: false`** at `/api/health`: `AI_API_KEY` missing in `backend/.env`;
  fix and run `docker compose up -d`.
