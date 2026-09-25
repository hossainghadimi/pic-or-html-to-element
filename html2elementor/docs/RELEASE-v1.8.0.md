# HTML2Elementor 1.8.0 — CPU+GPU همزمان، پوشه‌های جداگانه مدل و CUDA

## تغییرات اصلی نسبت به 1.7.0

### 1. حذف کارگاه آموزش قدیمی
- تب «کارگاه AI و آموزش» حذف شد
- فایل `ai-studio.js` حذف شد
- APIهای `samples`, `train`, `predict` غیرفعال شدند (پیام: بخش حذف شده)

### 2. پوشه جداگانه مدل‌ها — `models/`
- برنامه پوشه `models/` کنار EXE را خودکار اسکن می‌کند (حتی زیرپوشه‌ها)
- `models/README.md` شامل لینک‌های دانلود Qwen3-VL 4B/8B و Qwen2.5-Coder 7B
- `models/coder/` برای مدل‌های کدنویس (بدون mmproj)
- ساختار:
```
models/
├── Qwen3VL-4B-Instruct-Q4_K_M.gguf
├── mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf
└── coder/
    └── qwen2.5-coder-7b-instruct-q4_k_m.gguf
```

### 3. پوشه جداگانه CUDA — `cuda/`
- DLLهای CUDA از موتور جدا شد
- `cuda/README.md` شامل لینک‌های دانلود موتور و DLLها
- `engine/` موتور CPU، `engine-cuda/` موتور CUDA، `cuda/` DLLها
- برنامه پوشه `cuda/` را خودکار به PATH اضافه می‌کند

### 4. استفاده همزمان CPU و GPU
- حالت جدید `CPU+GPU ترکیبی` پیش‌فرض
- کنترل‌های جدید: `لایه GPU` و `ترد CPU`
- مثال: `-ngl 20` یعنی 20 لایه روی RTX 3050، بقیه روی i5-12400، `-t 6` ترد CPU
- لاگ `offloaded X/Y layers` نمایش داده می‌شود
- برای RTX 3050 8GB:
  - 4B: gpu_layers 20-28
  - 8B: gpu_layers 18-24
  - cpu_threads 6

### 5. لینک‌های دانلود کامل در UI
- تب «تصویر به طرح با Qwen» شامل تمام لینک‌های دانلود:
  - موتور CPU 18.5 MB
  - موتور CUDA 12.4 253 MB
  - DLLهای CUDA 12.4 391 MB
  - مدل‌های 4B/8B و Coder

## اجرای بسته

Windows 10/11 x64. ZIP را کامل استخراج کنید؛ پوشه‌های `runtime`, `engine`, `engine-cuda`, `cuda`, `models`, `ai` کنار EXE بمانند. EXE را اجرا کنید.

Python 3.12.10، Pillow، micrograd، موتور CPU داخل بسته‌اند. وزن مدل و CUDA داخل ZIP نیستند — جداگانه دانلود کنید و در پوشه‌های مربوطه بریزید.

## مدل پیشنهادی

**Qwen3-VL-4B-Instruct Q4_K_M + mmproj Q8_0:**
- https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct-GGUF/resolve/main/Qwen3VL-4B-Instruct-Q4_K_M.gguf?download=true (2.5 GB)
- https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct-GGUF/resolve/main/mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf?download=true (454 MB)

**CUDA:**
- https://github.com/ggml-org/llama.cpp/releases/download/b11095/llama-b11095-bin-win-cuda-12.4-x64.zip
- https://github.com/ggml-org/llama.cpp/releases/download/b11095/cudart-llama-bin-win-cuda-12.4-x64.zip

## محدودیت‌ها
- بدون مدل بینایی، تحلیل تصویر ممکن نیست
- ریسپانسیو از یک تصویر قابل استنتاج قطعی نیست
- تصاویر بلند بخش‌بندی می‌شوند
- مدل کدنویس فقط یک فایل دارد (بدون mmproj)

سورس قابل ویرایش در `source/` قرار دارد.
