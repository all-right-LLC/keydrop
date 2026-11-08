# 在线软件许可证

创建 `license` 类型的码批次，设置设备数，以及可选的固定到期日（`expiresAt`）。独立码只要持有码即可激活；共用码另外要求具名持有关系，设备上限按每个账号分别计算。激活码与 activationToken 都应视为凭证；设备 ID 本身不是授权证明。

## 共用端点

POST `/api/licenses`，Content-Type 为 `application/json`。原生应用或服务器可以不带 Origin；浏览器仅接受本实例的 Origin。每个 IP 每分钟最多 30 次，超限返回 429。请求／响应均不得写入产品日志。

激活：

```json
{"action":"activate","input":{"productId":"商品 UUID","code":"激活码","deviceId":"产品提供的稳定设备 ID","label":"用户可识别的设备名称"}}
```

响应包含 `activationId`、`activationToken`、`expiresAt`。同一设备重试会返回相同的有效凭证；最大设备数在数据库事务内检查。原始设备 ID 只用来生成 HMAC，不存入数据库。凭证加密存储，并另存校验摘要。

校验或解绑：

```json
{"action":"validate","input":{"productId":"商品 UUID","activationToken":"激活时返回的凭证","deviceId":"相同的设备 ID"}}
```

`validate` 返回 `valid`、`activationId`、`expiresAt`。把 action 改成 `release` 可解除绑定。必须同时提供正确的商品、凭证及设备 ID；不能仅凭设备 ID 解绑。解绑后再激活会换发凭证，旧凭证失效。

码被撤销、过期、设备解绑或商品归档都会使校验失效；恢复码后，未解绑且未过期的现有设备可再次生效。这是在线验证，不提供离线授权保证；产品应自行决定合理的重新校验周期与临时断网时的体验。

## 网页持有人与管理员

登录后领取码的用户可在“我的码”中查看设备并解绑。DELETE `/api/license-devices`，body 为 `{ "activationId": "UUID" }`，必须通过 session 与 Origin 验证。普通用户必须是对应码的领取持有人；管理员可解绑任意设备。匿名领取后不会自动转为登录账号持有，仍可用产品中的设备凭证解绑。

共用码的设备列表和自助解绑以设备自身的账号为准，不会因为两人持有同一个码而看到或操作彼此的设备。管理员或具有 licenses:manage 权限、限定商品范围的令牌，可查询／解绑授权范围内的设备。

## 共用码激活

共用 license 活动必须登录账号领取，即使活动原本选择了匿名模式，公开页面仍会显示需要登录。访客付款可以先购买，再通过原浏览器的订单页登录并关联订单。只有已登录且持有有效领取／购买的账号才能激活，仅知道共用码本身是不够的。

集成方式：

1. Keydrop 网站同站 session：调用上述 `/api/licenses` activate，服务器从 Better Auth session 获取账号；input 不接受 userId。
2. 产品后端委托：用保存在服务器上的 API Key 调用 POST `/api/v1/operations`，需具备 licenses:manage 与商品权限。传入 `{action:"licenses.activate",productId,userId,code,deviceId,label}`。产品后端须先验证自己的用户并映射到 Keydrop 账号，不可把后端令牌放在客户端，也不可接受未经验证的 userId。
3. MCP `activate_license_device` 使用相同的输入，另外要求 mcpWriteEnabled；返回 activationToken，代理及工具日志须保密。

没有有效持有关系时返回 LICENSE_OWNER_REQUIRED。激活成功后，原生产品可用 activationToken＋deviceId 调用 validate／release，无需持续携带登录 session 或管理令牌。同一设备 ID 在不同账号下会形成不同的绑定和凭证，设备 HMAC 使用明确分隔的账号／码／设备数据。

全额退款且开启撤销时，失去最后一个有效持有来源的账号会被解绑设备，其他持有人不受影响。如果该账号仍有免费领取或另一笔有效购买，设备会保留。退款后再次取得持有资格并激活时会换发 token，避免旧 token 因重新购买而复活。独立码的现有设备无需补绑账号。

## 后台设备管理

商品页的 License devices 入口提供分页的设备列表，每页最多 50 条，可按 Code ID 筛选。桌面端使用表格，窄屏使用卡片；显示设备标签、激活标识、码标识、具名账号（如有）、绑定／码状态及最近激活时间，不返回原始设备 ID、设备哈希或激活凭证。

GET `/api/admin/license-devices?productId=UUID&page=1&codeId=UUID`，codeId 可省略；仅限管理员 session，响应包含 devices、page、hasMore，禁止缓存。

对同一端点发送 DELETE，JSON 为 `{ "productId": "UUID", "activationId": "UUID" }`。需要管理员 session 与同站 Origin；商品与设备必须匹配。重复发送相同的解绑请求会保留原解绑时间。界面要求确认指定的设备，成功后更新列表；解绑只会让该设备的激活凭证失效，不会撤销原码或影响其他设备。码仍有效且有名额时，持有人可以再次激活并获得新凭证。

## 限制

许可证端点的请求必须是 JSON，且不超过 4 KiB。Keydrop 通过 Cloudflare 添加的 `cf-connecting-ip` 请求头识别调用方；缺少该请求头时（例如 Worker 前面没有 Cloudflare 而被直接调用），端点返回 503 `LICENSE_IDENTITY_UNAVAILABLE`。
