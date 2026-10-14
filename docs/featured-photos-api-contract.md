# 摄影清单与首页相片快照契约

状态：现行契约，已由 Home 部署同步接入

上游清单版本：v9

本地快照版本：2

最近审阅：2026-10-14

## 1. 目标

Home 在 Cloudflare Pages、ESA Pages 及 Vercel 的 Production / Preview 部署前读取 Photography 已生成的完整相片清单，并投影为首页需要的最新 30 张相片快照。Vercel 是中文版验证站，不增加语言版本。

```text
photos-manifest.json（完整、含摄影元数据）
  → 过滤 photo
  → 校验全量 ID、时间与版本
  → 按 dateTaken 新到旧排序
  → 取最新 30 张
  → 只映射首页允许字段
  → 应用本地临时文案覆盖
  → 原子写入 featured-photos.json（精简、可提交）
```

普通本地 Astro 构建和拉取请求中的 CI 测试读取已提交快照；浏览器加载由快照生成的页面和缩略图，不请求完整 manifest。平台部署先通过显式同步刷新工作区快照，再运行 Astro 构建。完整上游清单不得被复制进仓库、HTML 或客户端脚本。

## 2. 上游输入

生产地址：

```text
GET https://photo.jackyw.cn/photos-manifest.json
```

手动验证候选地址时，可以临时设置 PHOTOS_MANIFEST_URL。最终响应必须继续使用 HTTPS，并返回 JSON Content-Type。

下载策略：

- 超时 20 秒。
- 最大响应体 5MiB；超过上限立即中止。
- 只接受明确支持的 version=v9；版本变化必须通过代码与测试审查，不能静默兼容。

上游清单包含搜索、地图和相片站内部功能需要的完整字段，包括 EXIF、GPS、originalUrl、s3Key、相机与镜头信息。这些字段可以存在于下载内存中，但绝不能进入本地首页快照。

### 2.1 转换需要的上游字段

| 上游字段 | 用途 |
| --- | --- |
| version | 固定为 v9 的输入契约门禁 |
| data[].mediaType | 排除视频与其他媒体 |
| data[].id | 唯一身份与详情页路径 |
| data[].dateTaken | 排序并映射为 takenAt |
| data[].lastModified | 计算快照 updatedAt |
| data[].titles.zh-CN / titles.en | 双语标题；单一语言缺失时按规则回退 |
| data[].descriptions.zh-CN / descriptions.en | 分别生成中英文图片替代文本 |
| data[].title / description | 本地化对象缺项时的公开文案回退 |
| data[].thumbnailUrl | 640w WebP 默认图片 |
| data[].thumbnailWebpSrcSet | 360w / 640w WebP 候选 |
| data[].width / height | 图片比例与静态尺寸 |

所有 photo 记录先校验 id、dateTaken 和 lastModified，以便验证全量唯一性、数量和更新时间。只有排序后入选的 30 张需要通过完整展示字段校验；很旧且未入选的记录缺少展示文案时，不应无关地阻断首页部署。

## 3. 确定性选取与映射

1. 只保留 mediaType=photo；totalPhotos 等于过滤后的总数。
2. 全量相片 ID 必须唯一，且至少有 30 张。
3. 按 dateTaken 降序排序；时间相同时按 id 的简单字典序升序作为 tie-break。
4. 只取前 30 张。
5. thumbnailUrl 和 srcset 中的相对地址以 https://photo.jackyw.cn/ 为基准转为绝对地址；srcset 必须恰好包含 360w 和 640w 各一个候选，拒绝额外宽度、重复候选及 0640w 等带前导零的描述符。两个候选必须使用可信摄影域名的 `/thumbnails/{id}-{width}.webp` 路径，并与当前相片 id 对应。
6. photoUrl 由 id 确定性构造为 https://photo.jackyw.cn/photos/{id}/。
7. updatedAt 取全部 photo.lastModified 的最大值。
8. 映射完成后使用本地 version=2 schema 校验；应用 featured-photo-copy-overrides.json 后再次校验。

标题回退规则：

- title：titles.zh-CN → title → titles.en。
- titleEn：titles.en → title → titles.zh-CN。
- description：descriptions.zh-CN → description → descriptions.en → title。
- descriptionEn：descriptions.en；缺失时使用英文标题生成中性的英文替代文本。
- 仍无法得到非空值时，同步失败。

## 4. 本地输出

输出路径：src/data/featured-photos.json

```ts
interface FeaturedPhotosSnapshot {
  version: 2;
  updatedAt: string;
  totalPhotos: number;
  items: FeaturedPhoto[]; // 恰好 30 项，按 takenAt 新到旧排列
}

interface FeaturedPhoto {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  photoUrl: string;
  thumbnailUrl: string; // 可信摄影域名下的 -640.webp
  thumbnailWebpSrcSet: string; // 恰好两个同域 WebP 候选：360w 与 640w 各一个
  width: number;
  height: number;
  takenAt: string;
}
```

photoUrl、360w 候选和 640w 候选都必须与当前相片 id 对应；thumbnailUrl 必须与 srcset 的 640w 候选完全相同。输出只允许以上字段，不包含 tags、originalUrl、s3Key、size、EXIF、GPS、toneAnalysis、相机、镜头或上游存储信息。

最终格式化 JSON 设有 64KiB 硬上限，并在写临时文件前检查。5MiB 只用于有界读取完整上游输入，不是本地快照或 HTML 的体积预算。

## 5. 校验与失败策略

pnpm photos:sync 依次执行：

- 验证请求超时、最终 HTTPS URL、状态码、JSON MIME 与 5MiB 上限。
- 验证 manifest v9 根结构。
- 过滤视频，验证全量相片的最小索引字段和唯一 ID。
- 稳定排序并完整校验入选 30 张。
- 绝对化缩略图地址，并通过可信来源、WebP 后缀、相片 ID、恰好 360w / 640w 两档候选与默认图一致性检查；其他宽度或非标准描述符使同步失败。
- 应用本地文案覆盖，并警告没有匹配当前 30 张的过期覆盖 ID。
- 校验最终格式化快照不超过 64KiB。
- 先写临时文件，再原子替换已提交快照。

任何步骤失败都会返回非零退出码并保留旧快照。同步脚本不会把半成品、部分 30 项或未经 v2 schema 校验的数据写入目标文件。

## 6. 部署流程

```text
Home main 更新
  ├─ GitHub Actions：使用已提交快照运行单元测试、文档检查、双版本构建与 Playwright 回归
  ├─ Cloudflare Pages：pnpm deploy:cf → 同步相片 → 生成并发布英文版 dist-en
  ├─ ESA Pages：pnpm deploy:esa → 同步相片 → 生成并发布中文版 dist
  └─ Vercel Production：pnpm deploy:vercel → 同步相片 → 生成并发布中文版验证站 dist
```

GitHub Actions 只负责持续集成，不发布网站。拉取请求中的 CI 检查与本地常规构建不依赖外部网络；浏览器不请求完整 manifest，图片仍使用快照里的上游缩略图地址。Cloudflare Pages、ESA Pages 和 Vercel 只在部署构建工作区中读取上游清单，不把刷新后的快照回写 Git。Vercel Preview 同样运行 `pnpm deploy:vercel`，该命令复用中文版的 `deploy:esa`。相片同步或后续构建失败时，对应平台不会发布本次产物，其最后一次成功版本保持不变。

摄影上游更新本身不会触发首页部署；每次新的平台部署才读取当时的上游数据，并按 `dateTaken` 选取最新 30 张。Vercel 单次部署 URL 保留该次产物，查看后续新部署应使用 `jackyw.vercel.app` 或对应分支的稳定别名。

## 7. 验证边界

本地单元测试覆盖视频过滤、全量唯一 ID、稳定排序、30 项数量、双语文案回退和入选数据校验，并检查可信域名、相片 ID、默认图与 srcset 一致性。额外候选、重复宽度和 `0640w` 等非标准描述符会被拒绝。

同步脚本只请求 manifest JSON，不下载图片来检查 HTTP MIME、文件签名、解码或实际可访问性。快照校验通过只说明数据符合契约，不保证上游图片当前可用。

上线验收分别确认 manifest 响应、同步日志、输出字段和页面图片加载。离线测试不请求上游，不能替代线上资源检查。

快照里的相片标题、描述、拍摄信息与资源链接供作者的站点展示，未纳入代码开源许可。复用模板时应换成自己的数据，具体范围见[开源与内容许可](open-source.md)。
