(function(g){
'use strict';
const $=s=>document.querySelector(s);
let busy=false, selectedCoder=null;

async function api(path,data){
  const r=await fetch('/api/ai/'+path,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-H2E-Client':'1'},body:data===undefined?undefined:JSON.stringify(data)});
  const v=await r.json();
  if(!r.ok) throw Error(v.error||'خطای سرویس');
  return v;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function logCoder(text, cls=''){
  const el=$('#coderLog');
  if(!el) return;
  const line=document.createElement('div');
  line.textContent=text;
  if(cls) line.className=cls;
  el.appendChild(line);
  el.scrollTop=el.scrollHeight;
}

async function refreshCoderModels(){
  try{
    const res=await api('models');
    const pick=$('#coderModel');
    const old=pick.value;
    pick.replaceChildren();
    // coder models: those without projector OR marked coder OR in coder folder
    const coderModels=res.models.filter(m=>{
      const isCoder = !m.projector || m.coder || (m.path&&m.path.toLowerCase().includes('/coder/')) || /coder|deepseek|distill|code/i.test(m.name);
      return isCoder;
    });
    const visionModels=res.models.filter(m=>m.projector);

    // show coder models
    coderModels.forEach(m=>{
      const o=document.createElement('option');
      o.value=m.id;
      o.textContent=`${m.name} · ${(m.bytes/1048576).toFixed(0)} MB${m.path.includes('/coder/')?' · coder/':''}`;
      pick.appendChild(o);
    });
    if(coderModels.length===0){
      const o=document.createElement('option');
      o.value='';
      o.textContent='ابتدا مدل کدنویس را در models/coder/ قرار دهید';
      pick.appendChild(o);
    } else if([...pick.options].some(o=>o.value===old)){
      pick.value=old;
    }

    // status
    const status=await api('status');
    const sEl=$('#coderStatus');
    if(sEl){
      const cpuOk=status.engines?.cpu?'✓':'✗';
      const cudaOk=status.engines?.cuda?'✓':'✗';
      const total=status.models_found||0;
      const coderCount=coderModels.length;
      const visionCount=visionModels.length;
      sEl.textContent=`وضعیت: CPU ${cpuOk} | CUDA ${cudaOk} | کل مدل‌ها: ${total} | بینایی: ${visionCount} | کدنویس: ${coderCount}`;
    }
    const detail=$('#coderDetail');
    if(detail){
      const list=res.models.map(m=>{
        const folder = m.path.includes('/coder/')?'coder/': m.path.includes('/vision/')?'vision/':'models/';
        const type = m.projector?'بینایی': (m.coder||/coder|deepseek|distill/i.test(m.name)?'کدنویس':'متن');
        return `${type} · ${folder} · ${m.name}`;
      }).join('\n');
      detail.textContent=list||'هیچ مدلی یافت نشد';
    }

  }catch(e){
    logCoder('خطا: '+e.message,'error');
  }
}

async function ensureCoderModel(){
  const id=$('#coderModel').value;
  if(!id) throw Error('ابتدا یک مدل کدنویس از models/coder/ انتخاب کنید');
  let status=await api('status');
  const mode=$('#coderMode').value;
  const gpu_layers=Number($('#coderGpuLayers').value||24);
  const cpu_threads=Number($('#coderCpuThreads').value||6);
  const cur=status.active_model;
  const needRestart=!cur||cur.id!==id||cur.mode!==mode||cur.gpu_layers!==gpu_layers||cur.cpu_threads!==cpu_threads||status.engine==='stopped';
  if(needRestart){
    logCoder(`بارگذاری مدل کدنویس (${mode}) — GPU: ${gpu_layers} لایه، CPU: ${cpu_threads} ترد — CPU+GPU همزمان...`);
    await api('models/start',{id,mode,gpu_layers,cpu_threads});
  }
  const deadline=Date.now()+300000;
  while(Date.now()<deadline){
    status=await api('status');
    if(status.engine==='ready' && status.active_model){
      const am=status.active_model;
      const off=am.offloaded_layers!=null?` — ${am.offloaded_layers}/${am.total_layers||'?'} لایه GPU`:'';
      logCoder(`مدل آماده${off} | ${am.name} | ${am.mode} | ترد: ${am.cpu_threads}`,'success');
      return;
    }
    if(status.engine==='stopped') throw Error('موتور متوقف شد؛ engine/ یا engine-cuda/ و cuda/ را بررسی کنید');
    await sleep(1200);
  }
  throw Error('بارگذاری طولانی شد');
}

async function sendCoder(){
  const prompt=$('#coderPrompt').value.trim();
  if(!prompt) return;
  if(busy) throw Error('درخواست دیگری در حال اجراست');
  busy=true;
  $('#coderSend').disabled=true;
  logCoder('> '+prompt);
  try{
    await ensureCoderModel();
    // include selected HTML as context if requested
    let fullPrompt=prompt;
    if($('#coderIncludeSelection').checked){
      const srcSel = window.H2ESource?.selection?.();
      const liveSel = window.H2EPreview?.selection?.();
      const sel = srcSel || liveSel;
      if(sel && sel.html){
        fullPrompt = `کد زیر را ویرایش کن:\n\`\`\`html\n${sel.html.slice(0,8000)}\n\`\`\`\n\nدرخواست: ${prompt}\nفقط کد ویرایش شده را بده، توضیح اضافی نده.`;
      }
    }
    const res=await api('chat',{prompt:fullPrompt});
    logCoder(res.text||'(بدون پاسخ)');
  }catch(e){
    logCoder('خطا: '+e.message,'error');
  }finally{
    busy=false;
    $('#coderSend').disabled=false;
  }
}

function buildUI(){
  const pane=$('#pane-coder');
  if(!pane) return;
  pane.innerHTML=`<div class="vision-studio">
<header class="ai-hero"><div><span class="eyebrow">CODER MODELS — models/coder/</span><h2>بخش کدنویس — انتخاب جداگانه مدل‌ها</h2><p>هر پوشه مدل‌های خودش را دارد. اینجا فقط مدل‌های کدنویس از <code>models/coder/</code> و <code>models/</code> نمایش داده می‌شود. چند نسخه GGUF بریزید و بسته به نیاز انتخاب کنید.</p></div><span class="ai-badge">CPU+GPU همزمان</span></header>

<details class="vision-setup" open><summary>۱. مدل‌های کدنویس — پوشه models/coder/</summary><div class="vision-setup-grid"><div>
<h3>پوشه‌ها</h3>
<pre dir="ltr" style="font-size:11px;background:#111;color:#ddd;padding:8px;border-radius:6px">models/
├── Qwen3VL-4B-Instruct-Q4_K_M.gguf (بینایی)
├── mmproj-...gguf (بینایی)
└── coder/
    ├── qwen2.5-coder-7b-instruct-q4_k_m.gguf ← کدنویس 7B
    ├── DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf ← مدل شما
    └── qwen2.5-coder-14b-instruct-q4_k_m.gguf ← نسخه 14B (اختیاری)</pre>
<p>برنامه همه را <b>خودکار و بازگشتی</b> اسکن می‌کند. هر فایل جدید را بریزید و دکمه به‌روزرسانی را بزنید.</p>
<div class="vision-links">
<a href="https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_k_m.gguf?download=true" target="_blank">↓ Qwen2.5-Coder 7B Q4_K_M — 4.68 GB — بهترین برای کدنویسی</a>
<a href="https://huggingface.co/Qwen/Qwen2.5-Coder-14B-Instruct-GGUF/resolve/main/qwen2.5-coder-14b-instruct-q4_k_m.gguf?download=true" target="_blank">↓ Qwen2.5-Coder 14B Q4_K_M — 8.5 GB — کیفیت بالاتر</a>
<a href="https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF" target="_blank">صفحه Qwen2.5-Coder</a>
</div>
</div><div>
<label>مدل کدنویس — از models/coder/<select id="coderModel"></select></label>
<div style="display:flex;gap:8px"><label style="flex:1">حالت<select id="coderMode"><option value="cpu">CPU — فقط CPU</option><option value="cuda" selected>CPU+GPU ترکیبی</option></select></label><label>لایه GPU<input id="coderGpuLayers" type="number" min="1" max="64" value="24"></label><label>ترد CPU<input id="coderCpuThreads" type="number" min="1" max="24" value="6"></label></div>
<div style="display:flex;gap:8px;margin-top:8px"><button id="coderRefresh" class="btn btn-ghost">🔄 به‌روزرسانی لیست مدل‌ها</button><button id="coderStart" class="btn btn-primary">▶ اجرای مدل کدنویس</button><button id="coderStop" class="btn btn-ghost danger">■ توقف</button></div>
<p id="coderStatus" class="muted" style="margin-top:8px;background:#f5f5f5;padding:6px;border-radius:4px">در حال بررسی...</p>
<details><summary>جزئیات مدل‌های یافت شده</summary><pre id="coderDetail" style="font-size:11px;white-space:pre-wrap"></pre></details>
</div></div></details>

<details class="vision-setup" open><summary>۲. چت کدنویس — استفاده از مدل انتخاب شده</summary><div style="display:flex;flex-direction:column;gap:8px">
<div style="display:flex;gap:8px;align-items:center"><label style="display:flex;gap:4px;align-items:center"><input type="checkbox" id="coderIncludeSelection" checked> HTML انتخاب شده در پیش‌نمایش را به عنوان زمینه بفرست</label><button id="coderUseSelection" class="btn btn-ghost">📋 قرار دادن HTML انتخاب شده</button></div>
<textarea id="coderPrompt" rows="4" placeholder="مثلاً: این دکمه را به استایل گرادیانت تبدیل کن، یا: کلاس‌های Tailwind را به CSS معمولی تبدیل کن، یا: این فرم را ریسپانسیو کن" style="width:100%;font-family:monospace"></textarea>
<div style="display:flex;gap:8px"><button id="coderSend" class="btn btn-primary">ارسال به مدل کدنویس (CPU+GPU)</button><button id="coderClear" class="btn btn-ghost">پاک کردن لاگ</button></div>
<div id="coderLog" style="background:#111;color:#ddd;padding:10px;border-radius:6px;min-height:200px;max-height:400px;overflow:auto;font-family:monospace;font-size:12px;white-space:pre-wrap"></div>
</div></details>

<p class="muted">نکته: مدل بینایی (VL) برای تصویر لازم است (2 فایل)، مدل کدنویس برای ویرایش کد (1 فایل). هر بخش منوی خودش را دارد و می‌توانید چند نسخه GGUF در هر پوشه بریزید و بسته به نیاز انتخاب کنید. هر دو از حالت ترکیبی CPU+GPU پشتیبانی می‌کنند.</p>
</div>`;

  $('#coderRefresh').onclick=()=>refreshCoderModels();
  $('#coderStart').onclick=async()=>{
    try{ await ensureCoderModel(); }catch(e){ logCoder('خطا: '+e.message,'error'); }
  };
  $('#coderStop').onclick=async()=>{
    try{ await api('models/stop',{}); logCoder('مدل متوقف شد'); refreshCoderModels(); }catch(e){ logCoder(e.message); }
  };
  $('#coderSend').onclick=()=>sendCoder().catch(e=>logCoder(e.message,'error'));
  $('#coderClear').onclick=()=>{ $('#coderLog').innerHTML=''; };
  $('#coderUseSelection').onclick=()=>{
    const sel = window.H2ESource?.selection?.() || window.H2EPreview?.selection?.();
    if(!sel || !sel.html){ logCoder('هیچ المانی انتخاب نشده'); return; }
    $('#coderPrompt').value = `این HTML را ویرایش کن:\n\`\`\`html\n${sel.html.slice(0,6000)}\n\`\`\`\n\nدرخواست: `;
    $('#coderPrompt').focus();
  };
  // Enter to send with Ctrl+Enter
  $('#coderPrompt').addEventListener('keydown', (e)=>{
    if(e.ctrlKey && e.key==='Enter'){ sendCoder().catch(e=>logCoder(e.message,'error')); }
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  buildUI();
  // refresh when tab clicked
  const tab=document.querySelector('[data-tab="coder"]');
  if(tab) tab.addEventListener('click', ()=>{ refreshCoderModels(); });
});

g.H2ECoder={refresh:refreshCoderModels};

})(window);
