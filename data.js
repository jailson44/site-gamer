(function(){
  const C=window.GAMER_CONFIG||{};
  const ready=!!(C.supabaseUrl&&C.supabaseAnonKey&&window.supabase);
  const client=ready?window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey):null;
  window.GamerDB={client,ready};
  const safe=(v)=>typeof v==='string'?v:'';
  function validUrl(v){try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
  function showProfile(p){
    const id=p.player_key;
    document.querySelectorAll(`[data-name="${id}"]`).forEach(el=>el.textContent=p.name||id);
    document.querySelectorAll(`[data-bio="${id}"]`).forEach(el=>el.textContent=p.bio||'STREAMER • GAMER • CREATOR');
    document.querySelectorAll(`[data-avatar="${id}"]`).forEach(el=>{
      if(validUrl(p.avatar_url)){el.textContent='';const img=document.createElement('img');img.src=p.avatar_url;img.alt='Foto de '+p.name;img.loading='lazy';img.className='avatar-img';el.append(img)}
    });
    const grid=document.querySelector(`[data-links="${id}"]`);
    if(grid){grid.replaceChildren();const icons={Twitch:'🟣',YouTube:'▶️',TikTok:'🎵',Instagram:'📸',Discord:'💬'};
      for(const [name,raw] of Object.entries(p.links||{})){const url=validUrl(raw);if(!url)continue;
        const a=document.createElement('a');a.className='linkcard';a.href=url;a.target='_blank';a.rel='noopener noreferrer';
        const ico=document.createElement('span');ico.className='emoji';ico.textContent=icons[name]||'🔗';
        const txt=document.createElement('span');const b=document.createElement('strong');b.textContent=name;const small=document.createElement('small');small.textContent='VISITAR PERFIL';txt.append(b,small);
        const arrow=document.createElement('span');arrow.className='arrow';arrow.textContent='↗';a.append(ico,txt,arrow);grid.append(a);
      }
      if(!grid.children.length)grid.textContent='Links em breve.';
    }
  }
  function showMedia(items){
    const grid=document.querySelector('[data-media-grid]');if(!grid)return;
    grid.replaceChildren();
    for(const item of items){const card=document.createElement('article');card.className='media-card';
      const url=validUrl(item.url);if(!url)continue;
      if(item.kind==='image') {const img=document.createElement('img');img.src=url;img.loading='lazy';img.alt=item.title||'Foto';card.append(img)}
      else {const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.className='media-video';a.textContent='▶ VER CLIPE / VÍDEO ↗';card.append(a)}
      const h=document.createElement('h3');h.textContent=item.title||'Sem título';card.append(h);grid.append(card);
    }
    if(!grid.children.length)grid.textContent='Nenhum clipe ou foto publicado ainda.';
  }
  async function load(){
    if(!ready){document.querySelectorAll('[data-config-status]').forEach(e=>e.textContent='Painel aguardando conexão com Supabase.');return}
    const {data:profiles,error}=await client.from('profiles').select('player_key,name,bio,avatar_url,links');
    if(error){console.warn('Perfis:',error.message);return}
    (profiles||[]).forEach(showProfile);
    const id=document.body.dataset.player;
    if(id){const {data:items}=await client.from('media_items').select('id,title,url,kind').eq('player_key',id).order('created_at',{ascending:false});showMedia(items||[])}
  }
  window.GamerDB.load=load;
  document.addEventListener('DOMContentLoaded',load);
})();
