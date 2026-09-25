# HTML2Elementor 1.9.0 — نسخه نهایی با تمام تغییرات

## خلاصه تمام تغییرات از 1.7.0 تا 1.9.0

### 1. حذف کارگاه قدیمی
- تب کارگاه AI و آموزش حذف شد
- ai-studio.js حذف شد
- APIهای samples/train/predict غیرفعال

### 2. پوشه‌های جداگانه
- `models/` → مدل‌های بینایی (Qwen3-VL) — خودکار اسکن بازگشتی
- `models/vision/` → اختیاری برای مدل‌های بینایی
- `models/coder/` → مدل‌های کدنویس (Qwen2.5-Coder, DeepSeek-R1-Distill-Qwen) — خودکار اسکن
- `cuda/` → DLLهای CUDA جداگانه (cudart, cublas...)
- `engine/` → موتور CPU
- `engine-cuda/` → موتور CUDA

### 3. CPU+GPU همزمان
- حالت ترکیبی CPU+GPU پیش‌فرض
- کنترل‌های جدید: لایه GPU (gpu_layers) و ترد CPU (cpu_threads)
- مثال: -ngl 20 روی RTX 3050، بقیه روی i5-12400، -t 6
- لاگ offloaded X/Y layers

### 4. منوی جداگانه برای هر بخش (جدید در 1.9.0)
- تب «تصویر به طرح (models/)» → فقط مدل‌های بینایی (با mmproj)
- تب «کدنویس (models/coder/)» → فقط مدل‌های کدنویس (بدون mmproj)
- هر بخش می‌تواند چند نسخه GGUF داشته باشد و جداگانه انتخاب شود
- فایل جدید `coder-studio.js` برای بخش کدنویس

### 5. لینک‌های دانلود کامل
- موتور CPU 18.5 MB
- موتور CUDA 12.4 253 MB
- DLLهای CUDA 12.4 391 MB
- Qwen3-VL 4B (2.5GB+454MB) و 8B (5.03GB+752MB)
- Qwen2.5-Coder 7B (4.68GB) و 14B (8.5GB)
- DeepSeek-R1-Distill-Qwen-7B (مدل شما)

## ساختار نهایی
```
models/
├── vision/
│   ├── Qwen3VL-4B-Instruct-Q4_K_M.gguf
│   └── mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf
└── coder/
    ├── qwen2.5-coder-7b-instruct-q4_k_m.gguf
    └── DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf
cuda/
├── cudart64_12.dll
└── cublas...
engine/llama-server.exe
engine-cuda/llama-server.exe
```

## اجرا
ZIP را کامل استخراج کنید، مدل‌ها را در پوشه‌های خودشان بریزید، EXE را اجرا کنید. حالت CPU+GPU ترکیبی پیش‌فرض است.

## تست
- اسکن بازگشتی مدل‌ها
- تشخیص هوشمند coder vs vision
- CPU+GPU همزمان
- منوی جداگانه
