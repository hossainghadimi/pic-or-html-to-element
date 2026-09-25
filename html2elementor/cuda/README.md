# CUDA DLLs Folder / پوشه DLLهای CUDA — برای استفاده همزمان CPU+GPU

این پوشه برای DLLهای CUDA است که باعث می‌شود موتور CUDA بتواند از GPU استفاده کند و بقیه لایه‌ها روی CPU بماند — یعنی CPU و GPU همزمان.

## چه چیزی لازم است؟

برای حالت ترکیبی CPU+GPU، سه چیز لازم است:

1. **engine/llama-server.exe** — موتور CPU
2. **engine-cuda/llama-server.exe** — موتور CUDA
3. **cuda/*.dll** — DLLهای CUDA Runtime (این پوشه)

## لینک‌های دانلود رسمی — llama.cpp b11095 (سازگار با Qwen3-VL)

### موتورها
- **موتور CPU — 18.5 MB:**
  https://github.com/ggml-org/llama.cpp/releases/download/b11095/llama-b11095-bin-win-cpu-x64.zip
  → استخراج کنید و `llama-server.exe` را در `engine/` بریزید

- **موتور CUDA 12.4 — 253 MB:**
  https://github.com/ggml-org/llama.cpp/releases/download/b11095/llama-b11095-bin-win-cuda-12.4-x64.zip
  → استخراج کنید و `llama-server.exe` را در `engine-cuda/` بریزید

### DLLهای CUDA — ضروری برای GPU
- **CUDA Runtime 12.4 — 391 MB:**
  https://github.com/ggml-org/llama.cpp/releases/download/b11095/cudart-llama-bin-win-cuda-12.4-x64.zip
  → استخراج کنید و تمام DLLها را در همین پوشه `cuda/` بریزید
  شامل:
  - cudart64_12.dll
  - cublas64_12.dll
  - cublasLt64_12.dll
  - و چند DLL دیگر

- **صفحه ریلیز کامل b11095:**
  https://github.com/ggml-org/llama.cpp/releases/tag/b11095

- **Microsoft VCLibs (اگر msvcp140.dll خطا داد):**
  https://aka.ms/Microsoft.VCLibs.x64.14.00.Desktop.appx

## ساختار نهایی

```
HTML2Elementor/
├── models/
│   ├── Qwen3VL-4B-Instruct-Q4_K_M.gguf
│   └── mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf
├── engine/
│   └── llama-server.exe (CPU)
├── engine-cuda/
│   └── llama-server.exe (CUDA)
└── cuda/
    ├── cudart64_12.dll
    ├── cublas64_12.dll
    ├── cublasLt64_12.dll
    └── ...
```

## حالت ترکیبی CPU+GPU همزمان

```
-ngl 20  → 20 لایه روی RTX 3050 8GB
         بقیه روی i5-12400
-t 6     → 6 ترد CPU
= هر دو همزمان فعال
```

- برای 4B: gpu_layers 20-28
- برای 8B: gpu_layers 18-24
- ترد CPU: 6 (تعداد هسته فیزیکی) یا 8

برنامه پوشه `cuda/` را خودکار به PATH اضافه می‌کند — نیازی به نصب CUDA Toolkit نیست.

حجم کل CUDA ~645 MB است و در ZIP اصلی برنامه قرار نمی‌گیرد.
