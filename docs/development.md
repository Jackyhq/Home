# 开发指南

最近审阅：2026-10-14

## 前置条件

- 仓库默认使用 Node.js 24（见 `.nvmrc`）；`package.json` 接受 22.19 至 24 范围内受支持的 Node 版本，以满足 Undici 的运行时要求。
- pnpm 10.19.0，建议通过 Corepack 使用。
- Playwright 浏览器测试套件所需的 Chromium。

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
```

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动默认的中文版 Astro 开发服务器 |
| `SITE_LOCALE=en pnpm dev` | 启动英文版 Astro 开发服务器 |
| `pnpm check` | 分别在中文版与英文版环境运行 Astro 和 TypeScript 检查 |
| `pnpm check:zh` | 只检查 `jackyw.cn` 中文版构建环境 |
| `pnpm check:en` | 只检查 `jackyw.uk` 英文版构建环境 |
| `pnpm build` | 检查并生成中文版 `dist/` 与英文版 `dist-en/` |
| `pnpm build:zh` | 只生成 `jackyw.cn` 中文版产物到 `dist/` |
| `pnpm build:en` | 只生成 `jackyw.uk` 英文版产物到 `dist-en/` |
| `pnpm deploy:check` | 运行三个平台共用的单元测试与文档检查 |
| `pnpm deploy:cf` | 刷新相片、执行平台门禁并生成 Cloudflare Pages 使用的英文版 `dist-en/` |
| `pnpm deploy:esa` | 刷新相片、执行平台门禁并生成 ESA Pages 使用的中文版 `dist/` |
| `pnpm deploy:vercel` | 复用 `deploy:esa`，刷新相片并生成 Vercel Production / Preview 使用的中文版 `dist/` |
| `pnpm test:unit` | 运行数据契约、布局与依赖安全回归测试 |
| `pnpm test:e2e` | 构建并提供 `dist/`，然后运行全部 Playwright 测试 |
| `pnpm test:e2e:dist` | 针对已有的 `dist/` 运行完整中文版 Playwright 测试；不会自动重建 |
| `pnpm test:e2e:smoke` | 针对现有构建运行精简的浏览器冒烟测试集 |
| `pnpm test:e2e:photo` | 针对现有构建运行摄影功能浏览器检查 |
| `pnpm test:e2e:en` | 针对已有的 `dist-en/` 运行英文版本地化与 SEO 回归；不会自动重建 |
| `pnpm docs:check` | 校验本地 Markdown 链接 |
| `pnpm photos:sync` | 从正式 photos manifest 提取最新 30 张并替换已提交快照 |

设置 `PLAYWRIGHT_BASE_URL` 可测试已经运行的部署；在此模式下，Playwright 不会启动本地 `dist/` 服务器。分析脚本检查按受测页面的主机名判断是否应发起加载请求，正式规范域名与本地预览都可使用；请求仍会被测试拦截，不发送正式分析数据。设置 `PW_VERBOSE=1` 可输出带名称的本地测试结果。

`pnpm dev` 在未设置 `SITE_LOCALE` 时解析为 `zh-CN`。语言切换链接始终指向两个正式域名，因此本地双版本检查应分别启动相应环境，或先运行 `pnpm build` 后分别提供 `dist/` 与 `dist-en/`。直接运行 `pnpm test:e2e:dist` 或 `pnpm test:e2e:en` 前必须确认对应产物是本次变更生成的最新版本。

## 依赖安全维护

当前工具链基线为 Astro `7.2.8`、Sharp `0.35.5`、js-yaml `4.3.2`、smol-toml `1.9.1` 与 source-map-js `1.2.2`。Sharp 当前链接 libheif `1.23.2` 和 librsvg `2.63.2`。`package.json` 与 `pnpm-lock.yaml` 共同维护该基线，Astro 内容加载器和 `@astrojs/internal-helpers` 的 frontmatter 路径都必须解析到修复后的 js-yaml。

锁文件同时保持 Undici `8.11.2`、fast-uri `3.1.8` 与 devalue `5.9.4` 的修复基线。Undici 由 Astro 的 unifont 引入，fast-uri 由 `@astrojs/check` 的 YAML 语言服务经 ajv 引入，devalue 由 Astro 引入。项目产物为静态页面，这些依赖属于构建与开发工具链。

2026-10-14 的审计仍报告 `http-cache-semantics` 一条 High，[数据库公告](https://github.com/advisories/GHSA-ch52-4w7c-c8xp)与[上游维护者](https://github.com/kornelski/http-cache-semantics/issues/56)存在争议。当前程序没有共享用户会话缓存或接收访客 `max-stale` 请求头的消费路径，因此不将该告警直接写成网站可利用的漏洞。后续维护时应重新核对公告和实际调用路径。

`pnpm test:unit` 包含 [`scripts/lib/dependency-security.test.ts`](../scripts/lib/dependency-security.test.ts)，通过实际消费路径验证 YAML 空合并源预算、URI 主机与端口校验、HTTP 响应大小限制和 Buffer 序列化边界，同时保留合法输入兼容性。该回归使用本地构造输入与禁用联网的 HTTP mock，不需要外部网络。

依赖维护时可显式运行以下联网命令，定向刷新间接依赖并查询漏洞库：

```sh
pnpm update --depth Infinity smol-toml source-map-js sharp
pnpm audit
```

审查锁文件差异后，用 `pnpm install --frozen-lockfile` 检查安装可复现性，并执行双版本验证。审计结果具有时效性；联网更新与审计不加入普通构建或拉取请求测试，常规检查继续使用已提交的锁文件与本地测试输入。

## 代码结构

```text
src/content/      作者个人身份、域名、介绍与媒体文案（保留全部权利）
src/config/       组装当前语言的网站配置与外部 URL
src/i18n/         构建时语言解析、内容接口与界面文案
src/components/   语义化 Astro 区块与客户端渐进增强控制器
src/lib/          相片契约、已提交快照加载器、纯布局逻辑与构建元数据
src/data/         已提交的相片快照与临时文案覆盖配置
scripts/          相片同步、静态产物服务器与文档检查
tests/            Playwright 全页面行为与布局回归测试
docs/             开发、部署、数据契约和授权说明
esa.jsonc         ESA Pages 的版本化构建与静态资源目录配置
vercel.json       Vercel 中文版验证站的版本化安装、构建与输出目录配置
```

`scripts/lib/photos-manifest.ts` 负责把上游 v9 完整清单过滤并映射为本地 v2 快照；它只保留页面所需字段，不落盘 EXIF、GPS、原图地址或存储键。`src/lib/photo-schema.ts` 有意不导入已提交快照，从而让 `pnpm photos:sync` 能够修复缺失或无效数据；`src/lib/photos.ts` 是构建时校验已提交快照的加载器。

个人内容集中维护在 `src/content/personal.ts`。`src/config/site.ts` 与 `src/i18n/` 从该文件组装各版本的配置和文案；更换站点身份时应替换个人内容，而不是在组件中逐处修改。素材和相片快照的权利范围见[开源与内容许可](open-source.md)，复用前须按该文档完成替换。

## 源文件与生成物边界

`src/`、`scripts/`、`tests/`、`docs/`、`public/` 与根配置文件是可维护、可提交的源文件。`dist/`、`dist-en/`、`.astro/`、`node_modules/`、`.pnpm-store/`、`test-results/`、`playwright-report/` 和 `artifacts/` 均由工具或本地会话生成，已被 Git 忽略，不应手工编辑或作为长期文档依赖。内部资料统一保留在被忽略的 `.local/` 隐藏目录。`.vercel/`、`.env` 与 `.env.*` 是本机配置，同样不纳入版本控制；仅允许经过审阅的 `.env.example` 示例。

`src/data/featured-photos.json` 是生成物边界中的例外：它由 `pnpm photos:sync` 原子生成，但作为本地、CI 和普通构建使用的已审查快照纳入版本控制。`src/data/featured-photo-copy-overrides.json` 则是人工维护的源配置。

## 变更流程

按变更范围选择验证：

| 变更 | 必需检查 |
| --- | --- |
| 仅文档 | `pnpm docs:check` |
| 数据、schema 或纯布局逻辑 | `pnpm test:unit`、`pnpm check`、`pnpm docs:check` |
| 组件、样式或客户端脚本 | `pnpm test:unit`、`pnpm docs:check`、`pnpm build`，随后运行 `pnpm test:e2e:dist` 与 `pnpm test:e2e:en` |
| 部署脚本或平台配置 | 完整验证，并审查[部署运维](operations/deployment.md) |

结构性重构保持输出和行为不变；新增纯逻辑时添加有针对性的单元测试。实现、页面文案或部署事实变化时，在同一变更中更新对应说明与测试。内部讨论、历史验收、截图和个人计划仅保留在本地被忽略的隐藏目录，不属于公开文档或构建输入。

浏览器测试通过 `tests/helpers/network.ts` 在浏览器 context 上统一模拟缩略图并阻止分析请求；手动创建的无 JavaScript context 也必须在导航前安装这些拦截，并检查全部 30 张缩略图经过模拟。因此拉取请求中的 GitHub CI 浏览器检查既不依赖摄影站 CDN，也不会发送正式环境分析数据。分析回归还将规范域名与预览域名映射到受测服务器，验证两种主机名下的加载行为；默认本地回归不会访问正式站点。

摄影档案的精确 URL、鼠标、触控和键盘用例验证页面自身的链接行为。离线回归不执行真实 GA 脚本，不能证明后台跨域设置已生效；远程配置变更后须按[部署运维](operations/deployment.md#分析统计与跨域链接)在两个正式域名单独验收，不能用离线测试结果替代。

## 相片快照变更

常规本地构建、拉取请求中的 CI 检查和 GitHub Actions 使用已提交的 `src/data/featured-photos.json`。Cloudflare Pages、ESA Pages 及 Vercel 的 Production / Preview 部署会在生成站点版本前读取 `https://photo.jackyw.cn/photos-manifest.json`，按拍摄时间 `dateTaken` 选取最新 30 张并刷新工作区中的快照；平台构建产生的刷新不会回写 Git 仓库。Vercel 项目 `new-home` 的 `jackyw.vercel.app` 是中文版验证站，不增加语言版本；`pnpm build` 继续保持离线，Vercel 通过 `vercel.json` 使用显式联网的 `pnpm deploy:vercel`。

摄影上游更新本身不会自动触发首页部署，需重新部署以刷新相片。Vercel 的单次部署 URL 保留该次构建产物；查看最新 Production 部署使用稳定别名 `jackyw.vercel.app`，Preview 使用对应分支的稳定别名。需要验证候选清单时可临时设置 `PHOTOS_MANIFEST_URL`，但只接受 HTTPS。手动刷新后，提交前须同时审查 JSON 差异、确认没有私有上游字段，以及检查 `featured-photo-copy-overrides.json` 中关于过期 ID 的所有警告。
