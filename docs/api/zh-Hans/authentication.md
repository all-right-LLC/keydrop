# API 令牌与产品集成

此接口供部署者的服务器使用。令牌不可放在公开网页、移动 App 安装包或客户端代码中。

## 创建及撤销

管理员登录后可在 `/dashboard/tokens` 创建及撤销令牌。界面默认只读、需选择商品；密钥只显示一次，关闭后无法恢复。也可用 `/api/tokens`：GET 列表、POST 创建、DELETE `{ "id": "令牌 UUID" }` 撤销。修改请求需同站 Origin。普通 API 令牌不能管理或创建其他令牌。

创建内容：`name`、`scopes`、`productIds`、可选 `expiresAt`（Unix 毫秒或 null）及 `mcpWriteEnabled`（默认 false）。商品范围不能省略：指定非空 UUID 数组；只有明确设置为 null 才授权全部商品，包括未来新增的商品。有效期限必须在未来。

创建响应中的 `token` 只显示一次，格式为 `kd_` 加上随机密钥。数据库只保存 SHA-256 指纹。列表不包含原始令牌或指纹。请妥善保存在部署者的密钥管理服务中；丢失则撤销后重新创建。

## 调用

`POST /api/v1/operations`，请求头为 `Authorization: Bearer <token>` 与 `Content-Type: application/json`。服务器集成不需要浏览器 session。每个有效令牌每分钟最多 30 次请求，超过返回 429 `RATE_LIMITED`。该限制写在代码中（`apps/web/src/lib/server/claim-identity.ts`），上限为 30，如需提高须修改这段代码。

商品操作按各节规格提供 `productId`（可能位于 product、batch 或 campaign 中）；创建商品与全账户 Stripe 折扣操作不使用顶层 productId。涉及顾客权益或发码时另需提供 `userId`。`userId` 由受信任的部署者服务器指定，是该产品中稳定的用户标识；若要访问 Keydrop 页面创建的权益，必须使用同一个 Keydrop 用户 ID。不得直接信任未经验证的客户端传入的 ID。

| action | 所需 scope | 其他字段 |
|---|---|---|
| `products.read` | `products:read` | 无，返回单个商品设置 |
| `batches.read` | `codes:read` | 无，列出商品批次 |
| `codes.read` | `codes:read` | 可选 `batchId`、`status`、`page`；每页 50 条 |
| `codes.update` | `codes:write` | `ids`（最多 1,000 个 UUID）、`change`（revoke／restore） |
| `campaigns.read` | `campaigns:read` | 可选 `page`；每页 20 条 |
| `campaigns.status` | `campaigns:write` | `campaignId`、`expectedVersion`、`status` |
| `codes.issue` | `codes:issue` | `userId`、`campaignId`、UUID `idempotencyKey`；可选领取条件输入 |
| `credits.read` | `credits:read` | `bucket`、可选 `page` |
| `credits.write` | `credits:write` | `bucket`、`operation` |
| `entitlements.read` | `entitlements:read` | `plan` |
| `codes.redeem` | `codes:redeem` | `code`、UUID `idempotencyKey` |

`credits.read` 查询不存在的钱包时返回 `wallet: null` 和空明细，不会创建钱包。钱包存在时包含余额、每页 50 条的交易记录及可追溯的来源状态。

`credits.write` 的 `operation` 包含：

- `kind`：grant／spend／refund／revoke。
- `amount`：grant／spend／refund 为正整数；revoke 必须为 0。
- `idempotencyKey`：1–128 个字符，同一钱包同一个键只执行一次；同一个键改变内容会被拒绝。
- `relatedId`：grant 是唯一的发放来源；refund 是原扣除交易 ID；revoke 是来源 grant ID；spend 必须为 null 或省略。

`credits:write` 包含发放及撤销权限，仅交给受信任的产品后端。操作不接受任意 walletId，钱包由通过授权的商品、用户及 bucket 共同定位，防止跨商品操作。

`codes.redeem` 沿用码的使用限制、已指派持有人、奖励设置及原子事务。内置兑换只接受 redemption 类型，不能将外部平台码当作已兑换。

错误返回 `{"error": "<CODE>"}` 及以下状态码。响应均不缓存。

| 状态码 | 含义 |
|---|---|
| 400 | 输入格式不符（`INVALID_INPUT`） |
| 401 | 令牌无效／已过期／已撤销 |
| 403 | 缺少操作或商品授权 |
| 404 | 找不到商品、活动或用户（`PRODUCT_NOT_FOUND`、`CAMPAIGN_NOT_FOUND`、`CLAIM_USER_NOT_FOUND` 等） |
| 409 | 业务冲突，例如余额不足或幂等键重用 |
| 413 | 请求体超过 1 MiB（`REQUEST_TOO_LARGE`） |
| 415 | `Content-Type` 不是 `application/json` |
| 429 | 此令牌请求过多（`RATE_LIMITED`） |
| 503 | 缺少必要设置，例如 `CODE_ENCRYPTION_KEY`（`ENCRYPTION_NOT_CONFIGURED`）、Stripe（`STRIPE_NOT_CONFIGURED`）或资格验证端点（`QUALIFICATION_UNAVAILABLE`） |

## 当前边界

上表列出基本读取、发码及权益操作，并非完整列表。`codes.assign` 与 `assignments.read` 见[直接指派](assignments.md)，`discounts.read`／`discounts.write` 见[Stripe 折扣](stripe-discounts.md)。商品管理、批次创建／补货、活动编辑、凭证／链接、销售／权益设置及设备管理详见以下各节。另有[直接指派](assignments.md)与[Stripe 折扣](stripe-discounts.md)，以上全部也可通过 [MCP](mcp.md) 使用。

## 库存与活动发码

`codes.read` 只返回码 ID、批次、状态、限制及使用次数，不返回原始码、密文或指纹。`codes.update` 仅影响 productId 内的码；撤销可能联动回收已设置的权益，恢复码不会自动恢复已回收的权益。

`campaigns.status` 接受 draft／active／paused／archived，必须带上当前版本。版本过时返回 409，重新读取后由调用方决定是否重试，不能盲目覆盖。

`codes.issue` 用于受信任的后端代表已注册的 Keydrop 用户领取活动码。userId 必须存在，Email 及验证状态只从账号数据库读取。所有活动资格、开放时间、私密链接、每人上限、总量及库存限制仍然有效，这不是绕过条件的管理员指派。

可选领取参数包括 `linkToken`、`answers`、`passphrases`、`invitations` 与 `recoveryOnly`，语义和公开活动领取相同。相同用户、活动及幂等键返回同一领取结果；响应含原始码，仅在确实需要发码时授予 codes:issue，并避免记录响应内容。

未知／其他商品的活动返回 CAMPAIGN_NOT_FOUND；未知用户返回 CLAIM_USER_NOT_FOUND；资格未满足或库存／上限问题返回 409。外部资格服务不可用返回 503。购买记录条件查询 Keydrop 已确认付款且尚未全额退款的订单；正式收款须由部署者自行配置 Stripe 并验证。

## 商品与补货管理

- `products.create`：`products:write` 且 `productIds: null`。输入 `product` 含 name、slug、description、currency、priceMinor、shortagePolicy、revokeOnRefund，默认值与后台相同。创建不是幂等操作；slug 唯一，结果未知时先核对，不要更换 slug 盲目重建。
- `products.update`：`products:write`，输入 productId、完整的 product 设置；未提供的字段采用默认值，并非局部 PATCH。
- `products.archive`：`products:write`，输入 productId、archived 布尔值，可恢复。
- `batches.restock`：`codes:write`，输入 productId、batchId、idempotencyKey（UUID）、codes（1–1,000 个）、可选 expiresAt、maxUses、maxDevices。批次必须属于已授权商品。原样重试返回同一回执，不返回原始码；同一个键不同内容会被拒绝。可先在调用端生成安全的随机码；此操作只接受实际的码列表。
- REST 与 MCP 请求体上限为 1 MiB；超限需分批，每批使用独立的幂等键。大量特殊字符经 JSON 编码后仍可能触及请求体上限。

## 活动创建与修改

| action | 权限 | 输入 |
| --- | --- | --- |
| campaigns.create | campaigns:write | campaign 完整设置；创建为 draft |
| campaigns.update | campaigns:write | campaignId、expectedVersion、campaign 完整设置 |
| campaigns.get | campaigns:read | productId、campaignId |

campaign 包含 productId、batchId、name、slug、conditions；可选 description、visibility（public/private）、authMode（anonymous/email/account）、startsAt/endsAt（毫秒或 null）、totalLimit（或 null）、perPersonLimit。省略的字段采用默认值，修改并非局部 PATCH。创建时 slug 必须唯一，结果未知时应查询现有活动，不要改 slug 重建。

修改必须使用最新 version，且 productId、batchId 不可变动；版本过期或来源改动返回 CAMPAIGN_CONFLICT。跨商品查询不返回活动数据。条件中的 purchase.productId 也须在令牌的商品范围内。条件规格见 [活动条件](conditions.md)。

## 私密链接与活动凭证

所有操作都需要 productId、campaignId；活动必须属于已授权商品。

| action | 权限 | 额外输入／输出 |
| --- | --- | --- |
| links.create | campaigns:write | link：expiresAt（毫秒或 null）、maxClaims（默认 1，null 不限制）；返回 id、仅可见一次的 token、相对 path |
| links.read | campaigns:read | 返回链接 ID、期限、领取上限／次数、撤销时间；无 token 或 hash |
| links.revoke | campaigns:write | linkId；阻止后续领取，不收回已交付的码 |
| credentials.save | campaigns:write | credential：id、kind（passphrase/invitation）、secret（8–128 个字符）；创建或轮换，并解除该凭证的撤销状态 |
| credentials.read | campaigns:read | 返回凭证 id、kind、revoked_at；无密钥或哈希 |
| credentials.revoke | campaigns:write | credential：id、kind；撤销凭证 |

links.create 不是幂等操作，每次成功都会生成新链接；请保存成功的响应，不要盲目重试。path 中的 token 放在 URL fragment 中，拼接时加上部署者自己的 origin；不要移到 query，也不要写入日志。列表无法恢复密钥，若创建响应丢失，先查询列表并撤销不确定的链接，再重新创建。

credentials.save／revoke 会更新活动版本；之后编辑活动须重新读取 version。密钥以密码哈希存储，写入响应仅含标识数据。这些凭证是活动口令／邀请资格，不是管理员登录凭证。

## 批次创建与生成码

`batches.create` 与 `batches.generate` 均需要 codes:write、已授权的商品范围、idempotencyKey（UUID）及 batch。

- create 的 batch：productId、name、kind（redemption/discount/license/external）、source（manual/import）、codes（1–1,000 个实际的码）。
- generate 的 batch：productId、name、kind（redemption/discount/license）、rules。不能自行生成外部平台的有效码。
- 两者都可设置 expiresAt、maxUses、maxDevices；默认无期限、兑换一次、一台设备。
- rules：count（1–1,000）、prefix（最多 32 个字符，字母数字及 `_`、`-`）、length（12–64）、alphabet（2–64 个不重复的字母数字字符）、groupSize（0–16，0 表示不分段）。默认长度 20、每 5 位分段、排除易混淆字符。字符空间至少 60 bits。

响应只有批次 id 与原始 count，不包含原始码。原码加密保存，需要交付或管理员导出时才解密。相同商品与 idempotencyKey 以相同有效设置重试会返回原回执；变更内容返回 BATCH_IDEMPOTENCY_CONFLICT。即使之后补货，count 仍是首次创建的数量。不同操作（create/generate）不可共用同一个键。

管理员后台 POST /api/batches 也要求 idempotencyKey，其扁平 payload 会转换成上述共用的批次操作。规范化后的默认值一致时，后台与 REST／MCP 可以得到同一回执。后台表单只在当前打开的表单内存中保留请求键；结果未知后若已关闭或刷新页面，先查询批次列表再决定是否重新创建。

## 销售与权益设置

- `sales.configure` 需要 products:write，输入 productId、batchId（同商品的批次 UUID，或 null 停用销售），以及可选的 allowPromotionCodes（Checkout 是否接受 Stripe 促销码）与 stripeProductId（`prod_…`，或 null 解除与 Stripe 商品的关联）。不会更改价格；价格由 products.update 设置，付款另需部署者完成 Stripe 配置。
- `rewards.configure` 需要 rewards:write，输入 productId、batchId、可选 campaignId（默认 null）、expectedVersion 与 reward。expectedVersion=0 表示创建规则，之后使用读取到的版本；冲突时须重新读取，不可盲目覆盖。
- `rewards.read` 需要 rewards:read，输入 productId、batchId、可选 campaignId。返回 `{rule:null}` 或 id/version/reward；指定活动时只读取该活动的覆盖设置，不会自动回退到批次默认值。

reward 支持：

- `{kind:"credits",bucket:"requests",amount:100}`
- `{kind:"membership",plan:"pro",days:30}`
- `{kind:"permanent",plan:"pro"}`
- `{kind:"external",integrationId:"partner",payload:{plan:"pro"}}`；接收端协议与未知结果处理见[外部权益](external-rewards.md)。

均可加上 repeat（add/replace/reject，默认 add）、reclaimOnRevoke（默认 true）。只有 redemption 批次能设置内置兑换权益；活动覆盖设置必须属于相同的商品与批次。修改规则仅影响未来的兑换，已兑换的权益保留当时的快照。撤销回收仍按原快照与可追溯的消耗处理。

## 激活设备管理

`licenses:manage` 可对令牌授权的商品查询、解绑及委托激活设备；查询不返回激活 token、设备指纹或原始码，委托激活时才返回 activationToken。

- `licenses.read`：productId、可选 codeId、page（默认 1）。返回 devices、page、hasMore；每页最多 50 条，包含已解绑的设备。
- `licenses.release`：productId、activationId。在单条 SQL 内比对设备所属商品后解绑，返回 released、activationId、releasedAt。已解绑且未重新激活时，重试保留原时间；不撤销原码或其他设备。

设备重新激活会沿用 activationId。解绑结果未知时，先查询当前状态再决定是否重试，避免解绑用户之后重新激活的设备。此操作属于管理权限，不要求持有人账号；用户自助解绑仍使用账号所有权验证。

## 共用码活动分发

batches.create／batches.generate 及后台新建批次支持：

- distributionMode：unique（默认，一个码只分配一次）或 shared（多人可领取同一个码）。
- sharedClaimLimit：每个码跨活动、订单的分发上限（包括有效的 Checkout 预留），null 表示不设每码上限；活动、每人及私密链接的上限仍然生效。

分发模式及每码名额在批次创建后固定，补货继承批次设置。领取不消耗 maxUses；maxUses 仍是内置兑换次数，两者应按用途分别设置。shared 模式下的 assigned 只表示曾经分配过，不代表不能再分发；撤销、过期、活动限制及每码名额才会阻止后续领取。

共用 redemption 码的活动权益覆盖设置只查询本人的领取记录；同一个人从多个活动取得同一个码时，使用最早具有覆盖规则的本人活动（时间相同时按 claim ID 固定排序）。每人对同一个码仍只能兑换一次。匿名领取无法建立账号与领取之间可验证的关系，共用码匿名兑换采用批次默认权益；需要活动专属权益时请要求登录账号。

四种共用批次都可用于活动与 Checkout 销售；共用 license 活动要求登录。shared license 已支持具名持有者与每人的设备隔离，见 licenses.md。管理员直接撤销共用码会影响所有持有人。

共用 Checkout 预留一个名额，不锁定整个码。预留超时后名额可供其他人使用；迟到的付款会重新检查名额，按原订单的退款／人工／补货策略处理。已交付码的名额不会因退款重新开放，避免把已泄露的码当成未分发。

共用订单全额退款时，若开启了 revokeOnRefund，只撤销该笔订单的访问权，不撤销共用码。内置兑换记录 source_order_id，按该来源回收设置允许回收的未消耗权益，其他买家不受影响。部分退款、共享外部码与需人工处理的退款会被标记为待审查；外部平台无法因本地撤销而收回已公开的码。关闭 revokeOnRefund 时保留原有持有权。

退款后，订单页／我的码不再展示已撤销持有权的码，发送邮件时也会重新验证资格；已看过的共用密钥无法从用户记忆中移除。具名免费领取与有效购买都可作为持有依据；若同时存在免费领取，则不把该权益归属于付费订单。

licenses.activate 接受 productId、userId、code、deviceId、可选 label。userId 必须由受信任的产品后端验证后委托；共用码仍会检查实际持有关系。详细流程与凭证处理见 licenses.md。
