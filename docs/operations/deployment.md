# 部署运维

最近审阅：2026-10-14

## 架构关系

`Jackyhq/Home` 是 `jackyw.cn` 与 `jackyw.uk` 共用的唯一首页源代码仓库。两个正式首页和 Vercel 中文版验证站共用这套源代码，通过平台部署脚本生成对应产物；Vercel 不增加语言版本：

| 平台 | 正式域名与内容 | 构建命令 | 输出目录 |
| --- | --- | --- | --- |
| Cloudflare Pages | `jackyw.uk`，英文版 | `pnpm deploy:cf` | `dist-en` |
| ESA Pages | `jackyw.cn`，中文版 | `pnpm deploy:esa` | `dist` |
| Vercel（项目 `new-home`） | `jackyw.vercel.app`，中文版验证站 | `pnpm deploy:vercel` | `dist` |

GitHub Actions 只负责持续集成检查，不发布网站。推送到 `main` 后，持续集成和三个平台部署分别独立运行：

```text
推送到 main
  ├─ GitHub Actions：安装依赖 → 单元测试与文档检查 → 双版本构建 → Playwright 回归
  ├─ Cloudflare Pages：同步相片 → 检查并构建英文版 → 发布 dist-en
  ├─ ESA Pages：同步相片 → 检查并构建中文版 → 发布 dist
  └─ Vercel Production：同步相片 → 检查并构建中文版验证站 → 发布 dist
```

平台构建不会等待 GitHub Actions 完成。三个平台脚本因此会自行执行单元测试、文档检查和对应站点版本的 Astro 检查。Vercel 的 Preview 部署也执行同一联网同步与中文版构建流程；拉取请求中的 GitHub CI 检查继续离线读取已提交快照。平台发布不以 GitHub Actions 通过为前提。

## 相片同步边界

`pnpm deploy:cf`、`pnpm deploy:esa` 与 `pnpm deploy:vercel` 都会先从 `photos-manifest.json` v9 按拍摄时间 `dateTaken` 提取最新 30 张相片，在各自的临时构建工作区生成并校验 version=2 快照，然后构建对应站点版本。`deploy:vercel` 复用 `deploy:esa`，用于 Vercel 的 Production 与 Preview 部署。普通 `pnpm build` 与 GitHub CI 不执行同步；平台构建不会把刷新后的快照回写 Git 仓库。

摄影上游更新本身不会触发首页部署。相片更新后，应重新运行需要刷新的平台部署；相片以拍摄时间排序，新上传但拍摄日期较早的相片未必出现在最前。页脚日期与 commit 表示页面构建时间和源码版本，不表示相片快照更新时间。Vercel 的单次部署 URL 保留该次构建产物，重新部署不会改写旧 URL；查看最新 Production 部署使用稳定别名 `https://jackyw.vercel.app`，Preview 使用对应分支的稳定别名。

同步下载上限为 5MiB，最终快照上限为 64KiB；输出只保留首页需要的公开字段，完整清单里的 EXIF、GPS、原图地址和存储键不会进入部署产物。manifest 版本不受支持、少于 30 张相片、全量 ID 重复、入选数据不完整或输出不符合 v2 schema 时，对应平台构建会在发布前停止，最后一次成功版本保持不变。具体转换与隐私边界见[摄影清单与首页相片快照契约](../featured-photos-api-contract.md)。

## 平台配置

两个 Pages 项目与 Vercel 项目 `new-home` 的目标源仓库为 `Jackyhq/Home`，生产分支为 `main`，根目录为仓库根目录。删除并重建 GitHub 仓库会产生新的仓库 ID，原有连接不会自动迁移；须在各平台重新关联，并核对实际部署的提交。现有已发布产物可以继续在线。构建环境使用 Node.js 24，并按 `package.json` 的 `packageManager` 字段使用锁定版本的 pnpm；依赖安装必须遵守 `pnpm-lock.yaml`。

Cloudflare Pages：

- 构建命令：`pnpm deploy:cf`
- 构建输出目录：`dist-en`
- 正式域名：`jackyw.uk`；`www.jackyw.uk` 只重定向到主域名

ESA Pages：

- 安装命令：`corepack enable && pnpm install --frozen-lockfile`
- 构建命令：`pnpm deploy:esa`
- 构建输出目录：`dist`
- 正式域名：`jackyw.cn`；如启用 `www.jackyw.cn`，只重定向到主域名

Vercel：

- 项目：`new-home`，框架预设：Astro
- 安装命令：`corepack enable && pnpm install --frozen-lockfile`
- 构建命令：`pnpm deploy:vercel`，Production 与 Preview 均使用
- 构建输出目录：`dist`
- 稳定 Production 别名：`jackyw.vercel.app`；canonical 与语言切换继续使用两个正式域名

ESA 的安装命令、构建命令和静态资源目录同时保存在仓库根目录的 `esa.jsonc` 中；该文件是这些字段的权威配置并覆盖控制台同名设置。Vercel 的框架预设、安装命令、构建命令和输出目录保存在根目录的 `vercel.json` 中，避免默认 `pnpm build` 只使用旧快照。Cloudflare 固定使用 `NODE_VERSION=24` 与 `PNPM_VERSION=10.19.0` 构建变量。

`jackyw.cn` 以 `zh-CN` 为文档主语言，保留 Welcome 双语文案、英文展示级章节标题与中文副标题；导航、About 正文、相片数量提示、摄影入口和相片标题使用中文；`jackyw.uk` 以 `en` 为文档语言，只输出英文界面与正文。两版均使用自指 canonical，并互相声明 `hreflang=zh-CN`、`hreflang=en` 与指向中文版的 `x-default`，同时提供显式站点切换链接。相片清单固定为 `https://photo.jackyw.cn/photos-manifest.json`。作者的统计 ID、域名与身份信息维护在 `src/content/personal.ts`，由 `src/config/site.ts` 组装；客户端只在对应的规范主机名下加载统计脚本。

Git 提供商授权由 Cloudflare、ESA 与 Vercel 各自管理。平台只需读取源仓库并执行构建，不需要 GitHub Actions 发布密钥；连接失效时，只恢复完成构建所需的最小权限。

## 分析统计与跨域链接

网站代码只在对应的正式主机名加载 Google Analytics，验证站与预览地址不加载统计脚本。作者的统计 ID 在 `src/content/personal.ts` 中维护，两个首页与摄影档案共用统计配置。

2026-09-21 的后台验收确认：诊断范围为三个正式主机名，用户提供的数据收集关闭，增强衡量开启，跨域“配置网域”列表为空。这些是当时的远程配置记录，源码无法验证它们是否持续不变。

跨域列表为空时，摄影外链与中英文切换不通过 `_gl` 串联会话信息；本地 `linker.domains: []` 无法保证清除 GA 脚本合并的远程规则。没有跨根域身份关联时，三个网站的汇总用户数也不能视为去重人数。

修改后台配置后，在全新页面分别打开两个正式首页，确认真实统计脚本已加载，再点击摄影入口与语言切换。摄影入口应准确打开 `https://photo.jackyw.cn/`，站点切换应准确打开对应首页，均不附加 `_gl`。离线测试会拦截统计脚本，只能验证页面自身链接，不能证明后台设置已经生效。

## 故障处理

| 故障 | 预期行为 | 首要检查项 |
| --- | --- | --- |
| 相片清单下载、JSON MIME、大小、版本或投影校验失败 | 对应平台构建在发布前停止，上一成功版本继续在线 | manifest 响应、同步日志与投影契约；上游恢复后重试该平台部署 |
| Vercel 新部署仍显示 Git 快照中的旧相片 | 使用普通构建时不会同步上游 | 确认该部署已读取 `vercel.json` 并运行 `pnpm deploy:vercel`，日志包含 `Synced 30 photographs`；确认访问稳定别名而非旧单次部署 URL |
| `pnpm docs:check` 报告 `Broken local documentation links` | GitHub CI 与平台构建都会在文档检查处停止，上一成功部署继续在线 | 确认链接目标已纳入当前提交；修正引用或提交缺失文档，本地检查通过后再推送修复提交 |
| Astro 检查或静态构建失败 | 对应站点版本不发布，另一平台不受影响 | 平台所用命令、Node/pnpm 版本、失败构建日志和本地同命令结果 |
| GitHub Actions 单元测试、文档或 Playwright 失败 | 持续集成失败；它不会自动取消已开始的平台构建 | 失败检查、HTML 报告、截图与跟踪记录；必要时立即撤销 `main` 变更 |
| 平台无法读取仓库 | 新部署无法开始，线上版本不变 | GitHub App 授权、仓库选择和生产分支 |
| `.cn` 缺少中文正文或规定的固定英文展示层，或 `.uk` 出现中文内容 | 构建可能成功，但站点版本或域名映射有误 | 平台、构建命令、输出目录和自定义域名是否与上表一致 |
| 自定义域名不可用 | Pages 默认域名通常仍可用于诊断 | DNS 记录、证书状态、主域名绑定和 `www` 重定向 |

修复原因后，在受影响平台的部署历史中重新运行最新 `main` 构建；Vercel Preview 则重新部署对应分支的最新提交。不要直接编辑平台生成的静态文件，也不要通过复制另一个语言的输出目录临时覆盖。

仅文档变更也会触发完整部署流程。推送前运行 `pnpm docs:check`，并确认新增的链接目标随同提交；反复重试仍含失效链接的旧提交不会修复构建。

## 回滚

1. 在受影响平台的部署历史中确认最后一个正常部署及其源代码提交。
2. 使用平台提供的回滚或提升功能恢复该成功部署，使线上先回到可用状态。
3. 在 `Home` 中撤销或修复有问题的源代码提交，并通过正常拉取请求检查重新进入 `main`。
4. 等待 Cloudflare 与 ESA 都从修复后的同一提交成功部署；若问题只影响一方，也要确认另一方仍指向预期提交。
5. 在源代码变更或议题中记录原因与预防措施。

常规回滚不得强制推送或重写 `main` 历史。除非域名绑定本身是故障原因，不要通过删除 Pages 项目或改动 DNS 完成应用版本回滚。

## 平台配置的归属

构建逻辑、重定向或响应头等可版本化配置应保存在 `Home` 中；源仓库连接、生产分支、自定义域名、构建运行时和平台级环境变量由 Cloudflare、ESA、Vercel 各自控制。修改后一项时要同步审查相关平台，避免同一源代码产生不同的非语言行为。

平台项目只消费构建输出，不是人工维护的第二套代码。任何需要随平台共同演进的配置都应优先落到源仓库，并由 `pnpm deploy:cf`、`pnpm deploy:esa` 与 `pnpm deploy:vercel` 可重复生成。
