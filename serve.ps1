# Basit yerel test sunucusu: "oyun" klasörünü http://localhost:8765 adresinde yayınlar
param([int]$Port = 8765)
$root = Join-Path $PSScriptRoot 'oyun'
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$Port/"
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript'; '.css'='text/css'; '.png'='image/png'; '.svg'='image/svg+xml'; '.json'='application/json'; '.webmanifest'='application/manifest+json'; '.txt'='text/plain; charset=utf-8' }
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
  if ($path -eq '') { $path = 'index.html' }
  # /testler/... ve /deneme/... adresleri kendi klasörlerinden gelir (Netlify'a yüklenmez, sadece yerel)
  $base = $root
  foreach ($dir in 'testler', 'deneme') {
    if ($path -eq $dir) { $path = "$dir/" }
    if ($path.StartsWith("$dir/")) { $base = Join-Path $PSScriptRoot $dir; $path = $path.Substring($dir.Length + 1); if ($path -eq '') { $path = 'index.html' } }
  }
  $file = [IO.Path]::GetFullPath((Join-Path $base $path))
  if ($file.StartsWith($base) -and (Test-Path $file -PathType Leaf)) {
    $bytes = [IO.File]::ReadAllBytes($file)
    $ext = [IO.Path]::GetExtension($file)
    $ctx.Response.ContentType = if ($types[$ext]) { $types[$ext] } else { 'application/octet-stream' }
    $ctx.Response.Headers.Add('Cache-Control', 'no-store')
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
  }
  $ctx.Response.Close()
}
