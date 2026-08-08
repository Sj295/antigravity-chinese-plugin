#!/usr/bin/env bash
# Antigravity Desktop 中文汉化插件卸载 / 还原脚本 (macOS / Linux)
set -e
cd "$(dirname "$0")"

echo "========================================================"
echo "  Antigravity Desktop 汉化插件卸载 / 还原英文版"
echo "========================================================"
echo ""

if ! command -v node >/dev/null 2>&1; then
    echo "[错误] 未检测到 Node.js。"
    echo "请先安装 Node.js: https://nodejs.org"
    exit 1
fi

echo "正在还原官方英文资源..."
node scripts/patch.js uninstall
if [ $? -ne 0 ]; then
    echo ""
    echo "[失败] 还原未完成，请查看上方错误信息。"
    exit 1
fi

echo ""
echo "========================================================"
echo "  已恢复官方英文版！"
echo "========================================================"
