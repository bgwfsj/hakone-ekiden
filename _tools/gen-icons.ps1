Add-Type -AssemblyName System.Drawing
$ErrorActionPreference='Stop'
$root = Split-Path $PSScriptRoot -Parent
$srcPath = (Get-ChildItem -LiteralPath $root -Filter '*.png' | Where-Object { $_.Name -notlike '_*' } | Select-Object -First 1).FullName
$Out = Join-Path $root 'HakoneApp\app\src\main\res'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$sw=$src.Width; $sh=$src.Height
Write-Output ("source: {0}x{1}" -f $sw,$sh)

function Save($bmp,$path){ $dir=Split-Path $path; New-Item -ItemType Directory -Force -Path $dir|Out-Null; $bmp.Save($path,[System.Drawing.Imaging.ImageFormat]::Png); Write-Output ("  -> {0}" -f $path) }
function DrawCentered($g,$bmp,$cx,$cy,$targetH){
  $sc=$targetH/$bmp.Height
  $dw=$bmp.Width*$sc; $dh=$bmp.Height*$sc
  $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.DrawImage($bmp,$cx-$dw/2,$cy-$dh/2,$dw,$dh)
}

# normalize: near-white background -> pure white (keep the whole picture, no cutout)
$norm = New-Object System.Drawing.Bitmap($sw,$sh,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
for($y=0;$y -lt $sh;$y++){ for($x=0;$x -lt $sw;$x++){
  $c=$src.GetPixel($x,$y)
  $lum=0.299*$c.R+0.587*$c.G+0.114*$c.B
  if($lum -gt 200){ $norm.SetPixel($x,$y,[System.Drawing.Color]::White) } else { $norm.SetPixel($x,$y,$c) }
}}

# legacy launcher: white square + full picture at 80%
$legacy = @{ mdpi=48; hdpi=72; xhdpi=96; xxhdpi=144; xxxhdpi=192 }
foreach($k in $legacy.Keys){
  $size=$legacy[$k]
  $bmp=New-Object System.Drawing.Bitmap($size,$size,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g=[System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::White)
  DrawCentered $g $norm ($size/2) ($size/2) ($size*0.80)
  $g.Dispose()
  Save $bmp (Join-Path $Out "mipmap-$k\ic_launcher.png")
  $bmp.Dispose()
}

# adaptive foreground: 432 canvas, full picture at 62% height (fits circular safe zone)
$fgSize=432
$fg=New-Object System.Drawing.Bitmap($fgSize,$fgSize,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g=[System.Drawing.Graphics]::FromImage($fg)
$g.Clear([System.Drawing.Color]::White)
DrawCentered $g $norm ($fgSize/2) ($fgSize/2) ($fgSize*0.62)
$g.Dispose()
Save $fg (Join-Path $Out "mipmap-xxxhdpi\ic_launcher_foreground.png")
Save $fg (Join-Path $Out "mipmap-anydpi-v26\ic_launcher_foreground.png")
$fg.Dispose()

# notification small icon: white runner silhouette on transparent
$sil=New-Object System.Drawing.Bitmap($sw,$sh,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
for($y=0;$y -lt $sh;$y++){ for($x=0;$x -lt $sw;$x++){
  $c=$src.GetPixel($x,$y)
  $lum=0.299*$c.R+0.587*$c.G+0.114*$c.B
  if($lum -lt 150){ $sil.SetPixel($x,$y,[System.Drawing.Color]::White) } else { $sil.SetPixel($x,$y,[System.Drawing.Color]::Transparent) }
}}
$stat = @{ mdpi=24; hdpi=36; xhdpi=48; xxhdpi=72; xxxhdpi=96 }
foreach($k in $stat.Keys){
  $size=$stat[$k]
  $bmp=New-Object System.Drawing.Bitmap($size,$size,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g=[System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Transparent)
  DrawCentered $g $sil ($size/2) ($size/2) ($size*0.8)
  $g.Dispose()
  Save $bmp (Join-Path $Out "drawable-$k\ic_stat_run.png")
  $bmp.Dispose()
}
$sil.Dispose(); $norm.Dispose(); $src.Dispose()
Write-Output 'icon generation done'
