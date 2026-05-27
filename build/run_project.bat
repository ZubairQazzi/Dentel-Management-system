@echo off
setlocal

set ROOT=%~dp0..
set BACKEND=%ROOT%\backend
set FRONTEND=%ROOT%\frontend
set DB_USER=root
set DB_PASSWORD=
set DB_HOST=localhost
set DB_PORT=3306
set DB_NAME=dentist_management

echo ==========================================
echo Smile Cure Dentistry - Project Runner
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is missing. Install Node.js first.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is missing. Install Node.js with npm first.
  pause
  exit /b 1
)

if not exist "%BACKEND%\.env" (
  copy "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
  echo Created backend\.env from backend\.env.example
)

for /f "usebackq tokens=1,* delims==" %%A in ("%BACKEND%\.env") do (
  if /I "%%A"=="DB_USER" set DB_USER=%%B
  if /I "%%A"=="DB_PASSWORD" set DB_PASSWORD=%%B
  if /I "%%A"=="DB_HOST" set DB_HOST=%%B
  if /I "%%A"=="DB_PORT" set DB_PORT=%%B
  if /I "%%A"=="DB_NAME" set DB_NAME=%%B
)

set MYSQL_EXE=
set MYSQLADMIN_EXE=
set MYSQLD_EXE=
set MYSQL_INI=
set DB_READY=0

where mysql >nul 2>nul
if not errorlevel 1 (
  for /f "delims=" %%M in ('where mysql') do if not defined MYSQL_EXE set MYSQL_EXE=%%M
)

if not defined MYSQL_EXE if exist "C:\xampp\mysql\bin\mysql.exe" set MYSQL_EXE=C:\xampp\mysql\bin\mysql.exe
if not defined MYSQL_EXE if exist "D:\xampp\mysql\bin\mysql.exe" set MYSQL_EXE=D:\xampp\mysql\bin\mysql.exe
if exist "C:\xampp\mysql\bin\mysqladmin.exe" set MYSQLADMIN_EXE=C:\xampp\mysql\bin\mysqladmin.exe
if not defined MYSQLADMIN_EXE if exist "D:\xampp\mysql\bin\mysqladmin.exe" set MYSQLADMIN_EXE=D:\xampp\mysql\bin\mysqladmin.exe
if exist "C:\xampp\mysql\bin\mysqld.exe" set MYSQLD_EXE=C:\xampp\mysql\bin\mysqld.exe
if not defined MYSQLD_EXE if exist "D:\xampp\mysql\bin\mysqld.exe" set MYSQLD_EXE=D:\xampp\mysql\bin\mysqld.exe
if exist "C:\xampp\mysql\bin\my.ini" set MYSQL_INI=C:\xampp\mysql\bin\my.ini
if not defined MYSQL_INI if exist "D:\xampp\mysql\bin\my.ini" set MYSQL_INI=D:\xampp\mysql\bin\my.ini

if defined MYSQL_EXE (
  if not defined MYSQLADMIN_EXE set MYSQLADMIN_EXE=mysqladmin
  echo Checking MySQL server...
  "%MYSQLADMIN_EXE%" -h %DB_HOST% -P %DB_PORT% -u %DB_USER% --password=%DB_PASSWORD% ping >nul 2>nul
  if errorlevel 1 (
    if defined MYSQLD_EXE (
      echo Starting XAMPP MySQL...
      start "XAMPP MySQL" /min "%MYSQLD_EXE%" --defaults-file="%MYSQL_INI%" --standalone
      timeout /t 6 /nobreak >nul
    )
  )
  "%MYSQLADMIN_EXE%" -h %DB_HOST% -P %DB_PORT% -u %DB_USER% --password=%DB_PASSWORD% ping >nul 2>nul
  if errorlevel 1 (
    echo MySQL is not running. Start MySQL from XAMPP Control Panel and import the database if needed.
  ) else (
    "%MYSQL_EXE%" -h %DB_HOST% -P %DB_PORT% -u %DB_USER% --password=%DB_PASSWORD% -e "USE %DB_NAME%;" >nul 2>nul
    if errorlevel 1 (
      echo Importing MySQL database...
      cmd /c ""%MYSQL_EXE%" -h %DB_HOST% -P %DB_PORT% -u %DB_USER% --password=%DB_PASSWORD% < "%BACKEND%\database\dms_full_database.sql""
      if errorlevel 1 (
        echo Database import failed. Check build\database_import_steps.txt.
      ) else (
        echo Database imported successfully.
        set DB_READY=1
      )
    ) else (
      echo Database %DB_NAME% is ready.
      set DB_READY=1
    )
  )
) else (
  echo MySQL command line was not found.
  echo Install full XAMPP with MySQL, then import backend\database\dms_full_database.sql.
)

if "%DB_READY%"=="0" (
  echo.
  echo Cannot start the project because MySQL is not ready.
  echo Start MySQL from XAMPP Control Panel or install MySQL, then run this file again.
  pause
  exit /b 1
)

if not exist "%BACKEND%\node_modules" (
  echo Installing backend dependencies...
  pushd "%BACKEND%"
  call npm install
  if errorlevel 1 (
    echo Backend dependency installation failed.
    pause
    exit /b 1
  )
  popd
)

if not exist "%FRONTEND%\node_modules" (
  echo Installing frontend dependencies...
  pushd "%FRONTEND%"
  call npm install
  if errorlevel 1 (
    echo Frontend dependency installation failed.
    pause
    exit /b 1
  )
  popd
)

echo.
echo Starting backend at http://localhost:5000
start "Smile Cure Backend" cmd /k "cd /d ""%BACKEND%"" && npm start"

timeout /t 3 /nobreak >nul

echo Starting frontend at http://localhost:5173
start "Smile Cure Frontend" cmd /k "cd /d ""%FRONTEND%"" && npm run dev"

timeout /t 4 /nobreak >nul
start http://localhost:5173

echo.
echo Project windows are open. Close the backend and frontend command windows to stop the app.
pause
