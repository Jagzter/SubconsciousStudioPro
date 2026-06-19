const Stats = (()=>{
  const data={startedAt:null, sessionSeconds:0, played:0, textPlayed:0, imagePlayed:0, blankPlayed:0, totalSeconds:0, audioTracks:0};
  let timer=null;
  function start(){ if(!data.startedAt) data.startedAt=Date.now(); if(!timer) timer=setInterval(()=>{data.sessionSeconds++; data.totalSeconds++; render(); App.updateCounts(); Storage.saveLocal();},1000); }
  function stop(){ clearInterval(timer); timer=null; Storage.saveLocal(); }
  function record(item){ data.played++; if(item?.type==='text')data.textPlayed++; if(item?.type==='image')data.imagePlayed++; if(item?.type==='blank')data.blankPlayed++; render(); Storage.saveLocal(); }
  function load(saved={}){ Object.keys(data).forEach(k=>{ if(saved[k]!==undefined) data[k]=saved[k]; }); render(); }
  function reset(){ Object.keys(data).forEach(k=>data[k]=typeof data[k]==='number'?0:null); render(); Storage.saveLocal(); }
  function fmt(s){s=Math.floor(s||0); const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60; return h?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`}
  function render(){ const p=document.getElementById('statsPanel'); if(!p) return; p.innerHTML=[['Session Time',fmt(data.sessionSeconds)],['Total Time',fmt(data.totalSeconds)],['Items Played',data.played],['Text',data.textPlayed],['Images',data.imagePlayed],['Audio Tracks Loaded',data.audioTracks]].map(x=>`<div class="card"><h3>${x[0]}</h3><p>${x[1]}</p></div>`).join(''); }
  return {data,start,stop,record,reset,render,fmt,load};
})();
