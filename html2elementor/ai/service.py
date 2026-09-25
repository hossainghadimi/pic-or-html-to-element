"""Offline local AI service. No shell commands, remote downloads, or pickle models."""
import argparse, base64, hashlib, io, json, math, os, random, secrets, socket, subprocess, sys, threading, time
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image, ImageStat, ImageFilter
from micrograd.nn import MLP
from vision import Jobs
from studio import StudioJobs, Imports
import re

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get('H2E_DATA', str(Path(os.environ.get('LOCALAPPDATA', str(ROOT))) / 'HTML2Elementor-data')))
DATA.mkdir(parents=True, exist_ok=True)
LOCK = threading.RLock()
LOG = deque(maxlen=250)
PROC = None
ENGINE_PORT = 0
ENGINE_KEY = secrets.token_urlsafe(24)
ACTIVE_MODEL = None
TRAIN = {'state':'idle'}
FEATURES = 32

def load(name, default):
    p = DATA / name
    return json.loads(p.read_text('utf-8')) if p.exists() else default

def save(name, value):
    p = DATA / name
    t = p.with_suffix('.tmp')
    t.write_text(json.dumps(value, ensure_ascii=False), 'utf-8'); t.replace(p)

def log(text):
    LOG.append(time.strftime('%H:%M:%S')+' '+str(text)[:2000])

VISION_JOBS = Jobs(log)
STUDIO_JOBS = StudioJobs(log)
IMPORTS = Imports(DATA)

def gguf_path(value):
    p=Path(str(value or '').strip().strip(chr(34))).expanduser().resolve()
    if not p.is_file() or p.suffix.lower()!='.gguf':raise ValueError('مسیر فایل محلی GGUF معتبر نیست؛ URL پذیرفته نمی‌شود.')
    with p.open('rb') as f:
        if f.read(4)!=b'GGUF':raise ValueError('سرآیند فایل GGUF معتبر نیست')
    return p

MODELS_DIR = ROOT / 'models'
CUDA_DIR = ROOT / 'cuda'
ENGINE_CPU_DIR = ROOT / 'engine'
ENGINE_CUDA_DIR = ROOT / 'engine-cuda'

def scan_models_folder():
    try:
        if not MODELS_DIR.is_dir():
            return []
        rows = load('models.json', [])
        existing_paths = {r.get('path') for r in rows}
        # scan recursively to support models/coder/ subfolder
        ggufs = list(MODELS_DIR.rglob('*.gguf'))
        # separate mmproj candidates
        mmprojs = [p for p in ggufs if 'mmproj' in p.name.lower() or 'mmproj' in p.stem.lower() or p.name.lower().startswith('mmproj')]
        mains = [p for p in ggufs if p not in mmprojs]
        added = False
        for main in mains:
            if str(main.resolve()) in existing_paths:
                continue
            is_coder = 'coder' in main.name.lower() or 'code' in main.stem.lower() and 'vl' not in main.name.lower()
            # For coder models, never auto-pair with mmproj
            projector = None
            if not is_coder:
                # heuristic: look for mmproj with same model family
                for mp in mmprojs:
                    # same folder or same family
                    if mp.parent == main.parent or main.stem.split('-')[0].lower() in mp.stem.lower() or ('4b' in main.name.lower() and '4b' in mp.name.lower()) or ('8b' in main.name.lower() and '8b' in mp.name.lower()):
                        projector = mp
                        break
                # only auto-pair single mmproj if not coder and same folder
                if not projector and len(mmprojs) == 1 and not is_coder:
                    # avoid pairing if main is clearly coder
                    if mmprojs[0].parent == main.parent or MODELS_DIR in main.parents:
                        projector = mmprojs[0]
            try:
                gguf_path(main)
                if projector:
                    gguf_path(projector)
            except Exception:
                continue
            ident = hashlib.sha256((str(main.resolve())+'|'+str(projector.resolve() if projector else '')).encode()).hexdigest()[:12]
            if any(r['id']==ident for r in rows):
                continue
            rows = [x for x in rows if x['id']!=ident]
            rows.append({'id':ident,'name':main.name,'path':str(main.resolve()),'bytes':main.stat().st_size,'projector':str(projector.resolve()) if projector else '','vision':bool(projector),'coder':is_coder})
            added = True
            existing_paths.add(str(main.resolve()))
        if added:
            save('models.json', rows)
        return rows
    except Exception as e:
        log('Scan models folder: '+str(e))
        return load('models.json', [])

def model_request(port,payload,timeout=900):
    req=Request(f'http://127.0.0.1:{port}/v1/chat/completions',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json','Authorization':'Bearer '+ENGINE_KEY})
    try:
        with urlopen(req,timeout=timeout) as r:return json.load(r)
    except Exception as e:
        import urllib.error
        if isinstance(e,urllib.error.HTTPError):
            detail=e.read(4096).decode('utf-8','replace')
            raise ValueError('خطای موتور بینایی: '+detail)
        raise ValueError('ارتباط با موتور قطع شد یا زمان پاسخ تمام شد: '+str(e))

class Tags(HTMLParser):
    def __init__(self):
        super().__init__(); self.tags=[]; self.attrs=[]; self.text=''
    def handle_starttag(self,t,a): self.tags.append(t); self.attrs.extend(k for k,v in a)
    def handle_data(self,d): self.text+=d

def features(item):
    if item.get('kind') == 'image':
        raw = base64.b64decode(item.get('data','').split(',')[-1], validate=True)
        if len(raw)>8_000_000: raise ValueError('حد تصویر: ۸ مگابایت')
        with Image.open(io.BytesIO(raw)) as im:
            if im.format not in ('PNG','JPEG','WEBP','BMP','GIF'):raise ValueError('قالب تصویر پشتیبانی نمی‌شود')
            if im.width*im.height>16_000_000: raise ValueError('حد تصویر: ۱۶ مگاپیکسل')
            ratio = min(8,im.width/max(1,im.height))/8
            im=im.convert('RGB'); thumb=im.resize((4,4)).convert('L')
            f=[1,ratio]+[x/255 for x in thumb.getdata()]+[x/255 for x in ImageStat.Stat(im.resize((32,32))).mean]
            f += [ImageStat.Stat(im.resize((32,32)).convert('L').filter(ImageFilter.FIND_EDGES)).mean[0]/255]
    else:
        text=str(item.get('html',''))
        if not text or len(text)>200_000: raise ValueError('HTML خالی یا بیش از حد بزرگ است')
        h=Tags();h.feed(text)
        names=['button','a','h1','h2','h3','p','span','div','svg','i','img','input','ul','section','form','table']
        f=[0]+[min(5,h.tags.count(n))/5 for n in names]+[float(a in h.attrs) for a in ['href','src','viewbox','role','style']]
        f += [min(1,len(h.text)/300), min(1,len(h.tags)/20)]
    return (f+[0]*FEATURES)[:FEATURES]

def network():
    random.seed(42)
    return MLP(FEATURES,[8,6])

def new_network(labels):
    random.seed(42)
    return MLP(FEATURES,[8,len(labels)])

def train_worker(rows, epochs):
    global TRAIN
    try:
        labels=sorted(set(x['label'] for x in rows)); net=new_network(labels)
        params=net.parameters(); rng=random.Random(42)
        for ep in range(epochs):
            rng.shuffle(rows); total=0
            for item in rows:
                outputs=net(item['features']); outputs=outputs if isinstance(outputs,list) else [outputs]
                target=labels.index(item['label'])
                loss=sum((v-(1.0 if j==target else -1.0))**2 for j,v in enumerate(outputs))/len(labels)
                net.zero_grad();loss.backward()
                for p in params: p.data-=0.025*max(-5,min(5,p.grad))
                total+=loss.data
            TRAIN={'state':'training','epoch':ep+1,'epochs':epochs,'loss':round(total/len(rows),6)}
        correct=0
        for item in rows:
            out=net(item['features']);guess=max(range(len(labels)),key=lambda j:out[j].data)
            correct+=labels[guess]==item['label']
        artifact={'schema':1,'features':FEATURES,'labels':labels,'weights':[p.data for p in params],'samples':len(rows),'trained_at':time.time()}
        with LOCK: save('classifier.json',artifact)
        TRAIN={'state':'ready','samples':len(rows),'training_accuracy':round(correct/len(rows),3),'note':'امتیاز روی داده آموزشی است؛ ارزیابی مستقل نیست.'}
        log('Classifier saved. '+json.dumps(TRAIN,ensure_ascii=False))
    except Exception as e:
        TRAIN={'state':'error','error':str(e)};log(str(e))

def engine_status():
    if PROC is None or PROC.poll() is not None:return 'stopped'
    try:
        with urlopen(Request(f'http://127.0.0.1:{ENGINE_PORT}/health',headers={'Authorization':'Bearer '+ENGINE_KEY}),timeout=.4) as r:
            return 'ready' if r.status==200 else 'loading'
    except Exception:return 'loading'

def stop_engine():
    global PROC, ACTIVE_MODEL
    VISION_JOBS.cancel()
    STUDIO_JOBS.cancel()
    if PROC is not None and PROC.poll() is None:
        PROC.terminate()
        try:PROC.wait(timeout=4)
        except subprocess.TimeoutExpired:PROC.kill();PROC.wait(timeout=4)
    PROC=None;ACTIVE_MODEL=None;log('Model stopped')

def engine_log(proc):
    for line in proc.stdout:
        log(line.rstrip())
        match=re.search(r"offloaded (\d+)/(\d+) layers",line)
        if match and PROC is proc and ACTIVE_MODEL is not None:
            ACTIVE_MODEL.update(offloaded_layers=int(match[1]),total_layers=int(match[2]))
    log('Engine exit: '+str(proc.wait()))

def dispatch(path, data=None):
    global PROC, ENGINE_PORT, TRAIN, ACTIVE_MODEL
    with LOCK:
        if path=='status':
            def engine_exists(mode,folder):
                base = Path(os.environ.get('H2E_ENGINE_ROOT',str(ROOT))) / folder
                exe = base / ('llama-server.exe' if os.name=='nt' else 'llama-server')
                if exe.is_file():
                    return True
                # also check if exe exists in root/models? no, only engine folders
                return False
            cuda_dlls = []
            if CUDA_DIR.is_dir():
                cuda_dlls = [p.name for p in CUDA_DIR.glob('*.dll')]
            return {'ok':True,'python':sys.version.split()[0],'vision':'Pillow','ml':'micrograd','offline':True,'engine':engine_status(),'training':TRAIN,'samples':len(load('samples.json',[])),'data_dir':str(DATA),'model':load('classifier.json',{}).get('labels',[]),'logs':list(LOG),'active_model':ACTIVE_MODEL,'vision_busy':VISION_JOBS.busy(),'studio_busy':STUDIO_JOBS.busy(),'engines':{mode:engine_exists(mode,folder) for mode,folder in [('cpu','engine'),('cuda','engine-cuda')]},'cuda_dir':str(CUDA_DIR),'cuda_dlls':cuda_dlls,'models_dir':str(MODELS_DIR),'models_found':len(list(MODELS_DIR.glob('*.gguf'))) if MODELS_DIR.is_dir() else 0}
        if path.startswith('imports/'):return IMPORTS.dispatch(path,data)
        if path.startswith('studio/jobs/'):return STUDIO_JOBS.get(path.rsplit('/',1)[-1])
        if path=='studio/cancel':stop_engine();return {'state':'canceled'}
        if path=='studio/run':
            if engine_status()!='ready' or not ACTIVE_MODEL:raise ValueError('ابتدا مدل را اجرا کنید')
            if VISION_JOBS.busy() or STUDIO_JOBS.busy():raise ValueError('تحلیل قبلی در حال اجراست')
            port=ENGINE_PORT
            return STUDIO_JOBS.start(data,ACTIVE_MODEL,lambda payload:model_request(port,payload))
        if path=='models':
            rows = scan_models_folder()
            if not rows:
                rows = load('models.json', [])
            return {'models':rows}
        if path=='models/register':
            p=gguf_path(data.get('path'))
            projector=gguf_path(data.get('projector')) if data.get('projector') else None
            if projector and projector==p:raise ValueError('فایل مدل و mmproj باید جدا باشند')
            rows=load('models.json',[]);ident=hashlib.sha256((str(p)+'|'+str(projector or '')).encode()).hexdigest()[:12]
            rows=[x for x in rows if x['id']!=ident];rows.append({'id':ident,'name':p.name,'path':str(p),'bytes':p.stat().st_size,'projector':str(projector) if projector else '', 'vision':bool(projector)});save('models.json',rows)
            return {'models':rows,'id':ident}
        if path=='models/start':
            model=next((m for m in load('models.json',[]) if m['id']==data.get('id')),None)
            if not model:raise ValueError('ابتدا فایل GGUF را ثبت کنید.')
            if VISION_JOBS.busy() or STUDIO_JOBS.busy():raise ValueError('پیش از تغییر مدل درخواست فعال را لغو کنید')
            mode=data.get('mode','cpu')
            if mode not in ('cpu','cuda'):raise ValueError('حالت اجرا نامعتبر')
            layers=max(1,min(64,int(data.get('gpu_layers',20)))) if mode=='cuda' else 0
            threads=max(1,min(24,int(data.get('cpu_threads',6))))
            ctx=max(2048,min(16384,int(data.get('context',8192 if model.get('projector') else 2048))))
            image_tokens=max(256,min(2048,int(data.get('image_tokens',1536))))
            folder='engine-cuda' if mode=='cuda' else 'engine'
            base_root = Path(os.environ.get('H2E_ENGINE_ROOT',str(ROOT)))
            exe=base_root/folder/('llama-server.exe' if os.name=='nt' else 'llama-server')
            if not exe.is_file():raise ValueError('موتور '+folder+' موجود نیست. فایل llama-server.exe را در پوشه '+folder+' قرار دهید. برای CUDA، پوشه cuda جداگانه برای DLLهاست.')
            gguf_path(model['path'])
            if model.get('projector'):gguf_path(model['projector'])
            stop_engine()
            with socket.socket() as s:s.bind(('127.0.0.1',0));ENGINE_PORT=s.getsockname()[1]
            args=[str(exe),'-m',model['path'],'--host','127.0.0.1','--port',str(ENGINE_PORT),'--api-key',ENGINE_KEY,'-c',str(ctx),'--parallel','1','--offline','-t',str(threads),'-ngl',str(layers)]
            if model.get('projector'):
                args.extend(['--mmproj',model['projector'],'--image-min-tokens','128','--image-max-tokens',str(image_tokens),'--mtmd-batch-max-tokens','512'])
                if mode=='cpu':args.append('--no-mmproj-offload')
            ACTIVE_MODEL={'id':model['id'],'name':model['name'],'vision':bool(model.get('projector')),'mode':mode,'context':ctx,'gpu_layers':layers,'cpu_threads':threads,'image_tokens':image_tokens,'offloaded_layers':None}
            # Prepare environment with CUDA DLL folder in PATH
            env = os.environ.copy()
            extra_paths = []
            if (base_root / 'cuda').is_dir():
                extra_paths.append(str(base_root / 'cuda'))
            if (base_root / folder).is_dir():
                extra_paths.append(str(base_root / folder))
            if extra_paths:
                env['PATH'] = os.pathsep.join(extra_paths) + os.pathsep + env.get('PATH','')
                # On Windows Python 3.8+ add_dll_directory is handled by exe itself, but we also set CUDA_PATH
                if mode=='cuda':
                    env['CUDA_PATH'] = env.get('CUDA_PATH', str(base_root / 'cuda'))
            PROC=subprocess.Popen(args,cwd=exe.parent,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace',env=env,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
            threading.Thread(target=engine_log,args=(PROC,),daemon=True).start();log('Loading '+model['name']+' / '+mode+' | PATH extra: '+','.join(extra_paths))
            return {'state':'loading'}
        if path=='models/stop':stop_engine();return {'state':'stopped'}
        if path.startswith('vision/jobs/'):
            return VISION_JOBS.get(path.rsplit('/',1)[-1])
        if path=='vision/analyze':
            if STUDIO_JOBS.busy():raise ValueError('درخواست ویرایش در حال اجراست')
            if engine_status()!='ready' or not ACTIVE_MODEL or not ACTIVE_MODEL.get('vision'):
                raise ValueError('ابتدا مدل بینایی را همراه mmproj ثبت و اجرا کنید؛ مدل متنی تصویر نمی‌خواند.')
            port=ENGINE_PORT
            return VISION_JOBS.start(data,ACTIVE_MODEL,lambda payload:model_request(port,payload))
        if path=='vision/cancel':
            VISION_JOBS.cancel(data.get('id'));stop_engine();return {'state':'canceled','engine':'stopped'}
        if path in ('samples','samples/add','samples/delete','samples/import','train','predict'):
            raise ValueError('بخش کارگاه آموزش حذف شده است. از پوشه models برای مدل‌های GGUF و تب «تصویر به طرح با Qwen» استفاده کنید.')
    if path=='chat':
        if VISION_JOBS.busy() or STUDIO_JOBS.busy():raise ValueError('تحلیل تصویر در حال اجراست؛ برای گفت‌وگو صبر کنید یا تحلیل را لغو کنید')
        prompt=str(data.get('prompt',''))
        if not prompt.strip() or len(prompt)>12000:raise ValueError('پیام خالی یا بلندتر از ۱۲۰۰۰ کاراکتر است')
        if engine_status()!='ready':raise ValueError('مدل آماده نیست؛ ابتدا یک مدل (بینایی یا کدنویس) را از پوشه models اجرا کنید')
        # coder models work with same endpoint
        req=Request(f'http://127.0.0.1:{ENGINE_PORT}/v1/chat/completions',data=json.dumps({'messages':[{'role':'user','content':prompt}],'max_tokens':512,'temperature':.3,'stream':False}).encode(),headers={'Content-Type':'application/json','Authorization':'Bearer '+ENGINE_KEY})
        with urlopen(req,timeout=180) as r:result=json.load(r)
        return {'text':result['choices'][0]['message']['content']}
    raise ValueError('مسیر ناشناخته')

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def do_GET(self):self.handle_api(False)
    def do_POST(self):self.handle_api(True)
    def handle_api(self,post):
        if self.headers.get('X-H2E-Token')!=self.server.token:self.send_error(403);return
        try:
            path=self.path.split('?',1)[0].removeprefix('/api/ai/')
            if not post and path not in ('status','models','samples') and not path.startswith(('vision/jobs/','studio/jobs/')):raise ValueError('POST لازم است')
            length=int(self.headers.get('Content-Length','0'))
            if length>12_000_000:raise ValueError('درخواست بیش از حد بزرگ است')
            data=json.loads(self.rfile.read(length)) if post else None
            result=dispatch(path,data);status=200
        except Exception as e:result={'error':str(e)};status=400
        raw=json.dumps(result,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.end_headers()
        try:self.wfile.write(raw)
        except BrokenPipeError:pass

def main():
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=0);p.add_argument('--token',required=True);p.add_argument('--parent',type=int,default=0);a=p.parse_args()
    server=ThreadingHTTPServer(('127.0.0.1',a.port),Handler);server.token=a.token
    if a.parent:
        def parent_watch():
            while True:
                time.sleep(3)
                if os.name=='nt':
                    import ctypes
                    h=ctypes.windll.kernel32.OpenProcess(0x1000,False,a.parent)
                    if h:ctypes.windll.kernel32.CloseHandle(h)
                    else:stop_engine();os._exit(0)
                else:
                    try:os.kill(a.parent,0)
                    except ProcessLookupError:stop_engine();os._exit(0)
        threading.Thread(target=parent_watch,daemon=True).start()
    print(server.server_port,flush=True)
    try:server.serve_forever()
    finally:stop_engine();IMPORTS.close()
if __name__=='__main__':main()
