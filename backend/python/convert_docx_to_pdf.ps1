param(
    [Parameter(Mandatory=$true)][string]$docxPath,
    [Parameter(Mandatory=$true)][string]$pdfPath
)

$ErrorActionPreference = 'Stop'
$word = $null
$doc = $null

try {
    # Resolve absolute paths
    $resolvedDocx = (Resolve-Path -Path $docxPath).Path
    $resolvedPdf = [System.IO.Path]::GetFullPath($pdfPath)

    # Ensure output directory exists
    $outDir = [System.IO.Path]::GetDirectoryName($resolvedPdf)
    if (-not (Test-Path $outDir)) {
        New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    }

    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0 # wdAlertsNone

    # Open read-only
    $doc = $word.Documents.Open($resolvedDocx, $false, $true)
    
    # 17 = wdExportFormatPDF
    $doc.ExportAsFixedFormat($resolvedPdf, 17)
    
    Write-Output "SUCCESS: $resolvedPdf"
} catch {
    Write-Error $_.Exception.Message
    exit 1
} finally {
    if ($doc -ne $null) {
        try { $doc.Close([ref]0) } catch {}
        try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null } catch {}
    }
    if ($word -ne $null) {
        try { $word.Quit([ref]0) } catch {}
        try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null } catch {}
    }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
