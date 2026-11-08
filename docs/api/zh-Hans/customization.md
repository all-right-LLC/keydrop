# 公开页面与品牌定制

Keydrop 自有的界面文字放在 `apps/web/messages/en.json`（基准版本），同一文件夹每种语言一个文件；修改文案时请在每个要提供的语言中修改同一个键。`common.brand` 控制共用字标与标题，`home` 控制首页，`publicSite` 控制功能介绍、可选页面及主题操作。默认首页标题“Good things deserve a way in.”意为“好的产品，值得有个入口”；功能页标题“Every code. One place.”意为“所有码，集中管理”。部署者应把模板文案改成自己产品的介绍。

标志分两处：`apps/web/src/components/site/brand-logo.tsx` 以内嵌 SVG 画出字标与方形图标（字母跟随文字颜色，句点使用 `globals.css` 的 `--brand-accent`）；`apps/web/public/brand/` 存放同一套素材的文件，包括浅色／深色背景字标、单色版、多种图标与 PNG。`public/favicon.svg`、`src/app/favicon.ico` 和 `public/icons/` 的主屏幕图标都是图标的静态副本。换成自己的品牌时，替换 `brand-logo.tsx`、`public/brand/` 中的文件与这些图标；生成 `/share-image.png` 的构建脚本会读取 `keydrop-wordmark.svg` 和 `keydrop-icon.svg`，请沿用文件名或一并修改脚本。Keydrop 字标由 Poppins Bold 转轮廓制作（SIL Open Font License 1.1）。

## 区块与页面开关

`apps/web/src/config/site.ts` 的 `publicSite.sections` 决定首页区块与顺序：`hero`（主标题与会动的票券卡片）、`logos`（可搭配工具的跑马灯）、`features`（含小型产品示意的便当格）、`steps`（三步骤）、`facts`（四个重点数字）、`start`（底部行动入口）。可排序或移除；保留 `hero`，让页面只有一个主标题。区块代码在 `src/components/site/landing/`（`sections.tsx` 是版面、`hero-visual.tsx` 是动态卡片），文案在 `home`；`home.title` 中的 `<accent>` 标记渐变文字。访客偏好减少动态时，动画会停止。新增版式时修改这些文件或 `src/app/page.tsx`。必备的 `/features` 默认有六个功能区块。

所有默认公开页（含登录与初始化页）底部都有小字“Powered by Keydrop”，链接到 https://keydrop.allright.dev。MIT 许可证不强制显示，在 `apps/web/src/config/site.ts` 把 `poweredBy.enabled` 设为 `false` 即可移除。首页的开源徽章与结尾区的 GitHub 按钮链接到 `publicSite.repositoryUrl`；设为 `null` 就不显示，也可改成自己的仓库。

`publicSite.pages` 包含四个默认关闭的可选页面：

| 设置 | 路径 | 默认内容 |
| --- | --- | --- |
| docs | /docs | 领取、购买及使用码的简短指南 |
| pricing | /pricing | 免费活动与一次性购买说明；实际价格仍在商品购买页显示 |
| demo | /demo | 固定示例数字与 beUI 码库表格；完全不读取真实商品、码、订单或账号 |
| changelog | /changelog | 更新日志的空状态；发布更新前自行添加内容 |

改成 `true` 后重新构建并部署，导航、sitemap 与 AI 文档会一起更新。关闭后直接请求该网址返回 404，并非只隐藏导航。定价默认不虚构订阅方案，也不向部署者收取 Keydrop 授权费；可按自己销售的产品改写。页面入口在 `src/app/[section]/page.tsx`。

`siteFeatures.myCodes` 与 `siteFeatures.adminNotificationEmail` 继续分别控制“我的码”及管理员提醒邮件；发信仍需要有效的 Email Sending 配置。

## 主题与移动版

全站用 next-themes 管理系统／浅色／深色，选择保存在浏览器的 `keydrop-theme`。右下角 beUI ThemeToggle 切换浅色与深色，Auto 恢复跟随设备（中文意思：自动）。beUI 会尊重减少动态效果的偏好；相关许可证保留在 `apps/web/vendor/beui.LICENSE`。

颜色变量与公开页面排版在 `src/app/globals.css`，主题组装在 `src/components/site/theme-controls.tsx`。公开页面提供键盘跳至主要内容的链接，手机上的演示页用卡片取代表格。

## 搜索与分享

- 公开页面由服务器生成 title、description、canonical、各语言与 x-default 的 hreflang（见"界面语言"）、Open Graph 与 Twitter metadata。`pnpm dev`／`pnpm build` 会先运行 `scripts/generate-share-image.mjs`，根据品牌与首页文案生成 1200 × 630 的 `/share-image.png` 静态资源；修改文案后需重启或重新构建。绘图库不会进入正式 Worker。
- canonical 与分享图的完整网址读取部署环境的 `APP_URL`，不采用访客传入的 Host。正式网址必须是 HTTPS origin；本地允许 localhost HTTP。未设置、模板 `.example`、带路径／账号密码／查询参数的网址不输出 canonical，公开页面暂时标记 noindex，sitemap 为空。
- 首页输出 WebSite JSON-LD；`publicSite.organizationName` 默认为空。填入自己的运营者名称后才输出 Organization，不把模板作者冒充为部署者。
- `/sitemap.xml` 只列出首页、功能介绍与已启用的可选页面。`/llms.txt` 与 `/llms-full.txt` 同样只取公开文案，不查询数据库。
- `/robots.txt` 允许一般爬虫与 AI 爬虫读取公开页面，排除账号、后台、API、活动与交易路径。非公开页面默认 noindex。这不是访问控制；私有数据仍由服务器验证权限。
- 语言网址、`hreflang` 标签与 sitemap alternates 都由 `src/i18n/locales.ts` 生成；新增语言见下方[新增语言](#界面语言)。

搜索收录、域名与社交分享效果请在部署后自行确认。

## 管理后台布局

`/dashboard` 下的所有页面共用 `src/app/dashboard/layout.tsx`：先检查初始化、登录与管理员身份，再套上 SaaS 控制台外框 `src/components/dashboard/shell.tsx`。

- 侧边栏（beUI `animated-sidebar`）：导航分成 Workspace、Distribution、Operations、Developers 四组，项目在 `shell.tsx` 的 `groups` 数组中；通知、外部兑换待确认、外部撤销失败会显示数量徽标。`⌘B`／`Ctrl+B` 收起为图标栏，手机上变成抽屉。
- 顶栏：侧边栏切换、搜索按钮（beUI `command-palette`，`⌘K`／`Ctrl+K` 打开，可跳转页面或执行常用操作）、打开公开网站、语言菜单与 beUI `theme-toggle`。控制台内会隐藏公开页面右下角的主题切换。
- 每页页头使用 `src/components/dashboard/page-header.tsx`（beUI `breadcrumb`），内容区块使用 beUI `card`；状态使用 `animated-badge`，提示与表单错误统一使用 `src/components/dashboard/notice.tsx`（beUI `alert`），分页使用 `pagination`，筛选与子页面导航使用 `tabs`，创建表单放在 `drawer`。
- 首页的统计卡片、活动柱状图（beUI `bar-chart`）、最近动态与设置进度来自 `src/lib/server/dashboard-overview.ts` 的只读汇总查询，不含码原文或个人信息。
- 商品页有共用页头与分页导航（`src/app/dashboard/products/[id]/layout.tsx`）：Inventory、Campaigns、Devices、Entitlements、Settings。销售与商品设置、归档移到 Settings。
- 手机优先的“Quick handout”页面（`/dashboard/handout`）让管理员取码、分享（含三款分享图片）并记录给了谁，详见 [handouts.md](handouts.md)。
- 管理员的密码设置在控制台内的 `/dashboard/security`；普通用户仍使用 `/account/security`，两个页面共用 `SecurityPanel`。

控制台与公开页面都使用 Geist／Geist Mono（`src/lib/fonts.ts`，通过 `next/font/google`，构建时下载并自行托管）。图表颜色是 `globals.css` 的 `--chart-1`、`--chart-2`，默认为黑白灰阶，并各有深色版本。

beUI 组件从官方 registry 原样复制到 `src/components/motion/**`、`src/components/charts/**` 与 `src/lib` 的几个辅助文件，文件头注明来源，许可证见 `vendor/beui.LICENSE`。为了日后能直接用上游新版本覆盖，这两个目录在 `eslint.config.mjs` 中关闭了几条对上游写法误报的 React Compiler 规则，项目自己的代码不受影响。

## 界面语言

界面支持 en、zh-Hans、zh-Hant、ja、ko、it、de、ar，列表在 `src/i18n/locales.ts`，文案在 `messages/<语言>.json`。

- **如何决定语言**：网址语言前缀优先（例如 `/ja/features`），其次是语言菜单写入的 `NEXT_LOCALE` cookie，再是浏览器 `Accept-Language`（`zh-TW`／`zh-HK`／`zh-MO`／`zh-Hant` 对应繁中，其他中文对应简中），最后是英文。因此不带前缀的领码链接分享出去，会用收件人的语言显示。
- **语言网址**：除了管理后台、API 和 MCP，每个页面都能用 `/<语言>/…` 打开。`src/proxy.ts` 会去掉前缀、告诉页面使用哪种语言并写入 cookie，之后点到不带前缀的页面也保持同一种语言。大小写不对（`/zh-hant/…`）会重定向到标准写法；不支持的前缀返回 404。客户端自行发送的语言标头会被忽略。
- **SEO**：公开页面输出当前语言的 canonical，以及 8 种语言加 `x-default`（不带前缀的网址）的 `hreflang`。`sitemap.xml` 列出不带前缀和每种语言的网址。公开页面内的链接会保留当前前缀。
- **语言菜单**：在控制台顶栏（手机上只显示地球图标）和公开页右下角的主题切换旁。在语言网址下会切换到另一种语言的网址，其他页面只写入 cookie 并刷新。
- **从右到左**：阿拉伯文在 `<html>` 设置 `dir="rtl"`：侧栏移到右边、抽屉从左边滑出、箭头翻转。新组件请使用 Tailwind 的逻辑方向（`ms-`／`me-`／`ps-`／`pe-`／`text-start`／`text-end`），需要翻转的图标加 `rtl:` 变体。
- **邮件**：登录和重置密码的验证码邮件使用发出请求时的语言。码邮件与管理员提醒使用收件人偏好的语言，Keydrop 会在用户登录、打开控制台或"我的码"时记录（`user.locale`）。匿名码邮件使用领码页的语言；Email 分发使用管理员当前的界面语言。
- **缺少翻译**时逐键回退到英文；语言文件不存在或格式错误时整页使用英文。`tests/messages.test.ts` 检查每种语言的键与英文完全相同、ICU 参数一致且没有空字符串。
- **新增语言**：在 `src/i18n/locales.ts` 添加代码（从右到左的语言另加入 `rtlLocales`），新增键与 `en.json` 相同的 `messages/<代码>.json`，并在 `ogLocales` 添加 Open Graph 语言区域。
