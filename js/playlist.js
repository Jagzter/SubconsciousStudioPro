const Playlist = (() => {
  // The affirmation textarea is the source of truth for text.
  // The internal items array stores only non-text playlist items such as images and blank pauses.
  let items=[];
  let media=[];

  const textBox = () => document.getElementById('affirmationInput');
  const folderStatus = () => document.getElementById('imageFolderStatus');
  const imageInput = () => document.getElementById('imageFileInput');
  const imageFolderInput = () => document.getElementById('imageFolderInput');

  function init(){
    const addTextBtn = document.getElementById('addTextBtn');
    if(addTextBtn) addTextBtn.onclick=()=>{ render(); };

    textBox().addEventListener('input',()=>{
      App.updateCounts();
      Stats.render();
      Storage.saveEverything();
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
        media=[];
        render();
      }
    };

    // Android note:
    // Some Android gallery/photo-picker apps ignore the HTML "multiple" attribute and return only one image.
    // This code keeps previously selected images and lets users press Select Images repeatedly to append more.
    // This version uses the standard Android-compatible picker and appends each selection.
    document.getElementById('selectImagesBtn').onclick=openImageSelector;
    document.getElementById('selectImageFolderBtn').onclick=()=>imageFolderInput().click();

    imageInput().setAttribute('multiple','multiple');
    imageInput().setAttribute('accept','image/*,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg');
    imageInput().addEventListener('change',e=>{
      const files=[...e.target.files];
      if(!files.length){
        updateFolderStatus('No image was returned by Android. Try Photos, Gallery, Files, or Select Image Folder.');
        return;
      }
      addImages(files, true, 'selected');
      e.target.value='';
    });

    imageFolderInput().addEventListener('change',e=>{
      addImages([...e.target.files], true, 'folder');
      e.target.value='';
    });

    makeDrop(document.getElementById('playlistList'), files=>addImages(files,true,'dropped'),'image');
    const mediaList = document.getElementById('mediaList');
    if (mediaList) makeDrop(mediaList, files=>addImages(files,false,'dropped'),'image');

    render();
  }

  function openImageSelector(){
    // Use the standard file input for maximum Android compatibility.
    // Some Android gallery/photo pickers do not work reliably with showOpenFilePicker(),
    // so we deliberately avoid it here and let the browser/Android system picker handle images.
    const input=imageInput();
    input.value='';
    input.click();
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

  function isImageFile(f){
    return !!f && (String(f.type||'').startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name||''));
  }

  function addImages(files, addToPlaylist, source='selected'){
    const images=(files||[]).filter(isImageFile);
    images.forEach(file=>{
      const obj={type:'image', name:file.webkitRelativePath || file.name || 'Image', url:URL.createObjectURL(file), label:file.name || 'Image', file};
      media.push(obj);
      if(addToPlaylist) items.push(obj);
    });
    if(images.length){
      const extra = images.length===1 ? ' If your Android gallery only allows one at a time, tap Select Images again to add more.' : '';
      const sourceText = source==='folder' ? 'from folder' : source==='dropped' ? 'by drag and drop' : 'selected';
      updateFolderStatus(`${images.length} image${images.length===1?'':'s'} ${sourceText}. Total images/pauses: ${items.filter(x=>x.type!=='text').length}.${extra}`);
    }else if(files && files.length){
      updateFolderStatus('No supported image files were found in that selection.');
    }
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
    Storage.saveEverything();
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
      .map(x=>x.type==='text'?{type:'text',text:x.text}:{type:'blank', duration:x.duration||1});
  }

  async function serialiseFullBundle(){
    const full=[];
    for(const x of getItems()){
      if(x.type==='text') full.push({type:'text', text:x.text});
      else if(x.type==='blank') full.push({type:'blank', duration:x.duration||1});
      else if(x.type==='image'){
        let dataUrl=x.dataUrl || null;
        if(!dataUrl && x.file) dataUrl = await fileToDataURL(x.file);
        if(dataUrl) full.push({type:'image', name:x.name||'Image', dataUrl});
      }
    }
    return full;
  }

  function loadSerialised(arr){
    const text=[];
    items=[];
    media=[];
    (arr||[]).forEach(x=>{
      if(x.type==='text') text.push(x.text||'');
      else if(x.type==='blank') items.push({type:'blank', duration:x.duration||1, label:'Blank pause'});
      else if(x.type==='image' && x.dataUrl){
        const obj={type:'image', name:x.name||'Image', url:x.dataUrl, dataUrl:x.dataUrl, label:x.name||'Image'};
        media.push(obj);
        items.push(obj);
      }
    });
    textBox().value=text.filter(Boolean).join('\n');
    render();
  }

  function fileToDataURL(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(reader.error || new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
  }

  function updateFolderStatus(msg){
    const el=folderStatus();
    if(el) el.textContent=msg;
  }

  function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

  return {init, getItems, serialise, serialiseFullBundle, loadSerialised, render, addImages};
})();
