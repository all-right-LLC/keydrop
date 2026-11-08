<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/web/public/brand/keydrop-wordmark-dark.svg">
    <img src="apps/web/public/brand/keydrop-wordmark.svg" alt="Keydrop" width="320">
  </picture>
</p>

<p align="center"><a href="README.md">English</a> · <a href="README.zh-Hant.md">繁體中文</a> · <b>简体中文</b> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.it.md">Italiano</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ar.md">العربية</a></p>

**为独立开发者打造的自托管兑换码分发工具。** 在你自己的 Cloudflare 账号中管理和发放兑换码、折扣码、许可证密钥和 App Store 促销码——免费领取活动、Stripe 结账、权益、API、Webhook 和 MCP 服务器，全部集成在一个小巧的 Next.js 应用里。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fall-right-LLC%2Fkeydrop%2Ftree%2Fmain%2Fapps%2Fweb)

[![CI](https://github.com/all-right-LLC/keydrop/actions/workflows/ci.yml/badge.svg)](https://github.com/all-right-LLC/keydrop/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)

> **状态：** 1.0 之前的版本。核心流程已能在 Cloudflare 上端到端运行，但 1.0 之前可能会有破坏性变更。用于真实销售前，请先在自己的环境中测试。

## 为什么选择 Keydrop

你做了一款应用，手上有一张促销码表格、几百个许可证密钥，还有一个 Stripe 账号。Keydrop 给这些码一个归宿：

- **所有类型的码统一管理** —— 生成码，或从 CSV/Excel 导入（App Store 优惠码、合作伙伴密钥、Stripe 促销码），并加密存储。
- **按需发放** —— 带资格规则的公开或私密领取页、通过 Stripe 付费购买、直接分配、邮件分发，或者用适合手机的 *Quick handout* 页面，在聊天中把码发给别人。
- **清楚谁拿了什么** —— 每一次领取、订单、发放和兑换都有记录；撤销码、回收权益、处理退款都不会丢失历史。
- **接入你的产品** —— 带权限范围的 API 令牌、REST API、签名 Webhook 和 MCP 服务器，让你的后端或 AI 智能体可以发放和校验码。
- **完全自主运行** —— MIT 许可，单一管理员，部署到你自己的 Cloudflare Workers + D1。没有托管服务，也不按码收费。

## 功能

**码与库存**
- 四种码：兑换码、折扣码、许可证（在线激活，可限制设备数）和外部平台码
- 生成、导入（.xlsx / CSV，支持列映射和预览），以及同步 Stripe 促销码
- AES-GCM 静态加密、精确匹配搜索、导出、撤销 / 恢复、有效期和单码使用次数限制
- 唯一码或共享码，共享码可在活动和销售之间设置领取上限

**分发**
- 领取活动：公开或私密链接，匿名 / 验证邮箱 / 仅限账号，单人和总量上限，可嵌套的 AND/OR 资格规则（时间窗口、口令、邀请、购买记录、你自己的 HTTP 校验）
- Stripe Checkout：每次购买一个码、折扣、退款时可撤销码，以及三种缺货策略（退款、人工补发、补货后自动发放）
- 直接分配，以及向还没有账号的人发送邮件
- **Quick handout** —— 移动优先的页面，可取码、分享（包括三种在设备本地绘制的分享图片卡片）并记录发给了谁；可添加到主屏幕

**奖励与权益**
- 内置会员（限时或永久）和额度账本，提供幂等的扣除 / 退回 API
- 重复奖励可选择叠加、覆盖或拒绝；码被撤销时回收未使用的权益
- 外部奖励发送到你自己的服务，结果不明时转为人工审核

**集成**
- REST API 和 MCP 服务器，使用细粒度、按产品划分权限的令牌（MCP 默认只读）
- 带重试的签名外发 Webhook
- 可选的 Cloudflare Email Sending，用于验证码登录、码邮件和管理员提醒

**管理后台**
- SaaS 风格的控制台，包含活动图表、⌘K 命令面板、浅色 / 深色主题和移动端布局，使用 [beUI](https://beui.dev) 组件构建
- 界面支持 English、简体中文、繁體中文、日本語、한국어、Italiano、Deutsch 和 العربية（支持从右到左）；语言跟随访客浏览器，并可随时切换

## 技术栈

[Next.js](https://nextjs.org)（App Router）通过 [OpenNext](https://opennext.js.org/cloudflare) 运行在 [Cloudflare Workers](https://workers.cloudflare.com) 上 · [Cloudflare D1](https://developers.cloudflare.com/d1/) · [Better Auth](https://better-auth.com) · [Stripe](https://stripe.com)（可选） · [next-intl](https://next-intl.dev) · [beUI](https://beui.dev) + Tailwind CSS

## 快速开始

### 部署到 Cloudflare

1. 点击上方的 **Deploy to Cloudflare**。Cloudflare 会把 `apps/web` 文件夹复制到你 GitHub 账号下的新仓库，并创建一个 Worker 和一个 D1 数据库。
2. 填写它要求的设置：

   | 名称 | 填写内容 |
   |---|---|
   | `APP_URL` | 站点的 HTTPS 源地址，例如 `https://keydrop.your-subdomain.workers.dev`（末尾不加斜杠） |
   | `ADMIN_EMAIL` | 唯一管理员的邮箱地址 |
   | `BETTER_AUTH_SECRET` | 随机密钥，例如 `openssl rand -hex 32` |
   | `SETUP_SECRET` | 另一个随机密钥，在初始化页面使用一次 |
   | `CODE_ENCRYPTION_KEY` | 64 个十六进制字符，例如 `openssl rand -hex 32` —— **务必备份；丢失后现有的码将无法读取** |

   每个密钥使用不同的值。构建命令留空，部署命令设为 `pnpm run deploy`。
3. 打开 `APP_URL/setup`，输入 `SETUP_SECRET` 并设置管理员密码。然后登录并创建你的第一个产品。

免费的核心功能（码、活动、领取）不需要其他任何配置。需要时再添加 Stripe 和 Email Sending。

### 本地运行

需要 Node.js 24+ 和 pnpm。

```sh
cd apps/web
pnpm install --frozen-lockfile
node scripts/create-local-env.mjs "$HOME/.config/keydrop/local.env" you@example.com
pnpm run db:migrate
KEYDROP_DEV_ENV_FILE="$HOME/.config/keydrop/local.env" pnpm dev
```

打开 <http://localhost:3000/setup>，使用生成文件中的 `SETUP_SECRET`（该文件保存在仓库之外，不会打印到终端）。

### 手动部署

```sh
cd apps/web
pnpm exec wrangler login
pnpm exec wrangler d1 create keydrop   # 把数据库 ID 填入 wrangler.jsonc
# 在 wrangler.jsonc 中设置 Worker 名称、APP_URL 和 ADMIN_EMAIL，然后：
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put SETUP_SECRET
pnpm exec wrangler secret put CODE_ENCRYPTION_KEY
pnpm run deploy                        # 构建、执行 D1 迁移并部署
```

## 配置

| 设置 | 类型 | 必填 | 用途 |
|---|---|---|---|
| `APP_URL`, `ADMIN_EMAIL` | var | 是 | 公开源地址和管理员邮箱 |
| `BETTER_AUTH_SECRET`, `SETUP_SECRET`, `CODE_ENCRYPTION_KEY` | secret | 是 | 会话与身份哈希、一次性初始化、码加密 |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | secret | 销售时 | Stripe Checkout 和 `/api/stripe/webhook` 处的 Webhook |
| `EMAIL` binding + `EMAIL_FROM` | binding / var | 发邮件时 | Cloudflare Email Sending：验证码登录、码邮件、管理员提醒 |
| `WEBHOOK_SECRETS` | secret | 使用 Webhook 时 | 外发 Webhook 的签名密钥 |
| `ELIGIBILITY_SECRETS`, `EXTERNAL_REWARD_SECRETS` | secret | 可选 | 你自己的资格校验和外部奖励接收端的签名密钥 |

Cron 触发器每五分钟运行一次，用于让过期预留失效、处理缺货订单补发、发送排队中的邮件以及投递 Webhook。修改 `wrangler.jsonc` 后请运行 `pnpm run cf-typegen`。

功能开关（公开页面、“My codes”、管理员提醒邮件）位于 `apps/web/src/config/site.ts`；品牌和所有文案位于 `apps/web/messages/<locale>.json`。

## 定制为你自己的版本

一般部署需要修改的内容都集中在少数几个文件里。把改动限制在这些地方，日后更容易合并上游更新。

| 想修改的内容 | 位置（在 `apps/web/` 内） |
|---|---|
| 品牌名称、首页与页面文案、邮件文字 | `messages/<locale>.json`：`common.brand`、`home`、`publicSite`、`email`（在你提供的每种语言中修改同一个键） |
| 首页区块及其顺序、可选的公开页面、“我的兑换码”与管理员提醒开关 | `src/config/site.ts` |
| 页脚“Powered by Keydrop”链接与 GitHub 链接（MIT 不强制，可关闭） | `src/config/site.ts`: `poweredBy.enabled`, `publicSite.repositoryUrl` |
| 首页布局与视觉 | `src/components/site/landing/sections.tsx`、`src/components/site/landing/hero-visual.tsx`、`src/app/page.tsx` |
| 功能页与可选页面（文档、定价、演示、更新日志） | `src/app/features/page.tsx`、`src/app/[section]/page.tsx` |
| 标志、favicon 与应用图标 | `src/components/site/brand-logo.tsx`、`public/brand/`、`public/favicon.svg`、`src/app/favicon.ico`、`public/icons/`、`public/handout.webmanifest` |
| 颜色与浅色／深色主题 | `src/app/globals.css`（`:root` 中的令牌与 `--brand-accent`） |
| 社交分享图片 | 每次构建时由 `scripts/generate-share-image.mjs` 根据字标和 `home` 文案自动生成 |
| 界面语言 | `src/i18n/locales.ts`，以及 `messages/` 中每种语言一个文件 |
| Worker 名称、公开网址、cron 计划、绑定 | `wrangler.jsonc`（修改后运行 `pnpm run cf-typegen`） |

产品、价格、活动、资格规则、邮件发送与 API 令牌都在控制台中管理，而不是写在代码里。

以下内容请在明确了解原因时才修改：`migrations/`（只新增文件，绝不修改已有文件）、`src/lib/server/`（认证、加密、付款与库存规则）以及 `src/components/motion/`（beUI 组件；请改为从上游更新）。

## 文档

完整指南位于 [`docs/api`](docs/api/README.md)，提供 **English**、[繁體中文](docs/api/zh-Hant/README.md) 和 [简体中文](docs/api/zh-Hans/README.md) 版本：

- [部署、备份与恢复](docs/api/zh-Hans/deployment.md) · [本地开发](docs/api/zh-Hans/development.md) · [定制与管理后台](docs/api/zh-Hans/customization.md)
- [认证与 API 令牌](docs/api/zh-Hans/authentication.md) · [MCP](docs/api/zh-Hans/mcp.md) · [Webhook](docs/api/zh-Hans/webhooks.md)
- [活动条件](docs/api/zh-Hans/conditions.md) · [资格钩子](docs/api/zh-Hans/eligibility.md) · [权益与额度](docs/api/zh-Hans/entitlements.md) · [许可证](docs/api/zh-Hans/licenses.md)
- [Stripe](docs/api/zh-Hans/stripe.md) · [Stripe 折扣](docs/api/zh-Hans/stripe-discounts.md) · [邮件](docs/api/zh-Hans/email.md) · [Quick handout](docs/api/zh-Hans/handouts.md)

## 翻译

界面提供八种语言。公开页面还有语言网址，例如 `/ja/features`，并配有对应的 `hreflang` 标签和站点地图条目；邮件会以每位收件人的语言发送。每种语言是 [`apps/web/messages`](apps/web/messages) 中的一个 JSON 文件，键与 `en.json` 完全相同；有测试会检查每个翻译的键和 ICU 占位符是否一致。要添加新语言，请在 [`src/i18n/locales.ts`](apps/web/src/i18n/locales.ts) 中加入语言代码，并创建对应的 JSON 文件。非常欢迎母语者提供修正。

## 开发

```sh
cd apps/web
pnpm run lint
pnpm run typecheck
pnpm test                # 基于真实 SQLite + 迁移的单元测试和集成测试
pnpm run build:worker    # 生产环境 Worker 构建
```

CI 会在 Node.js 24 和 26 上运行相同的检查，并在全新的本地 D1 环境中端到端地领取码。提交 Pull Request 前请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)；报告安全漏洞请参阅 [SECURITY.md](SECURITY.md)。

## 许可证

[MIT](LICENSE) © all right LLC。内置的 [beUI](https://beui.dev) 组件保留其上游 MIT 许可证（[`apps/web/vendor/beui.LICENSE`](apps/web/vendor/beui.LICENSE)）。

## 致谢

Keydrop 建立在以下项目之上。感谢所有开发和维护它们的人：

- [Next.js](https://nextjs.org) 与 [React](https://react.dev)：应用框架
- [OpenNext for Cloudflare](https://opennext.js.org/cloudflare)、[Cloudflare Workers, D1](https://developers.cloudflare.com/) 与 [Wrangler](https://developers.cloudflare.com/workers/wrangler/)：托管、数据库与部署
- [Better Auth](https://better-auth.com)：登录、会话与邮件一次性验证码
- [Stripe](https://github.com/stripe/stripe-node)：付款
- [next-intl](https://next-intl.dev) 与 [FormatJS](https://formatjs.github.io)：翻译与消息检查
- [beUI](https://beui.dev)、[Tailwind CSS](https://tailwindcss.com)、[Motion](https://motion.dev)、[Lucide](https://lucide.dev)、[Floating UI](https://floating-ui.com)、[TanStack Virtual](https://tanstack.com/virtual)、[next-themes](https://github.com/pacocoursey/next-themes)、[clsx](https://github.com/lukeed/clsx) 与 [tailwind-merge](https://github.com/dcastil/tailwind-merge)：界面
- [Zod](https://zod.dev)：输入验证
- [Kysely](https://kysely.dev) 与 [kysely-d1](https://github.com/aidenwallis/kysely-d1)：Better Auth 的数据库访问
- [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)：MCP 服务器
- [SheetJS](https://sheetjs.com)：Excel 导入
- [Geist](https://vercel.com/font) 与 [Poppins](https://fonts.google.com/specimen/Poppins)：界面与标志所用字体
- [Vitest](https://vitest.dev)、[TypeScript](https://www.typescriptlang.org) 与 [ESLint](https://eslint.org)：测试与工具链
