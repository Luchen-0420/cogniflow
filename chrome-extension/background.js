/**
 * Background Service Worker
 * 处理 API 请求和登录逻辑
 */

// 默认 API 地址
const DEFAULT_API_URL = 'http://localhost:3001/api';

/**
 * 获取存储的配置
 */
async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiUrl', 'authToken'], (result) => {
      resolve({
        apiUrl: result.apiUrl || DEFAULT_API_URL,
        authToken: result.authToken || null
      });
    });
  });
}

/**
 * 用户登录
 */
async function login(username, password, apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        password: password
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      token: data.token,
      username: data.user.username
    };
  } catch (error) {
    console.error('登录失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 创建笔记
 */
async function createNote(content, title, url) {
  try {
    const config = await getConfig();
    
    if (!config.authToken) {
      return {
        success: false,
        error: '未登录，请先点击插件图标登录'
      };
    }

    const response = await fetch(`${config.apiUrl}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.authToken}`
      },
      body: JSON.stringify({
        raw_text: content,
        type: 'note',
        title: title || '来自网页的笔记',
        description: content.slice(0, 200),
        url: url || null,
        url_title: title || null,
        priority: 'medium',
        status: 'pending',
        tags: ['网页保存'],
        entities: {},
        due_date: null,
        archived_at: null,
        url_summary: null,
        url_thumbnail: null,
        url_fetched_at: null,
        has_conflict: false,
        start_time: null,
        end_time: null,
        recurrence_rule: null,
        recurrence_end_date: null,
        master_item_id: null,
        is_master: false
      })
    });

    if (!response.ok) {
      // 如果是 401 错误，可能是 token 过期
      if (response.status === 401) {
        // 清除 token，提示用户重新登录
        chrome.storage.sync.remove(['authToken', 'username']);
        return {
          success: false,
          error: '登录已过期，请重新登录'
        };
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('创建笔记失败:', error);
    return { success: false, error: error.message };
  }
}

// 监听来自 popup 和 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'login') {
    login(request.username, request.password, request.apiUrl)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放
  }

  if (request.action === 'createNote') {
    createNote(request.content, request.title, request.url)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放
  }
});

// 创建右键菜单
function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'cogniflow-save-selection',
      title: '保存选中内容到 Cogniflow',
      contexts: ['selection']
    }, () => {
      if (chrome.runtime.lastError) {
        console.log('创建右键菜单:', chrome.runtime.lastError);
      } else {
        console.log('右键菜单创建成功');
      }
    });
  });
}

// 插件安装或启动时创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
});

// 插件启动时也创建（防止 onInstalled 未触发）
chrome.runtime.onStartup.addListener(() => {
  createContextMenu();
});

// 立即创建（如果插件已安装）
createContextMenu();

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'cogniflow-save-selection' && info.selectionText) {
    // 检查是否已登录
    chrome.storage.sync.get(['authToken'], (result) => {
      if (!result.authToken) {
        // 未登录，提示用户
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Cogniflow',
          message: '请先点击插件图标登录'
        });
      } else {
        // 已登录，向 content script 发送消息
        chrome.tabs.sendMessage(tab.id, {
          action: 'saveSelectedText',
          text: info.selectionText,
          title: tab.title,
          url: tab.url
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('发送消息失败:', chrome.runtime.lastError);
            // 如果 content script 没有响应，直接调用 API
            createNote(info.selectionText, tab.title, tab.url).then(result => {
              if (result.success) {
                chrome.notifications.create({
                  type: 'basic',
                  iconUrl: 'icons/icon48.png',
                  title: 'Cogniflow',
                  message: '✓ 已保存到笔记'
                });
              } else {
                chrome.notifications.create({
                  type: 'basic',
                  iconUrl: 'icons/icon48.png',
                  title: 'Cogniflow',
                  message: '保存失败: ' + result.error
                });
              }
            });
          }
        });
      }
    });
  }
});
