# Coder Models / مدل‌های کدنویس

این پوشه برای مدل‌های کدنویس (بدون نیاز به mmproj) است.

## مدل پیشنهادی

**Qwen2.5-Coder 7B Instruct Q4_K_M — 4.68 GB:**
https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_k_m.gguf?download=true

صفحه مدل:
https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF

## نحوه استفاده

1. فایل GGUF را دانلود کنید
2. در همین پوشه `models/coder/` یا مستقیم در `models/` قرار دهید:
```
models/
├── Qwen3VL-4B-Instruct-Q4_K_M.gguf
├── mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf
└── coder/
    └── qwen2.5-coder-7b-instruct-q4_k_m.gguf
```
3. برنامه به صورت خودکار (حتی زیرپوشه‌ها) اسکن می‌کند
4. در تب «تصویر به طرح با Qwen» لیست مدل‌ها را ببینید — مدل کدنویس بدون mmproj نشان داده می‌شود
5. برای چت کدنویسی، مدل کدنویس را انتخاب و حالت CPU+GPU را بزنید، سپس از API چت استفاده کنید

تفاوت:
- مدل بینایی (VL): نیاز به 2 فایل (مدل + mmproj) — برای تحلیل تصویر
- مدل کدنویس: فقط 1 فایل (مدل) — برای تولید/ویرایش HTML/CSS/JS

هر دو از یک پوشه `models/` استفاده می‌کنند و هر دو از حالت ترکیبی CPU+GPU پشتیبانی می‌کنند.
