# Git 工作流与 Commit 提交规范 (Git Workflow & Commit Guidelines)

本文档定义 **Arturia.ShortLink** 项目的 Git 分支流转模型、分支命名规范、Conventional Commits 提交格式与合并审查标准。  
所有参与开发的贡献者（人类开发者与 AI 代理）在日常编码、提交代码、提交 PR 与合并分支时必须严格遵守本规范。

---

## 1. 分支流转模型 (GitHub Flow)

本项目采用轻量高效的 **GitHub Flow** 工作流模型。`main` 作为核心受保护主分支，所有功能特性与缺陷修复均通过短期特性分支推进。

```text
main (生产就绪主分支，打 Tag 发布)
  │
  ├── feat/link-qr-code (功能分支) ───[ PR / 验证 ]───┐
  │                                                   │
  ├── fix/utm-param-encoding (修复分支) ─[ PR / 验证 ]─┤
  │                                                   │
  ▼                                                   ▼
========================================================= main (合并发布 v0.1.0)
```

### 1.1 分支分类与定义

| 分支类型 | 命名格式 | 生命周期 | 来源与去向 | 职责说明 |
| :--- | :--- | :--- | :--- | :--- |
| **主干分支** | `main` | 长期常驻 | 受保护分支，只接受 PR 合并 | 生产就绪代码，每个版本 Tag 均在此分支打出 |
| **特性分支** | `feat/<feature-name>` | 短期临时 | 从 `main` 拉出，完成后合并回 `main` | 开发新业务功能（如短链生成、二维码定制等） |
| **修复分支** | `fix/<bug-name>` | 短期临时 | 从 `main` 拉出，完成后合并回 `main` | 修复已知缺陷或异常错误 |
| **重构分支** | `refactor/<scope>` | 短期临时 | 从 `main` 拉出，完成后合并回 `main` | 不改变外部行为的架构优化与代码清理 |
| **文档/维护** | `docs/<doc-name>` 或 `chore/<name>` | 短期临时 | 从 `main` 拉出，完成后合并回 `main` | 编写/修订规范文档或工程配置调整 |

### 1.2 分支操作基本准则

1. **严禁直接向 `main` 分支推送未测试的代码**：日常工作统一在独立的特性/修复分支中开展。
2. **保持特性分支轻量小步**：一个分支仅承载一个明确的业务目标，生命周期尽量不超过 2~3 天，避免形成臃肿庞大且难以审查的长寿分支。
3. **合并后即时清理**：分支合入 `main` 并确认无误后，应及时删除远端与本地的临时特性分支。

---

## 2. Commit 提交信息规范 (Conventional Commits)

代码提交信息严格遵循 [Conventional Commits 1.0.0](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范。

### 2.1 基础提交格式

```text
<type>(<scope>): <description>

[可选 body 正文：详细说明本次变更的背景、动机及设计考量]

[可选 footer 脚注：关联 issue 或破坏性变更声明 BREAKING CHANGE]
```

### 2.2 Commit Type（提交类型动词）

| Type | 语义说明 | 是否影响版本位 | 典型示例 |
| :--- | :--- | :---: | :--- |
| **`feat`** | 新增业务功能 (Feature) | **MINOR** | `feat(link): 支持动态二维码生成与 Logo 嵌入` |
| **`fix`** | 缺陷修复 (Bug Fix) | **PATCH** | `fix(auth): 修复 Token 过期未自动重定向登录页的问题` |
| **`docs`** | 仅文档变动 (Documentation) | 不发版 | `docs(spec): 更新前端 UI 设计规范与组件约束` |
| **`style`** | 代码格式调整（空格、分号、无逻辑影响） | 不发版 | `style(ui): 修正表格操作栏图标与边距间隙` |
| **`refactor`** | 代码重构（既非新增功能也非修复 bug） | **PATCH** | `refactor(mock): 抽取统一的内存数据持久化辅助函数` |
| **`perf`** | 性能提升与图表渲染优化 | **PATCH** | `perf(chart): 优化时序折线图补间渲染与防抖逻辑` |
| **`test`** | 增加或修正单元测试/Mock 测试用例 | 不发版 | `test(link): 增加短码别名字符合法性校验测试` |
| **`chore`** | 构建过程、辅助工具、依赖项更新变动 | PATCH/不发版 | `chore(deps): 升级 lucide-react 依赖版本` |
| **`ci`** | CI/CD 自动化构建配置变动 | 不发版 | `ci(github): 增加前端代码规范静态检查流水线` |

### 2.3 Scope（影响作用域）预设

为了方便变更溯源与生成清晰的 CHANGELOG，提交信息必须限定在以下标准 Scope 范围内：

* `web`：通用前端应用架构、全局布局、路由体系
* `ui`：底层通用组件（Button, Dialog, Input, Table 等）
* `mock`：前端本地 Mock 服务引擎与模拟数据仓
* `link`：短链核心（生成、别名、列表、编辑、启停、删除）
* `analytics`：数据分析看板、Recharts 图表、时序报表
* `marketing`：二维码生成、UTM 构建器、密码与有效期
* `domain`：自定义独立域名与 DNS CNAME 校验
* `workspace`：工作空间多租户切换、团队成员 RBAC 权限
* `api-key`：开发者开放平台凭证与密钥管理
* `api`：.NET 10 WebAPI 后端接口与控制器契约
* `db`：MySQL 数据库表结构、索引与 DDL 迁移
* `docs`：各类产品、设计、契约与开发规范文档

### 2.4 破坏性变更声明 (Breaking Changes)

任何破坏前后端现有协议兼容性、删除字段或破坏数据库结构的重大改动，**必须显式声明**：
1. 在 `type` 后附加 `!`，例如：`feat(api)!: 移除旧版本短链查询兼容接口`；
2. 并在 Footer 区域写明 `BREAKING CHANGE: <详细说明破坏点与迁移指引>`。

---

## 3. Commit 撰写质量准则与禁止清单

### 3.1 优秀提交范例 (Good Examples)

```text
feat(marketing): 增加二维码高清 PNG 与 SVG 格式下载功能

支持在二维码弹窗中实时调节容错率级别，并在前端基于 Canvas 与 SVG 
直接生成文件流下载，无需后端接口处理。
Closes #18
```

```text
fix(link): 修复别名为空时未能自动生成 6 位 Base62 短码的缺陷

调整表单提交逻辑，若检测到用户未指定别名 slug，则自动调用本地 
NanoID/Base62 生成器生成唯一字符码。
```

### 3.2 严格禁止清单 (Don'ts - 违规立即打回重写)

| 违规编号 | 违规形式 | 判定理由 |
| :-: | :--- | :--- |
| **C1** | `git commit -m "update"` 或 `git commit -m "fix bug"` | 语义模糊，毫无代码溯源价值 |
| **C2** | `git commit -m "feat: 完成了短链、分析看板、域名和全部设置"` | 粒度过粗，大杂烩提交破坏回滚原子性 |
| **C3** | 将业务代码变更与格式化代码（Eslint/Prettier）混合在同一 Commit 中 | 导致 Code Review 噪音巨大，必须拆分提交 |
| **C4** | Commit Message 包含敏感信息（真实密钥、数据库密码、生产 Token） | 严重安全事故，必须原地重置历史并吊销凭证 |

---

## 4. 合并与代码审查流程 (PR & Merge)

1. **本地自检清单 (Pre-Merge Checklist)**：
   * 代码静态检查（`npm run lint`）0 报错。
   * TypeScript 严格编译（`tsc --noEmit`）0 报错。
   * 本地构建打包（`npm run build`）顺利通过。
2. **合并方式选择**：
   * 推荐采用 **Squash and Merge（压缩合并）**：将特性分支中的多个临时小步提交压缩为一个符合 Conventional Commits 规范的干净提交合入 `main`，保持主干历史线性整洁。
3. **版本 Tag 触发**：
   * 仅在代码合入 `main` 分支并且经过阶段验收后，才依据《版本管理规范.md》在 `main` 上打出正式的语义化版本 Tag（`v{version}`）。

---

## 5. 人机协同大阶段审阅、PR 与自动合并工作流 (Human-in-the-Loop Workflow)

鉴于本项目前端由 **Agent（AI 代理）** 负责构建，为了保障开发方向 100% 受控、杜绝失控狂奔，并使 GitHub 上的代码流转与 Pull Requests 审查链路清晰规范，确立以下**基于特性分支与 PR 的大阶段闭环工作流**：

```text
[新阶段启动 / 前置基线同步与特性分支切出]
  ├─ 检查本地工作区纯净 (git status --porcelain，脏工作区立即阻断)
  ├─ 确保 main 分支为远端最新 (git checkout main && git pull --rebase origin main)
  └─ 切出阶段特性分支 (git checkout -b feat/phase-X-<name>)
        │
        ▼
[Agent 在特性分支中执行阶段开发与本地自测 (tsc / lint)]
        │
        ▼
[本地运行 Vite 开发服务并自动调用浏览器唤起页面 (Start-Process)]
        │
        ▼
[等待用户人工审查与体验]
   ├── 若需修改 ──► [Agent 根据意见就地微调] ──► [重新唤起浏览器审阅]
   │
   └── 若审查通过 (用户确认)
            │
            ▼
   [Agent 提交并推送特性分支至远程: git push -u origin feat/phase-X-<name>]
            │
            ▼
   [Agent 自动创建 Pull Request: gh pr create --base main --head feat/phase-X-<name>]
            │
            ▼
   [Agent 自动通过命令行执行 Squash 合并: gh pr merge --squash --delete-branch]
            │
            ▼
   [切回 main 并拉取最新主干: git checkout main && git pull --rebase origin main]
            │
            ▼
   [同步在《功能开发清单.md》中勾选对应项 [x]]
            │
            ▼
   [Agent 立即原地暂停，等待下一阶段指令]
```

### 5.1 核心执行规则

1. **前置基线同步与特性分支切出 (Pre-flight Remote Sync & Branching)**：
   * **阶段启动前检查**：在开始执行任何一个大阶段（Phase）的开发任务前，Agent 必须首先运行 `git status --porcelain` 检查工作区状态。
   * **脏工作区一票否决**：若检测到本地存在未提交或未暂存的代码改动，**严禁执行分支切换与拉取**，必须立即原地停手并向人类开发者告警，由人类确认保存、丢弃或提交后再推进。
   * **主干同步与分支切出**：切回 `main` 分支执行 `git pull --rebase origin main` 对齐远端最新代码；随后切出独立的阶段特性分支（例如阶段三切出 `git checkout -b feat/phase-3-link-engine`）。
   * **冲突严苛避险与自动回滚**：若拉取时出现任何代码冲突（Rebase Conflict），**Agent 绝对严禁私自强行解决或强制覆盖**；必须立即自动执行 `git rebase --abort` 彻底恢复干净工作区，并原地停止操作向人类开发者发出告警，由人类在终端手动解决冲突。
2. **验收颗粒度标准**：
   * 严格以《功能开发清单.md》中的**大阶段（Phase，共阶段一至阶段八）**为验收推进单元，避免过于零碎打断，确保每个阶段交付一个完整闭环的子系统。
3. **浏览器自动唤起指令**：
   * 当 Agent 确认当前阶段所有代码与 Mock 跑通后，确保本地 Vite 开发服务器正常运行，并通过系统命令（如 Windows PowerShell: `Start-Process "http://localhost:5173"`）主动打开用户默认浏览器展现成果。
4. **审阅确认机制**：
   * 浏览器打开后，Agent 必须停下工具操作，输出该阶段的核心成果总结，并通过交互等待用户的人工审阅反馈。
5. **自动化提交、推送与创建 Pull Request**：
   * 用户明确同意后，Agent 自动在特性分支执行：
     ```bash
     git add .
     git commit -m "<type>(<scope>): <清晰规范的阶段完成说明>"
     git push -u origin <feature-branch>
     gh pr create --base main --head <feature-branch> --title "<type>(<scope>): <说明>" --body "<阶段成果与变更清单>"
     ```
   * 此时在 GitHub 网页端的 **Pull requests** 标签页即可完整看到该合并请求。
6. **自动命令行 Squash 合并与环境同步 (CLI Squash Merge)**：
   * Agent 紧接着调用 GitHub CLI 自动执行 Squash 合并并清理远端临时分支：
     ```bash
     gh pr merge --squash --delete-branch
     git checkout main
     git pull --rebase origin main
     git branch -d <feature-branch>
     ```
   * 合并完成后，Agent 自动将《功能开发清单.md》中本阶段所有完成任务标记为 `[x]`。
7. **原地暂停铁律**：
   * 合并与清单标记完成后，Agent 必须**立即停止任何后续编码动作并原地暂停**，向用户报告当前阶段已安全归档，等待用户下发下一阶段的启动指令。
8. **仓库初始化约束**：
   * 在启动**阶段一（工程底座与 Mock 基础设施）**时，由 Agent 自动执行 `git init`，配置 `.gitignore`，完成首个全套规范文档的基线提交，并根据用户提供的远程仓库地址绑定 `remote origin`。

