# Arturia.ShortLink - AI 代理行动宪章与开发指引 (AGENTS.md)

本文件面向在 **Arturia.ShortLink** 仓库中工作的一切 **AI 编码代理 (Agent)** 及新加入的人类协作者。  
**在开始任何开发任务前，你被默认已完整阅读并严格同意遵守本文件。**  
本文件是 Agent 进入本仓库的**唯一总入口（The Front Door）与行动指南**。详细设计与技术规格见 `docs/` 规范文档库；规则冲突时以 `docs/项目全局硬性约束.md` 为最高裁决准绳。

---

## 1. 项目全景与当前阶段

* **项目名称**：Arturia.ShortLink
* **项目定位**：商业化多租户短链 SaaS 平台（对标 Dub.co / Bitly 体验，具备工作空间隔离、自定义独立域名、动态二维码定制、UTM 营销归因分析及毫秒级 302 重定向能力）。
* **协同分工模式**：
  * **前端工程（Agent 全权负责构建）**：React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Lucide Icons + Recharts，前期采用**全量高保真本地 Mock 服务引擎驱动**，脱离后端即可 100% 独立闭环运行全部业务流程。
  * **后端服务（人类开发者手动编写）**：.NET 10 + C# ASP.NET Core WebAPI + MySQL 8.x。**Agent 严禁编写任何后端代码**。
* **当前进度**：**规范规划阶段已 100% 达成，正准备启动【阶段一：前端工程底座与 Mock 基础设施】**。

### 1.1 仓库根目录结构拓扑

```text
Arturia.ShortLink/
├── docs/                               # 核心规范与架构设计文档库 (全中文单一事实源)
│   ├── 项目全局硬性约束.md             # 【最高宪法】不可协商工程红线 (技术栈锁定/零手搓/大阶段验收)
│   ├── 需求规格说明书.md               # 产品业务规则、Base62 短码、租户隔离、数据口径与三层风控
│   ├── 功能开发清单.md                 # 【前端唯一执行基准 (TODO)】阶段一至阶段八细粒度任务与里程碑
│   ├── 前端UI设计规范.md               # New York 预设、极客黑白灰 Zinc、组件三层分层、B1~B8 禁止清单
│   ├── Git工作流与Commit规范.md        # GitHub Flow、Conventional Commits 与人机大阶段审阅自动推送工作流
│   ├── 版本管理规范.md                 # SemVer 2.0.0、最小递增原则 (Minimal Bump)、全工程统一版本号
│   ├── 接口契约规范.md                 # .NET 10 WebAPI 统一响应结构、Header 租户隔离上下文与 DTO 契约
│   ├── 数据库设计.sql                  # MySQL 8.x 高性能 DDL 建表脚本、复合唯一索引与初始种子数据
│   ├── 测试与质量验收规范.md           # 大阶段浏览器走查清单、冒烟测试、边界输入异常与发布门禁
│   ├── 技术架构说明书.md               # 全局拓扑、高性能 302 重定向时序流转、缓存防穿透与后端架构建议
│   └── 部署与环境配置规范.md           # 环境变量 (.env)、Vite 生产构建优化、Nginx 生产反代与 Docker 编排
├── AGENTS.md                           # 【本文件】Agent 顶层行动指南与行为约束准则
└── frontend/                           # 前端源码工程目录 (阶段一启动后正式创建)
```

---

## 2. 任务类型与必读规范映射矩阵

在动手执行任何具体的开发或修改指令前，Agent **必须先完整阅读**对应任务列的必读文档：

| 任务类型 / 开发场景 | 动手前必读文档 (位于 `docs/`) | 补充参考 |
| :--- | :--- | :--- |
| **首次进入仓库 / 开始新会话** | `AGENTS.md`、`项目全局硬性约束.md`、`功能开发清单.md` | — |
| **开发前端界面、组件与页面交互** | `功能开发清单.md`、`前端UI设计规范.md`、`项目全局硬性约束.md` | `需求规格说明书.md` |
| **开发或调整 Mock 服务与接口层** | `接口契约规范.md`、`功能开发清单.md` | `技术架构说明书.md` |
| **执行阶段验收、走查与测试** | `测试与质量验收规范.md`、`功能开发清单.md` | `前端UI设计规范.md` |
| **Git 提交、推送与发版** | `Git工作流与Commit规范.md`、`版本管理规范.md` | `项目全局硬性约束.md` |
| **配置环境变量、生产打包与部署** | `部署与环境配置规范.md` | `技术架构说明书.md` |

---

## 3. Agent 核心不可协商硬性铁律 (违反即返工)

1. **专职纯前端，严禁越权写后端**：
   * Agent 100% 仅在 `frontend/` 目录下工作。**绝对严禁编写任何 C# 后端代码、严禁创建后端工程目录**；后端由人类用户手动实现。
2. **全流程 Mock 驱动，独立闭环运行**：
   * 前端目前的一切请求必须由本地 Mock 服务引擎处理，确保在无后端环境下，所有增删改查、租户切换、图表渲染 100% 正常可交互。
3. **严格遵从《功能开发清单.md》，严禁擅自增改**：
   * 清单是唯一执行准绳。**严禁跑偏、严禁漏项、严禁擅自新增未经清单列入的功能**。新需求必须遵循“先同步修订文档 -> 用户明确同意 -> 方可动手”。
4. **零手搓原生 UI（严格遵循 shadcn/ui 规范）**：
   * 严禁在业务页面中写裸 `<button>`、`<input>`、`<select>` 等原生标签，必须统一使用 `@/components/ui/` 原子组件。
   * 严禁硬编码 HEX 颜色值（如 `bg-[#18181b]`），必须使用语义 Token 或 Zinc 色阶；破坏性操作必须弹 `AlertDialog` 拦截。
5. **人机协同大阶段审阅、PR 与自动合并闭环（核心执行铁律）**：
   * 严格以大阶段（Phase 1 至 Phase 8）为最小交付单元。
   * **阶段启动前切出特性分支**：检查工作区纯净，`git checkout main && git pull --rebase origin main`；切出阶段独立分支 `feat/phase-X-<name>` 开发。
   * **每完成一个大阶段，Agent 必须通过系统命令主动唤起用户默认浏览器（`http://localhost:5173`）供人工审阅**。
   * **在未获得用户明确同意前，绝对严禁执行 `git commit` 或 `git push`**。
   * 用户确认同意后，Agent 自动执行规范 Conventional Commit、推送特性分支至 GitHub、使用 `gh pr create` 发起 Pull Request、再调用 `gh pr merge --squash --delete-branch` 完成自动合并，切回 `main` 同步并打勾清单 `[x]`，随后**必须立即原地暂停**，等待下一阶段指令。
6. **语言与命名标准**：
   * 代码标识符（变量、函数、组件、文件名）严格全英文；代码注释中文；用户可见 UI 文案地道纯中文；`docs/` 下文档全中文。
7. **版本管理与最小递增**：
   * 遵循 SemVer 2.0.0，统一以根目录 `package.json` 的版本为准；**能升 PATCH 就不升 MINOR，能升 MINOR 就不升 MAJOR**。
8. **文档同步修订与记录追溯铁律**：
   * 凡在开发过程中对 `docs/` 下任何规范文档进行新增、修改或调整，**必须在同一次提交中同步更新该文档文首的「文档概述与修订记录」表格**。
   * 严禁裸改文档正文而不留修订流水；修订记录必须如实填写版本号（遵循 Doc SemVer 规范，初始 `v1.0.0`，新增业务规则升 MINOR 如 `v1.1.0`，微调勘误升 PATCH 如 `v1.0.1`）、修订日期、修订人/Agent 与核心改动说明。

---

## 4. Agent 日常标准开发流转步序 (Standard Operating Procedure)

Agent 在承接并执行任一大阶段任务时，必须严格按以下 8 步推进：

```text
步骤 0: 基线同步与分支切出 ──► 检查工作区纯净，main 分支 pull --rebase，切出 feat/phase-X-<name>
    │
    ▼
步骤 1: 查阅清单 ──► 确认当前阶段目标，阅读对应必读规范
    │
    ▼
步骤 2: 编码实现 ──► 仅在前端工程中开发页面、组件、样式与本地 Mock 数据
    │
    ▼
步骤 3: 本地自测 ──► 运行 tsc -b 与 npm run lint，确保 0 报错、无控制台异常
    │
    ▼
步骤 4: 唤起审阅 ──► 确保 Vite 运行，执行 Start-Process 自动打开浏览器供用户体验
    │
    ▼
步骤 5: 人工确认 ──► 停下操作，汇报本阶段完成成果，等待用户确认
    │   ├── 若需修改 ──► 就地修改后重新打开浏览器审阅
    │   └── 用户同意 ──► 进入自动提交与 PR 合并闭环
    ▼
步骤 6: 提交/PR/自动合并 ──► push 特性分支 ──► gh pr create ──► gh pr merge --squash ──► 切回 main 同步
    │
    ▼
步骤 7: 原地暂停 ──► 清单勾选 [x]，Agent 立即停手暂停，等待下一阶段指令
```

---

## 5. 常用开发与构建命令速查

> 统一在 `frontend/` 目录或工程根目录通过 PowerShell / bash 执行：

```bash
# 进入前端目录
cd frontend

# 检查工作区是否纯净 (开发前门禁)
git status --porcelain

# 确保 main 主干最新
git checkout main
git pull --rebase origin main

# 切出阶段特性分支
git checkout -b feat/phase-X-<name>

# 冲突紧急回滚（拉取冲突时一键恢复现场并停手向人类报警）
git rebase --abort

# 安装依赖
npm install

# 启动本地开发服务器 (默认端口 http://localhost:5173)
npm run dev

# 自动唤起浏览器审查页面 (Windows PowerShell 命令)
Start-Process "http://localhost:5173"

# TypeScript 强类型编译自检 (门禁)
npx tsc -b

# 生产环境打包验证 (门禁)
npm run build

# 自动提交并推送特性分支
git add .
git commit -m "feat(<scope>): <完成说明>"
git push -u origin feat/phase-X-<name>

# 自动创建 Pull Request 并合并 (GitHub CLI)
gh pr create --base main --head feat/phase-X-<name> --title "..." --body "..."
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
```
