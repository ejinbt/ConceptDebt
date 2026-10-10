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
