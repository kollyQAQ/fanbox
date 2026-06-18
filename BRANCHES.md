# 功能分支清单

> 每次新建、修改、删除功能分支后必须同步更新本文件。

所有功能分支基于 `origin/master`，可单独向作者 PR。开发完成后 merge 进 `feature/kolly-main`。

## 活跃分支

| 分支                           | 功能                                                                                          | PR 状态  |
| ---------------------------- | ------------------------------------------------------------------------------------------- | ------ |
| `feature/keyboard-shortcuts` | 全局快捷键：⌘/ 快捷键面板、⌘1-9 切终端 tab、⌘←→ 切前后 tab、⌘W 关终端、⌘N 新终端、⌘B 浏览器开关、⌘P 隐藏文件、⌘⇧F 焦点铺满、⌘\ 侧栏折叠、按住⌘显示 tab 序号 | —      |
| `feature/browser`            | 内嵌浏览器模块：多站点 webview 标签视图，切换保活                                                               | —      |
| `feature/project-memory`     | 会话真标题 + ✎ 改名 + 全局项目记忆浏览器                                                                    | —  |
| `feature/terminal-tab-overflow` | 终端 tab 紧凑任务栏：active / 文件跟随 / busy / unread 优先可见，放不下的会话收进「更多」菜单                          | —      |
| `feature/file-preview`       | 点开头隐藏文件可预览/编辑/diff + .\*rc 等无扩展名文件可编辑                                                       | —      |
| `feature/max-layout`         | ⌘⇧F 焦点铺满（已并入 keyboard-shortcuts，保留分支供 PR）                                                   | —  |
| `chore/strip-nul-bytes`      | 终端验证缓存 key 的 NUL 分隔符改为转义                                                                    | —      |
| `feature/ui-tweaks`          | UI 微调：移除更新提示的「去下载」按钮                                                                         | —      |
| `feature/md-lossless-relax`  | md 无损判定放宽：结构比对失败时再比纯文本，表格/列表/空白等无害重排不再误锁源码（只有真吞内容才锁）                                          | —      |

## 已删除/废弃

| 分支                               | 原因                               |
| -------------------------------- | -------------------------------- |
| `fix/embedded-term-session-loss` | 问题已被上游修复，分支已删                    |
| `feature/terminal-shortcuts`     | 改名为 `feature/keyboard-shortcuts` |

## 操作规范

* **加新功能**：`git checkout -b feature/<名> feature/kolly-main` → 开发 → 完成后切 kolly-main merge → 更新本文件

* **作者实现了我的功能**：删分支 + 从本文件移到「已删除」区 + 重建 kolly-main

* **改了现有分支的功能范围**：同步更新本文件描述
