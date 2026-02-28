# Wrapper to init-project script
param([string]$Action = "start")
& (Join-Path (Split-Path -Parent $MyInvocation.MyCommandPath) "init-project" "init-project.ps1") -Action $Action
