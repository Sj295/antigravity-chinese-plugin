/**
 * Antigravity Desktop 主进程（菜单、托盘、对话框）汉化补丁
 */

module.exports = function patchMainProcess(electron, menuModule, trayModule, utilsModule) {
  // 1. 汉化退出确认框
  if (utilsModule) {
    const originalConfirm = electron.dialog.showMessageBox;
    // hook dialog
  }

  // 2. 汉化主菜单
  if (menuModule && menuModule.setupApplicationMenu) {
    const originalSetup = menuModule.setupApplicationMenu;
    menuModule.setupApplicationMenu = function(url) {
      originalSetup(url);
      const menu = electron.Menu.getApplicationMenu();
      if (!menu) return;

      const menuDict = {
        'File': '文件',
        'Edit': '编辑',
        'View': '视图',
        'Window': '窗口',
        'Help': '帮助',
        'New Window': '新建窗口',
        'Close Window': '关闭窗口',
        'Cut': '剪切',
        'Copy': '复制',
        'Paste': '粘贴',
        'Select All': '全选',
        'Undo': '撤销',
        'Redo': '重做',
        'Docs': '官方文档',
        'Check for Updates': '检查更新',
        'Toggle Developer Tools': '开发者工具',
        'Reload': '重新加载',
        'Force Reload': '强制重新加载',
        'Zoom In': '放大',
        'Zoom Out': '缩小',
        'Reset Zoom': '重置缩放',
        'Quit': '退出'
      };

      function translateMenuItems(items) {
        if (!items) return;
        items.forEach(item => {
          if (item.label && menuDict[item.label]) {
            item.label = menuDict[item.label];
          }
          if (item.submenu) {
            translateMenuItems(item.submenu.items);
          }
        });
      }

      translateMenuItems(menu.items);
      electron.Menu.setApplicationMenu(menu);
    };
  }
};
