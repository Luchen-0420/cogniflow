/**
 * Content Script
 * 在网页中显示快捷菜单栏
 */

// 菜单栏元素
let quickMenu = null;
let toast = null;
let selectedText = '';
let selectedRange = null;

/**
 * 处理来自 background 的消息（右键菜单）
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveSelectedText') {
    selectedText = request.text || '';
    // 如果没有选中文本，使用传入的文本
    if (!selectedText && request.text) {
      selectedText = request.text;
    }
    
    // 直接保存，不显示菜单
    handleSaveToNote();
    sendResponse({ success: true });
    return true;
  }
  return false;
});

/**
 * 创建快捷菜单栏
 */
function createQuickMenu() {
  if (quickMenu) return;

  quickMenu = document.createElement('div');
  quickMenu.id = 'cogniflow-quick-menu';
  quickMenu.innerHTML = `
    <div class="menu-item" data-action="note" title="保存到笔记">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
      <span>笔记</span>
    </div>
  `;
  
  // 绑定点击事件
  quickMenu.querySelector('.menu-item').addEventListener('click', (e) => {
    e.stopPropagation();
    handleSaveToNote();
  });
  
  document.body.appendChild(quickMenu);
}

/**
 * 创建提示消息
 */
function createToast() {
  if (toast) return;

  toast = document.createElement('div');
  toast.id = 'cogniflow-toast';
  document.body.appendChild(toast);
}

/**
 * 显示提示消息
 */
function showToast(message, type = 'success') {
  if (!toast) createToast();
  
  toast.textContent = message;
  toast.className = `cogniflow-toast ${type} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

/**
 * 显示快捷菜单
 */
function showQuickMenu() {
  if (!quickMenu) createQuickMenu();
  
  if (!selectedRange) {
    // 尝试从当前选择获取 range
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      selectedRange = selection.getRangeAt(0).cloneRange();
    } else {
      return;
    }
  }
  
  // 重置 loading 状态
  const noteItem = quickMenu.querySelector('.menu-item[data-action="note"]');
  if (noteItem) {
    noteItem.classList.remove('loading');
    const span = noteItem.querySelector('span');
    if (span) span.textContent = '笔记';
  }
  
  try {
    // 计算菜单位置（在选中文本上方，紧贴文本）
    const rect = selectedRange.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return; // 无效的选中区域
    }
    
    // 获取菜单的实际尺寸（如果还没有显示，使用默认值）
    // 先让菜单可见以获取实际尺寸
    quickMenu.style.visibility = 'hidden';
    quickMenu.style.display = 'flex';
    quickMenu.classList.add('show');
    const menuWidth = quickMenu.offsetWidth || 80;
    const menuHeight = quickMenu.offsetHeight || 50;
    quickMenu.classList.remove('show');
    quickMenu.style.visibility = 'visible';
    
    // 使用视口坐标（getBoundingClientRect 返回的是相对于视口的坐标）
    const viewportTop = rect.top;
    const viewportBottom = rect.bottom;
    const viewportLeft = rect.left;
    const viewportRight = rect.right;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 计算菜单水平位置（居中于选中文本）
    let menuLeft = viewportLeft + (rect.width / 2) - (menuWidth / 2);
    
    // 确保菜单不超出屏幕左右边界
    if (menuLeft < 10) {
      menuLeft = 10;
    } else if (menuLeft + menuWidth > viewportWidth - 10) {
      menuLeft = viewportWidth - menuWidth - 10;
    }
    
    // 计算菜单垂直位置
    // 优先显示在选中文本上方，如果上方空间不够，显示在下方
    let menuTop;
    const spaceAbove = viewportTop; // 上方可用空间
    const spaceBelow = viewportHeight - viewportBottom; // 下方可用空间
    const menuWithGap = menuHeight + 8; // 菜单高度 + 间距
    
    if (spaceAbove >= menuWithGap) {
      // 上方空间足够，显示在上方
      menuTop = viewportTop - menuHeight - 8;
    } else if (spaceBelow >= menuWithGap) {
      // 下方空间足够，显示在下方
      menuTop = viewportBottom + 8;
    } else {
      // 上下空间都不够，显示在选中文本中间（覆盖文本）
      menuTop = viewportTop + (rect.height / 2) - (menuHeight / 2);
      
      // 确保不超出视口
      if (menuTop < 10) {
        menuTop = 10;
      } else if (menuTop + menuHeight > viewportHeight - 10) {
        menuTop = viewportHeight - menuHeight - 10;
      }
    }
    
    // 使用 fixed 定位，直接使用视口坐标
    quickMenu.style.left = `${menuLeft}px`;
    quickMenu.style.top = `${menuTop}px`;
    quickMenu.classList.add('show');
  } catch (error) {
    console.error('显示快捷菜单失败:', error);
  }
}

/**
 * 隐藏快捷菜单
 */
function hideQuickMenu() {
  if (quickMenu) {
    quickMenu.classList.remove('show');
    // 清除 loading 状态
    const noteItem = quickMenu.querySelector('.menu-item[data-action="note"]');
    if (noteItem) {
      noteItem.classList.remove('loading');
      const span = noteItem.querySelector('span');
      if (span) span.textContent = '笔记';
    }
  }
}

/**
 * 处理保存到笔记
 */
async function handleSaveToNote() {
  if (!selectedText.trim()) {
    showToast('没有选中内容', 'error');
    return;
  }

  // 显示加载状态
  const noteItem = quickMenu.querySelector('.menu-item[data-action="note"]');
  if (noteItem) {
    noteItem.classList.add('loading');
    const span = noteItem.querySelector('span');
    if (span) span.textContent = '保存中...';
  }

  try {
    // 获取页面信息
    const pageTitle = document.title;
    const pageUrl = window.location.href;

    // 发送保存请求到 background script
    const response = await chrome.runtime.sendMessage({
      action: 'createNote',
      content: selectedText,
      title: pageTitle,
      url: pageUrl
    });

    if (response && response.success) {
      showToast('✓ 已保存到笔记', 'success');
      // 清除选中
      window.getSelection().removeAllRanges();
      // 清除状态
      selectedText = '';
      selectedRange = null;
      // 隐藏菜单
      hideQuickMenu();
    } else {
      const errorMsg = response?.error || '保存失败';
      showToast(errorMsg, 'error');
      
      // 如果是未登录错误，提示用户点击插件图标登录
      if (errorMsg.includes('未登录') || errorMsg.includes('登录')) {
        setTimeout(() => {
          showToast('请点击浏览器工具栏的插件图标登录', 'info');
        }, 2000);
      }
      
      if (noteItem) {
        noteItem.classList.remove('loading');
        const span = noteItem.querySelector('span');
        if (span) span.textContent = '笔记';
      }
    }
  } catch (error) {
    console.error('保存失败:', error);
    showToast('保存失败: ' + error.message, 'error');
    if (noteItem) {
      noteItem.classList.remove('loading');
      const span = noteItem.querySelector('span');
      if (span) span.textContent = '笔记';
    }
  }
}

/**
 * 处理文本选择
 */
function handleTextSelection() {
  const selection = window.getSelection();
  
  if (selection && selection.rangeCount > 0) {
    const text = selection.toString().trim();
    if (text) {
      // 如果文本和之前一样，不重复处理
      if (text === selectedText && selectedRange) {
        return;
      }
      
      selectedText = text;
      selectedRange = selection.getRangeAt(0).cloneRange();
      
      // 显示快捷菜单
      setTimeout(() => {
        showQuickMenu();
      }, 50);
    } else {
      // 延迟隐藏，避免快速切换选中时闪烁
      setTimeout(() => {
        const currentSelection = window.getSelection();
        if (!currentSelection || !currentSelection.toString().trim()) {
          hideQuickMenu();
          selectedText = '';
          selectedRange = null;
        }
      }, 100);
    }
  } else {
    // 延迟隐藏，避免快速切换选中时闪烁
    setTimeout(() => {
      const currentSelection = window.getSelection();
      if (!currentSelection || !currentSelection.toString().trim()) {
        hideQuickMenu();
        selectedText = '';
        selectedRange = null;
      }
    }, 100);
  }
}

/**
 * 处理点击事件（点击其他地方时隐藏菜单）
 */
function handleDocumentClick(e) {
  // 如果点击的不是菜单，隐藏菜单
  if (quickMenu && !quickMenu.contains(e.target)) {
    const selection = window.getSelection();
    if (!selection.toString().trim()) {
      hideQuickMenu();
    }
  }
}

/**
 * 处理滚动事件（滚动时隐藏菜单）
 */
function handleScroll() {
  hideQuickMenu();
}

/**
 * 初始化
 */
function init() {
  // 确保 body 存在
  if (!document.body) {
    setTimeout(init, 100);
    return;
  }
  
  // 监听文本选择
  document.addEventListener('mouseup', handleTextSelection, true);
  document.addEventListener('keyup', handleTextSelection, true);
  
  // 监听点击事件
  document.addEventListener('click', handleDocumentClick, true);
  
  // 监听滚动事件
  window.addEventListener('scroll', handleScroll, true);
  
  // 监听选择变化（更可靠的方式）
  document.addEventListener('selectionchange', () => {
    setTimeout(handleTextSelection, 10);
  });
  
  console.log('Cogniflow 插件已加载');
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // 如果页面已经加载完成，延迟一点初始化，确保 DOM 完全准备好
  setTimeout(init, 100);
}
