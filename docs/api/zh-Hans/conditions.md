# 活动条件

conditions 是 JSON 树，每个节点都有 type。分组 `{ "type": "and", "children": [...] }` 或 `or` 可以嵌套；children 为 1–20 个节点，整棵树最多 100 个节点、深度 8。

| type | 其他字段 | 含义 |
| --- | --- | --- |
| always | 无 | 不增加限制 |
| authenticated | 无 | 已登录 |
| verified_email | 无 | 已验证邮箱 |
| email | addresses：1–100 个 Email | 邮箱白名单；只匹配已验证的邮箱 |
| email_domain | domains：1–100 个域名 | 邮箱域名白名单；只匹配已验证的邮箱 |
| passphrase | credentialId | 活动口令凭证标识 |
| invitation | credentialId | 邀请凭证标识 |
| time | startsAt、endsAt 至少一个 | 毫秒时间范围；startsAt 必须早于 endsAt，且不含 endsAt 当刻 |
| purchase | productId、minimum（默认 1） | Keydrop 中已付款且未全额退款的订单数 |
| question | id、label、kind、required、options、可选 correct | 问卷与答案判定 |
| external | hookId | 部署者注册的资格 hook 或外部 API |

question.kind 为 text、single 或 multiple。text 的 options 为空数组，correct 若提供则为字符串。options 最多 30 项，每项最长 200 个字符。single 的 options 至少两项，correct 为其中一个字符串；multiple 的 correct 为选项字符串数组。options 不可重复，同一棵树中的 question.id 不可重复。未提供 correct 时只按必填与格式验证，不做标准答案比对。

口令与邀请的原始值不写入条件；须通过后台设置对应的凭证。external.hookId 须事先由部署者在代码中注册，不接受任意 URL。通过 API 管理购买条件时，其 productId 也须获得该令牌的授权。

```json
{
  "type": "and",
  "children": [
    { "type": "verified_email" },
    { "type": "email_domain", "domains": ["example.com"] }
  ]
}
```

管理 API 的响应包含完整的条件（可能包含问卷标准答案），只能提供给受信任的后端／代理；不可把管理令牌嵌入公开前端。公开领取页会另行生成适合访客的问卷数据。
