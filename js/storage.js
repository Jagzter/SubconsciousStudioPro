const Storage = (() => {
  const key = 'ssp_project_v21';

  function currentVersion(){
    return (window.APP_CONFIG && APP_CONFIG.version) || '2.2.5';
  }

  function snapshot(){
    return {
      projectName: App.state.projectName,
      viewMode: App.state.viewMode,
      theme: document.body.classList.contains('light')?'light':'dark',
      playlist: Playlist.serialise(),
      settings: Player.getSettings(),
      stats: Stats.data,
      version: currentVersion(),
      bundle: false
    };
  }

  async function bundleSnapshot(){
    return {
      projectName: App.state.projectName,
      viewMode: App.state.viewMode,
      theme: document.body.classList.contains('light')?'light':'dark',
      playlist: await Playlist.serialiseFullBundle(),
      settings: Player.getSettings(),
      stats: Stats.data,
      version: currentVersion(),
      bundle: true,
      createdAt: new Date().toISOString()
    };
  }

  function saveLocal(){ try{localStorage.setItem(key, JSON.stringify(snapshot()));}catch{} }
  function loadLocal(){ try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null} }

  function safeName(name){
    return String(name||'Subconscious_Studio_Project').replace(/[^a-z0-9_ -]/gi,'_').replace(/\s+/g,'_').slice(0,60);
  }

  function downloadJSON(data, filename, mime='application/json'){
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:mime});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=filename;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  function downloadProject(){
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    downloadJSON(snapshot(), `Subconscious_Studio_Settings_${stamp}.json`);
  }

  async function downloadBundle(){
    try{
      const stamp=new Date().toISOString().replace(/[:.]/g,'-');
      const data=await bundleSnapshot();
      downloadJSON(data, `${safeName(App.state.projectName)}_${stamp}.ssp`, 'application/vnd.subconscious-studio-project+json');
    }catch(err){
      alert('Could not create the project bundle. Try using fewer or smaller images.');
      console.error(err);
    }
  }

  return {saveLocal, loadLocal, downloadProject, downloadBundle};
})();
