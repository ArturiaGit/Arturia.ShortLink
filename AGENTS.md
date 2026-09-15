# Arturia.ShortLink - AI 代理行动宪章与开发指引 (AGENTS.md)

本文件面向在 **Arturia.ShortLink** 仓库中工作的一切 **AI 编码代理 (Agent)** 及新加入的人类协作者。  
**在开始任何开发任务前，你被默认已完整阅读并严格同意遵守本文件。**  
本文件是 Agent 进入本仓库的**唯一总入口（The Front Door）与行动指南**。详细设计与技术规格见 `docs/` 规范文档库；规则冲突时以 `docs/项目全局硬性约束.md` 为最高裁决准绳。

---

## 1. 项目全景与当前阶段

* **项目名称**：Arturia.ShortLink
* **项目定位**：商业化多租户短链 SaaS 平台（对标 Dub.co / Bitly 体验，具备工作空间隔离、自定义独立域名、动态二维码定制、UTM 营销归因分析及毫秒级 302 重定向能力）。
* **协同分工模式 (双 Agent 协作架构)**：
  * **前端 Agent（本工作区会话）**：专职负责前端工程（React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Lucide Icons + Recharts），由高保真 Mock 引擎驱动独立闭环运行；**严禁编写任何 C# 后端代码**；每次完成前端大阶段验收时，**必须同步更新后端规范文档**。
  * **后端 Agent（独立会话）**：专职负责后端服务（.NET 10 + C# ASP.NET Core WebAPI + MySQL 8.0.46），基于《后端详细设计与技术实现说明书.md》和《后端功能开发清单.md》独立交付。
* **当前进度**：**前端阶段一至阶段六已 100% 达成验收；前端阶段七、八待执行；后端正在执行“契约冻结门禁”，Phase 1 C# 工程尚未启动，必须等待契约冻结人工批准并合并。**

### 1.1 仓库根目录结构拓扑

```text
Arturia.ShortLink/
├── docs/                               # 核心规范与架构设计文档库 (全中文单一事实源)
│   ├── 项目全局硬性约束.md             # 【最高宪法】不可协商工程红线 (技术栈锁定/双Agent分工/大阶段验收)
│   ├── 需求规格说明书.md               # 产品业务规则、Base62 短码、租户隔离、数据口径与三层风控
│   ├── 前端功能开发清单.md             # 【前端 Agent 唯一执行基准 (TODO)】前端阶段一至阶段八细粒度任务与里程碑
│   ├── 后端功能开发清单.md             # 【后端 Agent 唯一执行基准 (TODO)】后端阶段一至阶段五细粒度任务与里程碑
│   ├── 后端详细设计与技术实现说明书.md # 【后端实操蓝图】Clean Architecture 4层、EF Core 全局过滤、Channels 削峰、DNS 直通
│   ├── 阶段详细设计/                   # 各大阶段技术落地与实施详细设计说明书归档目录
│   │   └── 后端阶段二详细设计说明书.md # 【后端阶段二实操指南】纯用户无状态JWT、租户中间件强校验、注册双重并存与RBAC
│   ├── 前端UI设计规范.md               # New York 预设、极客黑白灰 Zinc、组件三层分层、B1~B8 禁止清单
│   ├── Git工作流与Commit规范.md        # GitHub Flow、Conventional Commits 与人机大阶段审阅自动推送工作流
│   ├── 版本管理规范.md                 # SemVer 2.0.0、最小递增原则 (Minimal Bump)、全工程统一版本号
│   ├── 接口契约规范.md                 # .NET 10 WebAPI 统一响应结构、Header 租户隔离上下文、DTO 契约与密码解锁
│   ├── 数据库设计.sql                  # MySQL 8.0.46 DDL 建表脚本、复合唯一索引与初始种子数据
│   ├── 测试与质量验收规范.md           # 大阶段浏览器走查清单、冒烟测试、边界输入异常与发布门禁
│   ├── 技术架构说明书.md               # 全局拓扑、高性能 302 重定向时序流转、缓存防穿透与后端架构建议
│   └── 部署与环境配置规范.md           # 环境变量 (.env)、Vite 生产构建优化、Nginx 生产反代与 Docker 编排
├── AGENTS.md                           # 【本文件】Agent 顶层行动指南与行为约束准则
└── frontend/                           # 前端源码工程目录
```

---

## 2. 任务类型与必读规范映射矩阵

在动手执行任何具体的开发或修改指令前，Agent **必须先完整阅读**对应任务列的必读文档：

| 任务类型 / 开发场景 | 动手前必读文档 (位于 `docs/`) | 补充参考 |
| :--- | :--- | :--- |
| **首次进入仓库 / 开始新会话** | `AGENTS.md`、`项目全局硬性约束.md`、`前端功能开发清单.md`（前端）或 `后端功能开发清单.md`（后端） | — |
| **开发前端界面、组件与页面交互** | `前端功能开发清单.md`、`前端UI设计规范.md`、`项目全局硬性约束.md` | `需求规格说明书.md` |
| **开发或调整 Mock 服务与接口层** | `接口契约规范.md`、`前端功能开发清单.md` | `后端详细设计与技术实现说明书.md` |
| **后端独立 Agent 开发与架构实施** | `后端功能开发清单.md`、`后端详细设计与技术实现说明书.md`、`阶段详细设计/后端阶段二详细设计说明书.md`、`接口契约规范.md` | `数据库设计.sql` |
| **执行阶段验收、走查与测试** | `测试与质量验收规范.md`、对应功能开发清单 | `前端UI设计规范.md` |
| **Git 提交、推送与发版** | `Git工作流与Commit规范.md`、`版本管理规范.md` | `项目全局硬性约束.md` |
| **配置环境变量、生产打包与部署** | `部署与环境配置规范.md` | `技术架构说明书.md` |

---

## 3. Agent 核心不可协商硬性铁律 (违反即返工)

1. **专职边界与双 Agent 协同**：
   * 前端 Agent 100% 仅在 `frontend/` 目录下工作，**绝对严禁编写任何 C# 后端代码、严禁创建后端工程目录**；后端由专门的后端 Agent 在独立会话中完成。
   * **跨 Agent 文档同步协议**：前端 Agent 每次完成前端大阶段验收时，必须主动审查接口与 Mock 逻辑，**同步更新《接口契约规范.md》与《后端详细设计与技术实现说明书.md》**，并在《后端功能开发清单.md》中同步前置状态。
2. **全流程 Mock 驱动，独立闭环运行**：
   * 前端目前的一切请求必须由本地 Mock 服务引擎处理，确保在无后端环境下，所有增删改查、租户切换、图表渲染 100% 正常可交互。
3. **严格遵从各自功能开发清单，严禁擅自增改**：
   * 前端遵循《前端功能开发清单.md》，后端遵循《后端功能开发清单.md》。**严禁跑偏、严禁漏项、严禁擅自新增未经清单列入的功能**。新需求必须遵循“先同步修订文档 -> 用户明确同意 -> 方可动手”。
4. **零手搓原生 UI（严格遵循 shadcn/ui 规范）**：
   * 严禁在业务页面中写裸 `<button>`、`<input>`、`<select>` 等原生标签，必须统一使用 `@/components/ui/` 原子组件。
   * 严禁硬编码 HEX 颜色值（如 `bg-[#18181b]`），必须使用语义 Token 或 Zinc 色阶；破坏性操作必须弹 `AlertDialog` 拦截。
5. **人机协同大阶段审阅、PR 与自动合并闭环（核心执行铁律）**：
   * 严格以前端 Phase 1～8、后端 Phase 1～5 为各自最小交付单元，禁止跨阶段混合交付。
   * **阶段启动前切出特性分支**：检查工作区纯净，`git checkout main && git pull --rebase origin main`；切出阶段独立分支 `feat/phase-X-<name>` 开发。
   * **每完成一个大阶段，Agent 必须主动唤起审阅入口**：前端打开 `http://localhost:5173`，后端启动 API 后打开 `http://localhost:5000/scalar/v1`。
   * **在未获得用户明确同意前，绝对严禁执行 `git commit` 或 `git push`**。
   * 用户确认同意后，Agent 先在特性分支勾选本阶段清单、更新修订记录并复跑门禁，再执行 Conventional Commit、推送、`gh pr create` 与 `gh pr merge --squash --delete-branch`；切回 `main` 同步并验证清单已合入、工作区纯净，随后**必须立即原地暂停**。
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
步骤 2: 实施 ──► 前端仅修改 frontend/；后端仅修改 backend/、根工程配置及已批准的规范文档
    │
    ▼
步骤 3: 本地自测 ──► 前端运行 tsc/build/lint；后端运行 locked restore、Release build、test、format
    │
    ▼
步骤 4: 唤起审阅 ──► 前端打开 Vite；后端启动 Kestrel 并打开 Scalar
    │
    ▼
步骤 5: 人工确认 ──► 停下操作，汇报本阶段完成成果，等待用户确认
    │   ├── 若需修改 ──► 就地修改后重新打开浏览器审阅
    │   └── 用户同意 ──► 在特性分支勾选清单、更新修订记录并复跑全部门禁
    ▼
步骤 6: 提交/PR/自动合并 ──► commit/push 特性分支 ──► gh pr create ──► gh pr merge --squash ──► 切回 main 同步并验净
    │
    ▼
步骤 7: 原地暂停 ──► 确认清单已随 PR 合入后立即停手，等待下一阶段指令
```

---

## 5. 常用开发与构建命令速查

> 前端命令在 `frontend/`，Git 与后端解决方案命令在仓库根目录通过 PowerShell / bash 执行：

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

# 后端 Phase 1 建立后使用的统一门禁
dotnet tool restore
dotnet tool run dotnet-ef --version
dotnet restore backend/Arturia.ShortLink.sln --locked-mode
dotnet build backend/Arturia.ShortLink.sln -c Release --no-restore
dotnet test backend/Arturia.ShortLink.sln -c Release --no-build
dotnet format backend/Arturia.ShortLink.sln --verify-no-changes

# 后端人工审阅入口
dotnet run --project backend/src/Arturia.ShortLink.Api --urls http://localhost:5000
Start-Process "http://localhost:5000/scalar/v1"

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
