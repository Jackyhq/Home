# Home — AI 项目说明

每次在本仓库开始工作前先阅读本文件。实现、测试、文案或部署事实变化时，在同一变更中同步更新相关现行文档。

## 项目与双版本

Home 是一个 Astro 7 静态个人首页。同一套源代码在构建时生成两个版本；项目没有运行时语言路由，也不会根据浏览器语言自动跳转。

| 版本 | `SITE_LOCALE` | 正式域名 | 输出目录 | 托管平台 |
| --- | --- | --- | --- | --- |
| 中文版 | `zh-CN`（默认） | `https://jackyw.cn` | `dist/` | ESA Pages |
| 英文版 | `en` | `https://jackyw.uk` | `dist-en/` | Cloudflare Pages |

中文版正文与界面以中文为主，但 Welcome 保留双语层级，About 与 Photography 保留英文展示标题和中文副标题；英文版只输出英文。两版通过显式链接切换。

`https://photo.jackyw.cn` 是独立的完整摄影档案和相片清单上游，不是本仓库的第三个版本。

Vercel 项目 `new-home` 的 `https://jackyw.vercel.app` 是中文版验证站，复用 `dist/`，不增加语言版本。其 Production 与 Preview 部署均通过 `pnpm deploy:vercel` 在构建前联网同步相片；普通本地构建和 GitHub CI 继续使用已提交快照。

## 代码地图

- `src/pages/index.astro`：唯一首页入口，组合 Header、Welcome、About、Photography 与 Footer。
- `src/layouts/BaseLayout.astro`：HTML、SEO、canonical、hreflang、分析加载与全局样式入口。
- `src/components/`：语义化 Astro 区块及少量原生客户端渐进增强。
- `src/i18n/`：构建时 locale、域名、SEO 与中英文文案。
- `src/config/site.ts`：两版共享的网站身份、外链与分析配置。
- `src/content/personal.ts`：独立的个人资料、域名、SEO、介绍和标语数据，不属于代码开源授权。
- `src/styles/global.css`：全站设计 token、组件样式与响应式规则。
- `src/lib/`：相片 schema、快照加载、布局纯函数与构建元数据。
- `src/data/`：已提交的相片快照与临时双语文案覆盖。
- `scripts/`：相片同步、静态产物服务器与文档检查。
- `tests/`：Playwright 页面、响应式、无障碍与双版本回归。
- `docs/`：公开的开发、部署、数据契约和授权说明。
- `.local/`：仅保留在本地的讨论、历史规范、QA、截图和个人路线图；已被 Git 忽略，不得上传、提交或作为公开文档依赖。

## 源文件与生成物

可以编辑并提交 `src/`、`scripts/`、`tests/`、`docs/`、`public/`、根配置文件、`README.md` 与本文件。

不要编辑或提交 `dist/`、`dist-en/`、`.astro/`、`node_modules/`、`.pnpm-store/`、`test-results/`、`playwright-report/` 或 `artifacts/`；它们是生成物。`.local/` 中的资料只在本地维护，不得提交。`.vercel/`、`.env` 与 `.env.*` 是本机配置，也不属于版本化源码或文档；经过审阅的 `.env.example` 可纳入版本控制。

`src/data/featured-photos.json` 是例外：它由 `pnpm photos:sync` 生成，但作为经过审查的构建输入纳入版本控制。普通本地构建和 CI 只读取该快照，不访问摄影站网络。同步输出不得包含 EXIF、GPS、原图 URL、存储键或其他私有上游字段；`src/lib/photo-schema.ts` 必须保持不导入该快照，确保同步命令能修复无效数据。

## 修改规则

- 个人资料、身份、URL 和展示正文修改 `src/content/personal.ts`；`src/i18n/` 维护通用界面文案和语言逻辑，`src/config/site.ts` 组合共享配置。不要在多个组件重复维护同一事实。
- 代码使用 AGPL-3.0-only；个人内容、摄影数据与媒体素材的授权边界见 `NOTICE.md`。第三方材料遵循各自许可证，不得扩大个人内容授权。
- UI、布局、交互或 SEO 变更必须同时检查中文版和英文版，除非差异是明确的本地化规则。
- 保持 Astro + 原生 HTML/CSS/JavaScript；没有明确收益时不引入运行时框架、滚动库或第二套页面组件。
- 普通本地构建和拉取请求中的 CI 测试不得依赖外部网络；只有显式相片同步及平台部署脚本读取上游 manifest，包括 Vercel 的 Production 与 Preview 部署。
- 不直接修改生成目录来修复问题。
- 当前行为写入必要的公开说明；个人计划、AI 讨论和时间点审计只写入 `.local/records/`，不上传云端。公开文档不得链接这些本地资料。
- 视觉或行为变更必须同步更新测试和对应文档。

## 常用命令与验证

```sh
pnpm dev                         # 默认中文版
SITE_LOCALE=en pnpm dev          # 英文版
pnpm check                       # 两版 Astro / TypeScript 检查
pnpm build                       # 生成 dist/ 与 dist-en/
pnpm test                        # 单元测试 + 中文完整回归 + 英文本地化/SEO 回归
pnpm test:unit
pnpm docs:check
pnpm test:e2e:dist               # 先确保 pnpm build 已成功
pnpm test:e2e:en                 # 先确保 dist-en/ 为最新
pnpm photos:sync                 # 显式联网并改写已提交快照
pnpm deploy:vercel               # 联网同步后构建 Vercel 中文版验证站
```

- 仅文档：运行 `pnpm docs:check`。
- 数据、schema 或纯布局逻辑：运行 `pnpm test:unit`、`pnpm check`、`pnpm docs:check`。
- 组件、样式或客户端脚本：运行 `pnpm test:unit`、`pnpm docs:check`、`pnpm build`、`pnpm test:e2e:dist`、`pnpm test:e2e:en`。
- 部署脚本或平台配置：执行完整验证，并审查 `docs/operations/deployment.md`。

不要把已有但陈旧的 `dist/` 或 `dist-en/` 当作验证通过的证据。先读 `README.md` 与 `docs/README.md`；本地历史资料不得作为当前实现要求。
