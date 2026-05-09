@echo off
chcp 65001 >nul
cd /d F:\SelfJob\FreeToolsPuzzle
del /f .git\index.lock 2>nul
git add data/sokoban/
git commit -m "fix: sokoban direction encoding to NEW format (D=down R=right) verified 2996 puzzles"
if errorlevel 1 (
    echo COMMIT FAILED
    exit /b 1
)
git push
if errorlevel 1 (
    echo PUSH FAILED
    exit /b 1
)
echo DONE
