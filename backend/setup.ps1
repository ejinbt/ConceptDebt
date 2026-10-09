# Create the Python virtualenv and install dependencies (Windows PowerShell).
#   .\setup.ps1           then   .\.venv\Scripts\Activate.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$py = if (Get-Command py -ErrorAction SilentlyContinue) { "py" } else { "python" }
& $py -c "import sys; sys.exit(sys.version_info < (3, 10))"
if ($LASTEXITCODE -ne 0) { throw "Python 3.10+ required" }

if (-not (Test-Path .venv)) { & $py -m venv .venv }
& .\.venv\Scripts\python.exe -m pip install --upgrade pip -q
& .\.venv\Scripts\pip.exe install -r requirements-dev.txt -q
if (-not (Test-Path .env)) { Copy-Item .env.example .env }

Write-Host ""
Write-Host "Done. Next:"
Write-Host "  .\.venv\Scripts\Activate.ps1"
Write-Host "  uvicorn app.main:app --reload     # http://localhost:8000"
