# fanbox 仓库使用说明（kolly 的本地维护线）

这是 GitHub 开源项目 [alchaincyf/fanbox](https://github.com/alchaincyf/fanbox) 的本地个性化维护线。作者看起来不会接受外部 PR，所以这里的改动以**本地生效、自用维护**为目标，不再考虑推送 fork 分支或向作者提交 PR。**新会话直接提需求即可，以下规则不用再问。**

## 远端
- `origin` = 作者上游（alchaincyf/fanbox），**只 fetch，永不 push**
- `fork` = 如本地仍配置该远端，只视为历史遗留/手动备份对象，默认忽略；**不要自动 push fork，也不要围绕 fork 分支设计流程**

## 分支架构
- **`feature/kolly-main`**：我的集成主线，**只做合并、不直接写功能代码**。结构 = `origin/master` + merge 各 feature 分支 + 本地 gitignore 配置 commit。
- **功能分支清单**：见 [`BRANCHES.md`](BRANCHES.md)。每次新建/修改/删除分支后**必须同步更新该文件**。
- **加新功能**：从 `feature/kolly-main` 拉 `feature/<名>` 开发 → 完成后 `git checkout feature/kolly-main && git merge --no-ff feature/<名>` → 更新 `BRANCHES.md`。
- **作者自己实现了我某功能（且更好）→ 丢弃我的**：`git branch -D feature/<名>` → 重建 main（reset 到新 `origin/master` 后重新 merge 剩余分支）→ `git diff <旧main> HEAD` 验证无意外丢失 → 在 `BRANCHES.md` 移到「已删除」区。

## 跟进上游
用 `/check-upstream` 命令（`.Codex/commands/check-upstream.md`）：查作者更新 → 总结 → dry-run 评估 → 停下等我拍板。

## 硬性约定
1. **改代码前先识别分支**：根据改动内容对照 `BRANCHES.md` 判断该在哪个 feature 分支上改。不确定时问我确认，**不要直接在 `feature/kolly-main` 上写功能代码**。
2. **切到开发分支先合主线**：每次开始/继续某个开发分支前，先把 `feature/kolly-main` 合进去（`git checkout feature/<名> && git merge --no-ff feature/kolly-main`），解决冲突并验证后再写代码，避免长期分叉。
3. **CHANGELOG.md 永远跟作者一致，本地不写自己的条目**（新功能也不记）。合并/cherry-pick 时若它冲突，直接取作者版：`git checkout --theirs CHANGELOG.md && git add CHANGELOG.md`。
4. **commit 后默认只保留本地，不自动 push 任何远端**；只有我明确要求时才推送，commit message 用中文。
5. **打包**：`npm run dist`，产物 `dist/FanBox-<版本>-arm64.dmg`。只打 arm64、自用、不签名——keychain 里的 `Apple Development: chen yunfei` 是作者的证书、本机没有，electron-builder 跳过签名是预期行为。**不要提醒签名/Gatekeeper/Intel 包**。
6. **合并后验证**：`node -c` 检查改动的 js 文件；关键符号双方俱全才算合干净。


## AGENTS.md / CLAUDE.md 与 BRANCHES.md 是 kolly 本地维护线工作流文件；默认只在本地维护，不作为作者上游 PR 内容。
