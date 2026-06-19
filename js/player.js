const Player = (() => {
  let running=false, index=-1, timer=null, lastRandom=-1;
  const stage=()=>document.getElementById('stage'); const display=()=>document.getElementById('displayItem');
  function init(){
    document.getElementById('startBtn').onclick=start; document.getElementById('stopBtn').onclick=stop; document.getElementById('fullscreenBtn').onclick=fullscreen;
    document.getElementById('floatPlay').onclick=()=>running?stop():start(); document.getElementById('floatNext').onclick=()=>next(true); document.getElementById('floatPrev').onclick=prev; document.getElementById('floatDashboard').onclick=()=>{App.setViewMode('dashboard');}; document.getElementById('floatFullscreen').onclick=fullscreen;
    document.getElementById('speedSlider').oninput=e=>{document.getElementById('speedLabel').textContent=Number(e.target.value).toFixed(2)+'s'; if(running){clearTimeout(timer); timer=setTimeout(()=>next(true), Number(e.target.value)*1000);}};
    ['fontSizeSlider','fontSelect','fontColor','bgColor','positionSelect','autoFit','randomFontColor','orderSelect','shuffleImages','imageScale','imageOpacity','imageRotation','imagePositionSelect','imageAnimation','randomImageSize','randomImageMin','randomImageMax'].forEach(id=>document.getElementById(id).addEventListener('input',()=>{ updateControlLabels(); if(running) showCurrent(false); Storage.saveLocal(); }));
    updateControlLabels();
    window.addEventListener('resize',()=>{if(running) showCurrent(false)});
    window.addEventListener('keydown',e=>{ if(e.target.matches('input,textarea,select')) return; if(e.code==='Space'){e.preventDefault(); running?stop():start();} if(e.key.toLowerCase()==='f') fullscreen(); if(e.key==='ArrowRight') next(true); if(e.key==='ArrowLeft') prev(); });
    stage().addEventListener('pointerdown',()=>{document.getElementById('floatingToolbar').classList.add('show'); setTimeout(()=>document.getElementById('floatingToolbar').classList.remove('show'),2500);});
  }
  function start(){ const items=filteredItems(); if(!items.length){alert('Add at least one affirmation, image or blank pause.');return;} running=true; stage().classList.remove('hidden'); Stats.start(); next(true); }
  function stop(){ running=false; clearTimeout(timer); timer=null; stage().classList.add('hidden'); App.setViewMode('dashboard'); Stats.stop(); }
  function filteredItems(){ const all=Playlist.getItems(); return document.getElementById('shuffleImages').checked?all:all.filter(x=>x.type!=='image'); }
  function next(record=false){ const items=filteredItems(); if(!items.length)return; const order=document.getElementById('orderSelect').value; if(order==='random'){ let n=Math.floor(Math.random()*items.length); if(items.length>1 && n===lastRandom)n=(n+1)%items.length; lastRandom=n; index=Playlist.getItems().indexOf(items[n]); } else { const all=Playlist.getItems(); index=(index+1)%all.length; if(!document.getElementById('shuffleImages').checked){ let guard=0; while(all[index]?.type==='image' && guard++<all.length) index=(index+1)%all.length; } } showCurrent(record); }
  function prev(){ const all=Playlist.getItems(); if(!all.length)return; index=(index-1+all.length)%all.length; showCurrent(false); }
  function showCurrent(record=true){
    const all=Playlist.getItems(); const item=all[index]||all[0]; if(!item)return; const s=getSettings();
    const effectivePosition = item.type==='image' && s.imagePosition !== 'same' ? s.imagePosition : s.position;
    stage().style.background=s.bgColor; stage().className='stage '+effectivePosition+(stage().classList.contains('presentation')?' presentation':'');
    const el=display(); el.className='displayItem'; el.style.cssText=''; el.style.fontFamily=s.font; el.style.color=s.randomFontColor?randColor():s.fontColor; el.style.fontSize=s.fontSize+'px';
    if(item.type==='image'){
      el.innerHTML=`<img src="${item.url}" alt="${escapeHtml(item.name||'image')}">`;
      applyImageSettings(el.querySelector('img'), s);
    } else if(item.type==='blank') el.innerHTML=''; else el.textContent=item.text;
    requestAnimationFrame(()=>{
      if(item.type==='text' && s.autoFit) fitText(effectivePosition==='random');
      if(effectivePosition==='random') placeRandom();
    });
    if(record) Stats.record(item); clearTimeout(timer); if(running) timer=setTimeout(()=>next(true), Math.max(.01,s.speed)*1000);
  }
  function placeRandom(){
    const el=display();
    const stageEl=stage();
    const pad=Math.max(12, Math.min(innerWidth, innerHeight)*0.035);

    // Random mode should use the whole visible screen, not just the centre.
    // Reset centring styles before measuring.
    el.style.transform='none';
    el.style.right='auto';
    el.style.bottom='auto';

    const r=el.getBoundingClientRect();
    const usableW=Math.max(1, innerWidth - r.width - (pad*2));
    const usableH=Math.max(1, innerHeight - r.height - (pad*2));

    const x=pad + Math.random()*usableW;
    const y=pad + Math.random()*usableH;

    el.style.left=x+'px';
    el.style.top=y+'px';
  }

  function fitText(randomMode=false){
    const el=display();
    let size=Number(document.getElementById('fontSizeSlider').value);
    const min=12;
    const pad=Math.max(12, Math.min(innerWidth, innerHeight)*0.035);

    // In ordinary centred/top/bottom mode the text can use almost the whole screen.
    // In random mode the text box is deliberately narrower so it has room to move
    // left, right, up and down while still staying fully inside the screen.
    const maxW=randomMode ? Math.max(220, innerWidth*0.62) : innerWidth*0.92;
    const maxH=randomMode ? Math.max(120, innerHeight*0.62) : innerHeight*0.86;

    el.style.width=Math.min(maxW, innerWidth - pad*2)+'px';
    el.style.maxWidth=(innerWidth - pad*2)+'px';
    el.style.maxHeight=(innerHeight - pad*2)+'px';
    el.style.fontSize=size+'px';

    for(let i=0;i<140;i++){
      const r=el.getBoundingClientRect();
      if(r.width<=maxW && r.height<=maxH && el.scrollHeight<=maxH+2) break;
      size=Math.max(min,size-2);
      el.style.fontSize=size+'px';
      if(size===min)break;
    }
  }
  function applyImageSettings(img, s){
    if(!img) return;
    let scale = s.imageScale;
    if(s.randomImageSize){
      const lo=Math.min(s.randomImageMin, s.randomImageMax);
      const hi=Math.max(s.randomImageMin, s.randomImageMax);
      scale = lo + Math.random() * (hi - lo);
    }
    img.style.maxWidth = scale + 'vw';
    img.style.maxHeight = scale + 'dvh';
    img.style.opacity = String(s.imageOpacity/100);
    img.style.setProperty('--img-rotation', `${s.imageRotation}deg`);
    img.style.transform = 'rotate(var(--img-rotation))';
    img.style.transformOrigin = 'center center';
    img.style.animation = 'none';
    if(s.imageAnimation && s.imageAnimation !== 'none'){
      img.style.animation = `ssp-${s.imageAnimation} 12s ease-in-out infinite`;
    }
  }

  function updateControlLabels(){
    const pairs=[
      ['fontSizeSlider','fontSizeLabel','px'],
      ['imageScale','imageScaleLabel','%'],
      ['imageOpacity','imageOpacityLabel','%'],
      ['imageRotation','imageRotationLabel','°'],
      ['randomImageMin','randomImageMinLabel','%'],
      ['randomImageMax','randomImageMaxLabel','%']
    ];
    pairs.forEach(([input,label,suffix])=>{
      const i=document.getElementById(input), l=document.getElementById(label);
      if(i && l) l.textContent=i.value+suffix;
    });
  }

  function randColor(){return `hsl(${Math.floor(Math.random()*360)}, 95%, 72%)`}
  function fullscreen(){ const target=stage().classList.contains('hidden')?document.documentElement:stage(); if(!document.fullscreenElement) target.requestFullscreen?.(); else document.exitFullscreen?.(); }
  function getSettings(){return{speed:Number(document.getElementById('speedSlider').value),fontSize:Number(document.getElementById('fontSizeSlider').value),font:document.getElementById('fontSelect').value,fontColor:document.getElementById('fontColor').value,bgColor:document.getElementById('bgColor').value,position:document.getElementById('positionSelect').value,autoFit:document.getElementById('autoFit').checked,randomFontColor:document.getElementById('randomFontColor').checked,order:document.getElementById('orderSelect').value,shuffleImages:document.getElementById('shuffleImages').checked,imageScale:Number(document.getElementById('imageScale').value),imageOpacity:Number(document.getElementById('imageOpacity').value),imageRotation:Number(document.getElementById('imageRotation').value),imagePosition:document.getElementById('imagePositionSelect').value,imageAnimation:document.getElementById('imageAnimation').value,randomImageSize:document.getElementById('randomImageSize').checked,randomImageMin:Number(document.getElementById('randomImageMin').value),randomImageMax:Number(document.getElementById('randomImageMax').value)}}
  function applySettings(s={}){Object.entries({speedSlider:s.speed,fontSizeSlider:s.fontSize,fontSelect:s.font,fontColor:s.fontColor,bgColor:s.bgColor,positionSelect:s.position,orderSelect:s.order,imageScale:s.imageScale,imageOpacity:s.imageOpacity,imageRotation:s.imageRotation,imagePositionSelect:s.imagePosition,imageAnimation:s.imageAnimation,randomImageMin:s.randomImageMin,randomImageMax:s.randomImageMax}).forEach(([id,v])=>{if(v!==undefined && document.getElementById(id))document.getElementById(id).value=v}); if(s.autoFit!==undefined)document.getElementById('autoFit').checked=s.autoFit; if(s.randomFontColor!==undefined)document.getElementById('randomFontColor').checked=s.randomFontColor; if(s.shuffleImages!==undefined)document.getElementById('shuffleImages').checked=s.shuffleImages; if(s.randomImageSize!==undefined)document.getElementById('randomImageSize').checked=s.randomImageSize; document.getElementById('speedLabel').textContent=Number(document.getElementById('speedSlider').value).toFixed(2)+'s'; updateControlLabels();}
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  return {init,start,stop,getSettings,applySettings,fullscreen,next,prev};
})();
