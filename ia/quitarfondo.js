/* Quita el fondo de una foto en el mismo celular, sin enviar la foto a ningún servidor.
   Modelo: U2-Net liviano (u2netp), licencia Apache 2.0, tomado del proyecto rembg.
   Motor: ONNX Runtime Web, licencia MIT. */
(function(){
const BASE=new URL("./",document.currentScript.src).href,PESO=4574861,N=320;
let sess=null,cargando=null;
function script(src){return new Promise((ok,no)=>{const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=()=>no(new Error("red"));document.head.appendChild(s);});}
async function bajar(url,onp){const r=await fetch(url);if(!r.ok)throw new Error("red");
  if(!r.body||!r.body.getReader)return new Uint8Array(await r.arrayBuffer());
  const rd=r.body.getReader(),ch=[];let n=0;for(;;){const {done,value}=await rd.read();if(done)break;ch.push(value);n+=value.length;onp&&onp(Math.min(1,n/PESO));}
  const out=new Uint8Array(n);let o=0;for(const c of ch){out.set(c,o);o+=c.length;}return out;}
function preparar(onp){if(sess)return Promise.resolve(sess);if(cargando)return cargando;
  cargando=(async()=>{
    if(!window.ort)await script(BASE+"ort.wasm.min.js");
    ort.env.wasm.wasmPaths=BASE;ort.env.wasm.numThreads=1;
    const buf=await bajar(BASE+"u2netp.onnx",onp);
    sess=await ort.InferenceSession.create(buf,{executionProviders:["wasm"],graphOptimizationLevel:"all"});return sess;})();
  cargando.catch(()=>{cargando=null;});return cargando;}
function lienzo(w,h){const c=document.createElement("canvas");c.width=w;c.height=h;return c;}
/* reduce por mitades para que el modelo reciba una imagen limpia */
function reducir(src,w,h){let c=src,cw=src.width,ch=src.height;
  while(cw/2>w&&ch/2>h){const d=lienzo(Math.round(cw/2),Math.round(ch/2));const x=d.getContext("2d");x.imageSmoothingQuality="high";x.drawImage(c,0,0,d.width,d.height);c=d;cw=d.width;ch=d.height;}
  const d=lienzo(w,h),x=d.getContext("2d");x.imageSmoothingQuality="high";x.drawImage(c,0,0,w,h);return d;}
/* filtro guiado: pega el borde de la máscara al borde real del producto */
function caja(a,w,h,r){const t=new Float32Array(a.length),o=new Float32Array(a.length);
  for(let y=0;y<h;y++){let s=0;const b=y*w;for(let x=-r;x<w;x++){const xi=x+r;if(xi<w)s+=a[b+xi];const xo=x-r-1;if(xo>=0)s-=a[b+xo];if(x>=0)t[b+x]=s/(Math.min(w-1,x+r)-Math.max(0,x-r)+1);}}
  for(let x=0;x<w;x++){let s=0;for(let y=-r;y<h;y++){const yi=y+r;if(yi<h)s+=t[yi*w+x];const yo=y-r-1;if(yo>=0)s-=t[yo*w+x];if(y>=0)o[y*w+x]=s/(Math.min(h-1,y+r)-Math.max(0,y-r)+1);}}
  return o;}
function guiado(I,p,w,h,r,eps){const n=w*h,Ip=new Float32Array(n),II=new Float32Array(n);
  for(let i=0;i<n;i++){Ip[i]=I[i]*p[i];II[i]=I[i]*I[i];}
  const mI=caja(I,w,h,r),mp=caja(p,w,h,r),mIp=caja(Ip,w,h,r),mII=caja(II,w,h,r),a=new Float32Array(n),b=new Float32Array(n);
  for(let i=0;i<n;i++){const v=mII[i]-mI[i]*mI[i],c=mIp[i]-mI[i]*mp[i];a[i]=c/(v+eps);b[i]=mp[i]-a[i]*mI[i];}
  const ma=caja(a,w,h,r),mb=caja(b,w,h,r),q=new Float32Array(n);for(let i=0;i<n;i++){const v=ma[i]*I[i]+mb[i];q[i]=v<0?0:v>1?1:v;}return q;}
async function quitarFondo(src,onp){
  const s=await preparar(p=>onp&&onp("modelo",p));onp&&onp("foto",0);
  const W=src.width,H=src.height,sm=reducir(src,N,N),d=sm.getContext("2d").getImageData(0,0,N,N).data;
  let mx=1;for(let i=0;i<d.length;i+=4){if(d[i]>mx)mx=d[i];if(d[i+1]>mx)mx=d[i+1];if(d[i+2]>mx)mx=d[i+2];}
  const f=new Float32Array(3*N*N),M=[.485,.456,.406],S=[.229,.224,.225],P=N*N;
  for(let i=0;i<P;i++)for(let c=0;c<3;c++)f[c*P+i]=(d[i*4+c]/mx-M[c])/S[c];
  const out=await s.run({[s.inputNames[0]]:new ort.Tensor("float32",f,[1,3,N,N])});
  const m=out[s.outputNames[0]].data;let lo=1e9,hi=-1e9;for(let i=0;i<P;i++){if(m[i]<lo)lo=m[i];if(m[i]>hi)hi=m[i];}
  /* máscara al tamaño de trabajo (máx. 640) y afinado con la foto como guía */
  const k=Math.min(1,640/Math.max(W,H)),w=Math.max(8,Math.round(W*k)),h=Math.max(8,Math.round(H*k));
  const mc=lienzo(N,N),mx2=mc.getContext("2d"),mi=mx2.createImageData(N,N);
  for(let i=0;i<P;i++){const v=Math.round(255*(m[i]-lo)/(hi-lo||1));mi.data[i*4]=mi.data[i*4+1]=mi.data[i*4+2]=v;mi.data[i*4+3]=255;}mx2.putImageData(mi,0,0);
  const up=lienzo(w,h),ux=up.getContext("2d");ux.imageSmoothingQuality="high";ux.drawImage(mc,0,0,w,h);
  const md=ux.getImageData(0,0,w,h).data,gd=reducir(src,w,h).getContext("2d").getImageData(0,0,w,h).data,p=new Float32Array(w*h),I=new Float32Array(w*h);
  for(let i=0;i<w*h;i++){p[i]=md[i*4]/255;I[i]=(gd[i*4]*.299+gd[i*4+1]*.587+gd[i*4+2]*.114)/255;}
  const q=guiado(I,p,w,h,Math.max(3,Math.round(Math.max(w,h)/90)),1e-4);
  let dentro=0;for(let i=0;i<w*h;i++)if(p[i]>.5)dentro++;const parte=dentro/(w*h);
  if(parte<.015||parte>.97)throw new Error("fondo");
  /* máscara final a tamaño completo, con borde firme */
  const qc=lienzo(w,h),qx=qc.getContext("2d"),qi=qx.createImageData(w,h);
  for(let i=0;i<w*h;i++){let v=(.5*q[i]+.5*p[i]-.42)/.34;v=v<0?0:v>1?1:v;v=v*v*(3-2*v);qi.data[i*4]=qi.data[i*4+1]=qi.data[i*4+2]=255;qi.data[i*4+3]=Math.round(v*255);}qx.putImageData(qi,0,0);
  const res=lienzo(W,H),rx=res.getContext("2d");rx.imageSmoothingQuality="high";rx.drawImage(qc,0,0,W,H);rx.globalCompositeOperation="source-in";rx.drawImage(src,0,0);
  /* recorte al producto, con un poco de aire */
  let x0=w,y0=h,x1=0,y1=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(qi.data[(y*w+x)*4+3]>40){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  const pad=Math.round(Math.max(x1-x0,y1-y0)*.05),cx=Math.max(0,Math.floor((x0-pad)/k)),cy=Math.max(0,Math.floor((y0-pad)/k)),cw=Math.min(W,Math.ceil((x1+pad)/k))-cx,chh=Math.min(H,Math.ceil((y1+pad)/k))-cy;
  const fin=lienzo(Math.max(1,cw),Math.max(1,chh));fin.getContext("2d").drawImage(res,cx,cy,cw,chh,0,0,cw,chh);onp&&onp("foto",1);return fin;}
window.QuitarFondo={preparar,quitarFondo};
})();
