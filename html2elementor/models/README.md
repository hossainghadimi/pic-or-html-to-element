# Models Folder / پوشه مدل‌ها

این پوشه برای وارد کردن مدل‌های GGUF است — برنامه خودکار اسکن می‌کند.

## لینک‌های دانلود — مدل‌های بینایی Qwen3-VL (برای تصویر به طرح)

### پیشنهاد اصلی برای RTX 3050 8GB + i5-12400 + 32GB RAM — 4B
- **مدل 4B Q4_K_M (2.5 GB):**
  https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct-GGUF/resolve/main/Qwen3VL-4B-Instruct-Q4_K_M.gguf?download=true
- **mmproj 4B Q8_0 (454 MB):**
  https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct-GGUF/resolve/main/mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf?download=true
- صفحه مدل:
  https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct-GGUF

### کیفیت بالاتر — 8B (نیاز به RAM/VRAM بیشتر)
- **مدل 8B Q4_K_M (5.03 GB):**
  https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct-GGUF/resolve/main/Qwen3VL-8B-Instruct-Q4_K_M.gguf?download=true
- **mmproj 8B Q8_0 (752 MB):**
  https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct-GGUF/resolve/main/mmproj-Qwen3VL-8B-Instruct-Q8_0.gguf?download=true
- صفحه مدل:
  https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct-GGUF

## مدل کدنویسی (اختیاری — برای ویرایش HTML/CSS)

- **Qwen2.5-Coder 7B Q4_K_M (4.68 GB):**
  https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_k_m.gguf?download=true
- صفحه:
  https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF

## نحوه استفاده

1. هر دو فایل (مدل + mmproj) را از یک نسخه دانلود کنید
2. در همین پوشه `models/` کپی کنید
3. برنامه خودکار شناسایی می‌کند — نیازی به ثبت مسیر دستی نیست
4. در تب «تصویر به طرح با Qwen» مدل را انتخاب و حالت CPU+GPU را بزنید

```
models/
├── Qwen3VL-4B-Instruct-Q4_K_M.gguf
└── mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf
```

نکته: این فایل‌ها در ZIP اصلی نیستند و باید جداگانه دانلود شوند.

## مدل‌های کدنویس — در همین پوشه یا زیرپوشه coder/

مدل کدنویس فقط یک فایل دارد (بدون mmproj) و در همین پوشه یا `models/coder/` قرار می‌گیرد:

- **Qwen2.5-Coder 7B Q4_K_M (4.68 GB):**
  https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_k_m.gguf?download=true

ساختار پیشنهادی:
```
models/
├── Qwen3VL-4B-Instruct-Q4_K_M.gguf (بینایی)
├── mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf (بینایی)
└── coder/
    └── qwen2.5-coder-7b-instruct-q4_k_m.gguf (کدنویس)
```

هر دو نوع (بینایی و کدنویس) از حالت ترکیبی CPU+GPU پشتیبانی می‌کنند و خودکار شناسایی می‌شوند (حتی در زیرپوشه‌ها).
