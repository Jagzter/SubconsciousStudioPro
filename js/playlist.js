const Playlist = (() => {
  // The affirmation textarea is the source of truth for text.
  // The internal items array stores only non-text playlist items such as images and blank pauses.
  let items=[];
  let media=[];

  const textBox = () => document.getElementById('affirmationInput');
  const folderStatus = () => document.getElementById('imageFolderStatus');

  function init(){
    const addTextBtn = document.getElementById('addTextBtn');
    if(addTextBtn) addTextBtn.onclick=()=>{ render(); };

    textBox().addEventListener('input',()=>{
      App.updateCounts();
      Stats.render();
      Storage.saveLocal();
    });

    const loadTxtBtn=document.getElementById('loadTxtBtn');
    const txtInput=document.getElementById('affirmationTxtInput');
    if(loadTxtBtn && txtInput){
      loadTxtBtn.onclick=()=>txtInput.click();
      txtInput.addEventListener('change', e=>{
        const file=e.target.files[0];
        if(file) loadAffirmationTextFile(file);
        e.target.value='';
      });
    }

    document.getElementById('addBlankBtn').onclick=()=>{
      items.push({type:'blank', duration:1, label:'Blank pause'});
      render();
    };

    document.getElementById('clearPlaylistBtn').onclick=()=>{
      if(confirm('Clear playlist?')){
        textBox().value='';
        items=[];
        render();
      }
    };

    document.getElementById('selectImagesBtn').onclick=()=>document.getElementById('imageFileInput').click();
    document.getElementById('selectImageFolderBtn').onclick=()=>document.getElementById('imageFolderInput').click();
    document.getElementById('imageFileInput').addEventListener('change',e=>{addImages([...e.target.files], true); e.target.value='';});
    document.getElementById('imageFolderInput').addEventListener('change',e=>{addImages([...e.target.files], true); e.target.value=''; updateFolderStatus('Images loaded from selected folder.');});

    makeDrop(document.getElementById('playlistList'), files=>addImages(files,true),'image');
    const mediaList = document.getElementById('mediaList');
    if (mediaList) makeDrop(mediaList, files=>addImages(files,false),'image');

    render();
  }

  function textItems(){
    return textBox().value
      .split(/\r?\n/)
      .map(s=>s.trim())
      .filter(Boolean)
      .map(text=>({type:'text', text, label:text}));
  }

  function loadAffirmationTextFile(file){
    if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{
      const text=String(reader.result||'').replace(/^\uFEFF/, '');
      textBox().value=text;
      render();
      updateFolderStatus(`Loaded affirmations from: ${file.name}`);
    };
    reader.onerror=()=>alert('Could not read the text file.');
    reader.readAsText(file);
  }

  function addImages(files, addToPlaylist){
    const images=files.filter(f=>f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name));
    images.forEach(file=>{
      const obj={type:'image', name:file.webkitRelativePath || file.name, url:URL.createObjectURL(file), label:file.name};
      media.push(obj);
      if(addToPlaylist) items.push(obj);
    });
    if(images.length) updateFolderStatus(`${images.length} image${images.length===1?'':'s'} loaded.`);
    render();
  }

  function render(){
    const pl=document.getElementById('playlistList');
    const playlistNonText = items.filter(x=>x.type!=='text');
    pl.innerHTML = playlistNonText.length ? '' : 'Drop images here. Text affirmations are edited only in the box above.';
    playlistNonText.forEach((it)=>pl.appendChild(row(it, items.indexOf(it), true)));

    const ml=document.getElementById('mediaList');
    if (ml) {
      ml.innerHTML=media.length?'':'Drop image files or folders here';
      media.forEach((it,i)=>{
        const r=row(it,i,false);
        const b=document.createElement('button');
        b.textContent='Add to Playlist';
        b.onclick=()=>{items.push(it); render();};
        r.appendChild(b);
        ml.appendChild(r);
      });
    }
    App.updateCounts();
    Stats.render();
    Storage.saveLocal();
  }

  function row(it,i,playlist){
    const div=document.createElement('div');
    div.className='item';
    if(it.type==='image') div.innerHTML=`<img src="${it.url}" alt=""><strong>${escapeHtml(it.name)}</strong>`;
    else if(it.type==='blank') div.innerHTML=`⬛ <strong>Blank pause</strong>`;
    else div.innerHTML=`📝 <span>${escapeHtml(it.text)}</span>`;

    if(playlist){
      const del=document.createElement('button');
      del.textContent='Remove';
      del.onclick=()=>{items.splice(i,1); render();};
      div.appendChild(del);
    }
    return div;
  }

  function getItems(){
    return [...textItems(), ...items.filter(x=>x.type!=='text')];
  }

  function serialise(){
    return getItems()
      .filter(x=>x.type==='text'||x.type==='blank')
      .map(x=>x.type==='text'?{type:'text',text:x.text}:{type:'blank'});
  }

  function loadSerialised(arr){
    const text=[];
    items=[];
    (arr||[]).forEach(x=>{
      if(x.type==='text') text.push(x.text||'');
      else if(x.type==='blank') items.push({type:'blank', duration:x.duration||1, label:'Blank pause'});
    });
    textBox().value=text.filter(Boolean).join('\n');
    render();
  }

  function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

  return {init, getItems, serialise, loadSerialised, render, addImages};
})();
