# 下载并解压 Gradle 8.5（首次构建用）
$ErrorActionPreference = 'Stop'
$target = 'E:\develop\gradle\gradle-8.5'
if (Test-Path (Join-Path $target 'bin\gradle.bat')) { Write-Output 'gradle 已就绪'; exit 0 }
$dl = 'F:\AI\codex\箱根驿传\_tools\downloads'
New-Item -ItemType Directory -Force -Path $dl | Out-Null
$zip = Join-Path $dl 'gradle-8.5-bin.zip'
if (-not (Test-Path $zip)) {
    Write-Output '下载 Gradle 8.5（约 130MB）…'
    Invoke-WebRequest -Uri 'https://services.gradle.org/distributions/gradle-8.5-bin.zip' -OutFile $zip
}
Write-Output '解压…'
Expand-Archive -Path $zip -DestinationPath 'E:\develop\gradle' -Force
Write-Output 'gradle 就绪'