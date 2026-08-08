#!/usr/bin/env bash
# Antigravity Desktop 中文汉化插件安装脚本 (macOS / Linux)
set -e
cd "$(dirname "$0")"

echo "========================================================"
echo "  Antigravity Desktop 2.4.3+ 中文汉化插件安装器"
echo "========================================================"
echo ""

if ! command -v node >/dev/null 2>&1; then
    echo "[错误] 未检测到 Node.js。"
    echo "请先安装 Node.js: https://nodejs.org"
    exit 1
fi

echo "正在应用中文汉化补丁..."
node scripts/patch.js install
if [ $? -ne 0 ]; then
    echo ""
    echo "[失败] 安装未完成，请查看上方错误信息。"
    echo "若安装目录特殊，请设置环境变量:"
    echo "  export ANTIGRAVITY_RESOURCES_DIR=/path/to/resources"
    echo "后再运行本脚本。"
    exit 1
fi

echo ""
echo "========================================================"
echo "  安装完成！请重新打开 Antigravity Desktop 查看效果。"
echo "========================================================"
