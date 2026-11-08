# Stripe 折扣同步

Keydrop 可以把你的 Stripe Coupon 与 Promotion Code 读入加密目录、创建新的折扣、将 Promotion Code 导入批次，并把本地码推送到 Stripe。每次写入 Stripe 都会记录为可续做或恢复的操作。用于正式数据前，请先在 Stripe 测试模式验证流程。

## 数据与同步

Coupon 定义折扣，Promotion Code 为可分发的码。目录以 Stripe 账户、测试／正式模式、对象类型及来源 ID 隔离。调用方必须从服务器凭证确认账户与模式，不可信任客户端传入的范围。

快照保存 Stripe 的适用商品、客户／账户、最低金额、多币种、期间、次数及有效状态。金额使用 Stripe 的最小货币单位，转成 Keydrop 金额时需使用现有的货币换算。快照经过加密，AAD 绑定账户、模式、对象 ID 与版本；列表不含原始码、客户详细数据或 metadata。

每次同步先取得递增版本，再向 Stripe 读取。只有仍持有当前版本的响应才能提交，避免较旧的请求覆盖新数据。Stripe 状态是权威来源。失败时保留旧快照，但标记为过时；不能把过时快照用于新的优惠判定。仅官方 SDK 的 resource_missing 404 会转为删除标记，权限或网络失败不能当作删除。

## 创建操作

创建前先保存 UUID、范围、标准化请求哈希及加密正文。相同 UUID 不能更换账户、模式或内容。请求沿用固定的 Stripe 幂等键；Coupon 使用由操作 UUID 派生的固定 ID。成功后永久重放原对象 ID，不再创建。

60 秒租约与 token fencing 防止同时提交或迟到的结果覆盖。在首次尝试后 23 小时内可用同一 ID／正文重试；超过期限转为 review，不再调用创建 API。Stripe 的 API v1 幂等键可能在至少 24 小时后被清除，不能依赖它永久去重。review 可从创建历史核对已有对象并恢复；不可通过换新 UUID 盲目补发。

创建成功与目录同步是不同的步骤：即使后续同步失败，也必须保留已创建的来源 ID，再单独补同步，不能重新创建对象。

## 查证来源

参考：[创建 Coupon](https://docs.stripe.com/api/coupons/create)、[创建 Promotion Code](https://docs.stripe.com/api/promotion_codes/create)、[幂等请求](https://docs.stripe.com/api/idempotent_requests)。

## 管理员入口

`/dashboard/stripe-discounts` 显示连接状态、Stripe 折扣分页及本地目录，支持按来源 ID 同步。此处同步到折扣目录，不会自动变成可分发的码库；管理员可在商品码库页展开 Import a Stripe promotion code，明确导入到当前商品。

`GET /api/admin/stripe-discounts` 需要管理员 session，通过同一 Stripe client 的 `/v1/account` 及 `/v1/balance` 确认账户 ID 与 livemode。只返回 `{accountId,livemode}`，不保存或返回余额及账户个人信息；受限密钥需有账户与余额读取权限。

`POST /api/admin/stripe-discounts` 需要管理员 session、同源 Origin 与 JSON，最大 32 KiB。所有响应均为 no-store：

- `{action:"catalog",kind,page?}`：每页 25 条本地目录。
- `{action:"discover",kind,cursor?}`：每页 25 条 Stripe 来源 ID 与有效状态，不传原始码。
- `{action:"read",kind,sourceId}`：解密读取单条已同步快照，仅管理员可用。
- `{action:"sync",kind,sourceId,expectedScope}`：取得当前 Stripe 快照。
- `{action:"createCoupon",operationId,input,expectedScope}`、`createPromotion`：持久化创建并补同步；创建成功但同步失败时仍返回来源 ID 与 synced=false，重试不会重复创建。

kind 为 coupon／promotion_code。写入操作需传入界面先前显示的 expectedScope，服务器仍以认证取得的范围为准；不匹配时返回 409 STRIPE_CONNECTION_CHANGED，避免更换服务器密钥后误写到另一个账户或正式模式。创建的 input 使用代码中的严格 schema；后台提供 Coupon／Promotion Code 表单，更完整的公开协议仍待完成。

## 创建表单与重试

后台表单可设置百分比／固定金额、多币种、订阅期间、商品限制、到期与次数；Promotion Code 可设置关联 Coupon、客户／账户、首次交易、最低消费及启用状态。金额字段标示为 Stripe 最小单位，日期以浏览器本地时间输入再转为 Unix 秒。

当前标签页的 sessionStorage 只保存标准化请求哈希对应的操作 UUID，不保存原始码、客户 ID 或凭证。同一标签页刷新后，重新输入相同的账户／模式／值可沿用 UUID；更换标签页、清除浏览器数据或使用不同设备不具备这种关联，需保留显示的操作 ID 并核对服务器记录，不能宣称跨设备自动去重。

创建成功后可再次检查同一操作；只有确认成功后才显示“用相同值另开一次创建”，供管理员明确发起另一个操作。结果未知时不显示这个按钮。服务端可按操作 ID 取回原请求重试，或核对已有对象后恢复。

## 创建历史与恢复

管理页的 Creation history and recovery 每页 25 条，只列出操作 ID、类型、状态、来源 ID 及时间／次数，不传原始请求或码。同一管理账号可跨标签页／设备查看，解决浏览器不再保存表单的情况。

管理员 POST 另支持：

- `{action:"operations",page?}`：列出当前连接范围的创建日志。
- `{action:"resume",operationId,expectedScope}`：由服务器解密原请求后重试；已成功的操作只补同步；未确认的操作仍受 23 小时期限限制。
- `{action:"recover",operationId,sourceId,expectedScope}`：只读取 Stripe 已有对象，确认 metadata.keydrop_operation_id、对象 ID、模式及原码／Coupon 关联一致后才补回来源 ID，再同步目录。Coupon 必须使用原操作派生的固定 ID；Promotion Code 的来源 ID 由管理员从 Stripe 复制。

恢复不调用创建 API；metadata 已被移除／修改、来源已删除、无法核对或仍有有效租约时，不会强行结案。操作租约及 token fencing 防止过期的恢复覆盖新结果。若没有可验证的已有对象，案件保持待确认；目前没有可自动证明“Stripe 从未创建”的功能。

## Promotion Code 导入码库

管理员 POST 可使用 `{action:"importPromotion",expectedScope,input:{productId,promotionId,name,distributionMode,sharedClaimLimit}}`。distributionMode 为 unique／shared（默认 shared），sharedClaimLimit 为 1–1,000,000 或 null。先向 Stripe 同步 Promotion Code 与关联的 Coupon，再在同一事务中创建 discount／stripe 批次、加密码及来源关联。

相同的账户／模式／Promotion Code／商品只有一个关联。以相同导入设置重试会返回原批次与码 ID；设置不同则返回冲突。商品内已有相同文本的其他码时不会静默合并，整笔导入回滚。来源快照在入库前版本发生变化、商品已归档或来源已到期时，同样拒绝。

Stripe 领取名额与 Stripe 兑换次数不同；码库界面显示使用次数由 Stripe 管理。Stripe 自行执行客户、最低消费、商品、首次交易等优惠限制，导入不会移除这些限制；管理员需根据目标领取者配置活动资格。

后续同步若得知来源／Coupon 已停用、删除，或同步失败／仍在进行中，数据库 view 与领取／订单守卫会阻止新的分发。期限取 Coupon 与 Promotion Code 中较早的值。来源恢复有效不会改动管理员手动撤销的状态；已有交付记录保留。此处按本地最新同步状态判定，已有后台周期同步，但尚未接入 Stripe 折扣事件，不保证远端变动立即反映。

Stripe 批次不可使用一般的手动补货，避免没有来源的码混入；每次导入目前创建单一 Promotion Code 的批次，批量操作会逐条创建各自的批次。来源码文本或关联 Coupon 若意外变动，会阻止分发，不能把旧的加密码当成新来源继续发送。


商品导入表单先确认 Stripe 连接，再填写 Promotion Code ID、批次名称、独立／共享模式与领取上限。成功后码库自动切换到该批次；以相同设置重复导入会回到原批次。已归档商品不显示导入操作。正式使用前请先在 Stripe 测试模式验证。

## 批量导入

管理员 POST 支持 `{action:"importPromotions",expectedScope,input:{productId,promotionIds,name,distributionMode,sharedClaimLimit}}`。promotionIds 为 1–25 个不重复的来源 ID，其余设置与单条导入相同。返回 `{scope,results:[{promotionId,batchId,codeId}|{promotionId,error}]}`，HTTP 成功不代表每条都成功，调用方必须检查 results。

每条独立提交；部分失败或连接中断不会撤回已完成的项目。用相同设置重新发送可取回已有关联，不会重复入库。不要为了重试而更改批次名称或其他设置，否则已完成的项目会返回冲突。每条错误只返回安全代码，不返回 Stripe 原始错误。

商品表单可粘贴以逗号或空格分隔的最多 25 个 ID，并显示逐条结果。多条成功时回到全部批次，单条成功时切换到该批次。

## 后台同步

现有的每五分钟定时任务默认同步最久未查询的 20 个来源，可通过 STRIPE_SYNC_BATCH_SIZE 设置为 1–100。来源包括 Coupon 与 Promotion Code，并非码的数量；大量来源完整轮询可能需要数小时。单条失败时仍会轮换处理其他来源；缺少配置、连接身份查询失败或账户／模式切换会将相关来源标为不可用。定时任务租约避免重叠，但不保证远端变更即时反映。

## API 令牌与 MCP

`POST /api/v1/operations` 使用现有的 Bearer 令牌，提供两个操作：

- `{action:"discounts.read",request:{action:"connection"}}`：取得账户 ID／模式。request 也可使用上述 catalog、discover、read、operations 的相同字段。
- `{action:"discounts.write",request:{action:"sync",kind:"coupon",sourceId:"coupon_id",expectedScope:{accountId:"acct_id",livemode:false}}}`：request 也可使用 createCoupon、createPromotion、resume、recover、importPromotion、importPromotions、exportPromotion、resumeExport。

读取需要 `discounts:read`，写入需要 `discounts:write`；两者都要求 `productIds:null` 的全商品令牌，因为 Stripe 折扣目录是账户级别，不能按单一商品隔离。导入另需 `codes:write`。权限不足时在调用 Stripe 之前返回 `API_SCOPE_DENIED`。read 快照包含解密后的促销码及可能的客户 ID，应视为机密，不记录到公开日志。

MCP 对应 `read_stripe_discounts` 与 `manage_stripe_discounts`，参数同样包在 `request` 中。限定商品的令牌不提供这两个工具；写入工具还需 `mcpWriteEnabled:true`。读取工具不会同步本地快照，sync 属于写入操作。工具标示可能访问外部 Stripe；创建、重试与恢复仍受原有的操作 UUID、账户／模式及未知结果规则约束。

`discounts.write` 本身不会自动包含读取权限，代理通常需另外授予 `discounts:read`，以取得连接范围及查询创建记录。此集成不提供 SDK。

## 已有折扣码推送到 Stripe

管理员折扣 API 及 discounts.write 的 request 可使用 exportPromotion：expectedScope 指定已确认的账户及模式，input 包含 productId、codeId、operationId（稳定的 UUID）及 promotion。promotion 使用创建促销码的设置，例如 couponId、maxRedemptions、客户及最低消费限制；不接受 code，原码由服务器解密取得，active 只能为 true。

此操作沿用原码与批次。先确认 Coupon，再保存加密请求及唯一的推送意图；尚未完成来源关联时，该码停止新的分发，已有交付记录保留。原码须为本地折扣码，未撤销、未预留、未到期，且商品未归档。来源关联后会根据 Stripe 最新快照拦截无效码；原本的本地期限保留为上限。

响应包含 operationId、sourceId、codeId、batchId、linked。linked:false 表示 Stripe 已创建，但同步或本地关联未完成；不能换用新的操作编号。以相同设置重新发送会沿用原操作，也可传 `{action:"resumeExport",expectedScope,input:{productId,codeId}}`，由服务器解密原请求恢复。

结果未知且超过安全重试期限后，需通过现有的 recover 核对 Stripe 对象，再用 resumeExport 补关联。目前不会自动取消未知的推送或解除其分发锁。推送及恢复都要求全商品 discounts:write 加 codes:write，MCP 另需写入授权。

在商品码库选中一个本地折扣码后，可使用 Push selected code to Stripe。表单先确认连接，再显示模式与限制设置；有已存在的推送记录时提供 Resume saved request。推送成功后保留原码与批次；恢复已保存的请求不会重复创建。正式使用前请先在 Stripe 测试模式验证。
