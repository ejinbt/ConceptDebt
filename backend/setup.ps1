# Create the Python virtualenv and install dependencies (Windows PowerShell).
#   .\setup.ps1           then   .\.venv\Scripts\Activate.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Run($exe, [string[]]$argv) {
  & $exe @argv
  if ($LASTEXITCODE -ne 0) { throw "Failed: $exe $($argv -join ' ')" }
}

$py = if (Get-Command py -ErrorAction SilentlyContinue) { "py" } else { "python" }
Run $py @("-c", "import sys; sys.exit(sys.version_info < (3, 10))")

if (-not (Test-Path .venv)) { Run $py @("-m", "venv", ".venv") }
$vpy = ".\.venv\Scripts\python.exe"
Run $vpy @("-m", "pip", "install", "--upgrade", "pip", "-q")
Run $vpy @("-m", "pip", "install", "-r", "requirements-dev.txt")
Run $vpy @("-c", "import fastapi, sqlmodel, sympy, openai")
if (-not (Test-Path .env)) { Copy-Item .env.example .env }

Write-Host ""
Write-Host "Done. Next:"
Write-Host "  .\.venv\Scripts\Activate.ps1"
Write-Host "  python -m pytest"
Write-Host "  uvicorn app.main:app --reload     # http://localhost:8000"
