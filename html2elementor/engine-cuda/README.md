# Engine CUDA — برای استفاده همزمان CPU+GPU

این پوشه برای موتور CUDA است.

**دانلود موتور CUDA 12.4 (253 MB):**
https://github.com/ggml-org/llama.cpp/releases/download/b11095/llama-b11095-bin-win-cuda-12.4-x64.zip

استخراج کنید و `llama-server.exe` را اینجا قرار دهید.

**DLLهای CUDA (391 MB) — ضروری:**
https://github.com/ggml-org/llama.cpp/releases/download/b11095/cudart-llama-bin-win-cuda-12.4-x64.zip
→ این DLLها را در پوشه `../cuda/` بریزید، نه اینجا.

ساختار:
```
engine-cuda/
  llama-server.exe
cuda/
  cudart64_12.dll
  cublas64_12.dll
  ...
```

حالت ترکیبی: -ngl 20 یعنی 20 لایه روی GPU، بقیه روی CPU — هر دو همزمان.
