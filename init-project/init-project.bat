@echo off
REM ILPI Project Manager - Windows CMD/Batch Wrapper
REM Usage: init-project start
REM        init-project stop
REM        init-project restart
REM        init-project status

setlocal enabledelayedexpansion

REM Get the script directory
set SCRIPT_DIR=%~dp0
set ACTION=%1

if "%ACTION%"=="" (
    set ACTION=start
)

REM Map short forms to full forms
if "%ACTION%"=="s" set ACTION=start
if "%ACTION%"=="x" set ACTION=stop
if "%ACTION%"=="r" set ACTION=restart
if "%ACTION%"=="st" set ACTION=status
if "%ACTION%"=="-s" set ACTION=start
if "%ACTION%"=="-x" set ACTION=stop
if "%ACTION%"=="-r" set ACTION=restart
if "%ACTION%"=="-st" set ACTION=status

REM Run PowerShell script with the action
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%init-project.ps1" -Action %ACTION%

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Script failed with exit code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

endlocal
