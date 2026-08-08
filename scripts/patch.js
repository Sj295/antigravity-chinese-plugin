/**
 * Antigravity Desktop 汉化插件安装与还原管理脚本 (纯原生实现)
 */

const fs = require('fs');
const path = require('path');
const { extractAllFiles, packAllFiles, readAsarFile, validateAsar } = require('./asar_utils');

const WORK_DIR = path.join(__dirname, '..');
const INJECTOR_PATH = path.join(WORK_DIR, 'src', 'injector.js');
const PATCH_MARKER = '// === Antigravity Chinese Localization Plugin ===';

// ===== 跨平台自动探测 Antigravity resources 目录 =====
// 支持 Windows / macOS / Linux，可用环境变量 ANTIGRAVITY_RESOURCES_DIR 手动指定

function findResourcesDir() {
  // 1. 环境变量优先（非标准安装路径时使用）
  if (process.env.ANTIGRAVITY_RESOURCES_DIR) {
    return process.env.ANTIGRAVITY_RESOURCES_DIR;
  }
  const platform = process.platform;
  const candidates = [];
  if (platform === 'win32') {
    if (process.env.LOCALAPPDATA) {
      candidates.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'antigravity', 'resources'));
    }
    if (process.env.PROGRAMFILES) {
      candidates.push(path.join(process.env.PROGRAMFILES, 'Antigravity', 'resources'));
      candidates.push(path.join(process.env.PROGRAMFILES, 'antigravity', 'resources'));
    }
    if (process.env['PROGRAMFILES(X86)']) {
      candidates.push(path.join(process.env['PROGRAMFILES(X86)'], 'Antigravity', 'resources'));
    }
  } else if (platform === 'darwin') {
    candidates.push('/Applications/Antigravity.app/Contents/Resources');
    if (process.env.HOME) {
      candidates.push(path.join(process.env.HOME, 'Applications', 'Antigravity.app', 'Contents', 'Resources'));
    }
  } else {
    // Linux 及未知平台
    candidates.push('/opt/Antigravity/resources');
    candidates.push('/opt/antigravity/resources');
    candidates.push('/usr/lib/Antigravity/resources');
    candidates.push('/usr/lib/antigravity/resources');
    candidates.push('/snap/antigravity/current/resources');
  }
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'app.asar'))) {
      return dir;
    }
  }
  return null;
}

const RESOURCES_DIR = findResourcesDir();
if (!RESOURCES_DIR) {
  console.error('[Antigravity-i18n] ✗ 未找到 Antigravity 安装目录（resources/app.asar）。');
  console.error('  当前平台: ' + process.platform);
  console.error('  已尝试以下位置:');
  if (process.platform === 'win32') {
    if (process.env.LOCALAPPDATA) console.error('  - ' + path.join(process.env.LOCALAPPDATA, 'Programs', 'antigravity', 'resources'));
    if (process.env.PROGRAMFILES) console.error('  - ' + path.join(process.env.PROGRAMFILES, 'Antigravity', 'resources'));
  } else if (process.platform === 'darwin') {
    console.error('  - /Applications/Antigravity.app/Contents/Resources');
  } else {
    console.error('  - /opt/Antigravity/resources');
    console.error('  - /usr/lib/antigravity/resources');
  }
  console.error('  若安装位置特殊，请设置环境变量指定:');
  console.error('    Windows:  set ANTIGRAVITY_RESOURCES_DIR=C:\\path\\to\\resources');
  console.error('    macOS/Linux: export ANTIGRAVITY_RESOURCES_DIR=/path/to/resources');
  process.exit(1);
}
const ASAR_PATH = path.join(RESOURCES_DIR, 'app.asar');
const BAK_PATH = path.join(RESOURCES_DIR, 'app.asar.bak');

function log(msg) {
  console.log('[Antigravity-i18n] ' + msg);
}

// ===== 平台无关的关闭应用 =====

function stopApp() {
  const { execSync } = require('child_process');
  try {
    if (process.platform === 'win32') {
      execSync('taskkill /F /IM Antigravity.exe', { stdio: 'ignore' });
    } else if (process.platform === 'darwin') {
      try {
        execSync("osascript -e 'quit app \"Antigravity\"'", { stdio: 'ignore' });
      } catch (e) {
        execSync('pkill -f "Antigravity.app"', { stdio: 'ignore' });
      }
    } else {
      execSync('pkill -f "antigravity"', { stdio: 'ignore' });
    }
  } catch (e) {
    // 应用未在运行等，忽略
  }
}

// ===== 版本与状态检测 =====

function getAsarVersion(asarPath) {
  try {
    const pkg = readAsarFile(asarPath, 'package.json');
    if (!pkg) return null;
    const parsed = JSON.parse(pkg.toString('utf8').replace(/^\uFEFF/, ''));
    return parsed.version || null;
  } catch (err) {
    return null;
  }
}

function isPatched(asarPath) {
  try {
    const preload = readAsarFile(asarPath, 'dist/preload.js');
    return !!preload && preload.toString('utf8').indexOf(PATCH_MARKER) !== -1;
  } catch (err) {
    return false;
  }
}

function createBackup() {
  const ver = getAsarVersion(ASAR_PATH) || '未知版本';
  log('正在创建原生英文版备份 app.asar.bak (v' + ver + ') ...');
  fs.copyFileSync(ASAR_PATH, BAK_PATH);
  log('原生备份创建成功！');
}

function refreshBackup() {
  const ver = getAsarVersion(ASAR_PATH) || '未知版本';
  log('检测到 Antigravity 版本变化，正在刷新备份为当前版本 (v' + ver + ') ...');
  fs.copyFileSync(ASAR_PATH, BAK_PATH);
  log('备份已刷新为当前版本！');
}

function backupAsar() {
  if (!fs.existsSync(ASAR_PATH)) {
    throw new Error('未找到 app.asar 文件: ' + ASAR_PATH);
  }
  if (!fs.existsSync(BAK_PATH)) {
    createBackup();
    return;
  }

  const bakVersion = getAsarVersion(BAK_PATH);
  const curVersion = getAsarVersion(ASAR_PATH);
  const curPatched = isPatched(ASAR_PATH);

  if (bakVersion && curVersion && bakVersion !== curVersion) {
    if (curPatched) {
      // 当前 app.asar 是旧备份打出来的汉化版，无法从中重建官方备份
      log('警告：检测到版本不一致，且当前 app.asar 已包含插件内容。');
      log('备份版本: ' + bakVersion + '，当前应用版本: ' + curVersion);
      log('请先更新 Antigravity 到官方最新版（应用会自动覆盖 app.asar），再重新运行 install.bat。');
      throw new Error('备份版本与当前应用版本不一致，无法安全继续。请先恢复官方原版再重试。');
    }
    refreshBackup();
    return;
  }

  if (isPatched(BAK_PATH)) {
    // 备份本身被污染（不应发生），若当前为原版则重建
    if (curPatched) {
      throw new Error('备份文件与当前 app.asar 均包含插件内容，无法安全重建备份。请运行 uninstall.bat 还原官方版本后再重试。');
    }
    log('警告：备份文件疑似包含插件内容，正在重建备份...');
    refreshBackup();
    return;
  }

  log('原生备份已存在，版本一致 (v' + (bakVersion || '?') + ')。');
}

function applyPatch() {
  log('====================================================');
  log('开始安装 Antigravity Desktop 2.4.3+ 深度汉化插件...');
  log('====================================================');

  log('正在关闭 Antigravity...');
  stopApp();

  backupAsar();

  const tempExtractDir = path.join(WORK_DIR, '.temp_extract');
  if (fs.existsSync(tempExtractDir)) {
    fs.rmSync(tempExtractDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempExtractDir, { recursive: true });

  log('正在读取并解压核心组件...');
  extractAllFiles(BAK_PATH, tempExtractDir);

  // 1. 注入 preload.js (DOM 运行时汉化引擎)
  const preloadTarget = path.join(tempExtractDir, 'dist', 'preload.js');
  if (!fs.existsSync(preloadTarget)) {
    throw new Error('未找到 dist/preload.js');
  }

  const originalPreload = fs.readFileSync(preloadTarget, 'utf8');
  const injectorCode = fs.readFileSync(INJECTOR_PATH, 'utf8');
  const patchedPreload = `// === Antigravity Chinese Localization Plugin ===\n${injectorCode}\n// === End of Plugin ===\n\n${originalPreload}`;
  fs.writeFileSync(preloadTarget, patchedPreload, 'utf8');
  log('已注入 DOM 翻译引擎到 dist/preload.js');

  // 2. 注入 menu.js (顶部主菜单栏汉化)
  const menuTarget = path.join(tempExtractDir, 'dist', 'menu.js');
  if (fs.existsSync(menuTarget)) {
    let menuCode = fs.readFileSync(menuTarget, 'utf8');
    menuCode = menuCode.replace(
      /label:\s*'New Window'/g,
      "label: '新建窗口 (New Window)'"
    ).replace(
      /label:\s*'Docs'/g,
      "label: '官方文档 (Docs)'"
    );
    fs.writeFileSync(menuTarget, menuCode, 'utf8');
    log('已注入主菜单汉化到 dist/menu.js');
  }

  // 3. 注入 main.js (退出确认弹窗汉化)
  const mainTarget = path.join(tempExtractDir, 'dist', 'main.js');
  if (fs.existsSync(mainTarget)) {
    let mainCode = fs.readFileSync(mainTarget, 'utf8');
    mainCode = mainCode.replace(
      /buttons:\s*\['Cancel',\s*'Quit'\]/g,
      "buttons: ['取消', '退出']"
    ).replace(
      /title:\s*'Confirm Quit'/g,
      "title: '确认退出'"
    ).replace(
      /message:\s*'Are you sure you want to quit\?'/g,
      "message: '您确定要退出 Antigravity 吗？'"
    ).replace(
      /detail:\s*'There may be agents or background tasks running\.'/g,
      "detail: '当前可能仍有后台智能体或任务在运行中。'"
    );
    fs.writeFileSync(mainTarget, mainCode, 'utf8');
    log('已注入系统对话框汉化到 dist/main.js');
  }

  // 4. 打包并校验后替换
  const tempAsarPath = path.join(WORK_DIR, 'app.asar.temp');
  log('正在生成汉化后的 app.asar ...');
  packAllFiles(tempExtractDir, tempAsarPath);

  // 写入前自检：结构可解析、文件数与原版一致、数据不越界
  log('正在校验打包结果完整性...');
  const newCount = validateAsar(tempAsarPath);
  const origCount = validateAsar(BAK_PATH);
  if (newCount !== origCount) {
    throw new Error('打包校验失败：文件数不一致（' + newCount + ' vs 原版 ' + origCount + '），已中止写入，请反馈此问题。');
  }
  log('校验通过（' + newCount + ' 个文件）');

  log('正在写入程序目录...');
  try {
    fs.copyFileSync(tempAsarPath, ASAR_PATH);
    fs.unlinkSync(tempAsarPath);
    fs.rmSync(tempExtractDir, { recursive: true, force: true });
    log('====================================================');
    log('🎉 汉化插件安装成功！重新启动 Antigravity 即可生效。');
    log('====================================================');
  } catch (err) {
    log('写入失败，可能 Antigravity 正在运行中。请退出应用后重新运行 install.bat。错误: ' + err.message);
  }
}

function showStatus() {
  log('====================================================');
  log('Antigravity 汉化插件状态检查');
  log('====================================================');
  log('安装目录: ' + RESOURCES_DIR);
  if (!fs.existsSync(ASAR_PATH)) {
    log('✗ 未找到 app.asar');
    return;
  }
  const ver = getAsarVersion(ASAR_PATH);
  log('当前应用版本: v' + (ver || '未知'));
  if (isPatched(ASAR_PATH)) {
    log('汉化状态: 已汉化 ✓');
  } else {
    log('汉化状态: 官方原版（未汉化）');
  }
  if (fs.existsSync(BAK_PATH)) {
    const bakVer = getAsarVersion(BAK_PATH);
    log('原生备份: 存在 (v' + (bakVer || '?') + ')' + (bakVer === ver ? ' ✓ 版本一致' : ' ⚠ 与当前版本不一致'));
  } else {
    log('原生备份: 不存在');
  }
  if (ver && ver !== getAsarVersion(BAK_PATH)) {
    log('提示: 应用更新后备份版本过期，运行 install.bat 会自动刷新备份。');
  }
}

function restoreOriginal() {
  log('正在还原为官方英文版...');
  log('正在关闭 Antigravity...');
  stopApp();
  if (!fs.existsSync(ASAR_PATH)) {
    log('未找到 app.asar 文件。');
    return;
  }
  if (!isPatched(ASAR_PATH)) {
    log('当前 app.asar 已是官方原版，无需还原。');
    return;
  }
  if (fs.existsSync(BAK_PATH)) {
    const bakVersion = getAsarVersion(BAK_PATH);
    const curVersion = getAsarVersion(ASAR_PATH);
    if (bakVersion && curVersion && bakVersion !== curVersion) {
      log('警告：备份版本 (v' + bakVersion + ') 与当前汉化版版本 (v' + curVersion + ') 不一致。');
      log('还原后应用将回到旧版本文件，建议还原后重新更新 Antigravity。');
    }
    try {
      fs.copyFileSync(BAK_PATH, ASAR_PATH);
      log('🎉 已成功还原为官方原生英文版！');
    } catch (err) {
      log('还原失败，请先关闭 Antigravity 再试。错误: ' + err.message);
    }
  } else {
    log('未找到备份文件 app.asar.bak，无法还原。');
  }
}

const action = process.argv[2] || 'install';
try {
  if (action === 'restore' || action === 'uninstall') {
    restoreOriginal();
  } else if (action === 'verify' || action === 'status') {
    showStatus();
  } else {
    applyPatch();
  }
} catch (err) {
  console.error('[Antigravity-i18n] ✗ 操作失败: ' + err.message);
  process.exitCode = 1;
}
