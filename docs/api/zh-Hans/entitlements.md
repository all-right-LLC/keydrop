# 内置权益与额度账本

商品后台的“Entitlements & credits”提供内置会员、永久许可证及额度的只读查询。可按精确的账号 ID 或 Email 筛选；Email 不区分大小写，API 指定的外部用户 ID 不必对应 Keydrop 账号。

## 后台查询

`/dashboard/products/{productId}/entitlements` 需要管理员登录，仅查询该商品。会员与额度列表每页 25 笔。额度钱包明细包含每页 50 笔交易与独立分页的 25 笔来源；会员来源每页 25 笔。

会员显示的是当前连续覆盖的有效期间，沿用兑换服务的计算规则。撤销较早的发放可能造成当前与未来发放之间的空档，不能仅凭最晚到期日就宣称会员有效。永久许可证、被覆盖的来源，以及撤销兑换但按原设置保留的权益，都会在明细中呈现。

额度交易分开显示请求金额与实际余额变化。来源显示原始发放、可用、已回收、已消耗未退回，以及撤销后退回的数量。已撤销的来源不会因退回交易而恢复可用余额；已消耗而未回收的部分会显示提示，由管理员核对。

此页不提供任意覆写账本的功能；发放、扣除及退回沿用现有的额度操作，码撤销及退款沿用原有的权益回收规则。外部产品的权益不列入内置账本，请参阅[外部权益](external-rewards.md)的核对与撤销流程。

## 管理员查询 API

`GET /api/admin/entitlements` 使用管理员 session，不接受普通用户或 API Key。所有响应（含错误）都设置 `Cache-Control: no-store`。

| 查询 | 参数 |
| --- | --- |
| 额度列表 | `productId`、`view=credits`（默认）、可选 `query`、`page` |
| 会员列表 | `productId`、`view=memberships`、可选 `query`、`page` |
| 额度明细 | `productId`、`view=wallet`、`walletId`、可选 `page`、`sourcesPage` |
| 会员明细 | `productId`、`view=membership`、`userId`、`plan`、可选 `page` |

`query` 是精确的账号 ID 或 Email，最多 254 个字符；不接受通配符搜索。页码从 1 开始。列表与明细返回 `view`、`product`、`page`、`hasMore`；额度明细另有 `sourcesPage`、`sourcesHasMore`。找不到商品、跨商品钱包或不存在的会员方案返回 404；格式错误返回 400，未登录 401，非管理员 403。

响应不包含码明文、加密内容、登录凭证或交易的自定义幂等键。来源 ID、操作 ID、用户 ID 与会员来源的码 ID 供管理员核对；它们仅是标识值，不是可兑换的码。

管理员端点 `GET /api/credits?walletId=…` 与 `credits.read` 操作返回该钱包的交易记录，每页 50 笔，并带 `hasMore`。对外产品集成请使用有商品与操作范围限制的 [API 操作](authentication.md)（也可通过 [MCP](mcp.md) 使用）。
