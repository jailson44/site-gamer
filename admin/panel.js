(async function(){
 const db=window.GamerDB,client=db?.client;
 const $=id=>document.getElementById(id), notice=(msg)=>{$('notice').textContent=msg};
 const socials=['Twitch','YouTube','TikTok','Instagram','Discord'];
 const emailOf=(username)=>`${username.toLowerCase()}@gamerhub.invalid`;
 const validUrl=v=>{if(!v)return '';try{const u=new URL(v);if(u.protocol==='https:'||u.protocol==='http:')return u.href}catch{}throw Error('Use links completos começando com https://')};
 let role=null,player=null;
 const form=$('profileForm'),social=$('socialFields');
 socials.forEach(s=>{const l=document.createElement('label');l.textContent=s;const i=document.createElement('input');i.name='social_'+s;i.type='url';i.placeholder='https://...';l.append(i);social.append(l)});
 function currentKey(){return $('playerSelect').value}
 async function upload(file,key){
   if(!file)return null;
   if(file.size>5*1024*1024)throw Error('Imagem maior que 5 MB.');
   const ext=({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'})[file.type];
   if(!ext)throw Error('Formato inválido. Use PNG, JPG, WEBP ou GIF.');
   const path=`${key}/${crypto.randomUUID()}.${ext}`;
   const {error}=await client.storage.from('gamer-media').upload(path,file,{contentType:file.type,upsert:false});
   if(error)throw error;
   return client.storage.from('gamer-media').getPublicUrl(path).data.publicUrl;
 }
 async function loadProfile(){
   const key=currentKey();const {data,error}=await client.from('profiles').select('*').eq('player_key',key).single();
   if(error)throw error;player=data;form.elements.name.value=data.name||'';form.elements.bio.value=data.bio||'';form.elements.avatar_url.value=data.avatar_url||'';
   socials.forEach(s=>form.elements['social_'+s].value=data.links?.[s]||'');await loadMedia();
 }
 async function loadMedia(){const {data,error}=await client.from('media_items').select('*').eq('player_key',currentKey()).order('created_at',{ascending:false});if(error)throw error;
   const list=$('mediaList');list.replaceChildren();for(const item of data||[]){const row=document.createElement('div');row.className='media-row';const title=document.createElement('span');title.textContent=(item.kind==='image'?'📷 ':'▶ ')+item.title;
     const b=document.createElement('button');b.type='button';b.className='danger';b.textContent='EXCLUIR';b.onclick=async()=>{if(!confirm('Excluir este conteúdo?'))return;b.disabled=true;const {error}=await client.from('media_items').delete().eq('id',item.id);if(error)notice(error.message);else{notice('Conteúdo excluído.');await loadMedia()}};row.append(title,b);list.append(row)}
   if(!list.children.length)list.textContent='Nenhum conteúdo publicado.';
 }
 async function enter(){
   const {data:{user}}=await client.auth.getUser();if(!user){$('loginSection').hidden=false;$('dashboard').hidden=true;notice('Entre com seu usuário e senha.');return}
   const {data,error}=await client.from('user_roles').select('role,player_key').eq('user_id',user.id).single();
   if(error||!data){await client.auth.signOut();throw Error('Este usuário ainda não tem permissão configurada no banco. Consulte o administrador.')}
   role=data;const select=$('playerSelect');select.replaceChildren();for(const key of (role.role==='admin'?['player1','player2']:[role.player_key])){const o=document.createElement('option');o.value=key;o.textContent=key==='player1'?'Jogador 1':'Jogador 2';select.append(o)}
   $('welcome').textContent=role.role==='admin'?'🛡 Administrador':'🎮 '+select.selectedOptions[0].textContent;
   $('loginSection').hidden=true;$('dashboard').hidden=false;await loadProfile();notice('Painel pronto para editar.');
 }
 if(!db?.ready){notice('Falta configurar config.js com URL e chave pública do Supabase. Leia CONFIGURACAO.txt.');return}
 $('loginForm').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;try{const username=e.target.elements.username.value.trim().toLowerCase();const password=e.target.elements.password.value;const {error}=await client.auth.signInWithPassword({email:emailOf(username),password});if(error)throw error;await enter()}catch(err){notice('Não foi possível entrar: '+err.message)}finally{btn.disabled=false}};
 $('logout').onclick=async()=>{await client.auth.signOut();role=null;await enter()};
 $('playerSelect').onchange=async()=>{try{await loadProfile();notice('Perfil carregado.')}catch(e){notice(e.message)}};
 form.onsubmit=async e=>{e.preventDefault();const btn=e.submitter;btn.disabled=true;try{
   const key=currentKey();const avatar=await upload(form.elements.avatar_file.files[0],key)||validUrl(form.elements.avatar_url.value.trim());
   const links={};socials.forEach(s=>links[s]=validUrl(form.elements['social_'+s].value.trim()));
   const {error}=await client.from('profiles').update({name:form.elements.name.value.trim(),bio:form.elements.bio.value.trim(),avatar_url:avatar,links}).eq('player_key',key);if(error)throw error;
   form.elements.avatar_file.value='';notice('Perfil salvo! As mudanças já aparecem no site.');await loadProfile()
 }catch(err){notice('Erro ao salvar: '+err.message)}finally{btn.disabled=false}};
 $('mediaForm').onsubmit=async e=>{e.preventDefault();const f=e.target,btn=e.submitter;btn.disabled=true;try{
   const key=currentKey(),kind=f.elements.kind.value,file=f.elements.image_file.files[0];
   if(file&&kind!=='image')throw Error('Para enviar foto, escolha o tipo Foto.');
   const url=await upload(file,key)||validUrl(f.elements.url.value.trim());if(!url)throw Error('Informe um link ou envie uma foto.');
   const {error}=await client.from('media_items').insert({player_key:key,kind,title:f.elements.title.value.trim(),url});if(error)throw error;
   f.reset();notice('Conteúdo publicado!');await loadMedia()
 }catch(err){notice('Erro ao publicar: '+err.message)}finally{btn.disabled=false}};
 try{await enter()}catch(e){notice(e.message)}
})();
