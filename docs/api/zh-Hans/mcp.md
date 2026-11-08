# MCP 集成

直接指派提供 `assign_code`（codes:issue 及 MCP 写入开关）与 `list_code_assignments`（codes:read）；均限制商品范围。详见[直接指派协议](assignments.md)。历史记录包含收件 Email 与内部备注，应保密。

端点：`https://<部署域名>/mcp`。使用官方 MCP TypeScript SDK 的无状态 Streamable HTTP，POST 返回 JSON；不提供常驻的 GET SSE。每次请求都会重新验证令牌，因此不会沿用已撤销的 session 授权。

## 设置

1. 管理员在 `/dashboard/tokens` 创建令牌，选择商品及所需权限。
2. 客户端配置 MCP URL 与 HTTP 头 `Authorization: Bearer <token>`。
3. 默认仅有只读工具。若确实需要代理写入，创建令牌时同时勾选对应的写入 scope 与“Allow these write permissions through MCP”。只勾选其中一个不会授予 MCP 写入能力。

MCP 写入默认关闭（`mcpWriteEnabled=false`），令牌的权限不能修改。要更改权限，请创建新的令牌并撤销旧令牌。API 令牌本身不能创建或修改令牌。

目前适用于手动配置 Bearer 头的客户端，不提供 OAuth 登录或动态客户端注册；只支持 OAuth 的连接器不适用。密钥应放在客户端的安全设置或环境变量中，不要写进共享的项目文件。

## 工具

| 工具 | scope | 用途 |
|---|---|---|
| `read_product` | `products:read` | 单个商品的设置 |
| `list_batches` | `codes:read` | 商品批次 |
| `list_codes` | `codes:read` | 码的数据摘要，不含机密 |
| `list_campaigns` | `campaigns:read` | 活动设置与条件 |
| `change_code_status` | `codes:write` ＋ MCP 写入开关 | 撤销或恢复码 |
| `change_campaign_status` | `campaigns:write` ＋ MCP 写入开关 | 按当前版本变更活动状态 |
| `issue_code` | `codes:issue` ＋ MCP 写入开关 | 按活动条件为已注册用户领码 |
| `read_credits` | `credits:read` | 额度余额、每页 50 条的交易与来源状态 |
| `read_entitlements` | `entitlements:read` | 限时会员或永久权益 |
| `manage_credits` | `credits:write` ＋ MCP 写入开关 | 发放、扣除、退回、撤销额度 |
| `redeem_code` | `codes:redeem` ＋ MCP 写入开关 | 为指定用户兑换码 |

工具参数及业务规则与 [API 令牌文档](authentication.md) 相同。工具列表只包含该令牌已授权的操作；每次调用仍会检查商品范围，不依赖隐藏工具或提示文本作为授权。

`userId` 必须是产品后端已确认的稳定用户标识。发码与权益写入需要稳定的幂等键，重试时不可生成新键。活动状态操作使用 expectedVersion，版本冲突时必须重新读取再决定；它不标记为幂等操作。工具 annotations 标记只读／写入与幂等性，仅供客户端显示，真正的授权由服务器执行。

每个令牌与 REST API 共享每分钟 30 次的上限，包括协议初始化及工具发现。工具业务错误以 `isError: true` 返回公开代码，不返回 SQL 或内部异常。无效令牌返回 HTTP 401；商品不符时在工具结果中返回 `API_SCOPE_DENIED`。

带有 Origin 的请求必须与 APP_URL 同源，Host 必须与部署网址一致。一般的原生 MCP 客户端没有 Origin，可以直接连接。请求上限 1 MiB，所有响应都不缓存。

## 兼容性

服务器遵循 MCP Streamable HTTP transport，可配合官方 SDK 客户端使用；依赖你自己的客户端前请先自行检查。只接受 `POST`：`GET` 与 `DELETE` 会先验证身份，再返回 405 及 `Allow: POST`；`Host` 与 `APP_URL` 不符的请求返回 403 `INVALID_HOST`。商品／活动的新增与编辑、产码／导入／补货、设备管理、直接指派及 Stripe 折扣工具的规格见以下各节。

实现参考：[官方 SDK 的 Web Standard transport](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/packages/server/src/server/streamableHttp.examples.ts)。

## 新增管理工具

`create_product`、`update_product`、`archive_product` 需要 products:write；创建商品还要求全部商品权限，限定商品的令牌不会显示创建工具。`restock_batch` 需要 codes:write，使用稳定的 UUID 幂等键并以相同内容重试。所有这些工具均需 MCP 写入开关。字段规格同 authentication.md 中的商品与补货管理。

`create_campaign`、`update_campaign` 需要 campaigns:write 及 MCP 写入开关；`read_campaign` 需要 campaigns:read。创建后为草稿，使用 change_campaign_status 启用。修改需要 expectedVersion，商品与批次固定不变；遇到版本冲突时先重新读取再决定。条件 JSON 格式见 [活动条件](conditions.md)，不得引用令牌未授权商品的购买记录。

私密链接工具：create_claim_link、list_claim_links、revoke_claim_link。活动凭证工具：save_campaign_credential、list_campaign_credentials、revoke_campaign_credential。读取需要 campaigns:read，其他需要 campaigns:write 及 MCP 写入开关；字段同 REST 文档。创建链接会返回机密 token，写入凭证会接收机密内容；仅对受信任的代理启用，避免将机密粘贴到公开对话或日志中。

`create_code_batch` 导入实际的码列表；`generate_code_batch` 按规则安全地生成码。两者都需要 codes:write 及 MCP 写入开关，并要求 UUID idempotencyKey，重试时沿用相同的键和内容。响应只含批次 id/count，不暴露码；字段见 REST 批次创建文档。

销售工具 configure_sales_batch 需要 products:write；权益工具 configure_reward、read_reward 分别需要 rewards:write、rewards:read。写入需要额外的 MCP 开关，修改权益需要 expectedVersion。可设置额度、限时会员、永久权益或外部发放；外部发放结果不明时由管理员核对，不能直接重新发送。详细字段见 REST 文档。

## 激活设备工具

`list_license_devices` 与 `release_license_device` 对应 licenses.read／licenses.release，均要求 licenses:manage 与商品授权。默认只显示查询工具；解除工具另需 mcpWriteEnabled。查询每页 50 条，不返回激活凭证或设备指纹。设备可能会重新激活，解除工具不声明为幂等；结果未知时请先重新查询。

`activate_license_device` 另提供由产品后端／授权代理委托的激活，要求 licenses:manage、商品范围及 mcpWriteEnabled。共享码会检查指定 userId 的持有关系，不接受仅知道码的陌生账号。响应包含 activationToken，应视为机密，不放入公开日志。

Stripe 折扣工具：`read_stripe_discounts`／`manage_stripe_discounts` 仅对全商品令牌提供，分别需要 `discounts:read`／`discounts:write`；后者仍需额外的 MCP 写入授权。输入包在 `request` 中，详见 [Stripe 折扣](stripe-discounts.md)。导入另需 `codes:write`，解密后的快照可能包含码及客户标识，应保密。

`configure_sales_batch` 另支持可选的 `allowPromotionCodes` 与 `stripeProductId`；省略则保留原值，Product ID 传 null 则清除关联。
