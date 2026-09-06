# 前端 UI 与设计规范 (Frontend UI & Design Guidelines)

本文档定义 **Arturia.ShortLink** 前端（`frontend`）的 UI 设计规范、组件体系、分层架构与交互标准。  
本规范以 **shadcn/ui 官方生态标准** 为基准，深度对标 **Dub.co / Vercel** 的现代化极客无边框极简质感（Modern Minimalist Dashboard），**严格执行“现成开源免费组件库、严禁手搓原生 UI”的工程铁律**，确保全站设计与代码的高度一致性、健壮性与可维护性。

---

## 1. 设计哲学与核心原则

1. **拥抱官方标准生态**：以 shadcn/ui 官方推荐的实现范式为唯一基准，杜绝“造轮子”与随意引入非标准三方库。
2. **强制使用原子组件**：严禁在业务页面中随意使用原生 HTML 交互标签（如 `<button>`、`<input>`、`<select>`），必须统一使用 `@/components/ui/` 导出的原子组件。
3. **数据驱动与类型安全**：表单强制通过 Zod Schema 进行端到端运行时类型校验；表格、图表与短链状态遵循强类型定义。
4. **极客黑白灰与无障碍优先**：遵循 Radix UI 无障碍规范（WAI-ARIA），采用 New York 紧凑精致风格与 Zinc 冷灰调色板，边框优先（Border-First）替代厚重阴影，微交互清晰流畅。
5. **浅色优先专精 (Light-First Focus)**：首期专精打磨高对比度、纯净明亮的浅色控制台体验，底层采用语义化 CSS 变量，解耦色值，为后续暗色模式演进奠定基础。

---

## 2. 视觉体系与主题配置 (Theme & Tokens)

### 2.1 风格与基础预设

Arturia.ShortLink 采用 shadcn/ui 的 **New York** 风格预设，以更紧凑的内边距、更清晰的细线边框与更细腻的微排版适配数据密集型短链管理场景：

| 维度 | 规范选型 | 说明 |
| :--- | :--- | :--- |
| **风格预设 (Style)** | `New York` | 紧凑、细腻边框、适合数据与图表密集型 SaaS Dashboard |
| **基础色系 (Base Color)** | `Zinc` (中性冷灰) | 纯净、克制、极客黑白灰，突出核心短链与访问数据指标 |
| **圆角弧度 (Radius)** | `0.5rem` (`8px` / `rounded-lg`) | 控件 `rounded-md` (6px)，容器 `rounded-xl` (12px)，标签 `rounded-full` |
| **主题模式** | 浅色优先 (Light Only) | 专精打磨高品质纯白底色（`#FFFFFF` / `#FAFAFA`）与浅灰边框（`#E4E4E7`） |

### 2.2 语义色彩与状态色阶规范

全站颜色必须通过 Tailwind 语义变量（如 `bg-background`、`text-foreground`、`border-border`）或标准的 Zinc 色阶使用，**严禁在业务代码中硬编码 HEX 颜色值（如 `bg-[#18181b]`）**。

业务状态语义对应如下：

| 业务状态 | 语义 Token | 视觉效果规范 | 典型应用场景 |
| :--- | :--- | :--- | :--- |
| **正常 / 启用 / 激活** | `success` | `text-emerald-600 bg-emerald-500/10 border-emerald-500/20` | 短链正常重定向、域名 DNS 校验通过、复制成功反馈 |
| **警告 / 即将过期 / 待验证**| `warning` | `text-amber-600 bg-amber-500/10 border-amber-500/20` | 短链即将到期（7天内）、域名待配置 CNAME、二次确认 |
| **危险 / 停用 / 封禁 / 错误**| `destructive` | `text-destructive bg-destructive/10 border-destructive/20` | 短链已被禁用、违规封禁短链、删除操作拦截、校验失败 |
| **密码保护 / 信息提示** | `info` | `text-blue-600 bg-blue-500/10 border-blue-500/20` | 包含访问保护密码的短链、UTM 构建提示、操作指南 |
| **未启用 / 次要 / 过期** | `secondary` / `muted` | `text-muted-foreground bg-muted border-border` | 短链已过期、历史访问日志、无描述占位 |

### 2.3 全局基础控件与微交互规范

1. **滚动条美化规范 (Scrollbar Standard)**：
   * 全站所有发生溢出滚动的容器（抽屉、侧边栏、表格、代码预览区等）统一采用极简细窄圆角设计，严禁出现 Windows 浏览器原生粗灰色轨道与上下箭头按钮。
   * 滚动条颜色基于主题变量 `--muted-foreground` 自适应计算（透明背景轨道 + `muted-foreground/0.25` 半透明圆角滑块，悬停提亮至 `0.45`）。
   * 规范统一定义于 `src/index.css`（WebKit `width: 6px` + 标准 `scrollbar-width: thin`）。
2. **数字输入框规范 (Number Input Spinners)**：
   * 全局隐藏 `<input type="number">` 的浏览器原生微调上下箭头（Spinners），由 `index.css` 全局重置。保持端口、有效期天数等输入框与普通文本框完全一致的对齐排版。
3. **数字排版与等宽铁律 (Tabular Figures & Monospace)**：
   * 对于数据看板中的 PV、UV 点击数字，必须附加 `tabular-nums`，确保数字刷新时上下等宽对齐，杜绝视觉跳动。
   * 对于短码（Slug）、短链完整 URL、API Key 密钥及 UTM 参数代码块，必须统一应用等宽字体 `font-mono text-sm tracking-tight`。
4. **页面与卡片进场动效规范 (Page Transition)**：
   * 全站页面容器（`PageContainer`）与弹窗统一配置 `250ms ease-out` 微渐变淡入动效（`animate-in fade-in-0 zoom-in-[0.99] duration-250 ease-out`），严禁生硬瞬切，杜绝大范围纵向位移以防触发布局滚动条闪烁。

---

## 3. 组件分层与目录组织架构

前端工程的 `src/components` 目录严格按照三层架构进行管理：

```text
frontend/src/
├── components/
│   ├── ui/                     # 【底层原子组件】shadcn CLI 生成并维护，严禁侵入业务逻辑
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── sheet.tsx           # 抽屉组件 (Drawer)
│   │   ├── form.tsx
│   │   ├── table.tsx
│   │   ├── switch.tsx
│   │   ├── badge.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── tooltip.tsx
│   │   ├── popover.tsx
│   │   ├── skeleton.tsx
│   │   └── ...
│   ├── shared/                 # 【业务通用复合组件】短链 SaaS 业务跨模块复用组件
│   │   ├── page-container.tsx  # 统一页面容器与顶部面包屑/操作插槽
│   │   ├── data-table.tsx      # 短链与日志通用表格组件
│   │   ├── stat-card.tsx       # 仪表盘指标卡片 (PV/UV/增长率)
│   │   ├── empty-state.tsx     # 统一空状态插槽组件
│   │   ├── copy-button.tsx     # 短链/API Key 一键复制按钮（带 Tooltip 反馈）
│   │   ├── link-status-badge.tsx # 短链运行状态胶囊 (有效/暂停/过期/封禁)
│   │   ├── qr-code-dialog.tsx  # 动态二维码生成、Logo 嵌入与 PNG/SVG 下载弹窗
│   │   └── utm-builder.tsx     # 可视化 UTM 参数构建器面板
│   └── layout/                 # 【全局框架布局】
│       ├── app-layout.tsx      # 主控制台侧边栏 + 主工作区总布局
│       ├── app-sidebar.tsx     # 左侧导航菜单与品牌标识
│       ├── app-header.tsx      # 顶部全局栏与面包屑
│       ├── workspace-switcher.tsx # 顶部工作空间快速切换下拉器
│       └── user-menu.tsx       # 用户头像与下拉设置菜单
├── pages/                      # 【页面级视图组件】仅负责数据获取、状态编排与子组件组装
│   ├── Dashboard/              # 工作台仪表盘
│   ├── Links/                  # 短链列表、抽屉管理与批量操作
│   ├── Analytics/              # 数据分析中心 (时序图、设备、地域、渠道)
│   ├── Domains/                # 自定义域名与 DNS 状态
│   ├── Team/                   # 团队空间与成员 RBAC 权限
│   └── Settings/               # 个人与 API 密钥设置
├── services/                   # 统一 API 请求与 Axios 拦截器
├── mocks/                      # 本地高保真 Mock 数据仓与模拟引擎
└── types/                      # TypeScript 实体与契约类型定义
```

---

## 4. 强制使用规范与严格禁止清单 (Hard Constraints)

### 4.1 强制规范 (Do's)

1. **通过标准方式引入原子组件**：基础组件统一严格遵循 shadcn/ui 标准代码模板，落入 `@/components/ui/`，保持社区标准实现。
2. **统一使用 `cn()` 合并样式**：使用 `clsx` + `tailwind-merge` 导出的 `cn(...)` 工具函数处理条件样式与类名合并，杜绝类名覆盖冲突。
3. **复合组件采用 CVA 模式**：所有具有变体（`variant` / `size`）属性的自定义业务组件，必须基于 `class-variance-authority` (cva) 编写。
4. **唯一图标库使用标准**：全站仅允许引入 `lucide-react`，图标统一严格遵循四级尺寸阶梯：
   * **Micro (14px / `size-3.5`)**：Badge 徽标内小图标、表格行内辅助说明、复制成功小对勾。
   * **Regular (16px / `size-4`)**：按钮内部前缀图标、表单输入框前后缀、常规下拉菜单项。
   * **Medium (20px / `size-5`)**：卡片标题图标、导航菜单项主图标。
   * **Large (24px / `size-6`)**：统计面板大卡片图标、空状态占位插画。
5. **操作区域层级统一**：表单中承载 `Switch`（短链启停）或 `Checkbox` 的区域必须使用 shadcn/ui 标准 `FormItem` 结构，保持外围细边框与内边距一致。

### 4.2 严格禁止清单 (Don'ts - 违规立即打回)

| 编号 | 禁止行为 | 正确做法 | 违规判定 |
| :-: | :--- | :--- | :--- |
| **B1** | 业务代码中直接手写 `<button>` 标签 | 必须 `import { Button } from "@/components/ui/button"` | ❌ 立即打回 |
| **B2** | 业务代码中直接手写 `<input>`、`<select>`、`<textarea>` | 必须使用 `@/components/ui/input` 等对应 shadcn 原子组件 | ❌ 立即打回 |
| **B3** | 随意引入 Ant Design / Element / MUI / Mantine 等外部重型 UI 库 | 统一使用 shadcn/ui 原生体系，保持零手搓与纯净依赖 | ❌ 立即打回 |
| **B4** | 在 Tailwind 类名中手写硬编码 HEX 色值（如 `bg-[#18181b]`、`text-[#10b981]`） | 必须使用语义变量或 Tailwind Zinc 标准色阶（如 `bg-background`、`text-emerald-600`） | ❌ 立即打回 |
| **B5** | 高危破坏性操作（如删除短链、解绑域名、撤销密钥）仅用简单 `window.confirm` | 必须使用 `@/components/ui/alert-dialog` 提供专业二次确认拦截弹窗 | ❌ 立即打回 |
| **B6** | 表单通过裸 `useState` 分散管理字段与手动判断错误 | 必须使用 `react-hook-form` + `zod` + shadcn `<Form>` 标准范式 | ❌ 立即打回 |
| **B7** | 内部页面跳转手写原生 HTML `<a>` 标签 | 站内导航必须使用路由库跳转组件，严禁原生 `<a>` 引发整页刷新与白屏闪烁 | ❌ 立即打回 |
| **B8** | 自行手写非标准图表组件或第三方复杂图表库 | 图表统一使用 `recharts` 并严格遵循本文档第 7 节的极简灰阶渐变标准 | ❌ 立即打回 |

---

## 5. 表单与数据校验标准 (Form & Validation System)

所有短链创建、编辑、域名绑定与工作空间表单，必须严格遵循 **React Hook Form + Zod Schema + shadcn Form** 范式：

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// 短链创建/编辑表单校验规则
export const linkFormSchema = z.object({
  originalUrl: z
    .string()
    .url("请输入合法的目标长链接地址 (以 http:// 或 https:// 开头)")
    .refine((url) => !url.includes("art.link"), "禁止缩短本平台域名自身（防止自环重定向）"),
  slug: z
    .string()
    .min(3, "短码别名至少 3 个字符")
    .max(32, "短码别名最多 32 个字符")
    .regex(/^[a-zA-Z0-9_-]+$/, "短码仅支持字母、数字、下划线及短横线")
    .optional()
    .or(z.literal("")),
  title: z.string().max(64, "标题最多 64 个字符").optional(),
  password: z.string().max(32, "密码长度不可超过 32 位").optional(),
});

export type LinkFormValues = z.infer<typeof linkFormSchema>;

export function LinkCreateForm({ onSubmit }: { onSubmit: (data: LinkFormValues) => void }) {
  const form = useForm<LinkFormValues>({
    resolver: zodResolver(linkFormSchema),
    defaultValues: { originalUrl: "", slug: "", title: "", password: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="originalUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>目标长链接 *</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/very/long/url" {...field} />
              </FormControl>
              <FormDescription>访客访问短链后将直接重定向至此目标地址</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "正在生成..." : "立即生成短链"}
        </Button>
      </form>
    </Form>
  );
}
```

---

## 6. 全局交互反馈体系 (Feedback & Notifications)

### 6.1 Toast 通知标准 (`sonner`)

全站操作结果提示唯一使用社区成熟的 `sonner`，严禁使用原生 `alert()` 或自写简陋提示条。  
**位置固定标准：屏幕右上角 (Top-Right)**：

```tsx
import { toast } from "sonner";

// 复制短链成功
toast.success("短链已复制到剪贴板", { description: "https://art.link/github-repo" });

// 业务拦截/异常
toast.error("短码别名已被占用", { description: "该别名在当前域名下已存在，请更换后重试" });

// 异步操作绑定 (Promise)
toast.promise(verifyDomainPromise, {
  loading: "正在向公共 DNS 服务器查询 CNAME 记录...",
  success: "DNS 解析校验成功，域名已激活",
  error: "未查询到 CNAME 指向记录，请检查 DNS 配置并稍后再试",
});
```

### 6.2 弹窗形态选用矩阵

| 场景需求 | 采用组件 | 尺寸与规范要求 |
| :--- | :--- | :--- |
| **短链创建 / 复杂多配置编辑** | `Sheet` (右侧抽屉) | 宽屏从右侧顺滑滑出，固定头部标题与底部提交栏，内容区域独立滚动 |
| **动态二维码展示与定制** | `Dialog` (居中模态框) | 居中显示，固定宽度（`max-w-md`），带关闭图标与高清导出按钮 |
| **危险操作拦截 (删除/解绑/吊销)**| `AlertDialog` | 固定宽度 `max-w-md`，删除操作确认按钮标红（`variant="destructive"`） |
| **轻量级气泡说明 / 复制反馈** | `Tooltip` | 列表操作图标悬浮一律附加 Tooltip 说明，延迟 200ms 触发 |

### 6.3 加载骨架屏 (Skeleton) 与防闪屏约束

1. **初次加载骨架屏**：页面或数据卡片首次加载时，必须使用 `Skeleton` 还原真实 UI 的几何轮廓，严禁使用打断式的全屏大菊花 Spinner。
2. **防闪屏切换约束**：在时间跨度（24h / 7d / 30d）、筛选器或分页切换时，**严禁整块卸载图表并闪烁骨架屏**；必须配合原有数据保持机制，图表数据就地平滑补间更新，更新过程中仅施加轻微半透明过渡（`isFetching && "opacity-75"`）。

---

## 7. 图表可视化设计规范 (Recharts Aesthetics)

短链数据分析中心是平台的核心视觉亮点，严格遵循**极简灰阶高级微渐变标准**：

### 7.1 PV / UV 访问时序走势图
* **PV（总点击量）主曲线**：
  * 线条颜色：纯黑 `#18181B` (Zinc-900)，线宽 `2px`。
  * 渐变阴影填充 (Linear Gradient Area)：顶部透明度 `0.08`，底部为 `0.0`，轻微营造呼吸感。
* **UV（独立访客）次级曲线**：
  * 线条颜色：冷灰 `#71717A` (Zinc-500)，虚线描边 `strokeDasharray="4 4"`，线宽 `1.5px`。
* **坐标轴与网格 (Grid & Axis)**：
  * 仅保留极淡横向网格线 `stroke="#F4F4F5"` (Zinc-100)，隐藏所有垂直竖线。
  * 刻度文字：`fill="#A1A1AA"` (Zinc-400)，字号 `12px font-mono`。
* **悬浮浮层 (Tooltip)**：
  * 极简浮雕卡片：纯白背景 `bg-white border border-zinc-200 shadow-md rounded-lg p-2.5 text-xs`。

### 7.2 设备分布与渠道排行
* **设备环形饼图 (Pie Chart)**：
  * 采用 Zinc 阶梯灰度色阶保持视觉纯净：
    * 桌面端 (Desktop)：`#18181B` (Zinc-900)
    * 移动端 (Mobile)：`#52525B` (Zinc-600)
    * 平板端 (Tablet)：`#A1A1AA` (Zinc-400)
* **来源渠道排行 (Referrers)**：
  * 横向对比进度条：背景底色 `bg-zinc-100`，有效填充使用 `bg-zinc-900`。

---

## 8. 布局结构与 Inset 沉浸式工作区

1. **左侧导航栏 (`AppSidebar`)**：
   * 采用 shadcn/ui 官方 `Sidebar` (v4) `variant="inset"` 范式，与最外层底层底色自然融为一体。
   * 顶部固定高度 `h-14` 放置品牌标识与工作空间切换器；底部展示登录用户小头像与版本号。
2. **顶部全局操作栏 (`AppHeader`)**：
   * 高度固定为 `h-14`，与左侧品牌区齐平。右侧放置全局搜索入口、API 状态指示及用户个人菜单。
3. **主工作区浮雕卡片 (`<main>`)**：
   * 桌面端（`md:` 及以上）应用 Inset 样式（`md:mr-4 md:mb-4 md:rounded-xl md:border md:border-zinc-200 md:shadow-xs md:bg-white`），保持整站如同精致的桌面原生客户端体验。
