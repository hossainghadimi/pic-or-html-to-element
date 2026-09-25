# پوش کردن پروژه به گیت‌هاب — pic-or-html-to-element

ریپازیتوری شما: https://github.com/hossainghadimi/pic-or-html-to-element

## روش 1 — با Personal Access Token (ساده)

1. در گیت‌هاب بروید: https://github.com/settings/tokens/new
   - Note: HTML2Elementor Push
   - Expiration: 7 days
   - Scopes: تیک `repo` را بزنید
   - Generate token → توکن را کپی کنید (شروع با ghp_...)

2. در ترمینال ویندوز یا لینوکس، داخل پوشه پروژه:

```bash
cd html2elementor
git remote remove origin
git remote add origin https://YOUR_TOKEN@github.com/hossainghadimi/pic-or-html-to-element.git
git branch -M main
git push -u origin main --force
```

به جای YOUR_TOKEN توکنی که کپی کردید را بگذارید.

مثال:
```
git remote add origin https://ghp_abc123...@github.com/hossainghadimi/pic-or-html-to-element.git
```

## روش 2 — با GitHub CLI

```bash
gh auth login
# سپس
cd html2elementor
git push -u origin main --force
```

## روش 3 — آپلود دستی ZIP در گیت‌هاب

اگر نمی‌خواهید از ترمینال استفاده کنید:

1. فایل `HTML2Elementor-GitHub-v1.9.0.zip` را دانلود کنید (همین ورک‌اسپیس)
2. در گیت‌هاب، ریپازیتوری خود را باز کنید
3. دکمه Add file → Upload files
4. فایل ZIP را استخراج کنید و همه فایل‌ها را آپلود کنید (یا خود ZIP را)
5. Commit

## روش 4 — با Bundle

فایل `HTML2Elementor-v1.9.0.bundle` شامل تمام تاریخچه گیت است:

```bash
git clone HTML2Elementor-v1.9.0.bundle html2elementor
cd html2elementor
git remote add origin https://github.com/hossainghadimi/pic-or-html-to-element.git
git push -u origin main --force
```

## محتویات نسخه 1.9.0

- منوی جداگانه: vision (models/) و coder (models/coder/)
- پوشه‌های: models/, models/coder/, models/vision/, cuda/, engine/, engine-cuda/
- CPU+GPU همزمان: -ngl 20 + -t 6
- حذف کارگاه قدیمی
- لینک‌های دانلود کامل در UI

فایل‌های سنگین (GGUF, DLL, ZIP) در .gitignore هستند و پوش نمی‌شوند — فقط READMEها می‌مانند.

## بعد از پوش

در گیت‌هاب خواهید دید:
- 123 فایل
- 3eb256f کامیت v1.9.0
- تب‌های جدید در web/index.html

برای به‌روزرسانی بعدی:
```bash
git add .
git commit -m "update"
git push
```
