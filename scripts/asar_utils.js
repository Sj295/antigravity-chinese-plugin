/**
 * 原生 Asar 打包与解包引擎（无需外部 npx 依赖，完美兼容 unpacked 文件）
 */
const fs = require('fs');
const path = require('path');

function readAsarHeader(asarPath) {
  const fd = fs.openSync(asarPath, 'r');
  const buf = Buffer.alloc(16);
  fs.readSync(fd, buf, 0, 16, 0);
  const jsonSize = buf.readUInt32LE(12);
  const jsonBuf = Buffer.alloc(jsonSize);
  fs.readSync(fd, jsonBuf, 0, jsonSize, 16);
  const header = JSON.parse(jsonBuf.toString('utf8'));
  // 数据区起始 = 16 字节主头 + JSON(4 字节对齐)
  const baseOffset = 16 + ((jsonSize + 3) & ~3);
  return { fd, header, baseOffset, jsonSize };
}

function extractAllFiles(asarPath, outDir) {
  const { fd, header, baseOffset } = readAsarHeader(asarPath);

  function walk(node, currentDir) {
    if (!fs.existsSync(currentDir)) {
      fs.mkdirSync(currentDir, { recursive: true });
    }
    if (node.files) {
      for (const [name, child] of Object.entries(node.files)) {
        const itemPath = path.join(currentDir, name);
        if (child.files) {
          walk(child, itemPath);
        } else if (child.unpacked) {
          // unpacked 符号引用，创建占位标记
          fs.writeFileSync(itemPath + '.__unpacked__', JSON.stringify(child));
        } else {
          const offset = baseOffset + parseInt(child.offset, 10);
          const buf = Buffer.alloc(child.size);
          fs.readSync(fd, buf, 0, child.size, offset);
          fs.writeFileSync(itemPath, buf);
        }
      }
    }
  }

  walk(header, outDir);
  fs.closeSync(fd);
}

/**
 * 从 asar 中读取单个文件的内容（不落盘，快速读取）
 * @param {string} asarPath asar 文件路径
 * @param {string} filePath 文件在 asar 内的路径，如 'package.json' 或 'dist/preload.js'
 * @returns {Buffer|null} 文件内容；unpacked 或未找到时返回 null
 */
function readAsarFile(asarPath, filePath) {
  const { fd, header, baseOffset } = readAsarHeader(asarPath);
  try {
    const seg = filePath.split('/').filter(Boolean);
    let node = header;
    for (const s of seg) {
      if (!node.files || !node.files[s]) return null;
      node = node.files[s];
    }
    if (node.unpacked) return null;
    const buf = Buffer.alloc(node.size);
    fs.readSync(fd, buf, 0, node.size, baseOffset + parseInt(node.offset, 10));
    return buf;
  } finally {
    fs.closeSync(fd);
  }
}

function packAllFiles(srcDir, outAsarPath) {
  const header = { files: {} };
  const fileRecords = [];
  let currentOffset = 0;

  function walk(currentDir, parentNode) {
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      if (item.endsWith('.__unpacked__')) {
        const unpackedMeta = JSON.parse(fs.readFileSync(path.join(currentDir, item), 'utf8'));
        parentNode[item.slice(0, -'.__unpacked__'.length)] = unpackedMeta;
        continue;
      }
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        parentNode[item] = { files: {} };
        walk(fullPath, parentNode[item].files);
      } else {
        const content = fs.readFileSync(fullPath);
        parentNode[item] = {
          size: content.length,
          offset: currentOffset.toString()
        };
        fileRecords.push(content);
        currentOffset += content.length;
      }
    }
  }

  walk(srcDir, header.files);

  // 序列化 Header
  let headerString = JSON.stringify(header);
  // Asar 要求 4 字节对齐
  const align = 4;
  const headerRemainder = Buffer.byteLength(headerString, 'utf8') % align;
  if (headerRemainder !== 0) {
    const pad = align - headerRemainder;
    headerString += ' '.repeat(pad);
  }
  const headerBuf = Buffer.from(headerString, 'utf8');

  // 构建 16 字节头部
  // 0-3: 4
  // 4-7: headerSize + 8
  // 8-11: headerSize + 4
  // 12-15: headerSize
  const headerLen = headerBuf.length;
  const mainHeader = Buffer.alloc(16);
  mainHeader.writeUInt32LE(4, 0);
  mainHeader.writeUInt32LE(headerLen + 8, 4);
  mainHeader.writeUInt32LE(headerLen + 4, 8);
  mainHeader.writeUInt32LE(headerLen, 12);

  const fd = fs.openSync(outAsarPath, 'w');
  fs.writeSync(fd, mainHeader, 0, 16);
  fs.writeSync(fd, headerBuf, 0, headerLen);
  for (const buf of fileRecords) {
    fs.writeSync(fd, buf, 0, buf.length);
  }
  fs.closeSync(fd);
}

/**
 * 校验 asar 结构完整性：header 可解析、文件数据不越界
 * @param {string} asarPath
 * @returns {number} 文件条目总数（含 unpacked 引用）
 */
function validateAsar(asarPath) {
  const { fd, header, baseOffset } = readAsarHeader(asarPath);
  try {
    const fileSize = fs.fstatSync(fd).size;
    let count = 0;
    let errorPath = null;
    function walk(node, prefix) {
      if (!node.files) return;
      for (const [name, child] of Object.entries(node.files)) {
        const p = prefix + '/' + name;
        if (child.files) {
          walk(child, p);
        } else {
          count++;
          if (!child.unpacked) {
            const start = baseOffset + parseInt(child.offset, 10);
            const end = start + child.size;
            if (start < baseOffset || end > fileSize) {
              errorPath = errorPath || p + ' (offset=' + child.offset + ', size=' + child.size + ')';
            }
          }
        }
      }
    }
    walk(header, '');
    if (errorPath) {
      throw new Error('asar 数据越界: ' + errorPath);
    }
    return count;
  } finally {
    fs.closeSync(fd);
  }
}

module.exports = {
  extractAllFiles,
  packAllFiles,
  readAsarFile,
  validateAsar
};
