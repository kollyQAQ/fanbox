'use strict';
/**
 * browser: 内嵌浏览器（轻量多站点视图）—— 100% 独立模块，app.js 零改动。
 * - 每个站点一个 <webview>（partition=persist:browser），切换只做显隐：滚动 / 历史 / 登录态全保留
 * - 懒加载 + 常驻：点过的标签才创建 webview，创建后常驻；标签上 ✕ 手动释放
 * - 退出时机：包装全局 navigate / openPreview，并给 #skills-entry / #btn-recent 附加监听
 * - 依赖 app.js 的全局：$ / state / toast / escapeHtml（classic script 共享作用域，本文件在其后加载）
 */
(() => {
  const isApp = !!(window.fanboxEnv && window.fanboxEnv.isDesktopApp);
  const LS_KEY = 'fb_browser_sites';

  // i18n：词条并进运行时词典（EN 模式由 i18n.js 的 MutationObserver 自动翻译），不改 i18n-dict.js
  window.FANBOX_DICT = Object.assign(window.FANBOX_DICT || {}, {
    '浏览器': 'Browser',
    '设置网址': 'Manage sites',
    '添加网址': 'Add site',
    '＋ 添加网址': '+ Add site',
    '完成': 'Done',
    '后退': 'Back',
    '前进': 'Forward',
    '刷新': 'Reload',
    '复制 URL': 'Copy URL',
    '已复制 URL': 'URL copied',
    '复制失败': 'Copy failed',
    '删除': 'Delete',
    '拖拽排序': 'Drag to sort',
    '关闭页面（释放内存，标签保留，再点重新加载）': 'Close page (frees memory; tab stays, click to reload)',
    '还没有配置网址': 'No sites yet',
    '把常用站点加成快捷入口：知乎热榜 / GitHub / Twitter 一键直达': 'Add frequent sites as one-click entries',
    '拖拽排序 · 名称留空自动取网页标题': 'Drag to sort · empty name falls back to page title',
    '名称（选填）': 'Name (optional)',
    '网址，如 zhihu.com': 'URL, e.g. zhihu.com',
    '内嵌浏览器：知乎热榜 / GitHub / Twitter 这类轻量浏览不用跳出去': 'Built-in browser: light browsing without leaving the app',
  });

  let sites = load();        // [{id, name, url}]，运行时另挂 _title/_fav（不持久化）
  let active = null;         // 当前站点 id
  let on = false;            // 是否处于浏览器模式
  const views = new Map();   // id -> <webview>
  let modal = null;          // 设置弹层（懒建）

  // ---------- 持久化 ----------
  function load() {
    try {
      const a = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      return Array.isArray(a) ? a.filter((s) => s && s.id && s.url) : [];
    } catch { return []; }
  }
  function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(sites.map(({ id, name, url }) => ({ id, name, url }))));
  }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function normUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    try { new URL(u); return u; } catch { return ''; }
  }
  function domainOf(u) { try { return new URL(u).host.replace(/^www\./, ''); } catch { return u; } }
  function label(s) { return s.name || s._title || domainOf(s.url); }

  // ---------- 图标（自带，不依赖 app.js 的 SVG 表）----------
  const I = {
    globe: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    back: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    fwd: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    reload: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
    copy: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    gear: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
  };

  // ---------- 模式切换 ----------
  // 顶栏按钮高亮跟随浏览器模式开关
  function syncBtn() { const b = document.getElementById('btn-browser'); if (b) b.classList.toggle('active', on); }
  // 顶栏按钮点击：开着就关、关着就开
  function toggle() {
    if (on) { hide(); restoreFileView(); } // 主动关闭无触发方，自己恢复文件视图
    else show();
  }
  function show() {
    if (!on) {
      on = true;
      // 互斥：压掉文件区的特殊模式（直接改上游 state 对象，不改上游代码；上游重构时静默降级）
      try { state.skillsMode = false; state.recentMode = false; state.cursor = -1; } catch { /* */ }
      $('#browser-panel').classList.add('on');
      syncBtn();
    }
    $('#breadcrumb').innerHTML = '<span class="crumb last">浏览器</span>';
    if (!active && sites.length) active = sites[0].id;
    if (active) activate(active);
    else renderAll();
  }
  function hide() {
    if (!on) return;
    on = false;
    $('#browser-panel').classList.remove('on');
    syncBtn();
    // 面包屑/文件区：navigate / skillsView / showRecent 触发时由它们自己渲染；
    // 顶栏按钮主动关闭走 toggle()，那里单独补一次 renderBreadcrumb
  }
  async function restoreFileView() {
    try {
      state.skillsMode = false;
      state.recentMode = false;
      state.cursor = -1;
      if (state.cwd) await navigate(state.cwd, false);
      else { renderFiles(); renderBreadcrumb(); }
    } catch { /* 上游重构则静默降级 */ }
  }

  // ---------- 标签条 ----------
  function renderAll() { renderTabs(); updateAddr(); renderEmpty(); }
  function renderTabs() {
    const wrap = $('#bw-tabs');
    wrap.innerHTML = sites.map((s) => {
      const wv = views.get(s.id);
      const icon = wv && wv.__loading
        ? '<span class="bw-spin"></span>'
        : (s._fav ? `<img class="bw-fav" src="${escapeHtml(s._fav)}" onerror="this.remove()">` : `<span class="bw-fav-d">${I.globe}</span>`);
      return `<div class="bw-tab${s.id === active ? ' on' : ''}" data-id="${s.id}">
        ${icon}<span class="bw-tab-name">${escapeHtml(label(s))}</span>
        ${wv ? '<span class="bw-tab-x" data-x="1" title="关闭页面（释放内存，标签保留，再点重新加载）">✕</span>' : ''}
      </div>`;
    }).join('') + `<button class="bw-gear" id="bw-gear" title="设置网址">${I.gear}</button>`;
    wrap.querySelectorAll('.bw-tab').forEach((el) => {
      el.onclick = (ev) => {
        if (ev.target.dataset && ev.target.dataset.x) { closeView(el.dataset.id); return; }
        activate(el.dataset.id);
      };
    });
    $('#bw-gear').onclick = openSettings;
  }

  // ---------- webview 生命周期 ----------
  function activate(id) {
    const s = sites.find((x) => x.id === id);
    if (!s) return;
    active = id;
    ensureView(s);
    views.forEach((wv, vid) => wv.classList.toggle('bw-on', vid === id));
    renderAll();
  }
  function ensureView(site) {
    let wv = views.get(site.id);
    if (wv) return wv;
    wv = document.createElement('webview');
    wv.setAttribute('partition', 'persist:browser'); // 登录态跨重启保留
    wv.setAttribute('allowpopups', '');              // 弹窗由主进程 setWindowOpenHandler 接管→就地导航
    wv.__siteUrl = site.url;
    wv.src = site.url;
    wv.addEventListener('dom-ready', () => { wv.__ready = true; if (active === site.id) updateAddr(); });
    wv.addEventListener('did-start-loading', () => { wv.__loading = true; renderTabs(); });
    wv.addEventListener('did-stop-loading', () => { wv.__loading = false; renderTabs(); if (active === site.id) updateAddr(); });
    const onNav = () => { if (active === site.id) updateAddr(); };
    wv.addEventListener('did-navigate', onNav);
    wv.addEventListener('did-navigate-in-page', onNav);
    wv.addEventListener('page-title-updated', (e) => { site._title = e.title || ''; renderTabs(); });
    wv.addEventListener('page-favicon-updated', (e) => { if (e.favicons && e.favicons.length) { site._fav = e.favicons[0]; renderTabs(); } });
    views.set(site.id, wv);
    $('#bw-stack').appendChild(wv);
    return wv;
  }
  function destroyView(id) { const wv = views.get(id); if (wv) { wv.remove(); views.delete(id); } }
  function closeView(id) { destroyView(id); renderAll(); }

  // ---------- 地址行 ----------
  function buildAddrBar() {
    const bar = $('#bw-addr');
    bar.innerHTML = `
      <button id="bw-back" title="后退">${I.back}</button>
      <button id="bw-fwd" title="前进">${I.fwd}</button>
      <button id="bw-reload" title="刷新">${I.reload}</button>
      <span class="bw-url" id="bw-url"></span>
      <button id="bw-copy" title="复制 URL">${I.copy}</button>`;
    const act = (fn) => { const wv = views.get(active); if (wv && wv.__ready) { try { wv[fn](); } catch { /* */ } } };
    $('#bw-back').onclick = () => act('goBack');
    $('#bw-fwd').onclick = () => act('goForward');
    $('#bw-reload').onclick = () => act('reload');
    $('#bw-copy').onclick = () => {
      const u = $('#bw-url').textContent;
      if (!u) return;
      navigator.clipboard.writeText(u).then(() => toast('已复制 URL')).catch(() => toast('复制失败', true));
    };
  }
  function updateAddr() {
    const bar = $('#bw-addr');
    bar.classList.toggle('hidden', !sites.length);
    if (!sites.length) return;
    const s = sites.find((x) => x.id === active);
    const wv = views.get(active);
    const ready = !!(wv && wv.__ready);
    let url = s ? s.url : '';
    if (ready) { try { url = wv.getURL() || url; } catch { /* */ } }
    const u = $('#bw-url');
    u.textContent = url; u.title = url;
    const can = (fn) => { if (!ready) return false; try { return wv[fn](); } catch { return false; } };
    $('#bw-back').disabled = !can('canGoBack');
    $('#bw-fwd').disabled = !can('canGoForward');
    $('#bw-reload').disabled = !wv;
  }

  // ---------- 空状态 ----------
  function renderEmpty() {
    const stack = $('#bw-stack');
    let el = stack.querySelector('.bw-empty');
    if (sites.length) { if (el) el.remove(); return; }
    if (el) return;
    el = document.createElement('div');
    el.className = 'bw-empty';
    el.innerHTML = `<div class="bw-empty-t">还没有配置网址</div>
      <div class="bw-empty-s">把常用站点加成快捷入口：知乎热榜 / GitHub / Twitter 一键直达</div>
      <button class="bw-empty-add">＋ 添加网址</button>`;
    el.querySelector('.bw-empty-add').onclick = openSettings;
    stack.appendChild(el);
  }

  // ---------- 设置弹层 ----------
  function openSettings() { if (!modal) buildModal(); modal.classList.remove('hidden'); renderRows(); }
  function closeSettings() { commit(); modal.classList.add('hidden'); }
  function buildModal() {
    modal = document.createElement('div');
    modal.className = 'bw-modal-overlay hidden';
    modal.innerHTML = `<div class="bw-modal">
      <header class="bw-modal-head"><b>设置网址</b><span class="bw-modal-hint">拖拽排序 · 名称留空自动取网页标题</span><button class="bw-modal-x" title="完成">✕</button></header>
      <div class="bw-rows"></div>
      <footer class="bw-modal-foot"><button class="bw-add">＋ 添加网址</button><button class="bw-done">完成</button></footer>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('mousedown', (e) => { if (e.target === modal) closeSettings(); });
    modal.querySelector('.bw-modal-x').onclick = closeSettings;
    modal.querySelector('.bw-done').onclick = closeSettings;
    modal.querySelector('.bw-add').onclick = () => {
      const wrap = modal.querySelector('.bw-rows');
      wrap.insertAdjacentHTML('beforeend', rowHtml({ id: uid(), name: '', url: '' }));
      bindRow(wrap.lastElementChild);
      wrap.lastElementChild.querySelector('.bw-in-url').focus();
    };
  }
  function rowHtml(s) {
    return `<div class="bw-row" data-id="${s.id}">
      <span class="bw-drag" title="拖拽排序">⠿</span>
      <input class="bw-in-name" placeholder="名称（选填）" value="${escapeHtml(s.name || '')}">
      <input class="bw-in-url" placeholder="网址，如 zhihu.com" value="${escapeHtml(s.url || '')}">
      <button class="bw-row-del" title="删除">✕</button>
    </div>`;
  }
  function renderRows() {
    const wrap = modal.querySelector('.bw-rows');
    wrap.innerHTML = sites.map(rowHtml).join('');
    wrap.querySelectorAll('.bw-row').forEach(bindRow);
  }
  function bindRow(row) {
    row.querySelector('.bw-row-del').onclick = () => { row.remove(); commit(); };
    row.querySelectorAll('input').forEach((inp) => inp.addEventListener('change', () => commit()));
    // 拖拽排序：用 Pointer Events 手写，不走 HTML5 native draggable —— 后者在触控板上 drop 常判失败导致松手回弹。
    // setPointerCapture 保证指针移出手柄/列表也不丢 move/up；pointermove 实时挪行，pointerup 按 DOM 序提交。
    const h = row.querySelector('.bw-drag');
    h.addEventListener('pointerdown', (e) => {
      if (e.button) return; // 仅主键/主指针
      e.preventDefault();
      const wrap = row.parentElement;
      row.classList.add('dragging');
      const onMove = (ev) => {
        const after = [...wrap.querySelectorAll('.bw-row:not(.dragging)')]
          .find((r) => ev.clientY < r.getBoundingClientRect().top + r.offsetHeight / 2);
        if (after) wrap.insertBefore(row, after); else wrap.appendChild(row);
      };
      const onUp = () => {
        row.classList.remove('dragging');
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        commit();
      };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
  }
  // 提交：按弹层 DOM 行序重建 sites（保留旧对象引用，webview 事件闭包不失效）。
  // 空 URL / 非法 URL 的行不入库（行在弹层里保留，关掉弹层即消失）。
  function commit() {
    const next = [];
    modal.querySelectorAll('.bw-row').forEach((row) => {
      const url = normUrl(row.querySelector('.bw-in-url').value);
      if (!url) return;
      const name = row.querySelector('.bw-in-name').value.trim();
      const old = sites.find((s) => s.id === row.dataset.id);
      if (old) {
        if (old.url !== url) { destroyView(old.id); old._title = ''; old._fav = ''; } // URL 变了：旧页面作废，下次点重载
        old.name = name; old.url = url;
        next.push(old);
      } else next.push({ id: row.dataset.id, name, url });
    });
    sites.forEach((s) => { if (!next.some((n) => n.id === s.id)) destroyView(s.id); }); // 删掉的站点连 webview 一起销毁
    sites = next;
    save();
    if (active && !sites.some((s) => s.id === active)) active = sites.length ? sites[0].id : null;
    if (on && !active && sites.length) active = sites[0].id; // 空状态下首次添加：自动选中第一个（与 show() 一致）
    if (on && active) activate(active);
    else renderAll();
  }

  // ---------- 退出钩子（app.js 零改动的关键）----------
  function hooks() {
    // 文件导航 / 文件预览发生 → 退出浏览器模式。包装全局函数：app.js 内部调用走全局绑定，重赋值即生效
    try { const nav = navigate; navigate = function (...a) { hide(); return nav.apply(this, a); }; } catch { /* 上游重构则静默降级 */ }
    try { const op = openPreview; openPreview = function (...a) { hide(); return op.apply(this, a); }; } catch { /* */ }
    // Skills 透视 / 最近修改：它们的 onclick 是函数引用绑定，包装拦不到，附加监听并存
    const se = document.getElementById('skills-entry'); if (se) se.addEventListener('click', hide);
    const re = document.getElementById('btn-recent'); if (re) re.addEventListener('click', hide);
  }

  // ---------- 启动 ----------
  function init() {
    const btn = document.getElementById('btn-browser');
    const panel = document.getElementById('browser-panel');
    if (!btn || !panel) return;
    if (!isApp) return; // 浏览器降级版：webview 不存在，按钮由 CSS（.desktop 门控）隐藏，整个功能不启用
    btn.onclick = toggle;
    buildAddrBar();
    hooks();
    // ⌘R 刷新当前浏览器页面（浏览器模式激活时拦截）
    document.addEventListener('keydown', (e) => {
      if (!on) return;
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        const wv = views.get(active);
        if (wv && wv.__ready) try { wv.reload(); } catch { /* */ }
      }
    });
    window.fbBrowser = { get active() { return on; }, show, hide, toggle };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
