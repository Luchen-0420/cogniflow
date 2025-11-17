/**
 * Popup Script
 * 处理登录界面交互
 */

// DOM 元素
const loginView = document.getElementById('loginView');
const loggedInView = document.getElementById('loggedInView');
const loadingView = document.getElementById('loadingView');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const apiUrlInput = document.getElementById('apiUrl');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginStatus = document.getElementById('loginStatus');
const loggedUsername = document.getElementById('loggedUsername');

/**
 * 显示状态消息
 */
function showStatus(message, type = 'info') {
  loginStatus.textContent = message;
  loginStatus.className = `status ${type} show`;
  setTimeout(() => {
    loginStatus.classList.remove('show');
  }, 5000);
}

/**
 * 显示加载状态
 */
function showLoading(show = true) {
  if (show) {
    loginView.classList.add('hidden');
    loggedInView.classList.add('hidden');
    loadingView.classList.remove('hidden');
  } else {
    loadingView.classList.add('hidden');
  }
}

/**
 * 显示登录界面
 */
function showLoginView() {
  loginView.classList.remove('hidden');
  loggedInView.classList.add('hidden');
}

/**
 * 显示已登录界面
 */
function showLoggedInView(username) {
  loginView.classList.add('hidden');
  loggedInView.classList.remove('hidden');
  loggedUsername.textContent = username || '用户';
}

/**
 * 加载配置
 */
async function loadConfig() {
  try {
    chrome.storage.sync.get(['apiUrl', 'authToken', 'username'], (result) => {
      // 设置 API 地址
      if (result.apiUrl) {
        apiUrlInput.value = result.apiUrl;
      } else {
        apiUrlInput.value = 'http://localhost:3001/api';
      }

      // 如果已登录，显示已登录界面
      if (result.authToken && result.username) {
        showLoggedInView(result.username);
      } else {
        showLoginView();
      }
    });
  } catch (error) {
    console.error('加载配置失败:', error);
    showLoginView();
  }
}

/**
 * 登录
 */
async function login() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  const apiUrl = apiUrlInput.value.trim() || 'http://localhost:3001/api';

  if (!username) {
    showStatus('请输入用户名', 'error');
    usernameInput.focus();
    return;
  }

  if (!password) {
    showStatus('请输入密码', 'error');
    passwordInput.focus();
    return;
  }

  if (!apiUrl) {
    showStatus('请输入 API 地址', 'error');
    apiUrlInput.focus();
    return;
  }

  showLoading(true);
  loginBtn.disabled = true;

  try {
    // 发送登录请求到 background script
    chrome.runtime.sendMessage({
      action: 'login',
      username: username,
      password: password,
      apiUrl: apiUrl
    }, (response) => {
      showLoading(false);
      loginBtn.disabled = false;

      if (chrome.runtime.lastError) {
        showStatus('连接失败: ' + chrome.runtime.lastError.message, 'error');
        return;
      }

      if (response && response.success) {
        showStatus('登录成功', 'success');
        // 保存配置
        chrome.storage.sync.set({
          apiUrl: apiUrl,
          authToken: response.token,
          username: response.username
        }, () => {
          showLoggedInView(response.username);
          // 清空密码
          passwordInput.value = '';
        });
      } else {
        showStatus(response?.error || '登录失败', 'error');
      }
    });
  } catch (error) {
    showLoading(false);
    loginBtn.disabled = false;
    showStatus('登录失败: ' + error.message, 'error');
  }
}

/**
 * 退出登录
 */
async function logout() {
  try {
    chrome.storage.sync.remove(['authToken', 'username'], () => {
      showLoginView();
      usernameInput.value = '';
      passwordInput.value = '';
      showStatus('已退出登录', 'info');
    });
  } catch (error) {
    console.error('退出登录失败:', error);
  }
}

// 事件监听
loginBtn.addEventListener('click', login);
logoutBtn.addEventListener('click', logout);

// 回车键登录
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    passwordInput.focus();
  }
});

passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    login();
  }
});

apiUrlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    login();
  }
});

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
});

