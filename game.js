const $=id=>document.getElementById(id),canvas=$('road'),ctx=canvas.getContext('2d');
let save={cash:0,xp:0,best:0,runs:0,up:[0,0,0,0],milestone:0,ownedSkins:['acid'],skin:'acid',rewardUsed:true};
try{const s=JSON.parse(localStorage.getItem('neon-racing-v1'));if(s&&Array.isArray(s.up)&&s.up.length===4)save={...save,...s}}catch(e){}
for(const k of ['cash','xp','best','runs','milestone'])save[k]=Number.isFinite(save[k])?Math.max(0,save[k]):0;
save.up=save.up.map(n=>Number.isFinite(n)?Math.max(0,Math.min(5,Math.floor(n))):0);
if(save.pending){save.cash+=Math.max(0,Number(save.pending.cash)||0);save.xp+=Math.max(0,Number(save.pending.xp)||0);save.best=Math.max(save.best,Number(save.pending.distance)||0);save.runs++;delete save.pending;try{localStorage.setItem('neon-racing-v1',JSON.stringify(save))}catch(e){}}
const specs=[['E','Engine','Higher top speed'],['H','Handling','Sharper steering'],['N','Nitro tank','Longer boost'],['A','Armor','Extra hit point']];
let state='ready',keys={},W=800,H=610,t=0,last=0,traffic=[],particles=[],spawn=0,dist=0,earned=0,passes=0,speed=0,nitro=100,hp=3,x=.5,inv=0,toastTime=0,boosting=false,sound=false,audio,checkpointTime=0;
const SKINS=[
 {id:'acid',name:'Acid Runner',tag:'ORIGINAL',price:0,color:'#d4ff42',accent:'#111d16',glow:'#b9ff39'},
 {id:'glacier',name:'Glacier',tag:'ICE SERIES',price:450,color:'#bcefff',accent:'#2479c9',glow:'#47dbff'},
 {id:'sakura',name:'Sakura GT',tag:'STREET SERIES',price:800,color:'#fb77b8',accent:'#65275e',glow:'#ff4dba'},
 {id:'inferno',name:'Inferno',tag:'HEAT SERIES',price:1200,color:'#ff8245',accent:'#581c21',glow:'#ff5628'},
 {id:'phantom',name:'Phantom',tag:'NIGHT SERIES',price:1800,color:'#9992c9',accent:'#25223c',glow:'#ac75ff'},
 {id:'gold',name:'Gold Rush',tag:'PRESTIGE',price:2600,color:'#f1ce74',accent:'#6b4424',glow:'#ffcf56'}
];
save.ownedSkins=Array.isArray(save.ownedSkins)?save.ownedSkins.filter(id=>SKINS.some(s=>s.id===id)):['acid'];
if(!save.ownedSkins.includes('acid'))save.ownedSkins.push('acid');
if(!save.ownedSkins.includes(save.skin))save.skin='acid';
function activeSkin(){return SKINS.find(s=>s.id===save.skin)||SKINS[0]}
function skinArt(s){return '<svg viewBox="0 0 220 112" aria-hidden="true"><ellipse cx="110" cy="89" rx="75" ry="12" fill="'+s.glow+'" opacity=".14"/><path d="M44 74L58 45L87 25H141L166 45L179 74L169 88H53Z" fill="'+s.color+'"/><path d="M75 49L91 30H136L152 49Z" fill="#142238"/><path d="M81 45L93 33H133L140 39Z" fill="#89cee9" opacity=".4"/><path d="M44 74H179L169 88H53Z" fill="#000" opacity=".3"/><path d="M102 52H109V82H102ZM113 52H120V82H113Z" fill="'+s.accent+'"/><path d="M54 66H87V71H54ZM139 66H170V71H139Z" fill="#ff4265"/><path d="M41 53H181V58H41Z" fill="'+s.accent+'"/><path d="M52 87V95H69V87M153 87V95H170V87" stroke="#060b16" stroke-width="9"/><rect x="101" y="76" width="20" height="5" fill="#f1f2df"/></svg>'}
function renderSkins(){const locked=state==='running'||state==='paused';$('skinshop').innerHTML=SKINS.map(s=>{const owned=save.ownedSkins.includes(s.id),equipped=save.skin===s.id;return '<article class="skin-card '+(equipped?'equipped':'')+'" style="--paint:'+s.color+';--glow:'+s.glow+'"><div class="skin-label">'+tr(s.tag)+'<span>'+(equipped?tr('ON THE ROAD'):owned?tr('OWNED'):'')+'</span></div>'+skinArt(s)+'<h3>'+s.name+'</h3><button data-skin="'+s.id+'" '+(locked||equipped||!owned&&save.cash<s.price?'disabled':'')+'>'+(equipped?tr('EQUIPPED'):owned?tr('EQUIP'):tr('BUY')+' / '+s.price.toLocaleString()+' '+tr('CR'))+'</button></article>'}).join('');$('equippedName').textContent=activeSkin().name;}
function chooseSkin(id){if(state==='running'||state==='paused'||adBusy||platformPaused)return false;const s=SKINS.find(s=>s.id===id);if(!s)return false;if(!save.ownedSkins.includes(id)){if(save.cash<s.price)return false;save.cash-=s.price;save.ownedSkins.push(id);}save.skin=id;persist();profile();beep(660,.12);return true;}
$('skinshop').onclick=e=>{const b=e.target.closest('[data-skin]');if(b&&!b.disabled)chooseSkin(b.dataset.skin)};


function persist(){try{localStorage.setItem('neon-racing-v1',JSON.stringify(save))}catch(e){$('status').textContent=tr('Storage unavailable: progress may not save.');}}
function checkpoint(){if(state==='running'||state==='paused'){save.pending={cash:Math.floor(earned),xp:Math.floor(dist*70+passes*4),distance:dist};persist();}}
function profile(){renderSkins();let lv=Math.floor(save.xp/400)+1;$('cash').textContent=save.cash.toLocaleString();$('xptext').textContent=tr('Level')+' '+lv+' / '+save.xp%400+' XP';$('xpbar').style.width=save.xp%400/4+'%';document.querySelector('.avatar').textContent=String(lv).padStart(2,'0');$('rank').textContent=tr(lv<5?'ROOKIE':lv<10?'STREET PRO':'NIGHT LEGEND');$('best').textContent=save.best.toFixed(2)+' '+tr('KM');$('runs').textContent=save.runs;$('upgrades').innerHTML=specs.map((s,i)=>{let n=save.up[i],cost=200+n*225;return `<div class="upgrade"><div class="symbol">${s[0]}</div><div><h4>${tr(s[1])}</h4><p>${tr(s[2])} / ${n}/5</p></div><button data-up="${i}" ${n>=5||save.cash<cost||state==='running'||state==='paused'?'disabled':''}>${n>=5?tr('MAX'):cost+' '+tr('CR')}</button></div>`}).join('');$('missionTitle').textContent=tr(save.milestone?'Keep climbing':'Go the distance');$('missiontext').textContent=tr('Reach')+' '+(2+save.milestone*2)+' '+tr('km in a single run.');$('finishrun').hidden=state!=='paused';}
$('upgrades').onclick=e=>{let b=e.target.closest('[data-up]');if(!b||b.disabled||adBusy||platformPaused||state==='running'||state==='paused')return;let i=+b.dataset.up,c=200+save.up[i]*225;if(save.cash>=c&&save.up[i]<5){save.cash-=c;save.up[i]++;persist();profile();beep(700,.1)}};
function beep(f,d){if(!sound||adBusy||platformPaused||document.hidden)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});let o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+d)}catch(e){}}
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=tr(sound?'SOUND ON':'SOUND OFF');if(!sound)mute();else beep(500,.1);};
function message(s){$('toast').textContent=tr(s);toastTime=2;}
function renderOverlay(){
 $('start').disabled=!platformReady||platformPaused||adBusy;$('reward').hidden=!ysdk||state!=='over';$('reward').disabled=save.rewardUsed||adBusy||platformPaused;$('reward').textContent=tr(save.rewardUsed?'Reward claimed':'Watch an ad: +30 credits');
 if(state==='ready'){$('stage').textContent=tr('LEVEL')+' 01';$('distance').innerHTML='0.00 <span>'+tr('KM')+'</span>';$('runCash').textContent='0 '+tr('CR');document.querySelector('.flag').textContent=tr('MIDNIGHT RUN');document.querySelector('h2').innerHTML='NEON <em>RACING</em>';$('overlayText').textContent=tr('Dodge traffic. Earn credits. Build your ride.');$('start').textContent=tr(platformReady?'START RACE':'LOADING');$('overlayHint').textContent=tr('Arrows / A D: steer. Space: nitro. S: brake.');}
 if(state==='paused'){document.querySelector('.flag').textContent=tr('TAKE A BREATHER');document.querySelector('h2').innerHTML=tr('RACE')+' <em>'+tr('PAUSED')+'</em>';$('overlayText').textContent=tr('Your highway is waiting.');$('start').textContent=tr('RESUME RACE');$('overlayHint').textContent=tr('PRESS P TO RESUME');}
 if(state==='over'){document.querySelector('.flag').textContent=tr('RUN COMPLETE');document.querySelector('h2').innerHTML=tr('ONE MORE')+' <em>'+tr('RUN?')+'</em>';$('overlayText').textContent=dist.toFixed(2)+' '+tr('KM')+' / '+passes+' '+tr('overtakes')+' / '+tr('Earned')+': '+Math.floor(earned)+' '+tr('CR')+' / +'+Math.floor(dist*70+passes*4)+' XP';$('start').textContent=tr('RACE AGAIN');$('overlayHint').textContent=tr('UPGRADE YOUR CAR IN THE GARAGE');}
}
function start(){if(!platformReady||adBusy||platformPaused)return;if(state==='paused'){pause();return;}state='running';travel=0;steering=0;shake=0;toastTime=0;checkpointTime=0;$('toast').textContent='';$('runCash').textContent='0 '+tr('CR');traffic=[];particles=[];dist=0;earned=0;passes=0;speed=110;nitro=100;hp=3+save.up[3];x=.5;inv=0;spawn=.5;keys={};save.rewardUsed=false;$('overlay').classList.add('hidden');$('pause').style.display='block';checkpoint();profile();sdkPlay(true);beep(440,.15);}
function end(){if(state!=='running'&&state!=='paused')return;state='over';delete save.pending;save.cash+=Math.floor(earned);save.xp+=Math.floor(dist*70+passes*4);save.best=Math.max(save.best,dist);save.runs++;persist();sdkPlay(false);profile();$('overlay').classList.remove('hidden');$('pause').style.display='none';renderOverlay();beep(90,.4);}
function pause(){if(state==='running'){state='paused';keys={};checkpoint();mute();sdkPlay(false);$('overlay').classList.remove('hidden');renderOverlay();profile();}else if(state==='paused'&&!adBusy&&!platformPaused&&$('screen-race').classList.contains('active')){state='running';$('overlay').classList.add('hidden');sdkPlay(true);}}
$('finishrun').onclick=()=>{end();showScreen('race');};$('start').onclick=start;$('pause').onclick=pause;
const keyMap={ArrowLeft:'arrowleft',ArrowRight:'arrowright',ArrowDown:'arrowdown',KeyA:'a',KeyD:'d',KeyS:'s',Space:' ',KeyP:'p',Escape:'escape'};
window.addEventListener('keydown',e=>{const k=keyMap[e.code];if(!k||!$('screen-race').classList.contains('active')||adBusy||platformPaused||e.target.tagName==='SELECT')return;e.preventDefault();keys[k]=true;if(!e.repeat&&(k==='p'||k==='escape'))pause();});window.addEventListener('keyup',e=>{const k=keyMap[e.code];if(k)keys[k]=false;});
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{if(adBusy||platformPaused)return;e.preventDefault();b.setPointerCapture(e.pointerId);keys[b.dataset.key.toLowerCase()]=true;};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys[b.dataset.key.toLowerCase()]=false;});
let drag=null;canvas.onpointerdown=e=>{if(state!=='running'||adBusy||platformPaused)return;canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,screen:e.clientX,x};};canvas.onpointermove=e=>{if(drag&&drag.id===e.pointerId&&state==='running')x=Math.max(.075,Math.min(.925,drag.x+(e.clientX-drag.screen)/(W*.86)));};canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=()=>drag=null;
function resize(){let r=canvas.getBoundingClientRect();if(r.width<=0||r.height<=0)return;W=r.width;H=r.height;const dpr=Math.min(2,devicePixelRatio||1);canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}new ResizeObserver(resize).observe(canvas);

// Perspective highway: world-space distance drives both rendering and collisions.
const ROAD_DEPTH=145, PLAYER_WIDTH=.125;
let travel=0,steering=0,shake=0;
function project(lane,z){const scale=18/(Math.max(-8,z)+18),horizon=H*.29,base=W*.86;return {x:W*.5+(lane-.5)*base*scale,y:horizon+(H*.80-horizon)*scale,scale,width:base*scale};}
function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill();}
function roadQuad(a,b,z1,z2,color){const p=project(a,z1),q=project(b,z1),r=project(b,z2),s=project(a,z2);poly([[p.x,p.y],[q.x,q.y],[r.x,r.y],[s.x,s.y]],color);}
function car(cx,cy,w,color,player=false,truck=false,signal=0){
 ctx.save();ctx.translate(cx,cy);if(player)ctx.rotate(-steering*.035);
 if(player){ctx.fillStyle=activeSkin().glow;ctx.shadowColor=activeSkin().glow;ctx.shadowBlur=w*.36;ctx.globalAlpha=.35;ctx.beginPath();ctx.ellipse(0,3,w*.65,w*.13,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.shadowBlur=0;}ctx.fillStyle='#030712aa';ctx.beginPath();ctx.ellipse(0,3,w*.65,w*.16,0,0,Math.PI*2);ctx.fill();
 const roof=truck?-.92:-.66;
 ctx.fillStyle='#060912';ctx.fillRect(-w*.48,-w*.23,w*.19,w*.30);ctx.fillRect(w*.29,-w*.23,w*.19,w*.30);
 poly([[-w*.5,-w*.07],[-w*.48,-w*.36],[-w*.33,w*roof],[w*.32,w*roof],[w*.48,-w*.36],[w*.5,-w*.07]],color);
 poly([[-w*.48,-w*.36],[-w*.33,w*roof],[-w*.29,w*(roof+.06)],[-w*.38,-w*.31]],'#ffffff55');
 poly([[w*.48,-w*.36],[w*.32,w*roof],[w*.28,w*(roof+.08)],[w*.37,-w*.29]],'#00000040');
 if(truck){ctx.fillStyle='#263144';ctx.fillRect(-w*.34,-w*.84,w*.68,w*.48);ctx.strokeStyle='#566377';ctx.lineWidth=Math.max(1,w*.015);for(let j=0;j<4;j++){ctx.beginPath();ctx.moveTo(-w*.3,-w*(.44+j*.1));ctx.lineTo(w*.3,-w*(.44+j*.1));ctx.stroke();}}
 else {poly([[-w*.27,-w*.59],[w*.27,-w*.59],[w*.36,-w*.36],[-w*.36,-w*.36]],'#0a1e35');poly([[-w*.23,-w*.56],[w*.22,-w*.56],[w*.26,-w*.50],[-w*.25,-w*.50]],'#5ca6bd77');}
 poly([[-w*.48,-w*.32],[w*.48,-w*.32],[w*.5,-w*.07],[-w*.5,-w*.07]],color);
 ctx.fillStyle='#00000044';ctx.fillRect(-w*.47,-w*.15,w*.94,w*.09);
 if(player){ctx.fillStyle=activeSkin().accent;ctx.fillRect(-w*.12,-w*.29,w*.07,w*.17);ctx.fillRect(w*.05,-w*.29,w*.07,w*.17);ctx.fillStyle=activeSkin().accent;ctx.fillRect(-w*.52,-w*.34,w*1.04,w*.045);}
 ctx.shadowBlur=Math.max(3,w*.15);ctx.shadowColor='#ff365e';ctx.fillStyle='#ff4265';ctx.fillRect(-w*.42,-w*.26,w*.24,w*.055);ctx.fillRect(w*.18,-w*.26,w*.24,w*.055);ctx.shadowBlur=0;
 ctx.fillStyle='#b9d0dc';ctx.fillRect(-w*.09,-w*.14,w*.18,w*.045);
 if(signal&&Math.floor(travel*1.3)%2===0){ctx.fillStyle='#ffcc4c';ctx.shadowColor='#ffbe35';ctx.shadowBlur=12;ctx.fillRect((signal<0?-.45:.36)*w,-w*.27,w*.09,w*.09);ctx.shadowBlur=0;}
 if(player&&boosting){for(const a of [-.3,.3]){poly([[w*(a-.06),0],[w*(a+.06),0],[w*a,w*(.25+Math.random()*.20)]],'#36deff');poly([[w*(a-.025),0],[w*(a+.025),0],[w*a,w*.23]],'#edffff');}}
 ctx.restore();
}
function addTraffic(level){
 const lanes=[0,1,2,3].filter(l=>!traffic.some(c=>Math.abs(c.z-ROAD_DEPTH)<23&&Math.abs(c.x-(l+.5)/4)<.17));
 if(!lanes.length)return;
 const lane=lanes[Math.floor(Math.random()*lanes.length)],truck=level>=1&&Math.random()<.28;
 traffic.push({x:(lane+.5)/4,lane,z:ROAD_DEPTH,v:truck?80:85+Math.random()*30,color:['#da5980','#7b8bda','#e5ab52','#c5d0cf','#528c9d'][Math.floor(Math.random()*5)],truck,width:truck?.16:.125,done:false,hit:false,age:0,changeT:0,changeTo:null,changed:false});
}
function update(dt){
 checkpointTime+=dt;if(checkpointTime>=1){checkpointTime=0;checkpoint();}

 const level=1+Math.floor(dist/.65);boosting=!!keys[' ']&&nitro>1;
 const braking=keys.s||keys.arrowdown,target=braking?105:215+save.up[0]*16+Math.min(28,(level-1)*4)+(boosting?85:0);
 speed+=(target-speed)*Math.min(1,dt*2);nitro=Math.max(0,Math.min(100,nitro+(boosting?-27/(1+save.up[2]*.25):8)*dt));
 steering=(keys.arrowright||keys.d?1:0)-(keys.arrowleft||keys.a?1:0);
 x=Math.max(.075,Math.min(.925,x+steering*dt*(.56+save.up[1]*.065)));
 travel+=speed/3.6*dt;dist+=speed*dt/3600;earned+=speed*dt/3600*25;
 inv=Math.max(0,inv-dt);shake=Math.max(0,shake-dt);spawn-=dt;
 if(spawn<=0){addTraffic(level);spawn=Math.max(.42,.82-level*.035)+Math.random()*.20;}
 for(const c of traffic){
  c.age+=dt;c.z-=Math.max(12,(speed-c.v)/3.6)*dt;
  // Drivers signal for a full second before moving. Changes stop well ahead of the player.
  if(level>=2&&!c.changed&&c.age>1.1&&c.z>55&&Math.random()<dt*.22){
   c.changed=true;const next=c.lane+(Math.random()<.5?-1:1);
   if(next>=0&&next<4&&!traffic.some(o=>o!==c&&Math.abs(o.z-c.z)<28&&(o.lane===next||o.changeTo===next))){c.changeTo=next;c.changeT=1.0;}
  }
  if(c.changeTo!==null){c.changeT-=dt;if(c.changeT<=0){const goal=(c.changeTo+.5)/4,delta=goal-c.x;c.x+=Math.sign(delta)*Math.min(Math.abs(delta),dt*.16);if(Math.abs(c.x-goal)<.002){c.lane=c.changeTo;c.changeTo=null;}}}
  const dx=Math.abs(c.x-x),hitWidth=(PLAYER_WIDTH+c.width)*.44;
  if(c.z<3.5&&c.z>-3.5&&dx<hitWidth&&!c.hit&&inv<=0){
   c.hit=true;hp--;inv=.9;shake=.4;speed*=.68;beep(120,.2);message(hp?'HIT! FIND A GAP':'WRECKED');
   const p=project(x,0);for(let i=0;i<20;i++)particles.push({x:p.x,y:p.y-25,vx:(Math.random()-.5)*260,vy:-Math.random()*220,life:.6});
   if(hp<=0){end();return;}
  }
  if(c.z<-4&&!c.done){c.done=true;if(!c.hit){passes++;earned+=4;checkpoint();if(dx<hitWidth+.07&&dx>=hitWidth){earned+=10;checkpoint();message('CLOSE CALL +10');beep(800,.08);}}}
 }
 traffic=traffic.filter(c=>c.z>-8);
 if(dist>=2+save.milestone*2){save.milestone++;save.cash+=180;checkpoint();persist();profile();message('MILESTONE! +180');beep(1000,.2);}
 $('runCash').textContent=Math.floor(earned)+' '+tr('CR');$('distance').innerHTML=dist.toFixed(2)+' <span>'+tr('KM')+'</span>';$('passes').textContent=String(passes).padStart(3,'0');$('stage').textContent=tr('LEVEL')+' '+String(level).padStart(2,'0');$('speed').textContent=String(Math.round(speed)).padStart(3,'0');$('nitrobar').style.width=nitro+'%';$('health').textContent='\u2665 '.repeat(Math.max(0,hp));$('missionbar').style.width=Math.min(100,dist/(2+save.milestone*2)*100)+'%';
}
function scenery(){
 const hy=H*.29,sky=ctx.createLinearGradient(0,0,0,hy+100);sky.addColorStop(0,'#070e24');sky.addColorStop(.65,'#232044');sky.addColorStop(1,'#8d3963');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 for(let i=0;i<60;i++){ctx.fillStyle=i%4?'#7a87a4':'#e8e6eb';ctx.fillRect((i*197.3)%W,(i*73.9)%(hy*.8),i%5?1:2,1);}
 ctx.fillStyle='#eab8d5';ctx.shadowColor='#df87c8';ctx.shadowBlur=30;ctx.beginPath();ctx.arc(W*.72,hy*.47,22,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
 for(let i=0;i<35;i++){const bx=i*W/34,bw=W/31,bh=18+(i*43)%80;ctx.fillStyle=i%2?'#11182b':'#131b32';ctx.fillRect(bx,hy-bh,bw,bh);if(i%4===0){ctx.fillRect(bx+bw*.4,hy-bh-14,2,14);}ctx.fillStyle=i%3?'#58708866':'#e88bb266';for(let j=0;j<4;j++)for(let k=0;k<Math.floor(bh/12);k++)if((i+j+k)%3)ctx.fillRect(bx+3+j*bw/4,hy-bh+6+k*11,2,3);}
 ctx.fillStyle='#0d1526';ctx.fillRect(0,hy,W,H-hy);
 // Subtle ground grid gives the roadside real depth.
 for(let i=-6;i<=6;i++)roadQuad(i/2-.006,i/2+.006,-7,450,'#20304955');
 for(let i=0;i<36;i++){const z=i*13-travel%13;roadQuad(-4,5,z,z+.14,'#24304955');}
 for(let i=79;i>=0;i--){let z=i*6-7;roadQuad(0,1,z,z+6,(Math.floor((z+travel)/12)%2)?'#1b2334':'#1e2739');}
 for(let k=1;k<4;k++)for(let i=0;i<36;i++){const z=i*14-travel%14;roadQuad(k/4-.003,k/4+.003,z,z+5,'#7894af88');}
 for(let i=0;i<22;i++){const z=i*18-travel%18;roadQuad(.035,.038,z,z+7,'#5ad8e522');roadQuad(.96,.965,z,z+7,'#df6bfa22');}for(const side of [0,1]){roadQuad(side-.007,side+.007,-7,470,side?'#d070e5':'#4adeec');roadQuad(side===0?-.022:1.018,side===0?-.018:1.022,-7,470,'#496f9c');}
 // Roadside lights use the same camera projection as the traffic.
 for(let i=20;i>=0;i--)for(const side of [-.08,1.08]){let z=i*22-travel%22;if(z<-5)continue;const p=project(side,z),height=H*.40*p.scale;ctx.strokeStyle='#42657c';ctx.lineWidth=Math.max(1,3*p.scale);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-height);ctx.lineTo(p.x+(side<0?1:-1)*W*.035*p.scale,p.y-height);ctx.stroke();ctx.fillStyle=side<0?'#65ecff':'#e18ef4';ctx.shadowBlur=10*p.scale;ctx.shadowColor=ctx.fillStyle;ctx.fillRect(p.x+(side<0?0:-1)*W*.035*p.scale,p.y-height,W*.035*p.scale,Math.max(1,3*p.scale));ctx.shadowBlur=0;}
}
function draw(dt){
 if(state==='running'){t+=dt;update(dt);}else if(state==='ready'){travel+=dt*10;t+=dt;}
 if(state!=='running')boosting=false;
 ctx.save();if(shake>0&&state==='running')ctx.translate((Math.random()-.5)*7,(Math.random()-.5)*5);
 scenery();
 const cars=state==='ready'?[{x:.125,z:32,color:'#d39755'},{x:.625,z:72,color:'#7b8bda'},{x:.875,z:12,color:'#528c9d'}]:traffic;
 const visible=[...cars].sort((a,b)=>b.z-a.z);let playerDrawn=false;
 function player(){const p=project(x,0);if(inv<=0||state!=='running'||Math.floor(inv*12)%2===0)car(p.x,p.y,p.width*PLAYER_WIDTH,activeSkin().color,true);playerDrawn=true;}
 for(const c of visible){if(c.z<0&&!playerDrawn)player();const p=project(c.x,c.z);car(p.x,p.y,p.width*(c.width||.125),c.color,false,c.truck,c.changeTo===null||c.changeTo===undefined?0:Math.sign(c.changeTo-c.lane));}
 if(!playerDrawn)player();
 if(boosting){ctx.strokeStyle='#86efff66';ctx.lineWidth=1;for(let i=0;i<15;i++){const side=i%2?-1:1,y=H*.4+((i*71+travel*11)%(H*.55));ctx.beginPath();ctx.moveTo(W*.5+side*W*.44,y);ctx.lineTo(W*.5+side*W*.5,y+35);ctx.stroke();}}
 for(const p of particles){if(state==='running'){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}ctx.fillStyle='#ffbf63';ctx.fillRect(p.x,p.y,3,3);}particles=particles.filter(p=>p.life>0);
 ctx.restore();if(toastTime>0&&state==='running'){toastTime-=dt;if(toastTime<=0)$('toast').textContent='';}
 const shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#050b1966');shade.addColorStop(.25,'#050b1900');shade.addColorStop(.82,'#050b1900');shade.addColorStop(1,'#050b19dd');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
}
function frame(now){const dt=Math.min(.04,(now-last)/1000||.016);last=now;draw(dt);requestAnimationFrame(frame);}localize();profile();resize();renderOverlay();requestAnimationFrame(frame);boot();
