# 本地开发

本地开发环境支持码库、活动、权益、订单及集成功能。详细入口见 [Web README](../../../apps/web/README.md)。

需要 Node.js 24 与 pnpm。在 `apps/web` 中执行：

```sh
pnpm install --frozen-lockfile
node scripts/create-local-env.mjs "$HOME/keys/keydrop/local.env" admin@example.com
pnpm run db:migrate
KEYDROP_DEV_ENV_FILE="$HOME/keys/keydrop/local.env" pnpm dev
```

## 必要配置

运行环境应提供下列变量；机密信息使用 Workers secrets 或安全的本地密钥存储，不能提交到 Git。

| 变量 | 用途 |
| --- | --- |
| APP_URL | 完整 origin，不带末尾斜杠；生产环境使用 HTTPS，本地可用 http://localhost:3000 |
| ADMIN_EMAIL | 唯一管理员的 Email；公开注册不能使用此保留地址 |
| BETTER_AUTH_SECRET | 至少 32 个字符的随机密钥，保护登录状态 |
| SETUP_SECRET | 至少 32 个字符的独立随机密钥，首次设置管理员时使用 |
| CODE_ENCRYPTION_KEY | 32 bytes 随机值的 64 位十六进制表示，用于加密待交付的码；创建批次时必须设置 |

首页可以直接查看。第一次访问 `/dashboard` 会跳转到 `/setup`；输入一次性初始化密钥、管理员名称与至少 12 个字符的密码，再到 `/sign-in` 登录。初始化成功后，相同的密钥不能再次创建管理员。

普通用户与管理员共用 Better Auth，但管理权限由 installation 表中的 user ID 决定，不会通过公开注册或 Email 比对授予。

## 可选发信

设置 `EMAIL_FROM` 并在 Wrangler 中加入绑定 `EMAIL` 的 `send_email`，按 Cloudflare Email Service 文档完成发件域名设置；缺少任何一项时不会注册 Email OTP 插件，界面也不会显示验证码登录。不要为了发信修改现有的收信 MX。

```json
{"send_email": [{"name": "EMAIL"}]}
```

修改 Wrangler 后执行 `pnpm run cf-typegen`。尚未配置发信时仍可使用密码登录。

## 验证

```sh
pnpm run test
pnpm run typecheck
pnpm run build:worker
```

测试使用内存 SQLite 执行真正的 migrations，验证 Better Auth 密码／OTP 登录、初始化回滚、管理权限隔离、1,000 个码的批次、重复码回滚与加密完整性。不会发出真实邮件或创建付款。

## 现有端点

- `POST /api/setup`：一次性管理员初始化。
- `/api/auth/*`：Better Auth。
- `GET /api/products`、`POST /api/products`：管理员查询／新增商品。
- `GET /api/batches`、`POST /api/batches`：批次列表、生成码与入库。
- `POST /api/batches/preview`：检查产品内已有的重复码。
- `GET /api/codes`、`PATCH /api/codes`：分页、按批次／状态查询，撤销与恢复。
- `POST /api/codes/export`：解密指定批次后导出数据，管理界面下载为 Excel。

此列表只涵盖核心库存端点。其他功能在各自的文档中说明端点，例如[手动发放与商品图标](handouts.md)、[密码](passwords.md)与[Stripe 订单](stripe.md)。

商品与批次的写入需要管理员 session 及与 APP_URL 相同的 Origin。外部集成请使用独立的 API 令牌及 `/api/v1/operations`，不能把管理员 cookie 当作正式的集成方式。

## 外部本地配置文件

若机密信息集中存放在项目之外，使用 `KEYDROP_DEV_ENV_FILE=/absolute/path/to/local.env pnpm dev`。这个选项只在开发模式下读取；正式部署仍使用 Workers secrets。

导入在浏览器中解析 .xlsx／CSV，支持选择工作表、码字段及表头，预览通过后才提交；每次最多 1,000 个码。Excel 公式单元格与可能已失真的数值码会被拒绝。导出 .xlsx 时将码设为文本，保留前导零且不执行公式。

精确查询码使用 `POST /api/codes/search` 的 JSON body（code 字段），避免把原始码放入网址或访问日志。

## 登录来源 IP

Better Auth 只采用 Cloudflare 覆写的 `cf-connecting-ip` 计算登录限流，不使用客户端可提交的 `x-forwarded-for`。生产环境须经过 Cloudflare Workers 入口；若自行改用其他反向代理，应根据实际可信的请求头调整，不可直接信任任意转发请求头。纯本地且没有来源请求头的请求会使用本地／共用的限流桶，这不代表生产环境应停用限流。参考 [Better Auth 设置](https://better-auth.com/docs/reference/options)。

Keydrop 自己的限流与上限（领码、发码、购买、许可证验证）会把来源 IP 换成网段再计算：IPv4 用完整地址，IPv6 截成 /64（与 Better Auth 默认的 `ipv6Subnet: 64` 一致），避免一个 IPv6 用户更换地址绕过限制。数据库只保存 HMAC，不保存明文 IP。

匿名领取与未验证邮箱的账号都受活动“每人上限”在每个网段内的限制（账号可以无限注册，未验证邮箱不能当作独立的人）；已验证邮箱的账号只看账号本身的上限。API／MCP 的 `codes.issue` 由受信任的后端代为发放、没有来源 IP，不适用网段上限。


## 本地开发缓存

next.config.ts 将 `experimental.turbopackFileSystemCacheForDev` 设为 false，避免开发服务器持续重载并重置表单输入。正式 build 的磁盘缓存保持默认。

开发服务器也允许 `127.0.0.1` 来源，供独立 Cookie 的本地测试使用；`APP_URL` 应同步设为实际使用的 origin。`allowedDevOrigins` 只加入此本地 hostname，没有开放任意来源。正式的 Origin 验证不受影响。
