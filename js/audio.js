const AudioStudio = (() => {
  let tracks=[]; let current=0;
  const player = () => document.getElementById('audioPlayer');
  const status = () => document.getElementById('audioStatus');
  const list = () => document.getElementById('audioList');
  function init(){
    document.getElementById('selectAudioBtn').onclick=()=>document.getElementById('audioFileInput').click();
    document.getElementById('audioFileInput').addEventListener('change', e=>{addFiles([...e.target.files]); e.target.value='';});
    document.getElementById('audioPlayBtn').onclick=toggle;
    document.getElementById('audioStopBtn').onclick=stop;
    document.getElementById('audioVolume').oninput=e=>player().volume=Number(e.target.value);
    document.getElementById('audioLoop').onchange=e=>player().loop=e.target.checked;
    player().volume=Number(document.getElementById('audioVolume').value); player().loop=true;
    player().addEventListener('ended',()=>{ if(!player().loop && tracks.length>1){ current=(current+1)%tracks.length; load(current); play(); }});
    makeDrop(list(), addFiles, 'audio');
  }
  function addFiles(files){
    const audios=files.filter(f=>f.type.startsWith('audio/'));
    audios.forEach(file=>tracks.push({name:file.name, url:URL.createObjectURL(file), file}));
    if(audios.length){ Stats.data.audioTracks=tracks.length; }
    if(audios.length && !player().src) load(tracks.length-audios.length);
    render(); Stats.render(); Storage.saveLocal();
  }
  function load(i){
    if(!tracks[i]) return;
    current=i; player().src=tracks[i].url; player().load(); status().textContent=`Selected: ${tracks[i].name}`; render();
  }
  async function play(){
    if(!player().src){ status().textContent='Select an audio track first.'; return; }
    try{ await player().play(); status().textContent=`Playing: ${tracks[current]?.name||'audio'}`; }
    catch{ status().textContent='Press play on the browser audio bar once, then use app controls.'; }
  }
  function toggle(){ if(player().paused) play(); else player().pause(); }
  function stop(){ player().pause(); player().currentTime=0; status().textContent=tracks[current]?`Stopped: ${tracks[current].name}`:'No audio selected'; }
  function render(){
    list().innerHTML=tracks.length?'':'Drop audio files here';
    tracks.forEach((t,i)=>{ const div=document.createElement('div'); div.className='item'; div.innerHTML=`🎵 <strong>${t.name}</strong> <button data-i="${i}">Select</button>`; div.querySelector('button').onclick=()=>load(i); list().appendChild(div); });
  }
  return {init, addFiles, play, stop};
})();
function makeDrop(el, cb, kind){
  el.addEventListener('dragover',e=>{e.preventDefault(); el.classList.add('drag')});
  el.addEventListener('dragleave',()=>el.classList.remove('drag'));
  el.addEventListener('drop',e=>{e.preventDefault(); el.classList.remove('drag'); cb([...e.dataTransfer.files].filter(f=>kind==='image'?f.type.startsWith('image/'):kind==='audio'?f.type.startsWith('audio/'):true));});
}
