(function(g){
'use strict';const $=s=>document.querySelector(s);let busy=false,canceled=false,job=null,lastScene=null,lastFile=null,lastResult=null,selected=null,startTime=0;
const repo='https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct-GGUF';
const label={container:'کانتینر',heading:'تیتر',text:'متن',button:'دکمه',image:'تصویر',icon:'آیکن خالی',divider:'جداکننده'};
async function api(path,data){const response=await fetch('/api/ai/'+path,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-H2E-Client':'1'},body:data===undefined?undefined:JSON.stringify(data)});const value=await response.json();if(!response.ok)throw Error(value.error||'خطای سرویس محلی');return value;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function message(text,level=''){const n=$('#visionStatus');n.textContent=text;n.className='vision-status '+level;}
function protect(fn){return async()=>{try{await fn()}catch(e){message(e.message,'error');}};}
function buttons(){for(const id of ['visionRun','visionRegister','visionRebuild','visionImage','visionInput','visionModel','visionMode','visionGpuLayers','visionCpuThreads'])$( '#'+id).disabled=busy||(id==='visionRebuild'&&!lastScene);$('#visionCancel').disabled=!busy;}
function files(){const pick=$('#visionImage'),old=pick.value;pick.replaceChildren();(g.H2EApp?.images()||[]).forEach((f,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=f.name;pick.appendChild(o)});if([...pick.options].some(o=>o.value===old))pick.value=old;if(!busy&&!lastScene)previewOriginal();}
async function previewOriginal(){const f=g.H2EApp?.images()[Number($('#visionImage').value)];if(!f)return;$('#visionSource').src=f.dataUrl;$('#visionBoxes').replaceChildren();}
async function models(){try{
 const r=await api('models');
 const pick=$('#visionModel'),old=pick.value;pick.replaceChildren();
 r.models.filter(m=>m.projector).forEach(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.name+' · '+(m.bytes/1048576).toFixed(0)+' MB';pick.appendChild(o)});
 if([...pick.options].some(o=>o.value===old))pick.value=old;
 if(!pick.options.length){const o=document.createElement('option');o.value='';o.textContent='ابتدا مدل + mmproj را در models/ قرار دهید یا ثبت کنید';pick.appendChild(o);}
 try{
  const s=await api('status');
  const el=$('#visionCudaStatus');
  if(el){
   const cpuOk=s.engines?.cpu?'✓':'✗';
   const cudaOk=s.engines?.cuda?'✓':'✗';
   const dlls=(s.cuda_dlls||[]).length;
   const modelsCount=s.models_found||0;
   el.textContent=`وضعیت: CPU ${cpuOk} | CUDA ${cudaOk} | DLL در cuda/: ${dlls} فایل | مدل در models/: ${modelsCount} فایل`;
  }
  const el2=$('#visionCudaDetail');
  if(el2){
   const s=await api('status');
   el2.textContent=`پوشه‌ها: models=${s.models_dir} | cuda=${s.cuda_dir} | engine=${s.engines?.cpu?'موجود':'ناموجود'} | engine-cuda=${s.engines?.cuda?'موجود':'ناموجود'} | DLLها: ${(s.cuda_dlls||[]).join(', ')||'هیچ'}`;
  }
 }catch(_){}
}catch(e){message(e.message,'error');}}
function draw(){if(!lastScene)return;$('#visionSource').src=lastFile.dataUrl;const overlay=$('#visionBoxes');overlay.replaceChildren();const all=H2EVisionLayout.flatten(lastScene);const W=lastScene.image.width,H=lastScene.image.height;all.forEach(n=>{const box=document.createElement('button');box.type='button';box.className='vision-box '+(n.type==='container'?'container':'leaf')+(selected===n.id?' selected':'');const [x,y,w,h]=n.box;box.style.cssText=`left:${100*x/W}%;top:${100*y/H}%;width:${100*w/W}%;height:${100*h/H}%`;box.title=label[n.type]+' · '+n.id+(n.text?' · '+n.text:'');box.setAttribute('aria-label',box.title);box.onclick=()=>choose(n.id);overlay.appendChild(box)});const select=$('#visionNode');select.replaceChildren();all.forEach(n=>{const o=document.createElement('option');o.value=n.id;o.textContent=(label[n.type]||n.type)+' · '+(n.text||n.id).slice(0,60);select.appendChild(o)});if(selected)select.value=selected;const counts={};all.forEach(n=>counts[n.type]=(counts[n.type]||0)+1);$('#visionCounts').textContent=Object.entries(counts).map(([t,n])=>label[t]+': '+n).join(' · ');$('#visionWarnings').textContent=(lastResult?.warnings||lastScene.warnings||[]).join('\n');$('#visionReview').hidden=false;$('#visionDownloadPlan').disabled=false;buttons();}
function choose(id){selected=id;draw();const n=H2EVisionLayout.flatten(lastScene).find(n=>n.id===id);if(!n)return;$('#visionNodeType').value=n.type;$('#visionNodeType').disabled=!!n.children?.length;$('#visionNodeText').value=n.text||'';$('#visionNodeText').disabled=n.type==='container';$('#visionNodeFont').value=n.style?.font_size||16;$('#visionNodeColor').value=n.style?.color||'#222222';}
async function ensureModel(){await models();const id=$('#visionModel').value;if(!id)throw Error('ابتدا فایل Qwen-VL و mmproj را در models/ قرار دهید یا ثبت کنید.');let status=await api('status');const mode=$('#visionMode').value;const gpu_layers=Number($('#visionGpuLayers')?.value||20);const cpu_threads=Number($('#visionCpuThreads')?.value||6);const current=status.active_model;const needRestart=!current?.vision||current.id!==id||current.mode!==mode||current.gpu_layers!==gpu_layers||current.cpu_threads!==cpu_threads||status.engine==='stopped';if(needRestart){message(`بارگذاری مدل بینایی (${mode}) — لایه‌های GPU: ${gpu_layers}، ترد CPU: ${cpu_threads} — CPU و GPU همزمان فعال می‌شوند…`);await api('models/start',{id,mode,gpu_layers,cpu_threads});}const deadline=Date.now()+300000;while(Date.now()<deadline){if(canceled)throw Error('تحلیل لغو شد');status=await api('status');if(status.engine==='ready'&&status.active_model?.vision){const am=status.active_model;const off=am.offloaded_layers!=null?` — ${am.offloaded_layers}/${am.total_layers||'?'} لایه روی GPU، بقیه روی CPU`:' — حالت ترکیبی CPU+GPU فعال';message(`مدل آماده${off} | ترد CPU: ${am.cpu_threads} | حالت: ${am.mode}`, 'success');return;}if(status.engine==='stopped')throw Error('موتور بارگذاری نشد؛ بررسی کنید: 1) engine-cuda/llama-server.exe موجود باشد 2) DLLهای cuda/ موجود باشند 3) mmproj با مدل یکسان باشد.');message('در حال بارگذاری مدل… '+Math.round((Date.now()-startTime)/1000)+'s — CPU و GPU همزمان آماده می‌شوند');await sleep(1200);}throw Error('بارگذاری طولانی شد؛ RAM/VRAM و لاگ را بررسی کنید.');}
async function runImage(file,options={}){
 if(busy)throw Error('تحلیل دیگری در حال اجراست');busy=true;$('#visionReview').hidden=true;canceled=false;job=null;startTime=Date.now();buttons();g.H2EApp.show('vision');
 try{message('آماده‌سازی تصویر…');const prepared=await H2EVisionLayout.prepare(file);$('#visionSource').src=prepared.dataUrl;$('#visionBoxes').replaceChildren();$('#visionProgress').value=2;if(canceled)throw Error('تحلیل لغو شد');await ensureModel();if(canceled)throw Error('تحلیل لغو شد');const response=await api('vision/analyze',{image:prepared.dataUrl,limit:Number($('#visionLimit').value)});job=response.id;const deadline=Date.now()+7200000;
  while(Date.now()<deadline){if(canceled)throw Error('تحلیل لغو شد');const status=await api('vision/jobs/'+job);$('#visionProgress').value=5+Math.round(85*status.done/Math.max(1,status.total));message((status.message||'در حال تحلیل با مدل…')+' · '+Math.round((Date.now()-startTime)/1000)+' ثانیه');if(status.state==='error')throw Error(status.error);if(status.state==='canceled')throw Error('تحلیل لغو شد');if(status.state==='ready'){lastScene=status.result;lastFile=prepared;selected=null;const direction=$('#visionDirection').value;if(direction!=='auto')lastScene.direction=direction;if(prepared.resized)lastScene.warnings.push('تصویر برای مصرف حافظه کمتر به '+prepared.width+'×'+prepared.height+' تغییر اندازه داده شد.');message('ساخت کانتینرها و ویجت‌های بومی…');await sleep(25);lastResult=await H2EVisionLayout.build(lastScene,lastFile,options);draw();choose(H2EVisionLayout.flatten(lastScene).find(n=>n.type!=='container')?.id||lastScene.children[0].id);$('#visionProgress').value=100;message('طرح ساخته شد؛ CPU و GPU همزمان استفاده شد — تمام المان‌ها قابل ویرایش‌اند.','success');return lastResult;}await sleep(1100);}
  await api('vision/cancel',{id:job});throw Error('زمان تحلیل بیش از حد شد؛ از تصویر کوتاه‌تر استفاده کنید.');
 }catch(e){message(e.message,'error');throw e;}finally{busy=false;buttons();}
}
async function cancel(){canceled=true;message('در حال لغو تحلیل و توقف مدل…');await api('vision/cancel',{id:job});message('تحلیل لغو و مدل متوقف شد.');}
$('#pane-vision').innerHTML=`<div class="vision-studio">
<header class="ai-hero"><div><span class="eyebrow">SCREENSHOT → EDITABLE WIDGETS — CPU+GPU</span><h2>از تصویر به طرح قابل‌ویرایش — CPU و GPU همزمان</h2><p>Qwen-VL طرح را می‌بیند؛ با حالت ترکیبی بخشی از لایه‌ها روی RTX 3050 و بقیه روی i5-12400 اجرا می‌شود.</p></div><span class="ai-badge">محلی · آفلاین · CPU+GPU</span></header>

<details class="vision-setup" open><summary>۱. مدل‌های بینایی — دانلود و قرار دادن در models/</summary><div class="vision-setup-grid"><div>
<h3>پیشنهاد اصلی برای 8GB VRAM — 4B</h3><b dir="ltr">Qwen3-VL-4B-Instruct · Q4_K_M</b><p>بهترین تعادل سرعت/کیفیت برای RTX 3050 8GB + 32GB RAM</p>
<div class="vision-links">
<a href="${repo}/resolve/main/Qwen3VL-4B-Instruct-Q4_K_M.gguf?download=true" target="_blank" rel="noopener noreferrer">↓ مدل 4B Q4_K_M — 2.5 GB</a>
<a href="${repo}/resolve/main/mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf?download=true" target="_blank" rel="noopener noreferrer">↓ mmproj 4B Q8_0 — 454 MB</a>
<a href="${repo}" target="_blank" rel="noopener noreferrer">صفحه مدل 4B در HuggingFace</a>
</div>
<h3 style="margin-top:14px">کیفیت بالاتر — 8B (نیاز به RAM بیشتر)</h3>
<div class="vision-links">
<a href="https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct-GGUF/resolve/main/Qwen3VL-8B-Instruct-Q4_K_M.gguf?download=true" target="_blank" rel="noopener noreferrer">↓ مدل 8B Q4_K_M — 5.03 GB</a>
<a href="https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct-GGUF/resolve/main/mmproj-Qwen3VL-8B-Instruct-Q8_0.gguf?download=true" target="_blank" rel="noopener noreferrer">↓ mmproj 8B Q8_0 — 752 MB</a>
<a href="https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct-GGUF" target="_blank">صفحه مدل 8B</a>
</div>
<small>هر دو فایل را از یک ریلیز دانلود کنید و در پوشه <code>models/</code> کنار برنامه بریزید — برنامه خودکار شناسایی می‌کند.</small>
</div><div>
<label>مسیر کامل مدل GGUF<input id="visionModelPath" dir="ltr" placeholder="./models/Qwen3VL-4B-Instruct-Q4_K_M.gguf"></label>
<label>مسیر کامل mmproj<input id="visionProjectorPath" dir="ltr" placeholder="./models/mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf"></label>
<button class="btn btn-primary" id="visionRegister">ثبت این جفت مدل</button>
<p>یا فایل‌ها را مستقیم در پوشه <b>models</b> بریزید؛ لیست خودکار به‌روز می‌شود.</p>
<div id="visionCudaStatus" class="muted" style="margin-top:8px;background:#f5f5f5;padding:6px;border-radius:4px"></div>
<div id="visionCudaDetail" class="muted" style="margin-top:4px;font-size:11px"></div>
</div></div></details>

<details class="vision-setup" open><summary>۲. موتور و DLLهای CUDA — برای استفاده همزمان CPU+GPU</summary><div class="vision-setup-grid"><div>
<h3>چه چیزی لازم است؟</h3>
<ol style="margin:8px 0;padding-right:18px;line-height:1.7">
<li><b>engine/llama-server.exe</b> — موتور CPU (18 MB)</li>
<li><b>engine-cuda/llama-server.exe</b> — موتور CUDA 12.4 (254 MB)</li>
<li><b>cuda/*.dll</b> — DLLهای CUDA Runtime (391 MB):<br><code>cudart64_12.dll, cublas64_12.dll, cublasLt64_12.dll</code></li>
</ol>
<p><b>حالت ترکیبی چطور کار می‌کند؟</b></p>
<pre style="background:#111;color:#0f0;padding:8px;border-radius:6px;font-size:11px;direction:ltr">-ngl 20  → 20 لایه روی GPU (RTX 3050)
        بقیه روی CPU (i5-12400)
-t 6    → 6 ترد CPU
= CPU و GPU همزمان فعال</pre>
<p>برای 8GB VRAM:</p>
<ul style="margin:4px 0;padding-right:18px"><li>4B مدل: <code>gpu_layers 20-28</code></li><li>8B مدل: <code>gpu_layers 18-24</code></li><li>ترد CPU: <code>6</code> (هسته فیزیکی) یا 8</li></ul>
<small>پوشه <code>cuda/</code> خودکار به PATH اضافه می‌شود. نیازی به نصب CUDA Toolkit نیست.</small>
</div><div>
<h3>لینک‌های دانلود رسمی — llama.cpp b11095</h3>
<div class="vision-links">
<a href="https://github.com/ggml-org/llama.cpp/releases/download/b11095/llama-b11095-bin-win-cpu-x64.zip" target="_blank" rel="noopener noreferrer">↓ موتور CPU — 18.5 MB</a>
<a href="https://github.com/ggml-org/llama.cpp/releases/download/b11095/llama-b11095-bin-win-cuda-12.4-x64.zip" target="_blank" rel="noopener noreferrer">↓ موتور CUDA 12.4 — 253 MB — به engine-cuda/ استخراج کنید</a>
<a href="https://github.com/ggml-org/llama.cpp/releases/download/b11095/cudart-llama-bin-win-cuda-12.4-x64.zip" target="_blank" rel="noopener noreferrer">↓ DLLهای CUDA 12.4 — 391 MB — به cuda/ استخراج کنید</a>
<a href="https://github.com/ggml-org/llama.cpp/releases/tag/b11095" target="_blank" rel="noopener noreferrer">صفحه ریلیز b11095 — همه فایل‌ها + توضیحات</a>
<a href="https://aka.ms/Microsoft.VCLibs.x64.14.00.Desktop.appx" target="_blank">↓ Microsoft VCLibs (اگر msvcp140.dll کم بود)</a>
</div>
<h3 style="margin-top:12px">ساختار نهایی پوشه‌ها</h3>
<pre dir="ltr" style="font-size:11px;white-space:pre-wrap;background:#111;color:#ddd;padding:8px;border-radius:6px">HTML2Elementor/
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
    └── ...</pre>
<h3 style="margin-top:12px">اختیاری — مدل کدنویسی</h3>
<div class="vision-links">
<a href="https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_k_m.gguf?download=true" target="_blank">↓ Qwen2.5-Coder 7B Q4_K_M — 4.68 GB — برای ویرایش HTML/JS</a>
<a href="https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF" target="_blank">صفحه مدل Coder 7B</a>
</div>
</div></div></details>

<section class="vision-controls"><label class="btn btn-ghost">＋ بارگذاری تصویر<input id="visionInput" type="file" accept="image/png,image/jpeg,image/webp" hidden></label><label>تصویر<select id="visionImage"></select></label><label>مدل<select id="visionModel"></select></label><label>حالت<select id="visionMode"><option value="cpu">CPU — فقط CPU</option><option value="cuda" selected>CPU+GPU ترکیبی — پیشنهادی</option></select></label><label>لایه GPU<input id="visionGpuLayers" type="number" min="1" max="64" value="20" title="تعداد لایه روی GPU، بقیه روی CPU — همین باعث استفاده همزمان می‌شود"></label><label>ترد CPU<input id="visionCpuThreads" type="number" min="1" max="24" value="6" title="تعداد هسته CPU"></label><label>جزئیات<select id="visionLimit"><option value="20">20 المان</option><option value="30" selected>30 المان</option><option value="40">40 المان</option></select></label><label>جهت<select id="visionDirection"><option value="auto">خودکار</option><option value="rtl">راست‌چین</option><option value="ltr">چپ‌چین</option></select></label></section>
<p class="muted" style="margin:6px 0">حالت <b>CPU+GPU ترکیبی</b>: <code>-ngl 20</code> یعنی 20 لایه روی RTX 3050 و بقیه روی i5-12400 — هر دو همزمان کار می‌کنند. برای 8GB VRAM مقدار 18-28 پیشنهاد می‌شود.</p>
<div class="ai-row"><button id="visionRun" class="btn btn-primary">۳. تحلیل تصویر و ساخت ویجت‌ها (CPU+GPU)</button><button id="visionCancel" class="btn btn-ghost danger" disabled>لغو و توقف</button><button id="visionRebuild" class="btn btn-ghost" disabled>بازسازی</button><button id="visionDownloadPlan" class="btn btn-ghost" disabled>دانلود JSON تشخیص</button></div>
<progress id="visionProgress" max="100" value="0"></progress><p id="visionStatus" class="vision-status" role="status">ابتدا تصویر را وارد کنید. حالت CPU+GPU همزمان فعال است.</p>
<div id="visionCounts"></div>
<div class="vision-workspace"><div class="vision-reference"><div class="vision-picture"><img id="visionSource" alt="تصویر مرجع"><div id="visionBoxes"></div></div></div><aside id="visionReview" hidden><h3>بازبینی تشخیص</h3><label>المان<select id="visionNode"></select></label><label>نوع<select id="visionNodeType">${Object.entries(label).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')}</select></label><label>متن<textarea id="visionNodeText" rows="5"></textarea></label><label>فونت<input id="visionNodeFont" type="number" min="8" max="120" value="16"></label><label>رنگ<input id="visionNodeColor" type="color" value="#222222"></label><button id="visionApply" class="btn btn-primary">ثبت اصلاح</button></aside></div>
<details><summary>موارد نیازمند بازبینی</summary><pre id="visionWarnings" dir="auto"></pre></details>
</div>`;

$('#visionInput').onchange=protect(async()=>{if($('#visionInput').files.length){lastScene=null;lastResult=null;await H2EApp.addFiles($('#visionInput').files);H2EApp.show('vision');files();}});
$('#visionImage').onchange=()=>{lastScene=null;lastResult=null;selected=null;$('#visionReview').hidden=true;$('#visionCounts').textContent='';$('#visionDownloadPlan').disabled=true;buttons();previewOriginal();};
$('#visionRegister').onclick=protect(async()=>{if(!$('#visionProjectorPath').value.trim())throw Error('مسیر mmproj را هم وارد کنید');const r=await api('models/register',{path:$('#visionModelPath').value,projector:$('#visionProjectorPath').value});await models();$('#visionModel').value=r.id;message('جفت مدل ثبت شد.','success');});
$('#visionRun').onclick=protect(async()=>{const f=H2EApp.images()[Number($('#visionImage').value)];if(!f)throw Error('ابتدا تصویر طرح را بارگذاری کنید');const r=await runImage(f,H2EApp.options());H2EApp.acceptVision(r);});
$('#visionCancel').onclick=protect(cancel);
$('#visionNode').onchange=e=>choose(e.target.value);
$('#visionApply').onclick=()=>{const n=H2EVisionLayout.flatten(lastScene).find(n=>n.id===selected);if(!n)return;n.type=$('#visionNodeType').value;n.text=$('#visionNodeText').value.slice(0,1200);n.style={...n.style,font_size:Math.max(8,Math.min(120,Number($('#visionNodeFont').value)||16)),color:$('#visionNodeColor').value};draw();message('اصلاح ثبت شد؛ بازسازی را بزنید.');};
$('#visionRebuild').onclick=protect(async()=>{if(!lastScene)return;if(!confirm('بازسازی، ویرایش‌های دستی خروجی این تصویر را جایگزین می‌کند؟'))return;lastResult=await H2EVisionLayout.build(lastScene,lastFile,H2EApp.options());H2EApp.acceptVision(lastResult);message('بازسازی شد.','success');});
$('#visionDownloadPlan').onclick=()=>{if(lastScene)H2EApp.download('vision-layout.json',JSON.stringify(lastScene,null,2),'application/json');};
$('[data-tab="vision"]').addEventListener('click',()=>{files();models();});
document.addEventListener('h2e:files',()=>{files();if(busy&&!H2EApp.images().length)cancel().catch(()=>{});});
g.H2EVision={runImage,cancel,refresh:()=>{files();models();}};
})(window);
