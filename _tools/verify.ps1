# Verify build artifacts: 1) in-apk page == root single file 2) signature 3) version
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$apk = (Get-ChildItem -LiteralPath $root -Filter '*.apk' | Where-Object { $_.BaseName -notmatch '-v\d' } | Select-Object -First 1).FullName
if (-not $apk) { Write-Error 'APK not found; run build-release.ps1 first'; exit 1 }
Write-Output ('apk: ' + $apk)

# 1) assets/index.html SHA-256 must equal root index.html
Add-Type -AssemblyName System.IO.Compression.FileSystem
$tmp = Join-Path $env:TEMP ('hakone_unzip_' + [guid]::NewGuid().ToString('N'))
[System.IO.Compression.ZipFile]::ExtractToDirectory($apk, $tmp)
$inner = Get-FileHash (Join-Path $tmp 'assets\index.html') -Algorithm SHA256
$outer = Get-FileHash (Join-Path $root 'index.html') -Algorithm SHA256
Write-Output ('assets hash: ' + $inner.Hash)
Write-Output ('root   hash: ' + $outer.Hash)
if ($inner.Hash -ne $outer.Hash) { Remove-Item $tmp -Recurse -Force; Write-Error 'in-apk page differs from root index.html!'; exit 1 }
Write-Output 'OK 1: in-apk page matches'
Remove-Item $tmp -Recurse -Force

# 2) signature
$apksigner = 'E:\develop\android-sdk\build-tools\34.0.0\apksigner.bat'
& $apksigner verify --print-certs $apk | Select-String -Pattern 'Signer #1 certificate SHA-256 digest' | ForEach-Object { Write-Output ('OK 2: ' + $_.Line.Trim()) }

# 3) version (aapt cannot read CJK path -> copy to ASCII-only dir E:\hakone_build\verify)
$asciiDir = 'E:\hakone_build\verify'
New-Item -ItemType Directory -Force -Path $asciiDir | Out-Null
$asciiApk = Join-Path $asciiDir ('hakone_check_' + [guid]::NewGuid().ToString('N') + '.apk')
Copy-Item -LiteralPath $apk -Destination $asciiApk -Force
$aapt = 'E:\develop\android-sdk\build-tools\34.0.0\aapt.exe'
& $aapt dump badging $asciiApk 2>$null | Select-String -Pattern "^package:|^application-label:" | ForEach-Object { Write-Output ('OK 3: ' + $_.Line) }
Remove-Item -LiteralPath $asciiApk -Force