#!/usr/bin/env bash
# Create the Python virtualenv and install dependencies (Linux / macOS).
#   ./setup.sh            then   source .venv/bin/activate
set -euo pipefail
cd "$(dirname "$0")"

PY=${PYTHON:-python3}
"$PY" -c 'import sys; sys.exit(sys.version_info < (3, 10))' || { echo "Python 3.10+ required"; exit 1; }

[ -d .venv ] || "$PY" -m venv .venv
.venv/bin/python -m pip install --upgrade pip -q
.venv/bin/pip install -r requirements-dev.txt -q
[ -f .env ] || cp .env.example .env

echo
echo "Done. Next:"
echo "  source .venv/bin/activate"
echo "  uvicorn app.main:app --reload     # http://localhost:8000"
