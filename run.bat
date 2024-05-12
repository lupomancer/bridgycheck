@echo off
SETLOCAL

:: Check for Node.js
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed. Please install Node.js to continue.
    goto end
)

:: Check for npm
npm -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo npm is not installed. Please install npm to continue.
    goto end
)

:: Install npm packages
echo Installing npm packages...
npm install

:: Run the script with the provided CSV filename
echo Running the script...
node masto-to-bsky.js %1

:end
ENDLOCAL
