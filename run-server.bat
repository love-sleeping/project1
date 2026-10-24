@echo off
setlocal
cd /d "%~dp0"
echo This project can be opened directly. This optional server requires Python 3.
where py >nul 2>nul
if %errorlevel%==0 (
  start "" http://127.0.0.1:8080
  py -3 -m http.server 8080
  goto :end
)
where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://127.0.0.1:8080
  python -m http.server 8080
  goto :end
)
echo Python was not found. Double-click start-local.bat instead.
pause
:end
endlocal
