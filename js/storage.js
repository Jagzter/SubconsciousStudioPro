const Storage = (() => {
  const key = 'ssp_project_v21';
  function snapshot(){
    return { projectName: App.state.projectName, viewMode: App.state.viewMode, theme: document.body.classList.contains('light')?'light':'dark', playlist: Playlist.serialise(), settings: Player.getSettings(), stats: Stats.data, version:'2.1' };
  }
  function saveLocal(){ try{localStorage.setItem(key, JSON.stringify(snapshot()));}catch{} }
  function loadLocal(){ try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null} }
  function downloadProject(){
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], {type:'application/json'});
    const a=document.createElement('a'); const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    a.href=URL.createObjectURL(blob); a.download=`Subconscious_Studio_Project_${stamp}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  return {saveLocal, loadLocal, downloadProject};
})();
