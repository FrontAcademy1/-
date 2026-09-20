# Question Archive — Cairo Japanese

منصة تعليمية مستقلة لمساعدة الطلاب على مراجعة وحل الأسئلة التعليمية المرتبطة بمنصة كايرو الياباني والمحتوى الدراسي.

## التقنية

- HTML5
- CSS3
- Vanilla JavaScript
- Supabase Authentication
- Supabase PostgreSQL
- Supabase Storage
- Row Level Security (RLS)

لا يوجد Chat أو نظام دردشة في المشروع.

## ملفات المشروع

كل الملفات الأساسية في جذر المشروع:

- `index.html`
- `style.css`
- `app.js`
- `supabase.sql`
- `README.md`

## 1) إنشاء مشروع Supabase

أنشئ مشروعًا جديدًا في Supabase.

بعد ذلك افتح SQL Editor وشغّل الملف:

`supabase.sql`

الملف ينشئ:

- profiles
- chapters
- categories
- questions
- site_settings
- RLS policies
- Storage bucket باسم `question-media`
- trigger لإنشاء Profile عند إنشاء مستخدم

## 2) إعداد Authentication

من Supabase:

Authentication → Providers → Email

أنشئ حسابات الطلاب والإدارة من لوحة Authentication.

كلمة المرور لا يتم تخزينها داخل الموقع؛ Supabase Auth هو المسؤول عنها.

بعد إنشاء حساب الإدارة، شغّل داخل SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'ADMIN_EMAIL_HERE';
```

استبدل `ADMIN_EMAIL_HERE` بالبريد الخاص بحساب الإدارة.

## 3) ربط الموقع بـ Supabase

افتح `app.js` وستجد في الأعلى:

```js
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY";
```

ضع:

- Project URL
- Publishable/Anon Key

ولا تضع Service Role Key أو أي Secret Key داخل `app.js`.

## 4) تشغيل الموقع

يمكن فتح `index.html` مباشرة في المتصفح بعد إعداد Supabase.

للاستخدام على GitHub Pages:
1. ارفع الملفات كلها إلى root في Repository.
2. فعّل GitHub Pages.
3. استخدم رابط الموقع.

## 5) إضافة المحتوى

لا توجد أسئلة تجريبية في JavaScript.

بعد تسجيل الدخول بحساب admin:

ADMIN → DASHBOARD

ثم تستطيع:

- إنشاء Chapter.
- تعديل Chapter.
- حذف Chapter.
- إنشاء سؤال.
- تعديل سؤال.
- حذف سؤال.
- إنشاء Category.
- تعديل Category.
- حذف Category.
- رفع صورة إلى Storage.
- إضافة رابط فيديو قابل للتضمين.
- رفع فيديو اختياريًا.
- تحديد ترتيب Chapters والأسئلة.
- تغيير رقم WhatsApp ورسالة التواصل.

## 6) WhatsApp

من:

ADMIN → CONTACT SETTINGS

ضع رقم WhatsApp بصيغة دولية، مثل:

`201234567890`

بدون `+` أو مسافات.

يمكن تغيير الرسالة الافتراضية من نفس الصفحة.

زر CONTACT أسفل السؤال يضيف تلقائيًا اسم الـChapter وعنوان السؤال إلى رسالة WhatsApp.

## 7) الأمان

الواجهة تستخدم فقط Supabase URL + Anon/Publishable Key.

الحماية الفعلية موجودة في RLS:

- الطالب: قراءة المحتوى.
- الإدارة: إنشاء وتعديل وحذف المحتوى.
- الطالب لا يستطيع تنفيذ عمليات الإدارة حتى لو حاول استدعاء Supabase من أدوات المطور.
- Service Role Key غير موجود في Frontend.

## ملاحظة

هذا المشروع مستقل وغير تابع رسميًا للوزارة أو منصة كايرو الياباني إلا إذا كان لديك إثبات رسمي لذلك.
