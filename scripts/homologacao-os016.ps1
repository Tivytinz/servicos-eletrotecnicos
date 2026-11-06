param(
    [switch]$Parar,
    [switch]$ApagarDadosTeste
)

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
$arquivo = Join-Path $raiz ".env.homologacao-os016"
$compose = Join-Path $raiz "docker-compose.homologacao-os016.yml"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker Desktop nao encontrado. Instale e inicie Docker Desktop antes de continuar."
}
& docker compose version | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose nao disponivel. Atualize Docker Desktop."
}

# Rejeita variaveis externas que poderiam sobrescrever o arquivo local.
foreach ($nome in @("DATABASE_URL", "DATABASE_URL_ADMIN", "DATABASE_URL_CONVITES",
                    "POSTGRES_PASSWORD", "GESTAO_APP_PASSWORD",
                    "GESTAO_CONVITES_PASSWORD", "ADMIN_PASSWORD")) {
    if ([Environment]::GetEnvironmentVariable($nome, "Process")) {
        throw "A variavel $nome ja esta definida neste terminal. Abra um terminal limpo para proteger a homologacao."
    }
}

if ($ApagarDadosTeste -and -not $Parar) {
    throw "Para apagar os dados de teste, use -Parar -ApagarDadosTeste."
}

if ($Parar) {
    if (-not (Test-Path $arquivo)) {
        Write-Host "Arquivo local nao existe; nada para desligar."
        exit 0
    }
    $argsCompose = @("compose", "--env-file", $arquivo, "-f", $compose, "down")
    if ($ApagarDadosTeste) {
        $argsCompose += "--volumes"
        Write-Host "ATENCAO: isto apaga somente o volume Docker eg-homologacao-os016."
    }
    & docker @argsCompose
    if ($LASTEXITCODE -ne 0) { throw "Nao foi possivel parar o ambiente." }
    exit 0
}

function NovoSegredo {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return ([BitConverter]::ToString($bytes)).Replace("-", "")
}

if (-not (Test-Path $arquivo)) {
    $linhas = @(
        "POSTGRES_PASSWORD=$(NovoSegredo)",
        "GESTAO_APP_PASSWORD=$(NovoSegredo)",
        "GESTAO_CONVITES_PASSWORD=$(NovoSegredo)",
        "ADMIN_PASSWORD=$(NovoSegredo)"
    )
    [System.IO.File]::WriteAllLines($arquivo, $linhas, [System.Text.Encoding]::ASCII)
    Write-Host "Credenciais ficticias geradas no arquivo .env.homologacao-os016 (ignorado pelo Git)."
}
Write-Host "QA OS 016: banco INDEPENDENTE do ambiente 015, com volume Docker isolado."
Write-Host "Iniciando banco local isolado e site HTTPS..."
& docker compose --env-file $arquivo -f $compose up -d --build
if ($LASTEXITCODE -ne 0) {
    throw "Falha na inicializacao. Inspecione: docker compose --env-file .env.homologacao-os016 -f docker-compose.homologacao-os016.yml logs preparar"
}
Write-Host ""
Write-Host "Homologacao local: https://localhost:3444/gestao/login"
Write-Host "Usuario de teste: qa-admin@example.test"
Write-Host "Senha de teste: consulte ADMIN_PASSWORD no arquivo .env.homologacao-os016."
Write-Host "O navegador mostrara aviso de certificado local autoassinado; confirme somente em localhost."
Write-Host "Para parar: powershell -File scripts/homologacao-local.ps1 -Parar"
