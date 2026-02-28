@echo off
setlocal
set ACTION=%1
if "%ACTION%"=="" set ACTION=start
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0init-project\init-project.ps1" -Action %ACTION%
endlocal
