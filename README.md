# Home

**日常，值得多看一眼。**  
A closer look at the everyday.

Home 是 Jackywhq 的双语个人主页，也是一个个人学习与实验项目。页面从欢迎画面、个人介绍延伸到近期相片，用 Astro 7 和原生 HTML、CSS、JavaScript 构建。

[中文主页](https://jackyw.cn) · [English website](https://jackyw.uk) · [摄影档案](https://photo.jackyw.cn)

代码使用 [AGPL-3.0-only](LICENSE)，照片、头像、个人介绍及其他个人内容保留权利，范围见 [NOTICE.md](NOTICE.md)。公开代码供参考与交流，由作者按自己的兴趣维护。开源准备与发布边界见[开源说明](docs/open-source.md)。

## 项目特点

- **一套源码，两个版本**：在构建时生成中文与英文网站，通过显式链接切换语言。
- **静态页面与渐进增强**：使用语义化 HTML、响应式 CSS 和少量原生客户端脚本。
- **近期摄影展示**：桌面端根据空间排列最多 30 张相片，手机端提供最新 10 张的横向浏览。
- **可重复的本地验证**：普通构建读取已提交快照；浏览器回归模拟缩略图并拦截统计请求，不依赖摄影站网络。

摄影档案是独立网站，本仓库只维护个人首页及其相片入口。

## 快速开始

使用 Node.js 24（见 [`.nvmrc`](.nvmrc)）和 pnpm 10.19.0。在 Git 克隆的工作区中运行：

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

检查英文版或生成两个版本：

```sh
SITE_LOCALE=en pnpm dev
pnpm build
```

首次运行完整回归前安装 Chromium：

```sh
pnpm exec playwright install chromium
pnpm test
```

`pnpm test` 运行单元测试、双版本构建、中文版完整浏览器回归及英文本地化与 SEO 回归。命令详情见[开发指南](docs/development.md)。

## 语言与部署

| 版本 | 正式域名 | 构建环境 | 输出目录 | 托管平台 |
| --- | --- | --- | --- | --- |
| 中文版 | `jackyw.cn` | `SITE_LOCALE=zh-CN`（默认） | `dist/` | ESA Pages |
| 英文版 | `jackyw.uk` | `SITE_LOCALE=en` | `dist-en/` | Cloudflare Pages |

没有运行时语言路由，也不会根据浏览器语言自动跳转。中文版保留规定的英文展示标题；英文版只输出英文。两版分别生成 canonical、hreflang 和 sitemap。

GitHub Actions 负责持续集成。Cloudflare Pages、ESA Pages 与 Vercel 在各自部署时同步相片并构建；Vercel 是复用中文版的验证站。平台配置与回滚流程见[部署运维](docs/operations/deployment.md)。

## 内容与配置

| 文件 | 内容 |
| --- | --- |
| [`src/content/personal.ts`](src/content/personal.ts) | 个人身份、联系方式、域名、SEO、介绍和标语；独立于代码授权 |
| [`src/config/site.ts`](src/config/site.ts) | 组合两版共享的网站配置 |
| [`src/i18n/config.ts`](src/i18n/config.ts) | 构建时语言解析与站点配置 |
| [`src/i18n/content.ts`](src/i18n/content.ts)、[`photography.ts`](src/i18n/photography.ts) | 中英文界面文案，与个人内容组合 |
| [`src/styles/global.css`](src/styles/global.css) | 设计 token、区块样式与响应式规则 |
| [`src/data/`](src/data/) | 近期相片快照与人工文案覆盖 |
| [`src/assets/`](src/assets/)、[`public/`](public/) | 个人头像与网站图标 |

本地预览和验证可使用随仓库提供的内容；发布自己的站点前，请替换个人资料、域名、邮箱、社交账号、统计 ID、备案号、相片数据、头像与图标，并遵守 [NOTICE.md](NOTICE.md) 的范围。开源许可不包含作者的个人素材或品牌授权。

## 摄影数据

[`src/data/featured-photos.json`](src/data/featured-photos.json) 是经过审查、纳入版本控制的构建输入。普通本地构建与 CI 使用该快照，只有显式同步和平台部署会读取上游 manifest：

```sh
pnpm photos:sync
```

同步过滤视频，按拍摄时间选取最新 30 张，只保留首页所需的公开字段。完整上游清单、EXIF、GPS、原图 URL 与存储键不会写入首页快照。输入格式、字段边界与失败策略见[相片快照契约](docs/featured-photos-api-contract.md)。

快照应保留在仓库；构建目录、测试报告、环境配置和临时截图应被忽略。具体维护边界见[项目说明](AGENTS.md#源文件与生成物)。

## 文档与交流

[文档索引](docs/README.md) · [开发指南](docs/development.md)

这是以个人维护为主的项目，交流方式见 [CONTRIBUTING.md](CONTRIBUTING.md)，安全或隐私问题见 [SECURITY.md](SECURITY.md)。文档只保留使用、部署、数据契约和授权说明。
