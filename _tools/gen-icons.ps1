Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$srcPath = (Get-ChildItem -LiteralPath $root -Filter '*.png' | Select-Object -First 1).FullName
$Out = Join-Path $root 'HakoneApp\app\src\main\res'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Output ("source: {0}x{1}" -f $src.Width, $src.Height)

function Save($bmp, $path){
  $dir = Split-Path $path
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output ("  -> {0}" -f $path)
}

# legacy launcher icons (white background, 92% content)
$legacy = @{ mdpi=48; hdpi=72; xhdpi=96; xxhdpi=144; xxxhdpi=192 }
foreach($k in $legacy.Keys){
  $size = $legacy[$k]
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::White)
  $content = $size * 0.92
  $sc = $content / $src.Height
  $dw = $src.Width * $sc; $dh = $src.Height * $sc
  $g.DrawImage($src, ($size-$dw)/2, ($size-$dh)/2, $dw, $dh)
  $g.Dispose()
  Save $bmp (Join-Path $Out "mipmap-$k\ic_launcher.png")
  $bmp.Dispose()
}

# adaptive foreground: 432px, transparent bg, white removed, 72% content
$fgSize = 432
$fg = New-Object System.Drawing.Bitmap($fgSize, $fgSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($fg)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::Transparent)
$content = $fgSize * 0.72
$sc = $content / $src.Height
$dw = [int]($src.Width * $sc); $dh = [int]($src.Height * $sc)
$tmp = New-Object System.Drawing.Bitmap($dw, $dh, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gt = [System.Drawing.Graphics]::FromImage($tmp)
$gt.Clear([System.Drawing.Color]::Transparent)
$gt.DrawImage($src, 0, 0, $dw, $dh)
$gt.Dispose()
for($y=0; $y -lt $dh; $y++){
  for($x=0; $x -lt $dw; $x++){
    $c = $tmp.GetPixel($x,$y)
    if($c.A -gt 0 -and $c.R -gt 236 -and $c.G -gt 236 -and $c.B -gt 236){
      $tmp.SetPixel($x,$y, [System.Drawing.Color]::Transparent)
    }
  }
}
$g.DrawImage($tmp, ($fgSize-$dw)/2, ($fgSize-$dh)/2, $dw, $dh)
$g.Dispose()
Save $fg (Join-Path $Out "mipmap-xxxhdpi\ic_launcher_foreground.png")
Save $fg (Join-Path $Out "mipmap-anydpi-v26\ic_launcher_foreground.png")
$tmp.Dispose(); $fg.Dispose()

# notification small icon: white silhouette on transparent
$stat = @{ mdpi=24; hdpi=36; xhdpi=48; xxhdpi=72; xxxhdpi=96 }
foreach($k in $stat.Keys){
  $size = $stat[$k]
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::Transparent)
  $sc = $size / $src.Height
  $dw = [int]($src.Width * $sc); $dh = [int]($src.Height * $sc)
  $tmp = New-Object System.Drawing.Bitmap($dw, $dh, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gt = [System.Drawing.Graphics]::FromImage($tmp)
  $gt.Clear([System.Drawing.Color]::Transparent)
  $gt.DrawImage($src, 0, 0, $dw, $dh)
  $gt.Dispose()
  for($y=0; $y -lt $dh; $y++){
    for($x=0; $x -lt $dw; $x++){
      $c = $tmp.GetPixel($x,$y)
      $lum = 0.299*$c.R + 0.587*$c.G + 0.114*$c.B
      if($c.A -gt 128 -and $lum -lt 200){ $tmp.SetPixel($x,$y, [System.Drawing.Color]::White) }
      else { $tmp.SetPixel($x,$y, [System.Drawing.Color]::Transparent) }
    }
  }
  $g.DrawImage($tmp, ($size-$dw)/2, ($size-$dh)/2, $dw, $dh)
  $g.Dispose()
  Save $bmp (Join-Path $Out "drawable-$k\ic_stat_run.png")
  $bmp.Dispose(); $tmp.Dispose()
}

$src.Dispose()
Write-Output 'icon generation done'
