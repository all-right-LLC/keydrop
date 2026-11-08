# 手动发放（Quick handout）

供管理员在手机上把码交给没有 Keydrop 账号的人，例如把 App Store 兑换码通过微信、LINE 发给测试者或媒体，同时记下给了谁。页面在 `/dashboard/handout`，侧边栏“Quick handout”、⌘K 命令面板和首页都有入口。

## 流程

1. 选择商品与批次（可选“Any batch”）。选择只记录在这台设备的浏览器中。
2. 点击 **Take a code**：服务器以原子方式挑选一个可用的独立码（`unique` 批次），**取到就算已发放**，码状态改为 `assigned`，两台设备同时操作也不会拿到同一个码。会优先挑选最早到期的码，已过期的码会被跳过。
3. 点击码即可复制；支持系统分享的手机另有 **Share** 按钮；**Share as image** 可以生成分享图片（见下方）。
4. 收件人、渠道（WeChat、LINE、X、Email、Telegram、In person）与备注都可以留空，之后在发放记录中补填。
5. 给错时点击两次 **Return to inventory** 撤回：若码没有被兑换、领取或售出，会放回可用状态；已撤销的码保持撤销。撤回后的记录不能再修改。

只有独立码可以手动发放；共享码（`shared`）、已领取／售出／分配、正在预留、Stripe 来源已停用或有进行中外部兑换的码都不会被挑中。手动发放与活动、销售共用同一个库存，发放出去的码不会再被领走。

## 分享图片

三款模板：Paper（纸白网格线）、Midnight（深色渐变）、Ticket（票券）。输出 1080×1350 PNG，可以加一句卡片文字，有到期日时自动显示“Redeem before …”。图片在浏览器中用 canvas 绘制，**码不会上传到任何服务器**。**Save image** 直接下载；**Share image** 使用系统分享面板（iOS 可在面板中选择“存储图像”保存到相册），不支持时改为下载。

## 商品图标

每个商品都可以设置图标（商品“设置 → 商品图标”）。浏览器会把所选图片居中裁成正方形、缩放为 256 × 256，再以 WebP 上传（不支持时使用 PNG 或 JPEG）。SVG、GIF、AVIF 会先在浏览器中转为位图，服务器只保存 PNG、WebP、JPEG。服务器根据文件头核对声明的类型，要求每边 32–1024 px、不超过 256 KB，图片存放在 D1（`product_icons`，迁移 `0045`），每次上传都会更新 `products.icon_version`。

图标会显示在三款分享图片（Paper 在左上、Midnight 在标题上方居中、Ticket 压在票券上缘）、商品列表与商品页首、手动发放的结果与记录，以及公开的购买和兑换页。图标加载失败时，分享图片照常生成，只是不放图标。

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/products/{id}/icon?v={version}` | 公开。响应带 `X-Content-Type-Options: nosniff` 与 `default-src 'none'; sandbox` CSP；`v` 与当前版本一致时缓存一年，支持 `If-None-Match`。商品没有图标时返回 404。 |
| `PUT` | `/api/products/{id}/icon` | 管理员、同站 Origin。正文就是图片，`Content-Type` 为 `image/png`、`image/webp` 或 `image/jpeg`。返回 `{version, type, width, height}`；错误为 400 `INVALID_IMAGE`、413 `IMAGE_TOO_LARGE`、404 `PRODUCT_NOT_FOUND`。 |
| `DELETE` | `/api/products/{id}/icon` | 管理员、同站 Origin。移除图标（204）。 |

## 添加到主屏幕

页面提供 `public/handout.webmanifest`（`start_url` 为 `/dashboard/handout`，全屏打开）与 Apple Web App 设置。Android／Chrome 会出现安装按钮；iOS Safari 显示“分享 → 添加到主屏幕”的说明。图标是 `public/icons/` 中的静态文件（Keydrop 的“k.”），更换品牌时替换即可。

## API（管理员会话，需同站 Origin）

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/handouts` | 取码。`{productId, batchId?, idempotencyKey, recipient?, channel?, note?}`。同一个 `idempotencyKey` 重复提交返回同一笔，不会多占码；没有可用的码时返回 409 `HANDOUT_UNAVAILABLE`。 |
| `GET` | `/api/handouts` | 发放记录，每页 20 笔。可带 `productId`、`query`（搜索收件人、渠道、备注）、`missingRecipient=true`、`page`。返回内容包含码原文，不缓存。 |
| `PATCH` | `/api/handouts/{id}` | 修改 `{recipient, channel, note}`，空字符串视为清空。已撤回的返回 404。 |
| `DELETE` | `/api/handouts/{id}` | 撤回。 |

响应都带 `Cache-Control: no-store`。发放记录存储在 `code_handouts`（迁移 `0043`），数据库触发器保证只有初始化的管理员能发放、同一个码同时只有一笔有效发放、码与发放者不可修改。
