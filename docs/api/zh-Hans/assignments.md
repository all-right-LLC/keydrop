# 管理员直接指派

在商品码库中可选中一个码，点击“Assign selected code”，填写已有账号的 Email 与内部备注。此操作不需要活动或付款，但不会跳过库存、有效期、来源同步及商品归档检查。未注册的收件人须先创建账号；输入 Email 不会自动注册用户，也不会假定邮箱已验证。

收件人会在“我的码”中看到“Assigned by administrator”。已验证的收件人沿用自动寄码队列；未配置 Email 时仍可在网站上查看。未验证的邮箱不会收到码，验证后定时任务会补发。

## 管理端 API

POST /api/assignments 需要管理员 session 与同站 Origin，JSON：

```json
{
  "productId": "商品 UUID",
  "codeId": "码 UUID",
  "email": "recipient@example.com",
  "note": "客服补发原因",
  "idempotencyKey": "每次指派固定的 UUID"
}
```

返回 id、productId、codeId、userId、createdAt，不返回明文码。相同的管理员／幂等键与内容重新发送时返回原记录；同一个键更换内容时返回 ASSIGNMENT_CONFLICT。浏览器遇到结果不明时会保留原请求并提供重试，不得把尚未确认的结果当作失败而随意重发。

GET /api/assignments?productId=UUID&page=1 提供每页 25 条记录、page 与 hasMore。包含码 ID、收件账号、当前 Email、管理员 ID、API 令牌 ID（直接在后台操作时为 null）、内部备注、时间与码状态；仅管理员 session 可查询。Email 是账号当前的邮箱，不是永久保留的地址副本。

## API Key 与 MCP

POST /api/v1/operations 使用 Bearer API 令牌：

- `codes.assign`：在上述 JSON 中加入 `action: "codes.assign"`，需要 `codes:issue` 与该商品范围。这是管理性的直接分配，不执行活动资格判断；活动发码仍使用 `codes.issue`。
- `assignments.read`：传入 action、productId、page，需要 `codes:read` 与该商品范围。结果包含收件 Email 与内部备注，应保密。

MCP 对应 `assign_code`、`list_code_assignments`。写入工具还需要令牌的 MCP 写入开关，默认不提供。相同令牌、UUID 与内容在 API／MCP 之间重新发送会返回同一条记录；不同令牌的 UUID 分开计算，不会互相取回结果。已撤销或已到期的令牌不能重新发送；提交新指派时，数据库会再次检查令牌与商品权限。

记录中的 assigned_by 表示此单管理员部署的授权者，api_token_id 表示实际使用的委托令牌。不返回令牌密钥或码的明文。

## 库存与权益

- 独立码只能指派尚未被预留、分配或使用的可用码，不能覆盖已有的持有人。
- 共享码的指派、活动领取、付款预留与交付共享名额。相同账号已持有该码时不再消耗指派名额。
- 指派、库存状态、Webhook 事件在同一个数据库事务中完成；不会创建虚假的付款或活动记录。
- 兑换使用批次默认的权益规则；不套用其他活动的规则。独立码只有指定账号能兑换；共享激活码按持有人隔离设备。
- 码库的撤销／恢复仍作用于整个码，共享码会影响所有持有人；指派记录不可直接编辑，不提供单条指派的转让或撤回。

`code.assigned` Webhook 数据包含 assignmentId、codeId、userId，不包含明文码、Email 或内部备注，沿用现有的订阅、签名与重试协议。

`note` 为必填，长度 1–1000 个字符。错误：

| 状态码 | 代码 | 含义 |
|---|---|---|
| 404 | `ASSIGNMENT_USER_NOT_FOUND` | 没有该收件人的账号 |
| 409 | `ASSIGNMENT_UNAVAILABLE` | 该码无法指派，例如已指派给此账号、已使用、已撤销或已过期 |
| 409 | `ASSIGNMENT_CONFLICT` | 幂等键被重复用于不同内容 |
