# UMIKI-Web（Console 前端）Roadmap
> 目标：为 UMIKI 数据工厂提供**工业级**人类控制台——能跑任务、看 QC、做抽检、导出数据，以丰富的金融图表和可视化为核心，不掺任何数据逻辑，只调后端 API。

---

## 阶段总览
- **F0**：项目骨架 + 开发环境（0.5 天）
- **F1**：Layout / 路由 / 设计基础（0.5 天）
- **F2**：Jobs 页面 — 任务管理（1 天）
- **F3**：Datasets 页面 — 数据集浏览（1 天）
- **F4**：QC Dashboard — 质控看板（1–2 天）
- **F5**：Audit Viewer — 抽检查看器（1 天）
- **F6**：Export 页面 — 训练集导出（0.5 天）
- **F7**：联调 + 打磨 + 部署（1 天）

> F0–F1 可在后端 API 就绪前开始；F2–F6 依赖后端 API，如 API 未就绪则用 mock 数据先行开发，API 就绪后对接。

---

## 技术选型（已确定）

### 选型决策记录

| 维度 | 选型 | 选择理由 | 否决项 |
|------|------|---------|--------|
| 框架 | React 18 + TypeScript + Vite | 生态最大、工具链成熟、不需要 SSR | Next.js（不需要 SSR）、Vue（生态稍小） |
| UI 组件库 | **Ant Design 5 + ProComponents** | 企业级全套组件；ProLayout/ProTable 开箱即用；暗色主题；和 AntV 设计语言一致 | shadcn/ui（覆盖面不够，手写量大）、MUI（风格不适合金融） |
| 金融图表 | **KLineChart** | K 线 + 内置技术指标（MA/MACD/RSI 等）+ 自定义指标 API + 画线工具全套 + 多窗格 + 暗色主题 + 支持增量推送（实时流预留）；MIT 开源 | TradingView Lightweight Charts（无画线工具、自定义指标需大量手写）、Recharts（功能太弱） |
| 通用图表 | **Apache ECharts**（echarts-for-react） | 处理百万级数据点（WebGL renderer）；原生 dataZoom 大范围缩放；覆盖 QC 统计/分布/热力图/散点/时序 | Recharts（不能处理大数据量）、Highcharts（商业授权） |
| DAG / 血缘 | **React Flow** | 专为节点流程图设计；自定义节点；拖拽交互；minimap；React 原生 | AntV G6（非 React 原生）、Cytoscape（偏老） |
| 重型数据表格 | **AG Grid Community** | 金融行业标准；虚拟滚动百万行；列固定/排序/筛选/导出 | TanStack Table（纯逻辑库，UI 全部手写） |
| 轻型列表表格 | **Ant Design ProTable** | 和 Ant Design 一体，筛选/分页开箱即用 | — |
| 数据请求 | **TanStack Query + ky** | 缓存/重试/乐观更新/分页；ky 比 axios 更现代轻量 | axios（偏老）、原生 fetch（缺少拦截器） |
| 实时通信 | **WebSocket**（原生） | Job 日志流推送；预留未来 live tick stream 扩展点 | Socket.IO（太重，不需要 fallback） |
| 类型生成 | **openapi-typescript** | 后端 FastAPI 出 OpenAPI spec → 前端零手写类型同步 | 手写类型（容易 drift） |
| 状态管理 | **Zustand**（UI 状态） + **TanStack Query**（服务端状态） | 职责分离；Zustand 极轻量；不需要 Redux 的复杂度 | Redux（过重）、Jotai（项目不需要原子化） |
| 路由 | **React Router v7** | 稳定、生态大 | — |

### 技术栈总览图

```
┌──────────────────────────────────────────────────────────┐
│  Framework         React 18 + TypeScript + Vite          │
├──────────────────────────────────────────────────────────┤
│  UI Components     Ant Design 5 + ProComponents          │
│                    (ProLayout / ProTable / ProForm)       │
├──────────────────────────────────────────────────────────┤
│  Financial Charts  KLineChart                            │
│                    K线/自定义指标/画线工具/多窗格/实时流预留│
├──────────────────────────────────────────────────────────┤
│  General Charts    Apache ECharts (echarts-for-react)    │
│                    QC统计/分布/热力图/散点/时序            │
├──────────────────────────────────────────────────────────┤
│  DAG / Lineage     React Flow                            │
│                    数据血缘/Pipeline流程可视化             │
├──────────────────────────────────────────────────────────┤
│  Data Grid         AG Grid Community (重型表格)           │
│                    ProTable (轻型列表)                    │
├──────────────────────────────────────────────────────────┤
│  Data Fetching     TanStack Query + ky                   │
│  Type Gen          openapi-typescript                    │
│  Realtime          WebSocket (Job日志 + 未来tick流预留)   │
├──────────────────────────────────────────────────────────┤
│  State             Zustand (UI) + TanStack Query (服务端) │
│  Router            React Router v7                       │
└──────────────────────────────────────────────────────────┘
```

### 架构决策备注
- **为什么不用 TradingView Lightweight Charts？** 需求要求全交互 + 自定义指标 + 画线工具，Lightweight Charts 无内置画线、自定义指标需要大量 plugin 开发，KLineChart 开箱满足。
- **为什么不用 shadcn/ui？** 项目目标是工业级控制台，shadcn 组件覆盖面不够（无 ProTable/ProLayout 等高级组件），会导致大量手写重复代码。
- **AG Grid Community vs Enterprise？** 当前 Community 版的虚拟滚动、列固定、排序筛选已满足需求，无需行分组/聚合/Excel导出等 Enterprise 功能。如后续需要可平滑升级。
- **实时流预留策略？** WebSocket 连接层做抽象封装，KLineChart 原生支持 `updateData` 增量推送，ECharts 支持 `appendData`。当后端支持 live tick 时，前端只需接入数据源，图表层无需重构。

---

## 与后端的边界
- 前端**不做**任何数据处理 / 计算 / 解码 / 聚合
- 所有数据通过后端 FastAPI 获取
- 后端 API 尚未实现时，需求变更通过 `agent-message` 通知后端 `umiki` agent
- 预期后端 API 分组：`/api/jobs`、`/api/datasets`、`/api/qc`、`/api/audit`、`/api/export`

---

# F0 — 项目骨架 + 开发环境

## 任务
- [ ] `npm create vite` 初始化 React + TS 项目
- [ ] 安装并配置 Ant Design 5 + ProComponents
- [ ] 安装并配置 TanStack Query、Zustand、React Router v7、ky
- [ ] 安装可视化库：KLineChart、echarts + echarts-for-react、@xyflow/react（React Flow）、ag-grid-react + ag-grid-community
- [ ] 配置 ESLint / Prettier
- [ ] 建立目录结构：
  ```
  src/
    api/              # API 客户端、类型定义、WebSocket 封装
    components/
      charts/         # ECharts 通用图表封装
      financial/      # KLineChart 金融图表封装
      flow/           # React Flow 自定义节点/边
      data-grid/      # AG Grid 封装
    pages/
      jobs/
      datasets/
      qc/
      audit/
      export/
    layouts/          # ProLayout 配置
    hooks/            # 自定义 hooks
    stores/           # Zustand stores
    types/            # 全局类型 + API 生成类型
    lib/              # 工具函数
  ```
- [ ] 配置代理：`vite.config.ts` 中 `/api` → 后端地址
- [ ] 暗色主题为默认（量化工具惯例），Ant Design ConfigProvider 配置 dark algorithm

## 验收
- [ ] `npm run dev` 能跑起空白页面；`npm run build` 无报错

---

# F1 — Layout / 路由 / 设计基础

## 任务
- [ ] 基于 ProLayout 实现 AppLayout：左侧导航栏 + 顶部标题栏 + 主内容区
- [ ] 导航项：Jobs / Datasets / QC / Audit / Export
- [ ] 配置 React Router 路由表
- [ ] 封装 API 客户端基础（ky instance + 拦截器 + 错误处理）
- [ ] 创建 TanStack Query client + provider
- [ ] 类型文件占位（后续由 openapi-typescript 生成）

## 验收
- [ ] 点击导航能切换页面（内容为占位）；暗色主题生效；布局在 1280px+ 宽度下正常

---

# F2 — Jobs 页面（任务管理）

## 后端 API 依赖
```
POST   /api/jobs                 # 启动任务（参数：spec YAML 或 symbol/date/stages）
GET    /api/jobs                 # 任务列表（状态筛选）
GET    /api/jobs/{job_id}        # 任务详情 + 日志
POST   /api/jobs/{job_id}/retry  # 重试失败任务
WS     /ws/jobs/{job_id}/logs    # 实时日志流（WebSocket）
```

## 任务
- [ ] Jobs 列表页（ProTable）：列 = ID / 类型 / 状态 / 创建时间 / 耗时
- [ ] 状态筛选：running / completed / failed / all
- [ ] Job 详情面板（侧边抽屉或新页面）：
  - 任务参数（symbol、date range、stages）
  - 实时日志流（WebSocket 连接）
  - 重试按钮
- [ ] 新建任务对话框（ProForm）：
  - 选择 symbol（从 Datasets API 拉可用列表）
  - 选择日期范围
  - 选择 stages（download / decode / derive / qc / export，多选）

## 验收
- [ ] 能启动一个任务、看到状态变化、查看日志、失败后重试

---

# F3 — Datasets 页面（数据集浏览）

## 后端 API 依赖
```
GET    /api/datasets                        # 所有数据集概览
GET    /api/datasets/{symbol}               # 某 symbol 详情
GET    /api/datasets/{symbol}/{date}        # 某天的 manifest
```

## 任务
- [ ] 概览页：卡片或表格展示已有 symbol 列表，每个 symbol 显示：
  - 日期范围、记录总数、存储占用、pipeline 完成度（raw / canonical / derived / training）
- [ ] Symbol 详情页：按日期展示各 zone 状态
  - 每天一行：date / raw 状态 / canonical 状态 / derived 状态 / training 状态
  - 点击某天可展开 manifest 详情（hash、文件路径、记录数）
- [ ] 数据血缘可视化（React Flow）：
  - raw → canonical → derived → training 的 DAG 图
  - 节点显示 hash、记录数、状态
  - 点击节点可跳转到对应 manifest 详情
- [ ] Manifest 查看器：JSON 树形展示，支持复制

## 验收
- [ ] 能浏览所有 symbol，查看某 symbol 某天的完整 manifest 和血缘 DAG

---

# F4 — QC Dashboard（质控看板）

## 后端 API 依赖
```
GET    /api/qc                              # QC 报告列表
GET    /api/qc/{symbol}                     # 某 symbol 的 QC 汇总
GET    /api/qc/{symbol}/{date}              # 某天的 QC 详情
```

## 任务
- [ ] 汇总看板（ECharts）：
  - 按 symbol × date 矩阵热力图展示健康状态（绿/黄/红）
  - 关键指标卡片（Ant Design Statistic）：总记录数、BBO crossed 比例、序列断裂数、告警数
- [ ] 详情页（点击某 symbol/date 进入，ECharts）：
  - 序列间隙分析时序图
  - BBO 质量统计（crossed / locked 比例饼图/柱状图）
  - Action 分布柱状图
  - Depth 层级频率分析堆叠图
  - 告警列表（ProTable，规则触发明细 + 定位到具体分钟/分区）
- [ ] 筛选功能：按 symbol / date range / 告警级别

## 验收
- [ ] 一眼看出哪天数据有问题；点进去能定位到具体告警

---

# F5 — Audit Viewer（抽检查看器）

## 后端 API 依赖
```
GET    /api/audit/snapshots                 # 随机抽检快照
GET    /api/audit/snapshots/{symbol}/{date} # 指定 symbol/date 的抽检
  ?n=10&seed=42                             # 控制抽样数和种子
```

## 任务
- [ ] 抽检控制面板（ProForm）：选 symbol、date、抽样数量、随机种子
- [ ] Top-10 Book 展示（AG Grid）：
  - 左列 bid（price / size / count × 10 档）
  - 右列 ask（price / size / count × 10 档）
  - 条件格式高亮 BBO（最优买卖价）
  - 显示 mid、spread
- [ ] Order Book 深度图（KLineChart 或 ECharts）：
  - 可视化 bid/ask 各档位的 size 分布
- [ ] 每个快照附带追溯信息：
  - 原始记录索引、ts_event、对应 canonical 分区路径
- [ ] 支持翻页浏览多个快照

## 验收
- [ ] 随机抽 10 个分钟的 top10 表格 + 深度图可正常显示，追溯信息完整

---

# F6 — Export 页面（训练集导出）

## 后端 API 依赖
```
GET    /api/export/training                          # 可导出列表
GET    /api/export/training/{symbol}/{date}          # 下载某 shard
  ?format=parquet&compression=zstd
```

## 任务
- [ ] 导出列表页（ProTable）：列 = symbol / date / 样本数 / 特征数 / 文件大小
- [ ] 导出操作：
  - 单个 shard 下载按钮
  - 批量选择 + 打包下载（如后端支持）
- [ ] 导出前预览：展示该 shard 的 FeatureSpec 版本、特征列表、标签列表、样本数统计

## 验收
- [ ] 不用命令行就能选择并下载某 symbol 某周的训练集

---

# F7 — 联调 + 打磨 + 部署

## 任务
- [ ] 与后端 API 全量联调，替换所有 mock 数据
- [ ] 接入 openapi-typescript 自动生成 API 类型
- [ ] 错误处理：API 不可用时的 fallback 提示、请求失败 toast（Ant Design message/notification）
- [ ] Loading 状态：Ant Design Skeleton 骨架屏
- [ ] 响应式适配（最低 1280px 宽度）
- [ ] 生产构建 + 部署配置（Docker / Nginx 静态托管）

## 验收
- [ ] 完整流程：启动任务 → 等待完成 → 查看 QC → 抽检 → 导出训练集，全程无需命令行
