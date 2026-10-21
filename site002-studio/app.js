import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = id => document.getElementById(id);
const audio = $('audio');
const state = {ready:false, view:'auto', frame:0, line:-1, shot:-1, ended:false};
let renderer, scene, camera, timeline, envelope, hero, mixer, morphs=[], actions=[], characterBase;
let photo=1, previousStamp=0;
const cameraPosition = new THREE.Vector3(), cameraTarget = new THREE.Vector3();
const views = {
 wide: {p:[5.1,4.2,9],t:[-.2,1.6,-.6]},
 talk: {p:[2.5,2.8,6.2],t:[-.75,1.5,.05]},
 face: {p:[-.3,2.25,3.8],t:[-1.62,1.48,-.1]},
 item: {p:[.42,2.12,2.9],t:[-.06,1.65,.65]},
 final: {p:[1.8,2.65,5.6],t:[-.75,1.55,.05]}
};
const shotViews=['talk','item','face','item','face','talk','face','final'];
const emotions=['SURPRISE','SURPRISE','POINT','BASE','POINT','BASE','POINT','POINT'];
const format = t => `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;

function error(message, cause) {
 state.ready=false; audio.pause(); $('loading').hidden=true; $('start-overlay').hidden=true;
 $('error').hidden=false; $('error-message').textContent=message;
 for(const id of ['play','restart','timeline']) $(id).disabled=true;
 if(cause) console.error(cause);
}
function syncPlaying() {
 const playing=!audio.paused&&!audio.ended;
 $('play').textContent=playing?'Ⅱ 일시정지':audio.ended?'▶ 다시 재생':'▶ 재생';
 $('start-overlay').hidden=playing || audio.currentTime>0;
 $('status').dataset.playing=String(playing);
 $('status').lastChild.textContent=playing?' NOW PLAYING':audio.ended?' END OF STORY':' STUDIO PREVIEW';
 $('viewport').dataset.playing=String(playing);
}
async function togglePlay() {
 if(!state.ready)return;
 if(!audio.paused){audio.pause();return;}
 if(audio.ended||audio.currentTime>=timeline.duration-.05)audio.currentTime=0;
 try { await audio.play(); } catch(e) { $('start-overlay').hidden=false; $('start').querySelector('small').textContent='다시 눌러 소리를 재생해 주세요'; console.error(e); }
}
$('play').addEventListener('click',togglePlay); $('start').addEventListener('click',togglePlay);
$('restart').addEventListener('click',async()=>{if(!state.ready)return;audio.currentTime=0;if(audio.paused)await togglePlay();});
$('timeline').addEventListener('input',e=>{audio.currentTime=Number(e.target.value);updateScene();});
for(const event of ['play','pause','ended'])audio.addEventListener(event,syncPlaying);
audio.addEventListener('error',()=>error('음성을 불러오지 못했어요. 다시 불러오기를 눌러 주세요.'));
$('retry').addEventListener('click',()=>location.reload());
function volumeUI(){ $('mute').textContent=audio.muted||audio.volume===0?'음소거':'소리 켜짐';$('mute').setAttribute('aria-pressed',String(audio.muted||audio.volume===0)); }
$('mute').addEventListener('click',()=>{if(audio.volume===0){audio.volume=1;$('volume').value=1;audio.muted=false;}else audio.muted=!audio.muted;volumeUI();});
$('volume').addEventListener('input',e=>{audio.volume=Number(e.target.value);audio.muted=false;volumeUI();});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.player').requestFullscreen();}catch{$('fullscreen').title='이 브라우저에서는 전체 화면을 지원하지 않아요.';}});
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>{state.view=b.dataset.view;for(const a of document.querySelectorAll('[data-view]'))a.setAttribute('aria-pressed',String(a===b));});
for(const b of document.querySelectorAll('[data-photo]'))b.addEventListener('click',()=>{photo=Number(b.dataset.photo);$('item-photo').src=`./assets/item-${photo}.jpg`;for(const a of document.querySelectorAll('[data-photo]'))a.setAttribute('aria-pressed',String(a===b));});
$('photo-open').addEventListener('click',()=>{ $('large-photo').src=`./assets/item-${photo}.jpg`;$('photo-dialog').showModal();});
$('photo-close').addEventListener('click',()=>$('photo-dialog').close());
$('photo-dialog').addEventListener('click',e=>{if(e.target===$('photo-dialog'))$('photo-dialog').close();});
window.addEventListener('keydown',e=>{if(e.code==='Space'&&!/INPUT|BUTTON|SUMMARY|A/.test(document.activeElement.tagName)&&!$('photo-dialog').open){e.preventDefault();togglePlay();}});

function resize(){
 if(!renderer)return;
 const rect=$('viewport').getBoundingClientRect();
 renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();
}
function mesh(geometry,material,position,parent=scene){const m=new THREE.Mesh(geometry,material);m.position.fromArray(position);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
async function buildItem(){
 const texture=await new THREE.TextureLoader().loadAsync('./assets/item-1.jpg');texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const group=new THREE.Group();group.position.set(-.1,1.23,.65);scene.add(group);
 const brass=new THREE.MeshStandardMaterial({color:0xb38a49,metalness:.5,roughness:.42});
 const dark=new THREE.MeshStandardMaterial({color:0x304c44,roughness:.8});
 mesh(new THREE.BoxGeometry(1.22,.84,.065),brass,[0,.45,0],group);
 mesh(new THREE.BoxGeometry(1.16,.78,.025),new THREE.MeshStandardMaterial({color:0xeee4ca,roughness:1}),[0,.45,.043],group);
 mesh(new THREE.PlaneGeometry(1.08,.747),new THREE.MeshStandardMaterial({map:texture,roughness:1,metalness:0}),[0,.45,.058],group);
 mesh(new THREE.BoxGeometry(.045,.28,.06),dark,[-.4,.08,-.04],group);mesh(new THREE.BoxGeometry(.045,.28,.06),dark,[.4,.08,-.04],group);
 mesh(new THREE.BoxGeometry(1.27,.035,.25),dark,[0,.022,-.02],group);
 return group;
}
function updateScene(){
 if(!state.ready)return;
 const t=audio.currentTime;
 const shotIndex=timeline.shots.findIndex(s=>t>=s.start&&t<s.end);
 const lineIndex=timeline.lines.findIndex(l=>t>=l.start&&t<l.end);
 const line=timeline.lines[lineIndex];const shot=timeline.shots[Math.max(0,shotIndex)];
 if(state.line!==lineIndex){
  state.line=lineIndex;$('caption').hidden=!line;
  if(line){$('speaker').textContent=line.who==='태진'?'태진 · 목소리':line.who;$('speaker').dataset.who=line.who;$('subtitle').textContent=line.text;}
  $('voice').hidden=line?.who!=='태진';$('voice-name').textContent='태진 · 목소리 출연';
 }
 state.shot=shotIndex;
 const emotion=emotions[Math.max(0,shotIndex)];
 const local=Math.max(0,t-shot.start);
 for(const a of actions){
  const chosen=a.getClip().name===`Okja_${emotion}`;
  a.enabled=true;a.setEffectiveWeight(chosen?1:0);
  // Hold the expressive middle of each original reaction; ease in from neutral.
  a.time=chosen?Math.min(1.45,local+0.1):0;
 }
 mixer.update(0);
 const speaking=line?.who==='옥자'&&!audio.paused;
 const energy=speaking?(envelope[Math.min(envelope.length-1,Math.floor(t*40))]??0):0;
 for(const m of morphs){const d=m.morphTargetDictionary;if(d.JawOpen!==undefined)m.morphTargetInfluences[d.JawOpen]=Math.min(.72,energy*2.4);if(d.MouthRound!==undefined)m.morphTargetInfluences[d.MouthRound]=Math.min(.22,energy*.55);}
 $('timeline').value=t;$('timeline').setAttribute('aria-valuetext',`${format(t)} / ${format(timeline.duration)}`);
 $('time').textContent=`${format(t)} / ${format(timeline.duration)}`;
 $('chapter').textContent=shotIndex===7?'원화는 한 장 · TJ Kim Collection':'삐라를 손으로 그린 화가';
 let view=state.view==='auto'?(t===0?'talk':shotViews[Math.max(0,shotIndex)]):state.view;
 const preset=views[view];
 const portrait=camera.aspect<1;
 cameraPosition.fromArray(preset.p);cameraTarget.fromArray(preset.t);
 if(portrait){const offset=cameraPosition.clone().sub(cameraTarget);cameraPosition.copy(cameraTarget).add(offset.multiplyScalar(view==='wide'?1.18:view==='item'?1.6:1.48));}
}
async function init(){
 try{
 renderer=new THREE.WebGLRenderer({canvas:$('stage'),antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 scene=new THREE.Scene();scene.background=new THREE.Color('#153331');
 camera=new THREE.PerspectiveCamera(38,1,.05,80);
 scene.add(new THREE.HemisphereLight(0xf3f7ed,0x687c6e,2.4));
 const key=new THREE.DirectionalLight(0xfff0d6,3.8);key.position.set(0,6,6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;key.shadow.normalBias=.025;key.shadow.bias=-.0001;scene.add(key);
 const fill=new THREE.DirectionalLight(0xc7ece5,1.6);fill.position.set(-5,4,0);scene.add(fill);
 const back=new THREE.DirectionalLight(0xffdfaa,1.2);back.position.set(2,5,-3);scene.add(back);
 const loader=new GLTFLoader();
 const [stage,character,data,energy,sound]=await Promise.all([loader.loadAsync('./assets/studio.glb'),loader.loadAsync('./assets/reactions.glb'),fetch('./assets/timeline.json').then(r=>{if(!r.ok)throw Error('Timeline');return r.json();}),fetch('./assets/envelope.json').then(r=>{if(!r.ok)throw Error('Envelope');return r.json();}),fetch('./assets/episode.wav').then(r=>{if(!r.ok)throw Error('Audio');return r.blob();})]);
 timeline=data;envelope=energy;
 // A local Blob makes the complete original audio seekable even on static hosts without Range support.
 audio.src=URL.createObjectURL(sound);
 await new Promise((resolve,reject)=>{audio.addEventListener('loadedmetadata',resolve,{once:true});audio.addEventListener('error',reject,{once:true});audio.load();});
 scene.add(stage.scene);
 stage.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 const vase=stage.scene.getObjectByName('Prop_Celadon_Vase');if(vase)vase.visible=false;
 await buildItem();
 hero=character.scene;hero.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;if(o.morphTargetDictionary)morphs.push(o);}});
 hero.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(hero);const height=bounds.max.y-bounds.min.y;const center=bounds.getCenter(new THREE.Vector3());
 const normalize=new THREE.Group();const scale=1.64/height;normalize.scale.setScalar(scale);normalize.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);normalize.add(hero);
 characterBase=new THREE.Group();characterBase.position.set(-1.83,.36,-.25);characterBase.rotation.y=.24;characterBase.add(normalize);scene.add(characterBase);
 mixer=new THREE.AnimationMixer(hero);actions=character.animations.map(c=>{const a=mixer.clipAction(c);a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();return a;});
 for(const line of timeline.lines){const li=document.createElement('li');const b=document.createElement('button');b.textContent=format(line.start);b.setAttribute('aria-label',`${format(line.start)} ${line.who} 대사로 이동`);b.addEventListener('click',()=>{audio.currentTime=line.start;updateScene();});const name=document.createElement('b');name.textContent=line.who;const text=document.createElement('p');text.textContent=line.text;li.append(b,name,text);$('transcript').append(li);}
 new ResizeObserver(resize).observe($('viewport'));resize();
 state.ready=true;$('loading').hidden=true;$('start-overlay').hidden=false;$('start').disabled=false;
 for(const id of ['play','restart','timeline'])$(id).disabled=false;
 updateScene();camera.position.copy(cameraPosition);camera.lookAt(cameraTarget);syncPlaying();
 const look=cameraTarget.clone();
 function render(stamp){const dt=Math.min(.1,(stamp-previousStamp)/1000||.016);previousStamp=stamp;updateScene();const easing=1-Math.exp(-dt*3.5);camera.position.lerp(cameraPosition,easing);look.lerp(cameraTarget,easing);camera.lookAt(look);renderer.render(scene,camera);state.frame++;requestAnimationFrame(render);}
 requestAnimationFrame(render);
 window.studioDebug=()=>({ready:state.ready,time:audio.currentTime,paused:audio.paused,ended:audio.ended,line:state.line,shot:state.shot,view:state.view,frame:state.frame,heroHeight:height*scale,heroPosition:characterBase.position.toArray(),camera:camera.position.toArray(),jaw:morphs.map(m=>m.morphTargetInfluences[m.morphTargetDictionary.JawOpen]),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
 }catch(e){error('스튜디오를 불러오지 못했어요. WebGL을 지원하는 Chrome 또는 Safari에서 다시 시도해 주세요.',e);}
}
init();
