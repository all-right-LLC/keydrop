# 外部权益发放协议

兑换码时，Keydrop 可通过 HTTPS 端点或代码 hook 在你自己的产品中发放权益。权益设置在后台完成；兑换可通过已登录的 session、REST 与 MCP 进行，每次操作都会被记录，结果不明时可在后台复核。

## 集成注册

部署者在 `apps/web/src/custom/external-rewards.ts` 注册自己控制的 HTTPS 端点或代码 hook。同一个 ID 不能同时出现在两种注册表中；业务设置只引用集成 ID，不能提交任意网址。HTTP 端点需要 secretName，部署者把对应的 32-byte hex HMAC 密钥存放在 `EXTERNAL_REWARD_SECRETS` secret 中，密钥不进入数据库或代码仓库。

发送的 JSON：

```json
{
  "version": 1,
  "operationId": "固定操作 UUID",
  "productId": "商品 UUID",
  "codeId": "码 UUID",
  "userId": "Keydrop 账号 ID",
  "reward": {"payload": {"plan": "pro", "duration": {"days": 30}}, "repeat": "add", "reclaimOnRevoke": true}
}
```

不包含原始码、Email、设备 ID 或用户任意提供的网址。reward 可以使用嵌套 JSON，整个请求上限为 16 KiB。

请求头：

- `Idempotency-Key`：operationId。
- `Keydrop-Signature`：`t=Unix秒,v1=HMAC-SHA256(timestamp.rawBody)`，使用 32-byte hex 密钥解码后签名，验证方式与 Webhook 文档相同。
- `Content-Type`／`Accept`：application/json。

接收端须验证签名、检查合理的时间差，并把 operationId 与发放结果持久化。相同 operationId 和正文的重试必须返回原结果，不得再次发放；相同 ID 搭配不同正文必须拒绝。不能只把重复检查放在内存中。

## 响应

HTTP 2xx、application/json，正文最多 4 KiB：

```json
{"operationId":"与请求相同的 UUID","status":"applied"}
```

`applied` 表示权益已持久化完成。只有匹配操作 ID 的有效收据才能确认成功。明确拒绝且未产生副作用时返回 `status: "rejected"`；不得在已发放但收据暂时无法读取时返回 rejected。其他状态、额外字段、错误 ID、非 2xx 或无效 JSON 都视为结果未确认，不会把响应正文直接展示给用户。

## 超时与重试

五秒期限包含 DNS、HTTP、正文读取及代码 hook。HTTP 使用 AbortSignal、不跟随重定向，正文超限即取消；原始异常与外部正文不会写入面向用户的错误。

3xx 响应会被视为无效收据；Keydrop 不会跟随重定向到其他主机。

调用层不自行重试。兑换服务先持久化 operationId 和权益快照；同一账号与码即使刷新页面、改用新的请求幂等键，也会沿用同一个外部标识与内容。每个请求键都会保留对应关系，不能改用于其他码。超时不代表对方没有发放；迟到的成功或程序中断必须通过同一个 ID 查回结果，不能另发一笔。

代码 hook 接收相同的字段及 signal，返回同样的收据。hook 也必须实现持久化幂等并遵守取消；Promise 超时无法强制终止部署者自行编写的代码。

目前沿用 HTTPS 443、公网 DNS 预检；拒绝 IP、内网／特殊网址与公私网混合解析。DNS 预检没有把 fetch 固定到已检查的 IP，部署者只应注册自己控制的服务。这个同步发放协议与会自动重试的事件 Webhook 不同。

## 配置与事务行为

- `EXTERNAL_REWARD_SECRETS` 是 secretName → 64 字符 hex 密钥的 JSON secret map。只存在于部署环境或公司 keys/，不可放进 reward payload。
- 后台活动权益选择 Connected product reward，指定已注册的 integrationId 与 JSON payload（最多 8 KiB）。API reward 格式为 `{kind:"external",integrationId:"partner",payload:{plan:"pro"},repeat:"add",reclaimOnRevoke:true}`。
- 操作以 60 秒租约防止同时重复提交，租约到期后转为人工确认，用户不能接手；没有自动补发的定时任务。每次发送仍有五秒期限。
- 失败不会新增 redemptions、不会增加 use_count。只有匹配 operationId 的 rejected 收据允许自行重试，而且明确拒绝会释放兑换名额（use_count／max_uses），其他人可以兑换同一个码；原用户之后重试时若名额已用完，会返回 `REDEMPTION_UNAVAILABLE`、不再调用接收端。独立码仍不会放回库存重新领取或出售；超时、无效响应、程序中断及本地提交失败均设置为 review_required，禁止用户重复提交；控制台首页显示操作 ID 与累计失败次数。成功后原子写入兑换、消耗一次名额并解决该失败通知。
- 未确认操作的名额保留给原账号，避免对方其实已发放后又把名额交给另一个人。独立码在此期间不会重新分发或出售。这是未兑换操作的保留，不是已兑换；结果不明时只能由管理员在外部结果确认页核对，不能通过更换请求键或刷新页面绕过。若已发放但本地码已撤销或过期，仍需管理员在外部产品中安排补偿。
- 进行中的操作会保存原权益快照；后台修改规则不会让重试变成另一笔权益。重试及完成时仍会检查撤销、期限、持有关系与容量。
- 外部已返回 applied，但本地因撤销或数据库失败未能提交时，仍保留相同的操作并通知管理员。接收端必须支持通过同一个 ID 查回现有结果，不能通过重复提交新增权益。
- `repeat` 的累加／覆盖／拒绝语义由外部产品在同一个发放事务内实现；Keydrop 不虚构外部额度账本。
- 已完成的外部权益若被撤销且 reclaimOnRevoke 已开启，会在同一事务中创建外部撤销任务与管理员通知。定时任务发出撤销，只有接收端确认完成才会解决通知；本地码撤销不等于外部回收已完成。

## 外部撤销

撤销请求使用相同的集成及原权益快照，额外包含：

```json
{"action":"revoke","originalOperationId":"原发放操作 UUID","operationId":"不同于发放、固定的撤销 UUID"}
```

其余 productId、codeId、userId、reward、version 及签名格式不变。没有 action 的现有请求仍表示发放，避免改变进行中发放的正文。action 与 originalOperationId 必须同时出现，撤销 operationId 不能与原发放 ID 相同。

接收端必须按 originalOperationId 找到原权益来源，只回收该来源按策略可回收的部分，不得撤销同一账号的所有权益或另一位买家的权益。返回匹配撤销 operationId 的 applied 才表示已处理完成；仅有 HTTP 2xx 是不够的。接收端应保留已消耗部分的交易记录，无法处理的部分不得谎称已回收。

定时任务每次最多 10 笔，使用 60 秒租约与结果 fencing；失败按 5、10、20、40 分钟退避，第五次失败后停止自动尝试。这是撤销任务的重试，不会自动重试用户失败的兑换。超时及人工重试都沿用相同的撤销 ID。

管理员可在 `/dashboard/external-revocations` 查看每页 25 笔任务与累计尝试次数。只有 failed 任务可以人工重试，已确认成功的不会重复发送。`POST /api/admin/external-revocations` 接受 `{redemptionId:"原发放 UUID"}`，需要管理员 session 与 Origin；重置本轮计数，但保留 total_attempts／retry_count。即使原规则已修改，撤销仍使用发放时的快照。

## 管理员确认未知发放结果

`/dashboard/external-reviews` 列出待确认的操作。管理员先用原 operationId 查询接收端记录，再填写至少 10 字的核对说明（不可包含密钥或原始码），并选择：

- `applied`：已确认外部发放，原子完成本地兑换；不再调用接收端。
- `not_applied`：已确认没有发放，重新允许原用户重试；保留原操作 ID 与权益快照，释放兑换名额（与明确拒绝相同），不会自动发放。

`POST /api/admin/external-reviews` 接受 `{attemptId, outcome, note}`，需要管理员 session 与同源 Origin。操作及核对记录在同一事务中写入，重复处理会被拒绝；成功后解决通知。码在核对期间已撤销、过期或商品已归档时，确认 applied 仍会记录这笔兑换（外部确实已发放，本地必须留下记录才能追踪回收）；码保持原状态。若码已撤销或来源订单已撤销权限，兑换会立即标记为撤销，`reclaimOnRevoke` 开启时会自动排入外部撤销。

定时任务会将超过 60 秒租约的进行中发放隔离为人工确认，不需要等待用户再次尝试。旧版未区分结果的 retryable 操作，迁移后全部保守地转为人工确认。


管理员通知中心位于 `/dashboard/notifications`，区分明确拒绝与结果不明。前者可由用户重试；后者保留名额并禁止用户重试，必须按上述人工核对流程处理。通知邮件是可选的，发送规则见 [邮件文档](email.md)；发信重试只会重新发送提醒，绝不会重新发放权益。
