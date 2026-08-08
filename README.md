# Antigravity Desktop 中文汉化插件

![logo](docs/logo.svg)

> 面向 **Antigravity Desktop 2.4.3+** 的深度中文汉化方案，覆盖设置中心、侧边栏、对话交互、模型选择、/ 命令菜单、托盘与系统对话框等全部可见 UI（约 460+ 词条）。

⚠️ **非官方项目**：本插件通过修改 `app.asar` 实现 UI 文案汉化，仅做界面翻译，不涉及任何账户、计费或功能逻辑。请自行评估使用风险（可能违反官方服务条款，应用更新后需重新安装）。

---

## ✨ 功能特性

- **全界面汉化**：设置中心（账户/执行/外观/模型/浏览器/应用/反馈/快捷键/实验功能）、侧边栏、会话列表、聊天输入区、`/` 命令菜单、模型选择器、新建项目对话框、悬浮提示、托盘与退出确认框
- **动态翻译引擎**：注入 `preload.js` 的轻量 DOM 监听器实时翻译，不阻塞渲染；自动跳过代码块与可编辑输入区，不影响输入
- **正则模式**：动态文案（`可用 AI 积分：0`、`当前模型：Gemini 3.6 Flash (High)`、`将 3 个会话标记为已读`、`规则：108 个 Token` 等）全部覆盖
- **智能保留**：模型名、主题品牌名、套餐名、技能/插件标识、URL、邮箱、快捷键键名等保持原文
- **一键安装 / 一键还原**：自动备份、自动版本校验、写入前完整性自检，应用更新后重跑安装即可自动适配
- **对免费 / Pro / Ultra 订阅全部通用**

## 📋 使用前提

| 依赖 | 说明 |
|---|---|
| 操作系统 | **Windows / macOS / Linux** 均支持（自动探测安装路径） |
| Node.js | 需安装 [Node.js](https://nodejs.org)（v14+） |
| Antigravity Desktop | 2.4.3 及以上版本 |

> 若安装位置特殊导致自动探测失败，可用环境变量手动指定 resources 目录：
> ```bash
> # Windows
> set ANTIGRAVITY_RESOURCES_DIR=C:\path\to\resources
> # macOS / Linux
> export ANTIGRAVITY_RESOURCES_DIR=/path/to/resources
> ```

## 🚀 快速开始

```bash
git clone https://github.com/Sj295/antigravity-chinese-plugin.git
cd antigravity-chinese-plugin
```

**Windows**：

```bat
install.bat        # 一键安装汉化
uninstall.bat      # 一键还原英文
```

**macOS / Linux**：

```bash
chmod +x install.sh uninstall.sh
./install.sh       # 一键安装汉化
./uninstall.sh     # 一键还原英文
```

**任意平台命令行**（脚本会自动关闭正在运行的 Antigravity）：

```bash
node scripts/patch.js install     # 安装
node scripts/patch.js uninstall   # 卸载
node scripts/patch.js verify      # 查看当前状态（版本 / 汉化状态 / 备份）
```

安装完成后重启 Antigravity 即可生效。

## 🛡️ 安全机制

1. **自动备份**：首次安装时复制官方 `app.asar` 为 `app.asar.bak`，卸载时完整还原
2. **版本校验**：应用更新后检测备份版本与当前版本不一致时，自动刷新备份再打补丁；无法安全操作时拒绝执行并给出提示
3. **完整性自检**：重新打包后写入前校验 asar 结构、文件数量与原版一致、数据不越界，避免损坏应用
4. **错误处理**：`.bat` 脚本检测 Node.js 环境、提示关闭应用、失败时保留现场信息

## 📁 目录结构

```text
antigravity-chinese-plugin/
├── src/
│   ├── injector.js      # DOM 运行时翻译引擎（含内联词库，注入 preload.js）
│   └── i18n.js          # 独立词库模块（与 injector.js 同步，供贡献者参考）
├── scripts/
│   ├── patch.js         # 安装 / 卸载 / 状态检查主脚本
│   ├── asar_utils.js    # 原生 asar 解包/打包/校验引擎（无外部依赖）
│   └── check_i18n_sync.js # 词库一致性检查（CI 使用）
├── install.bat          # Windows 一键安装
├── uninstall.bat        # Windows 一键还原
├── install.sh           # macOS / Linux 一键安装
├── uninstall.sh         # macOS / Linux 一键还原
├── .github/workflows/   # CI：JS 语法检查 + 词库一致性检查
└── README.md
```

## 📝 如何贡献翻译

词库位于 `src/injector.js` 的 `I18N.exact`（精确词条）与 `I18N.patterns`（正则模式）：

```js
exact: {
  "English Text": "中文翻译",   // 新增一行即可
},
patterns: [
  { regex: /^New (\d+) items$/i, replace: "新 $1 个项目" },  // 动态文案
]
```

要求：
- 修改后同步更新 `src/i18n.js`（或运行 `node scripts/check_i18n_sync.js` 校验）
- 新增词条请附上截图/来源位置，方便复核
- 模型名、品牌名、技术标识请保持原文

## ❓ 常见问题

**Q: 应用自动更新后汉化失效？**
A: 正常现象。更新会覆盖 `app.asar`，重新双击 `install.bat` 即可（版本校验会自动刷新备份）。

**Q: 安装报错"备份版本与当前应用版本不一致，无法安全继续"？**
A: 说明应用已更新但当前 `app.asar` 仍为汉化版。请先让应用完成官方更新（会覆盖为原版），再运行 `install.bat`。

**Q: 如何完全回到官方状态？**
A: 运行 `uninstall.bat`（或 `node scripts/patch.js uninstall`），会从备份还原官方 `app.asar`。

**Q: 新版本部分界面仍是英文？**
A: 新版本可能新增了词库未覆盖的文案。可以在 [Issues](https://github.com/Sj295/antigravity-chinese-plugin/issues) 反馈，或按上文自行添加词条。

**Q: macOS / Linux 上安装失败，提示未找到安装目录？**
A: 先确认应用确实安装在该系统的标准位置（macOS: `/Applications/Antigravity.app`；Linux: `/opt/Antigravity`）。若为自定义安装路径，按上文"使用前提"用环境变量 `ANTIGRAVITY_RESOURCES_DIR` 指定。

**Q: 安全软件报警？**
A: 批处理 + 修改应用文件容易被误报。本项目代码完全开源，可自行审查；如遇误报请将项目加入白名单。

## ⚖️ 免责声明

- 本项目为社区开源项目，与 Google / Antigravity 官方无任何关联
- 插件仅修改 UI 文案，不收集、不传输任何用户数据
- 修改 `app.asar` 可能违反官方服务条款，请在了解风险后自行使用
- 因使用本插件造成的任何问题，作者不承担相关责任

## 📄 许可证

[MIT](LICENSE)
