#!/usr/bin/env bash
# Create the Python virtualenv and install dependencies.
# Works on Linux, macOS and Git Bash on Windows.
#   ./setup.sh     then   source .venv/bin/activate   (Git Bash: source .venv/Scripts/activate)
set -euo pipefail
cd "$(dirname "$0")"

PY=${PYTHON:-}
if [ -z "$PY" ]; then
  for candidate in python3 python py; do
    if command -v "$candidate" >/dev/null 2>&1; then PY=$candidate; break; fi
  done
fi
[ -n "$PY" ] || { echo "Python not found"; exit 1; }
"$PY" -c 'import sys; sys.exit(sys.version_info < (3, 10))' || { echo "Python 3.10+ required"; exit 1; }

[ -d .venv ] || "$PY" -m venv .venv
# Windows venvs use Scripts/, everything else bin/
if [ -x .venv/Scripts/python.exe ]; then VPY=.venv/Scripts/python.exe; ACT=.venv/Scripts/activate
else VPY=.venv/bin/python; ACT=.venv/bin/activate; fi

"$VPY" -m pip install --upgrade pip -q
"$VPY" -m pip install -r requirements-dev.txt
"$VPY" -c "import fastapi, sqlmodel, sympy, openai" || { echo "Install incomplete, see errors above"; exit 1; }
[ -f .env ] || cp .env.example .env

echo
echo "Done. Next:"
echo "  source $ACT"
echo "  python -m pytest"
echo "  uvicorn app.main:app --reload     # http://localhost:8000"
