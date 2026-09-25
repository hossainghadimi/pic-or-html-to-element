# HTML2Elementor Workspace Transfer — v1.9.0 — آماده انتقال به چت جدید

این ورک‌اسپیس برای انتقال به چت/ورک‌اسپیس جدید در Arena AI آماده شده است.

## محتویات فعلی

### پروژه اصلی
- `html2elementor/` — سورس کامل نسخه 1.9.0 (4.0 MB)
  - `web/index.html` — منوی جداگانه: vision (models/) و coder (models/coder/)
  - `web/vision-studio.js` — CPU+GPU همزمان، لینک‌های دانلود CUDA و مدل‌ها
  - `web/coder-studio.js` — بخش کدنویس جدید با منوی جداگانه مدل‌ها
  - `ai/service.py` — اسکن بازگشتی models/, تشخیص coder vs vision, PATH برای cuda/
  - `models/` — پوشه مدل‌ها (READMEها)
    - `models/coder/` — برای DeepSeek-R1-Distill-Qwen-7B و Qwen2.5-Coder
    - `models/vision/` — اختیاری برای Qwen3-VL
  - `cuda/` — پوشه جداگانه DLLهای CUDA
  - `engine/` — موتور CPU
  - `engine-cuda/` — موتور CUDA
  - `docs/RELEASE-v1.9.0.md` — توضیحات نسخه
  - `main.go` — نسخه 1.9.0
  - `.git/` — ریپازیتوری گیت آماده پوش به https://github.com/hossainghadimi/pic-or-html-to-element

### دانش پروژه
- `project-knowledge/html2elementor/hardware/polaris.json` — پروفایل سخت‌افزار (i5-12400, 32GB, RTX 3050 8GB)
- `PROJECT-MEMORY.md` — اشاره‌گر قابل کشف

### فایل‌های انتقال
- `PUSH_TO_GITHUB.md` — راهنمای پوش به گیت‌هاب
- `HTML2Elementor-GitHub-v1.9.0.zip` — ZIP سبک برای گیت‌هاب (3 MB)
- `HTML2Elementor-v1.9.0.bundle` — باندل گیت

## وضعیت فعلی

- نسخه: 1.9.0
- حجم ورک‌اسپیس: ~4.3 MB (سبک، بدون فایل‌های GGUF/DLL/ZIP حجیم)
- فایل‌های سنگین پاک شد: go/, versions/, build/, dist/
- سرور: `python3 app.py` روی پورت 7788 — برای پیش‌نمایش
- گیت: کامیت 3eb256f v1.9.0 آماده پوش

## برای بارگذاری در چت جدید

### روش 1 — آپلود ZIP ورک‌اسپیس
1. فایل `HTML2Elementor-Workspace-Full-v1.9.0.zip` را دانلود کنید (در همین پوشه ساخته می‌شود)
2. در چت جدید Arena AI، آن را آپلود کنید یا محتوای `html2elementor/` را کپی کنید
3. دستور:
```bash
cd html2elementor
python3 app.py --host 0.0.0.0 --port 7788
```

### روش 2 — کلون از گیت‌هاب (بعد از پوش)
```bash
git clone https://github.com/hossainghadimi/pic-or-html-to-element.git
cd pic-or-html-to-element
```

### روش 3 — کپی مستقیم پوشه html2elementor
کل پوشه `html2elementor/` را به ورک‌اسپیس جدید کپی کنید.

## چک‌لیست قبل از انتقال

- [x] فایل‌های سنگین پاک شد
- [x] .gitignore برای جلوگیری از پوش GGUF/DLL/ZIP
- [x] READMEها با لینک‌های دانلود کامل
- [x] نسخه 1.9.0 با منوی جداگانه
- [x] CPU+GPU همزمان فعال
- [x] گیت کامیت آماده
- [x] مستندات انتقال

## اجرای سرور در ورک‌اسپیس جدید

```bash
cd /home/user/html2elementor
H2E_HOST=0.0.0.0 H2E_PORT=7788 H2E_NO_BROWSER=1 python3 app.py
```

پیش‌نمایش: https://7788-{sandboxId}.e2b.app

## مدل‌ها (باید جداگانه دانلود و در پوشه‌ها ریخته شوند)

- Qwen3-VL-4B: models/
- Qwen2.5-Coder 7B / DeepSeek-R1-Distill-Qwen-7B: models/coder/
- CUDA DLLs: cuda/
- موتور CUDA: engine-cuda/

لینک‌ها در models/README.md و cuda/README.md و داخل UI تب Vision/Coder

## تاریخچه نسخه‌ها

- v1.7.0: نسخه اولیه Qwen-VL
- v1.8.0: پوشه‌های جداگانه models/, cuda/, CPU+GPU
- v1.8.1: منوی جداگانه vision/coder
- v1.9.0: نسخه نهایی انتقال — تمام تغییرات اعمال شد، نسخه‌های قبلی حذف شد

آماده انتقال!
