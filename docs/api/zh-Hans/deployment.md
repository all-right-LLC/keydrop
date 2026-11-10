# 部署与备份

本文档配合 [Web 启动说明](../../../apps/web/README.md)，说明如何把 Keydrop 部署到你自己的 Cloudflare 账户，以及相关设置、D1 备份、还原演练与定时任务。正式上线前，请在自己的环境中验证你依赖的流程。

## 部署配置

`apps/web` 是独立应用，包含 package.json、锁定文件、SQL 迁移、Wrangler 配置与必要的密钥名称模板。部署按钮的来源网址应指向公开仓库的 `tree/main/apps/web`；按钮创建的仓库以该子目录为根，不包含外层文档。

| 设置 | 用途 |
| --- | --- |
| APP_URL | 正式 HTTPS origin，不含末尾斜杠；用于登录、同站检查与邮件入口 |
| ADMIN_EMAIL | 初始化时创建的唯一管理员邮箱 |
| BETTER_AUTH_SECRET | 用于登录、令牌及持有人索引，至少 32 个字符；需长期保管 |
| SETUP_SECRET | 一次性初始化凭证，至少 32 个字符；初始化成功后不能再创建第二位管理员 |
| CODE_ENCRYPTION_KEY | 64 个十六进制字符，保护码与收件地址；需长期保管 |
| DB | D1 绑定名称；可以更改数据库名称，但不可移除此绑定 |

可选设置用于开启额外功能。需要时以 Worker 密钥（或绑定）的形式添加：

| 设置 | 类型 | 用途 |
| --- | --- | --- |
| STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET | secret | 通过 Stripe Checkout 付费销售；见 [Stripe 订单](stripe.md) |
| STRIPE_SYNC_BATCH_SIZE | var | 每次同步处理的 Stripe 折扣对象数量；见 [Stripe 折扣同步](stripe-discounts.md) |
| EMAIL binding + EMAIL_FROM | binding / var | Cloudflare Email Sending，用于登录验证码、码邮件与管理员提醒；见 [Email 发送](email.md) |
| WEBHOOK_SECRETS | secret | 外发 Webhook 的签名密钥；见 [事件 Webhook](webhooks.md) |
| ELIGIBILITY_SECRETS | secret | 资格验证端点的 Bearer 令牌；见 [外部资格验证](eligibility.md) |
| EXTERNAL_REWARD_SECRETS | secret | 外部权益接收端的 HMAC 密钥；见 [外部权益](external-rewards.md) |
| KEYDROP_TELEMETRY | var | 匿名安装统计（只发送一次），默认开启；设为 `off` 即可关闭，见[使用量统计](#使用量统计) |

必要的密钥各自独立生成。不要沿用示例值，也不要随意更换加密密钥及身份索引密钥。配置模板只包含名称，真实值应保存在私人密钥管理工具与 Cloudflare Secrets 中。

`pnpm run deploy` 在构建成功后、发布之前应用远程迁移。迁移指向 `DB`，不依赖部署者选择的数据库名称；已有的迁移不会重复运行。部署脚本会同步 `WORKER_SELF_REFERENCE` 与 Worker name，并重新生成类型。

[Deploy to Cloudflare](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fall-right-LLC%2Fkeydrop%2Ftree%2Fmain%2Fapps%2Fweb) 会创建私有的源码副本、全新的 D1 与 Worker。APP_URL、管理员 Email 及三项独立密钥需由部署者填写，管理员密码在部署后于 `/setup` 页面设置。

## 本地与生产环境隔离

本地 `pnpm run db:migrate` 只操作 `.wrangler` 内的模拟 D1；生产环境的 `pnpm run db:migrate:remote` 操作 Wrangler 指定的远程 DB。不要把生产密钥或生产数据复制到公开的 fixture 中。请使用不同的数据库、Stripe 测试账户设置及发件设置来验证新版本。

`pnpm run preview` 使用 Workers 运行环境；`pnpm dev` 使用 Next.js 开发服务器。即使通过了前者的本地测试，仍需在远程环境另行验证。

## 数据备份

在 Web 根目录运行，输出放在私人目录。导出文件包含账号、Email、订单与加密数据，不得提交到 Git。

```sh
pnpm exec wrangler d1 export DB --remote --output /absolute/private/keydrop-backup.sql
```

另行备份该部署的密钥及外部服务设置；SQL 不包含 Cloudflare Secrets。记录程序版本、迁移版本、备份时间及来源数据库 ID。如果需要一致的业务快照，先停止网站写入、定时任务及外部事件处理，确认没有正在进行的发放或付款操作后再备份。

## 还原演练

整理工具有自己的测试：修改后运行 `pnpm run test:restore`（Python 3）。

不要直接覆盖生产数据库。先创建一个独立的空白 D1，将隔离测试配置中的 DB 指向该数据库。使用 Python 3 的整理工具生成新的导入文件，再导入：

```sh
python3 scripts/prepare-restore.py /absolute/private/keydrop-backup.sql /absolute/private/keydrop-restore.sql
pnpm exec wrangler d1 execute DB --remote --file /absolute/private/keydrop-restore.sql
```

Keydrop 的跨表引用可能指向导出顺序较晚的表，直接导入原始的 Wrangler SQL 会出现“no such table”。整理工具先列出所有 CREATE TABLE，再保留数据插入顺序，最后还原索引、view 与 trigger，避免加载数据时触发发码、付款或账本的副作用。它不执行 SQL、不修改原文件、不覆盖已有输出，遇到不支持的语句会拒绝处理。只使用自己可信的 Wrangler 导出文件。

完整的 SQL 备份已包含结构与迁移记录，不要先对空白目标应用全部迁移再导入。使用原版本程序及对应的密钥，确认管理员登录、原码解密、持有记录、额度账本与设备归属。演练环境保持 Stripe、发信、Webhook 与定时任务停用，避免重放备份中的待办事项而引发外部操作。全部测试通过后，才安排正式切换与外部服务重新接入。

数据库回到旧的时间点，不会使 Stripe 付款或外部权益自动恢复；切换前必须核对备份时间之后的外部事件。Cloudflare Time Travel 的保留期及限制请以该账户的方案为准。

建议先停止来源网站的写入与定时任务，再将最新备份导入全新的空白 D1，并核对数据表行数、schema 对象、迁移记录、码与领取数量。另外运行外键及 SQLite 完整性检查，并用原密钥抽查码与设备凭证能否正确解密。

要演练切换，可将一个隔离的 Worker 暂时绑定到还原库，使用原程序与密钥。不提供任何外部集成的密钥，移除发信绑定并停用定时任务，确保演练不会发信或调用你的服务。这不涵盖备份之后新外部事件的对账；正式切换仍须按前述步骤核对外部状态。

参考：[部署按钮](https://developers.cloudflare.com/workers/platform/deploy-buttons/)、[D1 导入／导出](https://developers.cloudflare.com/d1/best-practices/import-export-data/)、[D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)。

## 定时任务

Worker 每次 Cron 触发时依次执行：Stripe 折扣刷新、外部操作隔离、订单维护（释放过期预留、补货发码）、管理员通知邮件、码邮件入队与发送、Email 分发、匿名码邮件、Webhook 外发、外部撤销。每个任务各自隔离错误：一个任务失败（例如 `EMAIL_FROM` 格式错误或外部服务暂时不可用）只记录任务名称与错误信息，后面的任务照常执行；全部跑完后，这次调度会被标记为失败，方便在 Cloudflare 仪表板的 Cron 事件与 Workers Logs 中看到 `scheduled task <名称> failed`。

## 使用量统计

Keydrop 是开源项目，有多少站点在使用，对项目来说是一枚小小的荣誉勋章。每个安装在完成 `/setup` 时，会发送一次匿名请求到 `https://keydrop.allright.dev/api/telemetry`，项目网站会显示累计数字。

- **会发送**：由你自己的数据库生成的随机实例 ID（不是从域名、账号或数据推算出来的）和 Keydrop 版本号。
- **不会发送**：网站地址、邮箱、码、订单、客户或任何其他业务数据。项目网站不存储 IP 地址。
- **时机**：只有一次，在 `/setup` 成功后。这次发送失败时，定时任务每小时最多补发一次，直到成功为止；成功之后就不再发送。不影响其他定时任务。
- **关闭方式**：在执行初始化之前，到 Workers → 你的 Worker → Settings → Variables and Secrets（或 `wrangler.jsonc`）把 `KEYDROP_TELEMETRY` 设为 `off`（也接受 `0`、`false`、`no`、`disabled`）。

代码在 `apps/web/src/lib/server/telemetry.ts`。
