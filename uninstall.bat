@echo off
chcp 65001 >nul
title Antigravity 汉化插件卸载 / 还原
echo ========================================================
echo   Antigravity Desktop 汉化插件卸载 / 还原英文版
echo ========================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js。
    echo 请先安装 Node.js: https://nodejs.org
    pause
    exit /b 1
)

echo 正在停止 Antigravity...
taskkill /F /IM Antigravity.exe >nul 2>&1
timeout /t 1 >nul

echo 正在还原官方英文资源...
node "%~dp0scripts\patch.js" uninstall
if errorlevel 1 (
    echo.
    echo [失败] 还原未完成，请查看上方错误信息。
    pause
    exit /b 1
)

echo.
echo ========================================================
echo   已恢复官方英文版！
echo ========================================================
pause
