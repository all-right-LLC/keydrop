# Keydrop

面向独立开发者的开源自托管应用，在你自己的 Cloudflare 账户中管理与分发兑换码、折扣码、激活码。项目网站：[keydrop.allright.dev](https://keydrop.allright.dev)。

## 状态

目前已实现登录与初始化、加密码库、活动领取、直接指派、权益兑换、在线激活、Stripe 付款与折扣同步，以及 API／MCP、Webhook 和邮件队列。源代码已在 [GitHub](https://github.com/all-right-LLC/keydrop) 公开，采用 MIT 许可证。用于正式销售前，请先在自己的环境中测试你依赖的流程。

## 技术

Next.js、OpenNext、Cloudflare Workers 与 D1、Better Auth、next-intl、beUI（https://beui.dev）、Stripe（可选）。

## 本地开发

按 [Web README](../../../apps/web/README.md) 安装依赖、在项目外生成本地配置、应用迁移，再启动开发服务器。
D1 配置使用本地占位 ID。Deploy to Cloudflare 按钮会自动创建数据库；手动部署时，请创建自己的数据库并把它的 ID 填入 wrangler.jsonc。
修改 Wrangler 配置后重新运行 `pnpm run cf-typegen`。

## 文档

- [本地开发与设置](development.md)：安装依赖、本地配置、迁移与开发服务器。
- [部署与备份](deployment.md)：Cloudflare 部署、数据备份与还原。
- [身份验证与 API 令牌](authentication.md)：会话、API 令牌权限与 REST 端点。
- [账号密码与找回](passwords.md)：密码设置、修改与验证码重置。
- [活动条件](conditions.md)：嵌套 AND／OR 条件树格式。
- [外部资格验证](eligibility.md)：通过 HTTP 端点或代码 hook 判断领取资格。
- [管理员直接指派](assignments.md)：不经活动把码指派给已有账号。
- [手动发放与分享图片](handouts.md)：在手机上把码交给没有账号的人。
- [Email 与访客绑定](email.md)：发码队列、匿名发码、邮箱找回与管理员通知。
- [Stripe 订单](stripe.md)：Checkout、付款 Webhook、缺货策略与退款撤销。
- [Stripe 折扣同步](stripe-discounts.md)：Coupon／Promotion Code 导入与推送。
- [在线软件许可证](licenses.md)：设备激活、校验与解绑。
- [内置权益与额度账本](entitlements.md)：会员、永久授权与额度查询。
- [外部权益](external-rewards.md)：兑换时通知外部服务发放与撤销权益。
- [事件 Webhook](webhooks.md)：事件类型、签名与重试。
- [MCP](mcp.md)：供 AI 代理使用的 MCP 工具与权限。
- [公开页面、品牌与主题定制](customization.md)：首页、品牌、主题与界面语言。
- [第三方组件与许可证](third-party.md)：beUI 等第三方组件的来源与许可证。
