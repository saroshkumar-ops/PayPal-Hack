<#
==============================================================================
TripSheriff AI - Master Shutdown Script
==============================================================================
#>

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Red
Write-Host "  TripSheriff AI - Stopping All Services                          " -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Red
Write-Host ""

$Ports = @(
    @{ Port = 8001; Service = "Python AI Microservice" },
    @{ Port = 8080; Service = "Java Spring Boot Backend" },
    @{ Port = 3000; Service = "React Frontend Dev Server" }
)

$StoppedCount = 0

foreach ($p in $Ports) {
    $portNum = $p.Port
    $serviceName = $p.Service

    $conns = Get-NetTCPConnection -LocalPort $portNum -ErrorAction SilentlyContinue
    if ($conns) {
        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            try {
                $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                $procName = "Unknown"
                if ($proc) { $procName = $proc.ProcessName }
                Write-Host "  [STOP] Stopping $serviceName (Port $portNum, PID $procId, Process: $procName)..." -ForegroundColor Yellow
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                $StoppedCount++
            } catch {
                Write-Host "         Could not terminate PID $procId" -ForegroundColor DarkGray
            }
        }
    } else {
        Write-Host "  [INFO] Port $portNum ($serviceName) is not active." -ForegroundColor DarkGray
    }
}

# Also close any dedicated TripSheriff terminal windows
Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*TripSheriff*" } | ForEach-Object {
    Write-Host "  [STOP] Closing terminal window: $($_.MainWindowTitle)" -ForegroundColor Yellow
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

Write-Host ""
if ($StoppedCount -gt 0) {
    Write-Host "  Terminated $StoppedCount process(es). Ports are now free." -ForegroundColor Green
} else {
    Write-Host "  No active processes found on ports 8001, 8080, or 3000." -ForegroundColor Green
}
Write-Host "==================================================================" -ForegroundColor Red
Write-Host ""
