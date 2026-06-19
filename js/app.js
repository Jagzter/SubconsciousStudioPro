const App = (()=>{
  const state={projectName:'Untitled Project', viewMode:'dashboard'};
  function init(){
    applyBranding();
    document.querySelectorAll('.navBtn').forEach(b=>b.onclick=()=>openTab(b.dataset.tab));
    document.getElementById('dashboardControlsBtn').onclick=()=>document.getElementById('allControlsPanel').classList.toggle('hidden');
    document.getElementById('projectNameInput').oninput=e=>{state.projectName=e.target.value||'Untitled Project'; updateCounts(); Storage.saveLocal();};
    document.getElementById('saveProjectBtn').onclick=Storage.downloadProject;
    document.getElementById('exportBundleBtn').onclick=Storage.downloadBundle;
    document.getElementById('importBundleBtn').onclick=()=>document.getElementById('bundleImportInput').click();
    document.getElementById('bundleImportInput').addEventListener('change',importBundle);
    document.getElementById('newProjectBtn').onclick=()=>{if(confirm('Start a new project?')){localStorage.removeItem('ssp_project_v21'); location.reload();}};
    document.getElementById('importProjectBtn').onclick=()=>document.getElementById('playlistImportInput').click();
    document.getElementById('playlistImportInput').addEventListener('change',importProject);
    document.getElementById('themeBtn').onclick=()=>{document.body.classList.toggle('light'); Storage.saveLocal();};
    document.getElementById('resetStatsBtn').onclick=()=>{if(confirm('Reset statistics?')) Stats.reset();};
    document.getElementById('viewDashboardBtn').onclick=()=>setViewMode('dashboard');
    document.getElementById('viewFocusBtn').onclick=()=>setViewMode('focus');
    document.getElementById('viewPresentationBtn').onclick=()=>setViewMode('presentation');
    Playlist.init(); AudioStudio.init(); Player.init(); buildAllControls(); loadSaved(); updateCounts(); Stats.render();
    if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(()=>{}); }
    window.addEventListener('keydown',e=>{ if(e.target.matches('input,textarea,select'))return; const k=e.key.toLowerCase(); if(k==='h') setViewMode(state.viewMode==='dashboard'?'focus':'dashboard'); if(k==='d') setViewMode('dashboard'); if(k==='p') setViewMode('presentation'); });
  }

  function applyBranding(){
    const cfg = window.APP_CONFIG || APP_CONFIG || {version:'2.2.5',build:'2026-06-19',copyright:'© JR Hypnotherapy 2026',name:'Subconscious Studio Pro'};
    const set=(id,text)=>{ const el=document.getElementById(id); if(el) el.textContent=text; };
    set('splashVersion', 'Version ' + cfg.version);
    set('bannerVersion', 'v' + cfg.version);
    set('aboutName', cfg.name);
    set('aboutVersion', cfg.version);
    set('aboutBuild', cfg.build);
    set('aboutCopyright', cfg.copyright);
    document.title = cfg.name + ' v' + cfg.version;
  }
  function openTab(id){document.querySelectorAll('.navBtn').forEach(b=>b.classList.toggle('active',b.dataset.tab===id)); document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.id===id));}
  function buildAllControls(){
    const grid=document.getElementById('allControlsGrid'); grid.innerHTML='';
    const quick=document.createElement('div'); quick.className='toolbar'; quick.innerHTML='<button id="dashStart">Start</button><button id="dashStop">Stop</button><button id="dashFocus">Focus</button><button id="dashPresent">Presentation</button><button id="dashFull">Fullscreen</button>'; grid.appendChild(quick);
    quick.querySelector('#dashStart').onclick=Player.start; quick.querySelector('#dashStop').onclick=Player.stop; quick.querySelector('#dashFocus').onclick=()=>setViewMode('focus'); quick.querySelector('#dashPresent').onclick=()=>setViewMode('presentation'); quick.querySelector('#dashFull').onclick=Player.fullscreen;
    const hint=document.createElement('p'); hint.className='hint'; hint.textContent='Use the Player, Audio and Playlist tabs for the live controls. This panel provides quick access without changing tabs.'; grid.appendChild(hint);
  }
  function setViewMode(mode){
    state.viewMode=mode; const shell=document.getElementById('appShell'); const stage=document.getElementById('stage');
    shell.classList.toggle('focusMode',mode==='focus'); shell.classList.toggle('presentationMode',mode==='presentation'); stage.classList.toggle('presentation',mode==='presentation');
    if(mode!=='dashboard' && stage.classList.contains('hidden')) Player.start();
    if(mode==='dashboard') stage.classList.remove('presentation');
    Storage.saveLocal();
  }
  function updateCounts(){document.getElementById('currentProjectName').textContent=state.projectName; document.getElementById('dashItemCount').textContent=Playlist.getItems().length;}

  function applyProjectData(data){
    if(data.projectName){state.projectName=data.projectName; document.getElementById('projectNameInput').value=state.projectName;}
    if(data.theme==='light') document.body.classList.add('light'); else if(data.theme==='dark') document.body.classList.remove('light');
    if(data.playlist)Playlist.loadSerialised(data.playlist);
    if(data.settings)Player.applySettings(data.settings);
    if(data.stats)Stats.load(data.stats);
    if(data.viewMode) setViewMode(data.viewMode);
    updateCounts();
    Storage.saveLocal();
  }

  function importBundle(e){
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const data=JSON.parse(reader.result);
        applyProjectData(data);
        alert('Full bundle imported. Affirmations, images, settings and statistics have been restored.');
      }catch(err){
        alert('That file could not be imported as a Subconscious Studio bundle.');
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value='';
  }

  function importProject(e){ const file=e.target.files[0]; if(!file)return; const reader=new FileReader(); reader.onload=()=>{ try{ const data=JSON.parse(reader.result); applyProjectData(data); } catch{ document.getElementById('affirmationInput').value=reader.result; Playlist.render(); } updateCounts(); Storage.saveLocal(); }; reader.readAsText(file); e.target.value=''; }
  function loadSaved(){ const data=Storage.loadLocal(); if(!data)return; applyProjectData(data); }
  return {init,state,updateCounts,setViewMode};
})();
window.addEventListener('DOMContentLoaded',App.init);
