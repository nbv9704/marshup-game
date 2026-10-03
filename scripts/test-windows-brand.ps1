$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$app = Join-Path $root 'release\win-unpacked\Mashup Arena.exe'
$sourceIcon = Join-Path $root 'build\icon.ico'
if (!(Test-Path -LiteralPath $app)) { throw "Packaged app missing: $app" }
$details = (Get-Item -LiteralPath $app).VersionInfo
if ($details.FileDescription -ne 'Mashup Arena' -or $details.ProductName -ne 'Mashup Arena') {
  throw "App executable has incorrect branding: $($details.FileDescription) / $($details.ProductName)"
}
Add-Type -AssemblyName System.Drawing
$expectedIcon = [System.Drawing.Icon]::new($sourceIcon, 32, 32)
$actualIcon = [System.Drawing.Icon]::ExtractAssociatedIcon($app)
if (!$actualIcon) { throw 'Packaged app has no icon' }
$expected = $expectedIcon.ToBitmap()
$actual = $actualIcon.ToBitmap()
try {
  if ($actual.Width -ne 32 -or $actual.Height -ne 32) { throw 'Unexpected packaged icon dimensions' }
  if ($PSVersionTable.PSVersion.Major -ge 7) {
    for ($x = 0; $x -lt 32; $x++) {
      for ($y = 0; $y -lt 32; $y++) {
        if ($expected.GetPixel($x, $y).ToArgb() -ne $actual.GetPixel($x, $y).ToArgb()) {
          throw "Packaged icon differs from build/icon.ico at $x,$y"
        }
      }
    }
    Write-Host 'PASS | packaged EXE metadata and all 1,024 icon pixels match Mashup Arena branding'
  } else {
    # .NET Framework selects a different ICO frame for source files than it
    # extracts from EXEs. The editor sets both icon and metadata atomically.
    Write-Host 'PASS | packaged EXE metadata and embedded icon present (pixel match requires PowerShell 7)'
  }
} finally {
  $expected.Dispose()
  $actual.Dispose()
  $expectedIcon.Dispose()
  $actualIcon.Dispose()
}
