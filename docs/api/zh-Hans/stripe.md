# Stripe 支付集成

目前已具备 Checkout、Webhook、购买／订单页、商品销售设置、库存定时任务及退款后的访问权限审查。支持折扣付款、Webhook 发码、零元折扣交付、部分退款时人工决定是否保留访问权限，以及全额退款自动撤销。正式收款前请先在 Stripe 测试模式验证。

## 设置

每次部署只连接一个 Stripe 账户。将 `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET` 设为 Worker secrets，不能写进仓库、浏览器或公开环境变量。免费领取与兑换不需要配置 Stripe。

Webhook URL 为 `https://<域名>/api/stripe/webhook`，至少订阅：

- checkout.session.completed
- checkout.session.async_payment_succeeded
- checkout.session.async_payment_failed
- checkout.session.expired
- charge.refunded
- refund.created、refund.updated、refund.failed

使用与 SDK 兼容的 Stripe API 版本，先以测试模式测试，再配置正式模式凭证。不要混用测试／正式的签名密钥。

Keydrop 创建一般 Checkout 时明确传入 `managed_payments.enabled=false` 与 `automatic_tax.enabled=false`，避免账户默认的 Managed Payments 改变卖方身份、商品税务类别要求及现有的金额核对规则；不修改 Stripe 账户的全局设置。目前未实现 Managed Payments／税额结算，不能直接开启后沿用此履约流程。已有订单保留原本的 Checkout 请求快照，更新程序不会改写已发送的幂等参数。

## 销售及领取

管理员通过 `PUT /api/products/<id>/sales` 指定 `{ "batchId": "批次 UUID" }`；传 null 则停止销售。批次必须属于同一商品。未指定销售批次的商品不会因为有价格就自动开放购买。

`POST /api/checkout` 接受 `productId`、UUID `idempotencyKey`。需要同站 Origin，身份由登录 session 或签名浏览器 cookie 取得。匿名首次请求返回 428 并创建 cookie，应使用相同的幂等键重试；不能改用新键重复预留。

商品价格、货币、数量一及回跳网址全部由服务器生成，不接受前端传入金额。订单先预留 35 分钟，Checkout 在预留结束前一分钟到期。Checkout 创建后，预留延长到 Session 到期后再加 3 天（涵盖 Stripe Webhook 重试），避免最后一分钟付款或 Webhook 迟到时码被提前释放；放弃付款的订单在收到 `checkout.session.expired` 时立即释放。异步付款（Session 已完成但尚未到账）最长保留 14 天，收到 `checkout.session.async_payment_failed` 时释放。

同一买家同时最多 2 笔、同一网段（IPv4 地址或 IPv6 /64）最多 5 笔在 35 分钟内创建的未付款订单，超过时返回 429 `ORDER_PENDING_LIMIT`，避免匿名请求把整批库存锁住。创建参数保存快照并使用固定的 Stripe 幂等键，商品后续改名不影响重试。

每个商品仅使用其设置的单一货币，Checkout 明确传入 `adaptive_pricing.enabled=false`，避免账户默认的自动换汇导致实收货币与订单核对规则不一致。目前不支持同一订单的换汇结算。

Checkout 返回 `orderId` 与 Stripe `url`；已关闭的 session 返回 null URL。成功及取消都返回 `/orders/<id>`。该页每三秒查询一次订单，最多自动刷新一分钟，另提供手动刷新及继续付款。不能把返回成功页当作付款成功的证明。

`GET /api/orders/<id>` 仅允许订单买家的 session／原签名浏览器访问。匿名购买后即使登录，也可通过原 cookie 查看；它不会仅凭相同 Email 自动变成某个账号的订单。

## 付款及退款

Webhook 对原始内容使用官方 SDK Web Crypto 验签，最大 256 KiB。事件 ID 去重，处理中有五分钟租约及独立的租约标识；处理失败会释放租约供 Stripe 重试，并发请求不会直接被当作已完成。

收到通知后重新向 Stripe 取得 Checkout 与 PaymentIntent，核对订单标识、session、价格、货币、付款成功状态及实收金额。延迟付款先保持未付款，收到成功通知后才发码。

退款金额只累加状态为 succeeded 的退款；pending／failed 不视为完成。缺货且设置为自动退款时，用固定幂等键申请剩余款项的退款。退款失败或取消时标记人工检查，等待管理员处理。全额退款成功后，按商品快照决定是否撤销可控的码；外部平台的码只标记退款。

若退款通知先于付款通知到达，同样重新读取 Stripe 最新状态，已全额退款的订单不发码。较旧的通知不能降低本地已确认的退款金额。

金额使用整数转换，支持一般的零位／两位及三位小数货币，并处理 ISK／UGX 的兼容单位。无法精确表达的金额直接拒绝，不静默四舍五入。个别货币及最低金额能否收款仍由部署者的 Stripe 账户决定。

## 订单管理与账号绑定

可用：购买页、订单页、销售批次设置、已购码与设备记录，以及 `/dashboard/orders` 的分页／筛选、Stripe 核对和人工补发。

匿名订单可在原浏览器登录后，在订单页点击“Link to my account”绑定。`POST /api/orders/<id>/link` 同时验证登录 session 与原购买浏览器证明，只接受已付款且不属于其他账号的订单。绑定后需该账号才能查看，原 cookie 不再单独授权；不会仅凭相同 Email 认领订单。绑定后才能将匿名购买的内置权益兑换到账号。

缺货的三种策略分别为：自动全额退款、补货后由管理员手动交付，以及补货后由 Cloudflare 定时任务自动交付原订单。超时未付款的订单由定时任务清理。延迟付款方式及外部平台的撤销能力请按实际配置验证。

可选的 Email 交付及 Stripe Coupon／Promotion Code 双向同步，参见[邮件文档](email.md)与[折扣文档](stripe-discounts.md)。

官方依据：[Stripe Node SDK](https://github.com/stripe/stripe-node)、[付款履约](https://docs.stripe.com/checkout/fulfillment)、[货币与金额单位](https://docs.stripe.com/currencies)。

## Checkout 促销码与实付金额

商品销售设置可开启 `allowPromotionCodes`（默认关闭），传给 Stripe Checkout 的 `allow_promotion_codes`。该开关连同其他创建参数保存在该订单的 Checkout 请求中；后续修改商品只影响新的 Checkout。

订单 `amount_minor` 保留原价；`charged_minor` 保存经 Stripe 核对的实付金额，结算后不可改写。付款核对原价小计、折扣额、总额、币种、Session／订单归属；目前不启用税费或运费，遇到非零的税费／运费时拒绝自动结算。正金额订单仍须核对 PaymentIntent 的成功状态、订单 metadata 与实收金额。退款以实付金额作为全额退款门槛，不能退超过实付的金额。

100% 折扣须取得状态为 `complete`、`paid` 或 `no_payment_required`、总额为零且没有 PaymentIntent 的 Session 才交付，并核对原始小计及全额折扣。Stripe 真实沙盒的零元完成订单可能返回 `paid`。根据 [Stripe 零元订单指引](https://docs.stripe.com/payments/checkout/no-cost-orders?ui=full-page)，此类订单以 Checkout 完成事件处理，不能依赖 PaymentIntent。零元不等于退款；若缺货策略是退款，则转为人工处理，因为没有付款可退；人工／补货策略照常处理。

消费者订单响应中的 `amountMinor` 显示实付金额（未结算时显示原价），另有 `listAmountMinor` 保存原价。退款事件也包含这两种金额。商品销售设置的 PUT 可传 `{batchId,allowPromotionCodes}`；省略开关时保留原设置。

Checkout 默认使用内嵌的商品数据；可在销售设置中填入同一 Stripe 账户／模式下有效的 Product ID，以使用限定该商品的 Coupon。Keydrop 仍使用自己的价格快照，Stripe 商品不决定金额。创建 Checkout 前会确认来源商品仍有效；商品关联同样固定在请求快照中，重试不会跟随后续的设置变动。适用性、客户资格与兑换次数由 Stripe 判断。请先在 Stripe 测试模式验证。

销售设置的 PUT 另接受 `stripeProductId`（`prod_` ID 或 null）；省略则保留原设置，null 则清除。保存时验证格式，结账时使用同一 Stripe client 读取商品；不存在、已删除、已停用、账户不符或无权限时拒绝创建 Checkout，返回 503 `STRIPE_PRODUCT_UNAVAILABLE`。关联不会在 Stripe 创建或修改商品。


## 部分退款与人工访问权限审查

已交付的订单收到部分成功退款后，订单后台显示 Review refund access。管理员填写至少 10 字的核对备注，再确认以下决定：

- Keep access：保留当前访问权限，只解决这笔累计退款金额的待审标记；后续退款仍按原商品快照处理。
- Revoke access：撤销该订单的访问权限。独立码会撤销码本身，共享码不影响其他持有人；对应的兑换按原 reclaimOnRevoke 规则回收，已消耗部分仍需核对。外部权益只创建原发放的撤销任务，不保证接收端已回收。
- Acknowledge review：外部平台码或已撤销的订单只允许确认审查。对 App Store 等外部码需先自行核对平台状态；此操作不会使外部码失效，也不会恢复已撤销的访问权限。

审查不会创建、取消或修改 Stripe 退款；未交付、退款失败或仍在等待退款的订单不提供上述访问权限决策，需先处理资金／履约问题。后台显示当前撤销状态与最新一次审查的管理员、时间、核对金额及备注；完整历史保存在 order_refund_reviews。

POST /api/admin/orders/{id} 接受 action=review-refund、refundedMinor（页面加载时的累计成功退款整数）、decision（retain／revoke／acknowledge）、note（10–2000 字）及 UUID idempotencyKey。只允许管理员 session 与同站 Origin，管理员身份由 session 取得。

数据库在同一事务中验证退款金额、待审状态、交付与码状态，写入记录并应用决定；若权益回收失败则全部回滚。同一订单与退款金额只允许一个决定，相同的幂等请求返回原回执；相同的键更换内容、金额过期或决定已被处理时返回 409。新的成功退款金额会重新触发原退款规则，重放旧回执不能清除新的待审标记。

自动化测试涵盖共享码／设备隔离、内置额度回收、外部撤销调度、相反决定的竞争、下游失败回滚以及部分退款后的全额自动撤销。其他回收情境请按部署配置验证。
