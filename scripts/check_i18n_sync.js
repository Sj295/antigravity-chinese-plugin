/**
 * 词库一致性检查：确保 src/injector.js 内联词库与 src/i18n.js 模块词库保持同步
 * 用法: node scripts/check_i18n_sync.js
 * 退出码: 0 = 一致, 1 = 不一致
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const injectorPath = path.join(ROOT, 'src', 'injector.js');
const i18nPath = path.join(ROOT, 'src', 'i18n.js');

function extractDict(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  // 提取 exact 词条与 patterns（仅用于一致性比对，不执行代码）
  const exact = {};
  const patterns = [];

  const exactRe = /"((?:[^"\\]|\\.)*)":\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = exactRe.exec(code)) !== null) {
    const inExactBlock = code.lastIndexOf('exact:', m.index) > code.lastIndexOf('patterns:', m.index);
    const inInjector = code.lastIndexOf('I18N = {', m.index) > code.lastIndexOf('module.exports', m.index);
    if (inExactBlock) {
      exact[m[1]] = m[2];
    }
  }
  return { exact, filePath };
}

function loadModuleDict(filePath) {
  // i18n.js 是 CommonJS 模块，直接 require 获取真实词条
  const mod = require(filePath);
  return { exact: mod.exact, patterns: mod.patterns };
}

// 由于 injector.js 不可直接 require（浏览器环境代码），这里做简化校验：
// 1. injector.js 中的 exact 键集合必须包含 i18n.js 的 exact 键集合（反向亦然）
// 2. 数量差异超过阈值时报警

function main() {
  const injectorCode = fs.readFileSync(injectorPath, 'utf8');
  const i18n = loadModuleDict(i18nPath);

  // 从 injector.js 中提取 exact 块（I18N.exact 到 patterns: 之前）
  const injectorExactBlock = injectorCode.split('patterns: [')[0].split('exact: {')[1] || '';
  const i18nExactBlock = JSON.stringify(i18n.exact);

  const injectorKeys = new Set();
  const keyRe = /^\s{4,6}"((?:[^"\\]|\\.)*)":/gm;
  let m;
  while ((m = keyRe.exec(injectorExactBlock)) !== null) {
    try {
      // 将源码中的 JS 字符串字面量反解为实际字符串（处理 \" 等转义）
      injectorKeys.add(JSON.parse('"' + m[1] + '"'));
    } catch (e) {
      // 解析失败时使用原始文本，仅影响比对精度
      injectorKeys.add(m[1]);
    }
  }

  const i18nKeys = Object.keys(i18n.exact);

  const missingInInjector = i18nKeys.filter(k => !injectorKeys.has(k));
  const extraInInjector = [...injectorKeys].filter(k => !i18n.exact.hasOwnProperty(k));

  let failed = false;
  if (missingInInjector.length) {
    failed = true;
    console.error('✗ i18n.js 有但 injector.js 缺失的词条 (' + missingInInjector.length + '):');
    missingInInjector.slice(0, 20).forEach(k => console.error('   - ' + k));
  }
  if (extraInInjector.length) {
    failed = true;
    console.error('✗ injector.js 有但 i18n.js 缺失的词条 (' + extraInInjector.length + '):');
    extraInInjector.slice(0, 20).forEach(k => console.error('   - ' + k));
  }

  if (!failed) {
    console.log('✓ 词库一致: injector.js (' + injectorKeys.size + ' 条) 与 i18n.js (' + i18nKeys.length + ' 条)');
  }
  process.exit(failed ? 1 : 0);
}

main();
