
(function(){
var $=function(i){return document.getElementById(i)};
var video=$('video'),shot=$('shot'),play=$('play'),frame=$('frame'),count=$('count'),msg=$('msg'),toast=$('toast'),recBadge=$('rec'),
flip=$('flip'),mic=$('mic'),snap=$('snap'),record=$('record'),stop=$('stop'),retake=$('retake'),save=$('save'),share=$('share'),mPhoto=$('mPhoto'),mVideo=$('mVideo');
var MAX_SEC=15,REC_W=720,REC_H=1280,facing='user',micOn=true;
var stream=null,mode='photo',blob=null,fname='',busy=false,recording=false,recorder=null,chunks=[],raf=0,timer=0,t0=0,mime='',playUrl='';

function say(t){toast.textContent=t||''}
function wait(ms){return new Promise(function(r){setTimeout(r,ms)})}
function showMsg(h){msg.innerHTML=h;msg.style.display='block'}
function show(){for(var i=0;i<arguments.length;i++)arguments[i].classList.remove('hide')}
function hide(){for(var i=0;i<arguments.length;i++)arguments[i].classList.add('hide')}

async function startCam(){
  msg.style.display='none';say('');
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){showMsg('Camera is not available in this browser. Please open this link in Safari or Chrome.');return}
  try{
    if(stream)stream.getTracks().forEach(function(t){t.stop()});
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:2160},height:{ideal:2880},aspectRatio:{ideal:0.75}},audio:false});
    video.srcObject=stream;
    try{var tr=stream.getVideoTracks()[0],cap=tr.getCapabilities?tr.getCapabilities():{};if(cap.zoom&&cap.zoom.min!==undefined){await tr.applyConstraints({advanced:[{zoom:cap.zoom.min}]})}}catch(e){}video.style.transform=(facing==='user')?'scaleX(-1)':'none';await video.play().catch(function(){});
    snap.disabled=false;record.disabled=false;
  }catch(e){
    showMsg('Please allow camera access to take your selfie.<br><button id="retry">Try again</button>');
    $('retry').onclick=startCam;
  }
}

function resetLive(){
  blob=null;say('');
  shot.style.display='none';
  play.pause();play.style.display='none';play.removeAttribute('src');
  if(playUrl){URL.revokeObjectURL(playUrl);playUrl=''}
  video.play().catch(function(){});
  hide(retake,save,share,stop,snap,record,mic);show(flip);
  recBadge.style.display='none';
  if(mode==='photo')show(snap);else show(record,mic);
}
function setMode(m){
  if(recording||busy)return;
  mode=m;
  mPhoto.classList.toggle('on',m==='photo');mVideo.classList.toggle('on',m==='video');
  resetLive();
}
mPhoto.onclick=function(){setMode('photo')};
mVideo.onclick=function(){setMode('video')};

function done(){hide(snap,record,stop,flip,mic);show(retake,save,share)}

/* PHOTO */
snap.onclick=async function(){
  if(busy||!stream)return;busy=true;snap.disabled=true;
  count.style.display='flex';
  for(var i=3;i>0;i--){count.textContent=i;await wait(1000)}
  count.style.display='none';
  var W=frame.naturalWidth||941,H=frame.naturalHeight||1672;
  shot.width=W;shot.height=H;
  drawTo(shot.getContext('2d'),W,H);
  shot.style.display='block';
  blob=await new Promise(function(r){shot.toBlob(r,'image/jpeg',0.93)});
  fname='Doras-Shopyee-Selfie-'+Date.now()+'.jpg';
  video.pause();done();snap.disabled=false;busy=false;
};
var HX=0,HY=0,HW=1,HH=1;
function drawVideo(c,W,H,mirror){
  var vw=video.videoWidth,vh=video.videoHeight;
  c.fillStyle='#fde4ef';c.fillRect(0,0,W,H);
  if(!vw||!vh)return;
  var bx=HX*W,by=HY*H,bw=HW*W,bh=HH*H;
  var s=Math.max(bw/vw,bh/vh),dw=vw*s,dh=vh*s,cx=bx+bw/2,cy=by+bh/2;
  c.save();
  if(mirror){c.translate(2*cx,0);c.scale(-1,1)}
  c.drawImage(video,cx-dw/2,cy-dh/2,dw,dh);
  c.restore();
}
function drawTo(c,W,H){
  drawVideo(c,W,H,false);
  c.drawImage(frame,0,0,W,H);
}
/* REEL */
function pickMime(){
  if(typeof MediaRecorder==='undefined')return '';
  var c=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  for(var i=0;i<c.length;i++){if(MediaRecorder.isTypeSupported(c[i]))return c[i]}
  return '';
}
record.onclick=async function(){
  if(busy||!stream||recording)return;
  mime=pickMime();
  if(!mime){say('Video recording is not supported on this browser. Please use the latest Chrome or Safari.');return}
  busy=true;record.disabled=true;
  var aStream=null;
  if(micOn){try{aStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})}catch(e){say('Microphone blocked, recording without sound.')}}
  count.style.display='flex';
  for(var i=3;i>0;i--){count.textContent=i;await wait(1000)}
  count.style.display='none';
  var cv=document.createElement('canvas');cv.width=REC_W;cv.height=REC_H;
  var c=cv.getContext('2d');
  var fc=document.createElement('canvas');fc.width=REC_W;fc.height=REC_H;var fx=fc.getContext('2d');fx.imageSmoothingQuality='high';fx.drawImage(frame,0,0,REC_W,REC_H);
  var vfc=!!video.requestVideoFrameCallback,lid=0;
  function loop(){drawVideo(c,REC_W,REC_H,false);c.drawImage(fc,0,0);lid=vfc?video.requestVideoFrameCallback(loop):requestAnimationFrame(loop)}
  function stopLoop(){if(vfc)video.cancelVideoFrameCallback(lid);else cancelAnimationFrame(lid)}
  loop();
  chunks=[];
  var cs=cv.captureStream(30);
  if(aStream)aStream.getAudioTracks().forEach(function(t){cs.addTrack(t)});
  try{recorder=new MediaRecorder(cs,{mimeType:mime,videoBitsPerSecond:5000000,audioBitsPerSecond:128000})}
  catch(e){if(aStream)aStream.getTracks().forEach(function(t){t.stop()});stopLoop();busy=false;record.disabled=false;say('Could not start recording on this browser.');return}
  recorder.ondataavailable=function(e){if(e.data&&e.data.size)chunks.push(e.data)};
  recorder.onstop=function(){
    stopLoop();clearInterval(timer);
    if(aStream)aStream.getTracks().forEach(function(t){t.stop()});
    var base=mime.split(';')[0],ext=base==='video/mp4'?'mp4':'webm';
    blob=new Blob(chunks,{type:base});fname='Doras-Shopyee-Reel-'+Date.now()+'.'+ext;
    recording=false;busy=false;recBadge.style.display='none';
    playUrl=URL.createObjectURL(blob);play.src=playUrl;play.style.display='block';play.muted=!aStream;play.play().catch(function(){play.muted=true;play.play().catch(function(){})});
    video.pause();done();record.disabled=false;
  };
  recorder.start(250);recording=true;t0=Date.now();
  recBadge.style.display='block';recBadge.textContent='00:00';
  hide(record,flip,mic);show(stop);
  timer=setInterval(function(){
    var s=Math.floor((Date.now()-t0)/1000);
    recBadge.textContent='00:'+(s<10?'0':'')+s;
    if(s>=MAX_SEC)stop.onclick();
  },250);
};
stop.onclick=function(){if(recording&&recorder&&recorder.state!=='inactive')recorder.stop()};

var ICON_ON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
ICON_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M3 3l18 18"/></svg>';
function paintMic(){mic.innerHTML=micOn?ICON_ON:ICON_OFF;mic.classList.toggle('off',!micOn);mic.setAttribute('aria-label',micOn?'Sound on':'Sound off')}
paintMic();
mic.onclick=function(){micOn=!micOn;paintMic();say(micOn?'Sound ON for reel':'Sound OFF for reel')};
retake.onclick=resetLive;
flip.onclick=function(){if(busy||recording)return;facing=(facing==='user')?'environment':'user';snap.disabled=true;record.disabled=true;startCam()};

/* SAVE = instant download */
save.onclick=function(){
  if(!blob)return;
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fname;
  document.body.appendChild(a);a.click();a.remove();
  say(mode==='photo'?'Photo saved to your Downloads/Gallery.':'Reel saved to your Downloads/Gallery.');
};
/* SHARE = share sheet */
share.onclick=async function(){
  if(!blob)return;
  var file=new File([blob],fname,{type:blob.type});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:'Dora’s Shopyee'})}catch(e){}
  }else say('Sharing is not supported on this browser. Please use Save.');
};
window.addEventListener('pagehide',function(){if(stream)stream.getTracks().forEach(function(t){t.stop()})});
var live=$('live'),lc=live.getContext('2d');live.width=540;live.height=960;
(function lp(){drawVideo(lc,live.width,live.height,facing==='user');requestAnimationFrame(lp)})();
async function loadBrand(){
  var b=(location.pathname.split('/').filter(Boolean)[0]||'').toLowerCase().replace(/[^a-z0-9_-]/g,'');
  try{
    var img=new Image();
    await new Promise(function(ok,no){img.onload=ok;img.onerror=no;img.src='/'+b+'/template.png'});
    try{var r=await fetch('/'+b+'/brand.json');if(r.ok){var j=await r.json();if(j.name)document.title=j.name+' Photo Booth | LoudBuzz'}}catch(e){}
    var w=img.naturalWidth,h=img.naturalHeight,cv=document.createElement('canvas');cv.width=w;cv.height=h;
    var c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0);
    var d=c.getImageData(0,0,w,h),p=d.data,n=w*h,m=new Uint8Array(n),i,k,x,y,q;
    for(i=0;i<n;i++){var R=p[i*4],G=p[i*4+1],B=p[i*4+2];if(p[i*4+3]<250||(R>180&&B>180&&G<110&&R-G>110&&B-G>110))m[i]=1}
    for(k=0;k<2;k++){var m2=m.slice();for(y=1;y<h-1;y++)for(x=1;x<w-1;x++){q=y*w+x;if(!m[q]&&(m[q-1]||m[q+1]||m[q-w]||m[q+w]))m2[q]=1}m=m2}
    var x0=w,x1=0,y0=h,y1=0;
    for(y=0;y<h;y++)for(x=0;x<w;x++){q=y*w+x;if(m[q]){p[q*4+3]=0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
    if(x1<=x0)throw new Error('no window');
    c.putImageData(d,0,0);
    HX=x0/w;HY=y0/h;HW=(x1-x0+1)/w;HH=(y1-y0+1)/h;
    var ow=Math.max(w,2160),oh=Math.round(h*ow/w),out=document.createElement('canvas');out.width=ow;out.height=oh;
    var oc=out.getContext('2d');oc.imageSmoothingEnabled=true;oc.imageSmoothingQuality='high';oc.drawImage(cv,0,0,ow,oh);
    var bl=await new Promise(function(r){out.toBlob(r,'image/png')});
    await new Promise(function(r){frame.onload=r;frame.src=URL.createObjectURL(bl)});
    $('stage').style.aspectRatio=w+'/'+h;
    live.height=Math.round(live.width*h/w);REC_H=Math.round(REC_W*h/w/2)*2;
    return true;
  }catch(e){
    showMsg('This photo booth page was not found.<br><a href="/">Visit LoudBuzz</a>');return false;
  }
}
loadBrand().then(function(ok){if(ok)startCam()});
})();
