<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/web/public/brand/keydrop-wordmark-dark.svg">
    <img src="apps/web/public/brand/keydrop-wordmark.svg" alt="Keydrop" width="320">
  </picture>
</p>

<p align="center"><a href="README.md">English</a> · <a href="README.zh-Hant.md">繁體中文</a> · <a href="README.zh-Hans.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.it.md">Italiano</a> · <a href="README.de.md">Deutsch</a> · <b>العربية</b></p>

<div dir="rtl">

**توزيع الأكواد ذاتي الاستضافة للمطوّرين المستقلين.** أدِر أكواد الاسترداد وأكواد الخصم ومفاتيح الترخيص وأكواد App Store الترويجية ووزّعها من حساب Cloudflare الخاص بك — حملات مطالبة مجانية، ودفع عبر Stripe، واستحقاقات، وواجهة API، وwebhooks، وخادم MCP، وكل ذلك في تطبيق Next.js صغير واحد.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fall-right-LLC%2Fkeydrop%2Ftree%2Fmain%2Fapps%2Fweb)

[![CI](https://github.com/all-right-LLC/keydrop/actions/workflows/ci.yml/badge.svg)](https://github.com/all-right-LLC/keydrop/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)

> **الحالة:** ما قبل الإصدار 1.0. تعمل المسارات الأساسية من البداية إلى النهاية على Cloudflare، لكن توقّع تغييرات غير متوافقة قبل 1.0. اختبره في بيئتك الخاصة قبل الاعتماد عليه في مبيعات حقيقية.

## لماذا Keydrop

بنيتَ تطبيقًا وأصبح لديك الآن جدول بأكواد ترويجية، وبضع مئات من مفاتيح الترخيص، وحساب Stripe. يمنح Keydrop هذه الأكواد مكانًا واحدًا:

- **مخزون واحد لكل أنواع الأكواد** — أنشئ الأكواد، أو استوردها من CSV/Excel (أكواد عروض App Store، ومفاتيح الشركاء، وأكواد Stripe الترويجية)، واحفظها مشفّرة أثناء التخزين.
- **وزّعها بالطريقة التي تناسبك** — صفحات مطالبة عامة أو خاصة مع قواعد أهلية، أو دفع عبر Stripe، أو تعيين مباشر، أو توزيع بالبريد الإلكتروني، أو صفحة *Quick handout* مناسبة للهاتف لإعطاء كود لشخص ما في محادثة.
- **اعرف من يملك ماذا** — تُسجَّل كل مطالبة وطلب وتسليم واسترداد؛ ألغِ الأكواد، واسترجع الاستحقاقات، وعالج المبالغ المستردّة دون فقدان السجل.
- **اربطه بمنتجك** — رموز API محدّدة الصلاحيات، وواجهة REST API، وwebhooks موقّعة، وخادم MCP لكي تتمكّن الخلفية لديك أو وكلاء الذكاء الاصطناعي من إصدار الأكواد والتحقق منها.
- **ملكك وتديره بنفسك** — بترخيص MIT، ومسؤول واحد، ويُنشر على Cloudflare Workers + D1 الخاصة بك. لا خدمة مستضافة، ولا رسوم لكل كود.

## الميزات

**الأكواد والمخزون**
- أربعة أنواع من الأكواد: الاسترداد، والخصم، والترخيص (تفعيل عبر الإنترنت مع حدود لكل جهاز)، وأكواد المنصات الخارجية
- الإنشاء، والاستيراد (‎.xlsx / CSV مع ربط الأعمدة ومعاينة)، ومزامنة أكواد Stripe الترويجية
- تشفير AES-GCM أثناء التخزين، وبحث بالتطابق التام، وتصدير، وإلغاء / استعادة، وانتهاء صلاحية، وحدود استخدام لكل كود
- أكواد فريدة أو مشتركة، مع حدود مطالبة مشتركة عبر الحملات والمبيعات

**التوزيع**
- حملات المطالبة: روابط عامة أو خاصة، مجهول الهوية / بريد إلكتروني مُتحقَّق منه / بحساب فقط، وحدود لكل شخص وحدود إجمالية، وقواعد أهلية متداخلة بـ AND/OR (نوافذ زمنية، وعبارات مرور، ودعوات، وسجل المشتريات، وفحص HTTP خاص بك)
- Stripe Checkout: كود واحد لكل عملية شراء، وخصومات، ومبالغ مستردّة يمكنها إلغاء الكود، وثلاث استراتيجيات لنفاد المخزون (استرداد المبلغ، أو التنفيذ اليدوي، أو التنفيذ التلقائي بعد إعادة التخزين)
- التعيين المباشر والتوزيع بالبريد الإلكتروني لأشخاص ليس لديهم حساب بعد
- **Quick handout** — صفحة مصمّمة للهاتف أولًا لأخذ كود ومشاركته (بما في ذلك ثلاث بطاقات صور قابلة للمشاركة تُرسَم على الجهاز) وتسجيل من حصل عليه؛ ويمكن تثبيتها على الشاشة الرئيسية

**المكافآت والاستحقاقات**
- عضويات مدمجة (محدودة المدة أو دائمة) ودفاتر أرصدة مع واجهات API متساوية الأثر (idempotent) للخصم / الاسترداد
- تجميع المكافآت المتكررة أو استبدالها أو رفضها؛ واسترجاع الاستحقاقات غير المستخدمة عند إلغاء الكود
- مكافآت خارجية تُسلَّم إلى خدمتك الخاصة، مع مراجعة يدوية عندما تكون النتيجة غير معروفة

**التكاملات**
- واجهة REST API وخادم MCP مع رموز دقيقة الصلاحيات ومحدّدة بالمنتج (MCP للقراءة فقط افتراضيًا)
- webhooks صادرة موقّعة مع إعادة المحاولة
- Cloudflare Email Sending اختياري لتسجيل الدخول برمز لمرة واحدة، ورسائل الأكواد، وتنبيهات المسؤول

**لوحة الإدارة**
- لوحة تحكم بأسلوب SaaS مع رسوم بيانية للنشاط، ولوحة أوامر ⌘K، وسمات فاتحة / داكنة، وتخطيط للهاتف، مبنية بمكوّنات [beUI](https://beui.dev)
- الواجهة متاحة بـ English و简体中文 و繁體中文 و日本語 و한국어 وItaliano وDeutsch والعربية (مع دعم الكتابة من اليمين إلى اليسار)؛ تتبع اللغة متصفح الزائر ويمكن تغييرها في أي وقت

## التقنيات المستخدمة

[Next.js](https://nextjs.org) (App Router) على [Cloudflare Workers](https://workers.cloudflare.com) عبر [OpenNext](https://opennext.js.org/cloudflare) · [Cloudflare D1](https://developers.cloudflare.com/d1/) · [Better Auth](https://better-auth.com) · [Stripe](https://stripe.com) (اختياري) · [next-intl](https://next-intl.dev) · [beUI](https://beui.dev) + Tailwind CSS

## البدء السريع

### النشر على Cloudflare

1. انقر **Deploy to Cloudflare** أعلاه. ينسخ Cloudflare مجلد `apps/web` إلى مستودع جديد في حسابك على GitHub، وينشئ Worker وقاعدة بيانات D1.
2. املأ الإعدادات التي يطلبها:

   | الاسم | ما يجب إدخاله |
   |---|---|
   | `APP_URL` | أصل الموقع عبر HTTPS، مثل `https://keydrop.your-subdomain.workers.dev` (بدون شرطة مائلة في النهاية) |
   | `ADMIN_EMAIL` | عنوان البريد الإلكتروني للمسؤول الوحيد |
   | `BETTER_AUTH_SECRET` | سرّ عشوائي، مثل `openssl rand -hex 32` |
   | `SETUP_SECRET` | سرّ عشوائي آخر، يُستخدم مرة واحدة في صفحة الإعداد |
   | `CODE_ENCRYPTION_KEY` | ‏64 حرفًا ست عشريًا، مثل `openssl rand -hex 32` — **احتفظ بنسخة احتياطية منه؛ فقدانه يجعل الأكواد الحالية غير قابلة للقراءة** |

   استخدم قيمة مختلفة لكل سرّ. اترك أمر البناء فارغًا، واضبط أمر النشر على `pnpm run deploy`.
3. افتح `APP_URL/setup`، وأدخل `SETUP_SECRET`، واختر كلمة مرور المسؤول. ثم سجّل الدخول وأنشئ منتجك الأول.

لا تحتاج النواة المجانية (الأكواد والحملات والمطالبات) إلى أي شيء آخر. أضف Stripe وEmail Sending لاحقًا إن أردتهما.

### التشغيل محليًا

يتطلب Node.js 24+‎ وpnpm.

```sh
cd apps/web
pnpm install --frozen-lockfile
node scripts/create-local-env.mjs "$HOME/.config/keydrop/local.env" you@example.com
pnpm run db:migrate
KEYDROP_DEV_ENV_FILE="$HOME/.config/keydrop/local.env" pnpm dev
```

افتح <http://localhost:3000/setup> واستخدم `SETUP_SECRET` من الملف المُنشأ (يُحفظ خارج المستودع، ولا يُطبع أبدًا في الطرفية).

### النشر يدويًا

```sh
cd apps/web
pnpm exec wrangler login
pnpm exec wrangler d1 create keydrop   # ضع معرّف قاعدة البيانات في wrangler.jsonc
# اضبط اسم Worker و APP_URL و ADMIN_EMAIL في wrangler.jsonc، ثم:
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put SETUP_SECRET
pnpm exec wrangler secret put CODE_ENCRYPTION_KEY
pnpm run deploy                        # يبني، ويطبّق ترحيلات D1، وينشر
```

## الإعدادات

| الإعداد | النوع | مطلوب | الغرض |
|---|---|---|---|
| `APP_URL`, `ADMIN_EMAIL` | var | نعم | الأصل العام وبريد المسؤول الإلكتروني |
| `BETTER_AUTH_SECRET`, `SETUP_SECRET`, `CODE_ENCRYPTION_KEY` | secret | نعم | الجلسات وتجزئة الهوية، والإعداد لمرة واحدة، وتشفير الأكواد |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | secret | للمبيعات | Stripe Checkout والـ webhook على `/api/stripe/webhook` |
| ربط `EMAIL` + `EMAIL_FROM` | binding / var | للبريد الإلكتروني | Cloudflare Email Sending: تسجيل الدخول بـ OTP، ورسائل الأكواد، وتنبيهات المسؤول |
| `WEBHOOK_SECRETS` | secret | للـ webhooks | أسرار التوقيع للـ webhooks الصادرة |
| `ELIGIBILITY_SECRETS`, `EXTERNAL_REWARD_SECRETS` | secret | اختياري | أسرار التوقيع لفحوص الأهلية الخاصة بك ومستقبِلات المكافآت الخارجية |

يعمل مشغّل cron كل خمس دقائق لإنهاء الحجوزات المنتهية، وتنفيذ الطلبات المؤجّلة، وإرسال الرسائل المنتظرة في الطابور، وتسليم الـ webhooks. شغّل `pnpm run cf-typegen` بعد تعديل `wrangler.jsonc`.

توجد مفاتيح تشغيل الميزات (الصفحات العامة، و"My codes"، ورسائل تنبيه المسؤول) في `apps/web/src/config/site.ts`؛ وتوجد العلامة التجارية وكل النصوص في `apps/web/messages/<locale>.json`.

## اجعله خاصًا بك

كل ما يغيّره النشر المعتاد موجود في عدد قليل من الملفات. حصر تعديلاتك فيها يسهّل دمج التحديثات من المشروع الأصلي لاحقًا.

| ما تريد تغييره | المكان (داخل `apps/web/`) |
|---|---|
| اسم العلامة التجارية، ونصوص الصفحة الرئيسية والصفحات، ونصوص البريد الإلكتروني | `messages/<locale>.json`: `common.brand` و`home` و`publicSite` و`email` (عدّل المفتاح نفسه في كل لغة تنشرها) |
| أقسام الصفحة الرئيسية وترتيبها، والصفحات العامة الاختيارية، ومفاتيح "My codes" وتنبيهات المسؤول | `src/config/site.ts` |
| رابط "Powered by Keydrop" في التذييل وروابط GitHub (اختيارية بموجب ترخيص MIT ويمكنك إيقافها) | `src/config/site.ts`: `poweredBy.enabled`, `publicSite.repositoryUrl` |
| تخطيط الصفحة الرئيسية ومرئياتها | `src/components/site/landing/sections.tsx` و`src/components/site/landing/hero-visual.tsx` و`src/app/page.tsx` |
| صفحة الميزات والصفحات الاختيارية (التوثيق، والأسعار، والعرض التجريبي، وسجل التغييرات) | `src/app/features/page.tsx` و`src/app/[section]/page.tsx` |
| الشعار وfavicon وأيقونات التطبيق | `src/components/site/brand-logo.tsx` و`public/brand/` و`public/favicon.svg` و`src/app/favicon.ico` و`public/icons/` و`public/handout.webmanifest` |
| الألوان والسمة الفاتحة / الداكنة | `src/app/globals.css` (رموز `:root` و`--brand-accent`) |
| صورة المشاركة على الشبكات الاجتماعية | تُولَّد في كل عملية بناء من الشعار النصي ونصوص `home` بواسطة `scripts/generate-share-image.mjs` |
| لغات الواجهة | `src/i18n/locales.ts` إضافةً إلى ملف لكل لغة في `messages/` |
| اسم Worker، والعنوان العام، وجدول cron، والروابط (bindings) | `wrangler.jsonc` (شغّل `pnpm run cf-typegen` بعدها) |

تُدار المنتجات والأسعار والحملات وقواعد الأهلية وإرسال البريد الإلكتروني ورموز API من لوحة التحكم، لا من الشيفرة.

لا تغيّر ما يلي إلا إذا كنت تعرف السبب: `migrations/` (أضف ملفات جديدة ولا تعدّل الملفات الموجودة أبدًا)، و`src/lib/server/` (قواعد المصادقة والتشفير والمدفوعات والمخزون)، و`src/components/motion/` (مكوّنات beUI؛ حدّثها من المصدر الأصلي بدلًا من ذلك).

## التوثيق

الأدلة الكاملة موجودة في [`docs/api`](docs/api/README.md) بـ **English** و[繁體中文](docs/api/zh-Hant/README.md) و[简体中文](docs/api/zh-Hans/README.md). الأدلة متاحة بالإنجليزية والصينية (التقليدية والمبسّطة) فقط، وليست متاحة بالعربية:

- [النشر والنسخ الاحتياطي والاستعادة](docs/api/en/deployment.md) · [التطوير المحلي](docs/api/en/development.md) · [التخصيص ولوحة الإدارة](docs/api/en/customization.md)
- [المصادقة ورموز API](docs/api/en/authentication.md) · [MCP](docs/api/en/mcp.md) · [Webhooks](docs/api/en/webhooks.md)
- [شروط الحملات](docs/api/en/conditions.md) · [خطافات الأهلية](docs/api/en/eligibility.md) · [الاستحقاقات والأرصدة](docs/api/en/entitlements.md) · [التراخيص](docs/api/en/licenses.md)
- [Stripe](docs/api/en/stripe.md) · [خصومات Stripe](docs/api/en/stripe-discounts.md) · [البريد الإلكتروني](docs/api/en/email.md) · [Quick handout](docs/api/en/handouts.md)

## الترجمات

تأتي الواجهة بثماني لغات. للصفحات العامة أيضًا عناوين URL حسب اللغة مثل `/ja/features` مع وسوم `hreflang` وإدخالات sitemap مطابقة، وتُرسَل الرسائل بلغة كل مستلم. كل لغة عبارة عن ملف JSON في [`apps/web/messages`](apps/web/messages) بالمفاتيح نفسها تمامًا الموجودة في `en.json`؛ ويتحقق اختبار من أن كل ترجمة لها المفاتيح نفسها والعناصر النائبة ICU نفسها. لإضافة لغة، أضف رمزها إلى [`src/i18n/locales.ts`](apps/web/src/i18n/locales.ts) وأنشئ ملف JSON المطابق. نرحّب كثيرًا بتصحيحات المتحدثين الأصليين.

## التطوير

```sh
cd apps/web
pnpm run lint
pnpm run typecheck
pnpm test                # اختبارات الوحدة والتكامل على SQLite حقيقي + الترحيلات
pnpm run build:worker    # بناء Worker للإنتاج
```

يشغّل CI الفحوص نفسها على Node.js 24 و26، إضافةً إلى إعداد D1 محلي جديد يطالب بالأكواد من البداية إلى النهاية. اطّلع على [CONTRIBUTING.md](CONTRIBUTING.md) قبل فتح طلب سحب (pull request)، وعلى [SECURITY.md](SECURITY.md) للإبلاغ عن ثغرة أمنية.

## الترخيص

[MIT](LICENSE) © all right LLC. تحتفظ مكوّنات [beUI](https://beui.dev) المضمّنة بترخيص MIT الأصلي الخاص بها ([`apps/web/vendor/beui.LICENSE`](apps/web/vendor/beui.LICENSE)).

## شكر وتقدير

يقف Keydrop على أكتاف هذه المشاريع. شكرًا لكل من يبنيها ويصونها:

- [Next.js](https://nextjs.org) و[React](https://react.dev): إطار عمل التطبيق
- [OpenNext for Cloudflare](https://opennext.js.org/cloudflare) و[Cloudflare Workers, D1](https://developers.cloudflare.com/) و[Wrangler](https://developers.cloudflare.com/workers/wrangler/): الاستضافة وقاعدة البيانات والنشر
- [Better Auth](https://better-auth.com): تسجيل الدخول والجلسات ورموز البريد الإلكتروني لمرة واحدة
- [Stripe](https://github.com/stripe/stripe-node): المدفوعات
- [next-intl](https://next-intl.dev) و[FormatJS](https://formatjs.github.io): الترجمات وفحص الرسائل
- [beUI](https://beui.dev) و[Tailwind CSS](https://tailwindcss.com) و[Motion](https://motion.dev) و[Lucide](https://lucide.dev) و[Floating UI](https://floating-ui.com) و[TanStack Virtual](https://tanstack.com/virtual) و[next-themes](https://github.com/pacocoursey/next-themes) و[clsx](https://github.com/lukeed/clsx) و[tailwind-merge](https://github.com/dcastil/tailwind-merge): الواجهة
- [Zod](https://zod.dev): التحقق من المدخلات
- [Kysely](https://kysely.dev) و[kysely-d1](https://github.com/aidenwallis/kysely-d1): الوصول إلى قاعدة البيانات لـ Better Auth
- [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk): خادم MCP
- [SheetJS](https://sheetjs.com): استيراد Excel
- [Geist](https://vercel.com/font) و[Poppins](https://fonts.google.com/specimen/Poppins): الخطوط المستخدمة في الواجهة والشعار
- [Vitest](https://vitest.dev) و[TypeScript](https://www.typescriptlang.org) و[ESLint](https://eslint.org): الاختبار والأدوات

</div>
