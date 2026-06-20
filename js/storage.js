const Storage = (() => {
  const key = 'ssp_project_v21';
  const dbName = 'SubconsciousStudioProDB';
  const storeName = 'projects';
  const localProjectKey = 'currentProject';
  let fullSaveTimer = null;
  let savingFull = false;
  const projectFolderHandleKey = 'projectFolderHandle';
  const currentFileHandleKey = 'currentProjectFileHandle';


  function supportsFileSystemAccess(){
    return 'showDirectoryPicker' in window || 'showSaveFilePicker' in window || 'showOpenFilePicker' in window;
  }

  async function idbPut(keyName, value){
    const db = await openDB();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value, keyName);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error('Could not save browser handle.')); };
    });
  }

  async function idbGet(keyName){
    try{
      const db = await openDB();
      return await new Promise((resolve,reject)=>{
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(keyName);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error || new Error('Could not read browser handle.'));
        tx.oncomplete = () => db.close();
      });
    }catch{return null;}
  }

  async function verifyPermission(handle, writable=false){
    if(!handle || !handle.queryPermission) return false;
    const opts = {mode: writable ? 'readwrite' : 'read'};
    if((await handle.queryPermission(opts)) === 'granted') return true;
    if((await handle.requestPermission(opts)) === 'granted') return true;
    return false;
  }

  function setProjectFolderStatus(msg){
    const el=document.getElementById('projectFolderStatus');
    if(el) el.textContent=msg;
  }

  function currentVersion(){
    return (window.APP_CONFIG && APP_CONFIG.version) || '2.2.6';
  }

  function lightSnapshot(){
    return {
      projectName: App.state.projectName,
      viewMode: App.state.viewMode,
      theme: document.body.classList.contains('light')?'light':'dark',
      playlist: Playlist.serialise(),
      settings: Player.getSettings(),
      stats: Stats.data,
      version: currentVersion(),
      bundle: false,
      savedAt: new Date().toISOString()
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
      createdAt: new Date().toISOString(),
      savedAt: new Date().toISOString()
    };
  }

  function openDB(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)) return reject(new Error('IndexedDB is not available in this browser.'));
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if(!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Could not open local project database.'));
    });
  }

  async function putLocalProject(data){
    const db = await openDB();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(data, localProjectKey);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error('Could not save local project.')); };
    });
  }

  async function getLocalProject(){
    try{
      const db = await openDB();
      return await new Promise((resolve,reject)=>{
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(localProjectKey);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error || new Error('Could not load local project.'));
        tx.oncomplete = () => db.close();
      });
    }catch{
      return null;
    }
  }

  async function clearLocalProject(){
    try{
      localStorage.removeItem(key);
      const db = await openDB();
      return await new Promise((resolve,reject)=>{
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(localProjectKey);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error || new Error('Could not clear local project.')); };
      });
    }catch(err){
      console.warn(err);
    }
  }

  function setLocalStatus(msg){
    const el=document.getElementById('localProjectStatus');
    if(el) el.textContent=msg;
  }

  function saveLocal(){
    try{ localStorage.setItem(key, JSON.stringify(lightSnapshot())); }catch{}
  }

  function saveEverything(){
    saveLocal();
    scheduleFullLocalSave();
  }

  function scheduleFullLocalSave(){
    clearTimeout(fullSaveTimer);
    fullSaveTimer = setTimeout(()=>saveFullLocal(false), 700);
  }

  async function saveFullLocal(showAlert=false){
    if(savingFull) return;
    savingFull = true;
    try{
      const data = await bundleSnapshot();
      await putLocalProject(data);
      setLocalStatus(`Local project saved: ${new Date().toLocaleTimeString()}`);
      if(showAlert) alert('Project saved locally on this device. It will reload automatically next time.');
    }catch(err){
      console.error(err);
      setLocalStatus('Could not save the full local project. Try exporting a bundle instead.');
      if(showAlert) alert('Could not save the full local project. Try exporting a bundle instead.');
    }finally{
      savingFull = false;
    }
  }

  function loadLocal(){
    try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}
  }

  async function loadFullLocal(){
    const full = await getLocalProject();
    const light = loadLocal();
    if(full && light){
      // Keep the latest lightweight settings/statistics, but preserve full image bundle from IndexedDB.
      return {...full, ...light, playlist: full.playlist || light.playlist, bundle: full.bundle};
    }
    return full || light;
  }


  async function chooseProjectsFolder(){
    if(!('showDirectoryPicker' in window)){
      setProjectFolderStatus('Direct folder saving is not supported in this browser. Use Export Full Bundle instead.');
      alert('Your browser does not support choosing a persistent projects folder. Use Export Full Bundle / Import Full Bundle instead.');
      return;
    }
    try{
      const root = await window.showDirectoryPicker({mode:'readwrite'});
      if(!(await verifyPermission(root,true))) throw new Error('Folder permission was not granted.');

      // Create a tidy project structure inside the chosen folder when possible.
      try{
        await root.getDirectoryHandle('Projects', {create:true});
        await root.getDirectoryHandle('Images', {create:true});
        await root.getDirectoryHandle('Audio', {create:true});
        await root.getDirectoryHandle('Backups', {create:true});
      }catch{}

      await idbPut(projectFolderHandleKey, root);
      setProjectFolderStatus(`Projects folder selected: ${root.name}. Saves will go into the Projects subfolder when available.`);
      alert('Projects folder selected. You can now use Save or Save As.');
    }catch(err){
      console.warn(err);
      setProjectFolderStatus('No projects folder selected.');
    }
  }

  async function getProjectsDirectoryHandle(){
    const root = await idbGet(projectFolderHandleKey);
    if(!root) return null;
    if(!(await verifyPermission(root,true))) return null;
    try{ return await root.getDirectoryHandle('Projects', {create:true}); }
    catch{ return root; }
  }

  async function updateProjectFolderStatus(){
    const root = await idbGet(projectFolderHandleKey);
    if(root){
      setProjectFolderStatus(`Projects folder remembered: ${root.name}. You may need to re-approve access when saving.`);
    }else if(!supportsFileSystemAccess()){
      setProjectFolderStatus('Direct project-folder saving is not available in this browser. Use Export Full Bundle instead.');
    }else{
      setProjectFolderStatus('No projects folder chosen. Use Choose Projects Folder to save normal .ssp project files directly.');
    }
  }

  async function writeDataToFileHandle(handle, data){
    if(!(await verifyPermission(handle,true))) throw new Error('File permission was not granted.');
    const writable = await handle.createWritable();
    await writable.write(new Blob([JSON.stringify(data, null, 2)], {type:'application/vnd.subconscious-studio-project+json'}));
    await writable.close();
    await idbPut(currentFileHandleKey, handle);
    setProjectFolderStatus(`Saved: ${handle.name} at ${new Date().toLocaleTimeString()}`);
  }

  async function saveToProjectFile(saveAs=false){
    const data = await bundleSnapshot();
    const filename = `${safeName(App.state.projectName)}.ssp`;
    try{
      if(!saveAs){
        const currentHandle = await idbGet(currentFileHandleKey);
        if(currentHandle){
          await writeDataToFileHandle(currentHandle, data);
          await saveFullLocal(false);
          return;
        }
      }

      // Prefer saving into the chosen Projects folder.
      const dir = await getProjectsDirectoryHandle();
      if(dir){
        const fileHandle = await dir.getFileHandle(filename, {create:true});
        await writeDataToFileHandle(fileHandle, data);
        await saveFullLocal(false);
        return;
      }

      // Fallback to native Save As dialog where supported.
      if('showSaveFilePicker' in window){
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: filename,
          types:[{description:'Subconscious Studio Project', accept:{'application/vnd.subconscious-studio-project+json':['.ssp'], 'application/json':['.json']}}]
        });
        await writeDataToFileHandle(fileHandle, data);
        await saveFullLocal(false);
        return;
      }

      await downloadBundle();
      setProjectFolderStatus('Direct Save is not supported here, so a bundle download was created instead.');
    }catch(err){
      if(err && err.name === 'AbortError') return;
      console.error(err);
      alert('Could not save directly to a project file. A bundle download will be created instead.');
      await downloadBundle();
    }
  }

  async function openProjectFile(){
    try{
      if('showOpenFilePicker' in window){
        const [handle] = await window.showOpenFilePicker({
          multiple:false,
          types:[{description:'Subconscious Studio Project', accept:{'application/vnd.subconscious-studio-project+json':['.ssp'], 'application/json':['.json']}}]
        });
        if(!handle) return;
        const file = await handle.getFile();
        const text = await file.text();
        const data = JSON.parse(text);
        await idbPut(currentFileHandleKey, handle);
        App.applyProjectData(data);
        setProjectFolderStatus(`Opened: ${handle.name}`);
        alert('Project opened.');
        return;
      }
      const input=document.getElementById('projectFileInput');
      if(input) input.click(); else alert('Open Project File is not supported in this browser. Use Import Full Bundle instead.');
    }catch(err){
      if(err && err.name === 'AbortError') return;
      console.error(err);
      alert('Could not open that project file.');
    }
  }

  async function importProjectFileFallback(e){
    const file=e.target.files && e.target.files[0];
    if(!file) return;
    try{
      const data=JSON.parse(await file.text());
      App.applyProjectData(data);
      setProjectFolderStatus(`Opened imported file: ${file.name}. Use Save As or Export Bundle to save changes.`);
    }catch(err){
      console.error(err);
      alert('Could not open that project file.');
    }finally{
      e.target.value='';
    }
  }

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
    downloadJSON(lightSnapshot(), `Subconscious_Studio_Settings_${stamp}.json`);
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

  return {saveLocal, saveEverything, saveFullLocal, loadLocal, loadFullLocal, clearLocalProject, downloadProject, downloadBundle, chooseProjectsFolder, saveToProjectFile, openProjectFile, importProjectFileFallback, updateProjectFolderStatus};
})();
