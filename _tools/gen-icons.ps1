Add-Type -AssemblyName System.Drawing
$ErrorActionPreference='Stop'
$root = Split-Path $PSScriptRoot -Parent
$srcPath = (Get-ChildItem -LiteralPath $root -Filter '*.png' | Where-Object { $_.Name -notlike '_*' } | Select-Object -First 1).FullName
$Out = Join-Path $root 'HakoneApp\app\src\main\res'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$sw=$src.Width; $sh=$src.Height
Write-Output ("source: {0}x{1}" -f $sw,$sh)

function Save($bmp,$path){ $dir=Split-Path $path; New-Item -ItemType Directory -Force -Path $dir|Out-Null; $bmp.Save($path,[System.Drawing.Imaging.ImageFormat]::Png); Write-Output ("  -> {0}" -f $path) }
function Bounds($bmp){
  $minX=$bmp.Width;$minY=$bmp.Height;$maxX=-1;$maxY=-1
  for($y=0;$y -lt $bmp.Height;$y++){ for($x=0;$x -lt $bmp.Width;$x++){
    if($bmp.GetPixel($x,$y).A -gt 0){
      if($x -lt $minX){$minX=$x}; if($y -lt $minY){$minY=$y}
      if($x -gt $maxX){$maxX=$x}; if($y -gt $maxY){$maxY=$y}
    }
  }}
  return @($minX,$minY,$maxX,$maxY)
}
function DrawCentered($g,$bmp,$cx,$cy,$targetH){
  $b=Bounds $bmp
  $w=$b[2]-$b[0]+1; $h=$b[3]-$b[1]+1
  $sc=$targetH/$h
  $dw=$w*$sc; $dh=$h*$sc
  $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.DrawImage($bmp,$cx-$dw/2,$cy-$dh/2,$dw,$dh)
}

# silhouette: keep teal runner by saturation (max-min >= 25) or very dark, original color, transparent bg
$sil=New-Object System.Drawing.Bitmap($sw,$sh,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
for($y=0;$y -lt $sh;$y++){ for($x=0;$x -lt $sw;$x++){
  $c=$src.GetPixel($x,$y)
  $mx=[Math]::Max($c.R,[Math]::Max($c.G,$c.B)); $mn=[Math]::Min($c.R,[Math]::Min($c.G,$c.B))
  $sat=$mx-$mn
  $lum=0.299*$c.R+0.587*$c.G+0.114*$c.B
  if($sat -ge 25 -or $lum -lt 130){ $sil.SetPixel($x,$y,$c) } else { $sil.SetPixel($x,$y,[System.Drawing.Color]::Transparent) }
}}
$b=Bounds $sil
Write-Output ("runner bbox: ({0},{1})-({2},{3})  w={4} h={5}" -f $b[0],$b[1],$b[2],$b[3],($b[2]-$b[0]+1),($b[3]-$b[1]+1))

# legacy launcher icons: transparent bg + silhouette at 82%
$legacy = @{ mdpi=48; hdpi=72; xhdpi=96; xxhdpi=144; xxxhdpi=192 }
foreach($k in $legacy.Keys){
  $size=$legacy[$k]
  $bmp=New-Object System.Drawing.Bitmap($size,$size,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g=[System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Transparent)
  DrawCentered $g $sil ($size/2) ($size/2) ($size*0.82)
  $g.Dispose()
  Save $bmp (Join-Path $Out "mipmap-$k\ic_launcher.png")
  $bmp.Dispose()
}

# notification small icon: white silhouette
$white=New-Object System.Drawing.Bitmap($sw,$sh,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
for($y=0;$y -lt $sh;$y++){ for($x=0;$x -lt $sw;$x++){
  $c=$sil.GetPixel($x,$y)
  if($c.A -gt 0){ $white.SetPixel($x,$y,[System.Drawing.Color]::White) } else { $white.SetPixel($x,$y,[System.Drawing.Color]::Transparent) }
}}
$stat = @{ mdpi=24; hdpi=36; xhdpi=48; xxhdpi=72; xxxhdpi=96 }
foreach($k in $stat.Keys){
  $size=$stat[$k]
  $bmp=New-Object System.Drawing.Bitmap($size,$size,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g=[System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Transparent)
  DrawCentered $g $white ($size/2) ($size/2) ($size*0.8)
  $g.Dispose()
  Save $bmp (Join-Path $Out "drawable-$k\ic_stat_run.png")
  $bmp.Dispose()
}
$sil.Dispose(); $white.Dispose(); $src.Dispose()
Write-Output 'icon generation done'
