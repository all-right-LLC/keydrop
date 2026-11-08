# 事件 Webhook

事件通知队列、签名发送、端点管理与人工重试已接入，管理页为 /dashboard/webhooks。本文档描述此协议；依赖它之前，请先用自己的接收端测试。

## 事件与请求体

支持 code.assigned、code.claimed、code.redeemed、code.revoked、order.delivered、order.refunded。事件与业务数据在同一事务中提交，只有在事件创建时已启用、且商品与事件类型匹配的端点才会创建发送任务；不追溯新订阅之前的事件。

JSON 请求体包含 version（1）、id、type、productId、createdAt（毫秒）和 data。data 包含对应的 claimId/campaignId/codeId/userId/redemptionId/orderId，退款事件另有 refundedMinor、amountMinor、currency。匿名的 userId 为 null。不包含原始码、Email、IP、问卷答案或付款凭证。

直接指派事件 code.assigned 的 data 为 assignmentId、codeId、userId，详见 [管理员直接指派](assignments.md)。不提供管理员内部备注。

## 签名

HTTP 请求头：

- Keydrop-Event-Id：事件 ID，重试时保持不变。
- Keydrop-Signature：`t=<Unix 秒>,v1=<HMAC-SHA256 十六进制>`。

签名消息是 UTF-8 的 `时间戳.原始 JSON 请求体`。密钥为 32-byte 随机值，以 64 位十六进制保存；HMAC 使用解码后的 bytes，而不是十六进制文本。密钥放在部署环境 WEBHOOK_SECRETS 的 JSON 对象中，键名如 PARTNER，值为密钥。数据库只保存名称，不保存密钥。

接收端须先验证原始请求体的签名，再解析 JSON；不要重新 JSON.stringify 后再验证。建议允许五分钟的时钟误差，用 timing-safe comparison 比对，核对请求体 id 与事件请求头一致，再用事件 id 做幂等处理。每次投递都会用当时的时间重新签名，事件的 createdAt 不变；验证新的时间戳不能代替事件去重。

## 投递语义

每五分钟调度一次，处理最多 20 条到期的投递。仅 2xx 视为成功；DNS、网络、超时及其他 HTTP 状态都算失败。每次上限五秒（含 DNS），不跟随重定向，不读取也不保存响应体。会保留 HTTP 状态，不保存错误文本。

失败后依次等待约 2、4、8、16、32、64、128 分钟，受五分钟调度间隔影响；第八次失败后转为 failed，停止自动重试。进程中断的 sending 任务在 60 秒租约过期后可被接手。投递为至少一次，可能重复或乱序，接收端应先可靠入队再返回 2xx。

端点仅限 HTTPS、公网 DNS、443 端口，不允许 URL 中带账号密码、query、fragment、IP literal；每次发送都会重新查询 DNS，并拒绝任何非公网结果。DNS 预检不等于连接 IP 绑定，端点仍必须由可信的部署管理员设置；Worker 保留 global_fetch_strictly_public。不要用不受信任的用户输入创建端点。

此机制是事件通知。外部产品实际发放权益的同步兑换流程另行处理，不能把通知投递成功当成权益已发放，也不会因通知失败而回滚已有的领码或付款交易。

## 管理员 API

这些端点只接受管理员 session，写入必须带有与 APP_URL 匹配的 Origin；不是普通 API token 的操作。

- POST /api/webhooks：name、url、secretName、events（上述事件数组）、productIds（明确为 null 表示全部商品，否则为非空的商品 UUID 数组）。创建后默认停用。
- PATCH /api/webhooks：`{action:"enabled",endpointId,enabled:true|false}`。启用时必须已配置对应的 WEBHOOK_SECRETS；停用不依赖密钥。正在进行的 HTTP 请求可能仍会完成，停用并不能撤回对方已收到的数据。
- GET /api/webhooks：端点设置与启用状态；仅返回密钥名称，不含密钥值。
- GET /api/webhooks?endpointId=UUID&page=1：每页 20 条，包括投递状态、事件类型、HTTP 状态、下次尝试时间、本轮次数、累计次数和人工重试次数；不返回原始事件请求体。
- PATCH /api/webhooks：`{action:"retry",endpointId,deliveryId}`。仅失败且端点已启用的任务可回到 pending，沿用原事件 ID，由下一轮调度处理。本轮尝试次数归零，累计次数与人工重试次数保留。pending、sending、delivered 不接受人工重试。

端点网址、密钥名称、商品与事件订阅范围在创建后固定。要更改目的地时，先停用旧端点，再另建并启用新端点；新端点只接收启用后的新事件。重新启用旧端点会恢复它尚未完成的任务，但不会收到停用期间的事件。密钥轮换可在环境变量中更新同一名称的值，接收端需协调轮换期间的验证。

## 密钥名称与手动发放

- `secretName` 必须符合 `^[A-Z][A-Z0-9_]{0,63}$`，`WEBHOOK_SECRETS` JSON 中对应的值必须是 64 个十六进制字符（32 字节）。
- 在[手动发放](handouts.md)页面取出的码会标记为已指派，但不会发出 `code.assigned` 或任何其他 Webhook 事件。
