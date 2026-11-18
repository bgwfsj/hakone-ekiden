# 一键构建正式签名 release APK（自动设置 JDK17 / gradle 路径）
# 注意：AGP 不允许非 ASCII 项目路径，这里镜像到 E:\hakone_build 构建后再拷回
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$env:JAVA_HOME = 'E:\develop\jdk\jdk-17'
$env:ANDROID_HOME = 'E:\develop\android-sdk'
$env:ANDROID_SDK_ROOT = 'E:\develop\android-sdk'
$gradle = 'E:\develop\gradle\gradle-8.5\bin\gradle.bat'
if (-not (Test-Path $gradle)) { Write-Error "找不到 gradle: $gradle（先运行 _tools\setup-gradle.ps1）"; exit 1 }

$buildRoot = 'E:\hakone_build'
$mirror = Join-Path $buildRoot 'HakoneApp'
if (Test-Path $mirror) { Remove-Item -LiteralPath $mirror -Recurse -Force }
New-Item -ItemType Directory -Force -Path $buildRoot | Out-Null
Copy-Item (Join-Path $root 'HakoneApp') $mirror -Recurse -Force

Push-Location $mirror
& $gradle assembleRelease --no-daemon
$code = $LASTEXITCODE
Pop-Location
if ($code -ne 0) { Write-Error 'gradle 构建失败'; exit 1 }

$apk = Join-Path $mirror 'app\build\outputs\apk\release\app-release.apk'
if (-not (Test-Path $apk)) { Write-Error '未找到 release APK'; exit 1 }

$cfg = [IO.File]::ReadAllText((Join-Path $mirror 'app\build.gradle'), [Text.Encoding]::UTF8)
$m = [regex]::Match($cfg, 'versionName\s+"([^"]+)"')
$ver = $m.Groups[1].Value
Copy-Item $apk (Join-Path $root "箱根驿传-v$ver.apk") -Force
Copy-Item $apk (Join-Path $root '箱根驿传.apk') -Force
Write-Output ("OK -> 箱根驿传-v{0}.apk / 箱根驿传.apk" -f $ver)