# 外部资格集成

活动的 `external` 条件使用集成 ID。部署者先在 `apps/web/src/custom/eligibility.ts` 注册，管理员再在活动条件中输入该 ID。访客及活动 API 不能指定 URL。

## HTTP 端点

在 `eligibilityEndpoints` 中加入配置：

```ts
partner: {
  url: "https://api.example.com/keydrop/eligibility",
  secretName: "PARTNER",
  shareEmail: false,
}
```

只能注册自己控制的正式 HTTPS 域名；不支持 IP、内部主机、非标准端口、URL 账号密码、query 或 fragment。`shareEmail` 默认关闭；开启后也只传递已验证的 Email。

设置 `secretName` 时，在 Worker 的 `ELIGIBILITY_SECRETS` secret 中放入对应名称到 Bearer token 的 JSON 对象。使用 `pnpm exec wrangler secret put ELIGIBILITY_SECRETS` 交互式输入，实际密钥不写进项目或命令历史。本地配置沿用 `KEYDROP_DEV_ENV_FILE` 指向仓库外的密钥文件。

请求为 POST JSON，包含 `version: 1`、`campaignId`、`productId` 与 `identity`。身份包含 `emailVerified`，访客已登录时另含 `userId`（匿名活动与 Email 验证活动可能没有 `userId`）。开启 `shareEmail` 且邮箱已验证时才会增加 `email`。代码 hook 不同：它在你的部署内运行，无论 `shareEmail` 如何设置，始终会收到操作者的 `email` 与 `emailVerified`。Keydrop 不传递 IP、浏览器标识、口令、邀请秘密或问卷答案。

成功响应必须是 HTTP 2xx、`application/json`：

```json
{"allowed": true, "reason": "可选，最多 500 字符"}
```

`allowed` 必须是布尔值，原因不会直接展示给访客。响应最多 16 KiB；拒绝重定向、错误格式及额外字段。整个条件判定默认最多 3 秒；网络、DNS 或集成错误会返回可重试的“资格暂时不可用”，不会发码。对方端点应为只读且可重试，不应在资格检查中扣款或消耗权益。

## 代码 hook

在 `eligibilityHooks` 中注册异步函数，接收 `campaignId`、`productId`、最少身份信息 `actor` 及 `signal`，返回 `{ allowed: boolean }`。hook 必须遵守取消信号；不提供原始 IP 或浏览器标识。hook 与 HTTP 端点的 ID 不可重复。

## 网络边界

发送前检查 A／AAAA，任何一个非公开地址都会被拒绝；不跟随重定向。DNS 预查与 fetch 仍是两个步骤，不能把预查宣称为连接地址已固定。部署者只能注册自己控制、DNS 可信的端点，不可提供任意第三方 URL 的编辑入口。

`global_fetch_strictly_public` 是公开路由语义，不能单靠它宣称完整的 SSRF 防护。正式部署还须验证实际 Workers 环境的 DNS 与 fetch 行为。官方说明：[DNS API](https://developers.cloudflare.com/workers/runtime-apis/nodejs/dns/)、[Fetch](https://developers.cloudflare.com/workers/runtime-apis/fetch/)。

资格服务明确拒绝、响应超时，或代码 hook 拒绝时，都不会创建领取或消耗库存。所有条件通过后只交付一个码，成功页重新加载不会再次调用资格端点或创建第二笔领取。依赖自定义 hook、域名或代理设置前，请先自行验证。
