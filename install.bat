@echo off
chcp 65001 >nul
title Antigravity 汉化插件安装器
echo ========================================================
echo   Antigravity Desktop 2.4.3+ 官方汉化插件安装器
echo ========================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js。
    echo 请先安装 Node.js: https://nodejs.org  （安装后重开本窗口再试）
    pause
    exit /b 1
)

echo 正在检查 Antigravity 运行状态...
taskkill /F /IM Antigravity.exe >nul 2>&1
timeout /t 1 >nul

echo 正在应用中文汉化补丁...
node "%~dp0scripts\patch.js" install
if errorlevel 1 (
    echo.
    echo [失败] 安装未完成，请查看上方错误信息。
    echo 常见原因：Antigravity 正在运行 / 应用刚更新过 / 未找到安装目录。
    pause
    exit /b 1
)

echo.
echo ========================================================
echo   安装完成！请重新打开 Antigravity Desktop 查看效果。
echo ========================================================
pause
