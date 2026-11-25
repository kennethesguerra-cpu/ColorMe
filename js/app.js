/* ===== Color Me! Core UI, Mascot & Game Engine ===== */
const $=s=>document.querySelector(s),shuffle=a=>[...a].sort(()=>Math.random()-.5),pick=(a,n)=>shuffle(a).slice(0,n);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const key=d=>d.toLocaleDateString('en-CA');
const ul=c=>`text-decoration:underline;text-decoration-color:${c=='white'?'#C9D0E8':COL[c]};text-decoration-thickness:6px;text-underline-offset:6px`;
let S=load(),G=null,idle=null,homeIdle=null,palT=null,palTalking=false,lastFact=null,lastScene=null,wiping=false,curPage='';

/* ---------- navigation state & paint wipe ---------- */
function setNav(p){
  curPage=p;
  const nh=$('#navHome'),np=$('#navProf'),bk=$('#backTitle'),ns=$('#navStudent'),na=$('#navAdmin'),rt=$('#roleTag');
  const isAdmin=p==='teacher';
  const isPending=p==='pending';
  if(ns)ns.style.display=(isAdmin||isPending)?'none':'flex';
  if(na)na.style.display=(isAdmin||isPending)?'flex':'none';
  if(rt){
    rt.style.display=isAdmin?'inline-flex':'none';
    rt.textContent='Teacher';
  }
  if(nh){
    const onHome=p==='home';
    nh.disabled=onHome;
    nh.classList.toggle('current',onHome);
  }
  if(np){
    const onProf=p==='profile';
    np.disabled=onProf;
    np.classList.toggle('current',onProf);
  }
  if(bk){
    bk.style.display=p==='home'?'grid':'none';
  }
}

function brandClick(){
  if(curAdmin())teacherDashboard();
  else if(curStudent())home();
  else titleScreen();
}

function go(fn,instant=false){
  const w=$('#wipe');
  if(instant||!w||matchMedia('(prefers-reduced-motion:reduce)').matches){fn();return}
  if(wiping)return;
  wiping=true;
  w.className='cover';
  setTimeout(()=>{
    fn();
    w.className='reveal';
    setTimeout(()=>{
      w.className='';
      wiping=false;
    },440);
  },360);
}

/* ---------- Pal the mascot ---------- */
const talkMood=()=>Math.random()<.5?'think':'happy';

function mode(m){
  clearTimeout(homeIdle);
  clearTimeout(palT);
  palTalking=false;
  document.body.dataset.pal=m;
  $('#pal').classList.remove('in');
}
function palBounce(){
  const img=$('#palImg');
  img.classList.remove('bounce');
  void img.offsetWidth;
  img.classList.add('bounce');
}
function palSet(text,mood='happy',bounce=true){
  const b=$('#palBub'),img=$('#palImg'),file=(MASCOT.files&&MASCOT.files[mood])||'happy.png';
  img.src=encodeURI(`${MASCOT.dir}${file}`);
  if(text){
    b.innerHTML=text;
    b.classList.remove('hide','pop');
    void b.offsetWidth;
    b.classList.add('pop');
  }else{
    b.classList.add('hide');
  }
  if(bounce)palBounce();
}
function palQuiet(){
  clearTimeout(palT);
  palTalking=false;
  palSet('','idle',false);
  if(document.body.dataset.pal==='home')homeIdleReset();
}
function palSpeakFact(){
  if(document.body.dataset.pal!=='home')return;
  clearTimeout(homeIdle);
  clearTimeout(palT);
  palTalking=true;
  const pool=SAY.facts.filter(f=>f!==lastFact);
  const fact=lastFact=pick(pool.length?pool:SAY.facts,1)[0];
  palSet(fact,talkMood(),true);
  palT=setTimeout(palQuiet,HOME_TALK_MS);
}
function homeIdleReset(){
  clearTimeout(homeIdle);
  if(document.body.dataset.pal==='home'&&!palTalking){
    homeIdle=setTimeout(palSpeakFact,HOME_IDLE_MS);
  }
}
function palCall(text,mood='think',ms=6500){
  if(!G)return;
  palSet(text,mood,true);
  $('#pal').classList.add('in');
  clearTimeout(palT);
  palT=setTimeout(palHide,ms);
}
function palHide(){
  clearTimeout(palT);
  $('#pal').classList.remove('in');
  setTimeout(()=>{if(!$('#pal').classList.contains('in'))palSet('','idle',false)},450);
}

/* Mascot & speech bubble click handlers */
$('#palImg').onanimationend=e=>{if(e.animationName==='palbounce')$('#palImg').classList.remove('bounce')};
$('#palImg').onclick=e=>{
  e.stopPropagation();
  if(document.body.dataset.pal==='home')palSpeakFact();
};
$('#palBub').onclick=e=>{
  e.stopPropagation();
  const m=document.body.dataset.pal;
  if(m==='home'){
    palQuiet();
  }else if(m==='game'){
    palHide();
    idleReset();
  }else if(m==='welcome'){
    palSet('','idle',false);
  }
};
['pointerdown','keydown'].forEach(evt=>document.addEventListener(evt,()=>{
  if(document.body.dataset.pal==='home'&&!palTalking)homeIdleReset();
}));

/* ---------- shared UI ---------- */
function logo(c=''){const cl=['red','orange','yellow','green','blue','purple','pink','red','orange'];return `<span class="logo ${c}">${[...'Color Me!'].map((l,i)=>l==' '?' ':`<i style="color:${COL[cl[i]]};animation-delay:${i*.12}s">${l}</i>`).join('')}</span>`}
$('#lg').innerHTML=logo();
function show(h){clearTimeout(idle);$('#main').innerHTML=h;scrollTo(0,0)}
function streakFor(data){let n=0,d=new Date(),days=(data&&data.days)||{};if(!days[key(d)])d.setDate(d.getDate()-1);while(days[key(d)]){n++;d.setDate(d.getDate()-1)}return n}
function streak(){return streakFor(S)}
function evalBadges(){const b=S.b=S.b||{},old={...b};if(streak()>=STREAK_DAYS)b.streak=1;if(S.perf&&Object.keys(S.perf).length)b.perfect=1;if(S.swift&&Object.keys(S.swift).length)b.swift=1;if(b.streak&&b.perfect&&b.swift)b.master=1;return Object.keys(b).filter(k=>!old[k])}
function pop(el){const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;for(let i=0;i<16;i++){const s=document.createElement('i');s.className='cf';s.style.cssText=`left:${x}px;top:${y}px;background:${COL[K[i%9]]}`;document.body.appendChild(s);const a=i/16*6.28,d=70+Math.random()*80;s.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d-30}px) scale(.4) rotate(200deg)`,opacity:0}],{duration:900,easing:'cubic-bezier(.2,.8,.3,1)'}).onfinish=()=>s.remove()}}
const star=on=>`<svg viewBox="0 0 24 24"><path d="M12 2l3 7 7 .6-5.3 4.7 1.7 7.2L12 17.8 5.6 21.5l1.7-7.2L2 9.6 9 9z" fill="${on?'#FFC933':'#E4E6F4'}" stroke="${on?'#DDA200':'#D3D6EA'}" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
const badgeSvg=k=>{const b=BD[k];return `<svg viewBox="0 0 80 80"><path d="M40 4l30 17v38L40 76 10 59V21z" fill="${b.c}"/><path d="M40 4l30 17v38L40 76 10 59V21z" fill="#fff" opacity=".18" transform="translate(0 -3) scale(1 .96)"/><g transform="translate(22 20) scale(1.5)" fill="#fff"><path d="${b.p}"/></g></svg>`};
const tile={
  name:`<svg viewBox="0 0 58 58"><circle cx="19" cy="21" r="14.5" fill="#fff"/><circle cx="39" cy="21" r="14.5" fill="#fff"/><circle cx="29" cy="39" r="14.5" fill="#fff"/><circle cx="19" cy="21" r="11.5" fill="#F0464A"/><circle cx="39" cy="21" r="11.5" fill="#FFC933"/><circle cx="29" cy="39" r="11.5" fill="#2F7BF5"/></svg>`,
  mix:`<svg viewBox="0 0 64 56"><circle cx="23" cy="28" r="19.5" fill="#fff"/><circle cx="41" cy="28" r="19.5" fill="#fff"/><circle cx="23" cy="28" r="16.5" fill="#2F7BF5"/><circle cx="41" cy="28" r="16.5" fill="#FFC933"/><path d="M32 14.17a16.5 16.5 0 0 1 0 27.66 16.5 16.5 0 0 1 0-27.66z" fill="#3CC15C"/></svg>`,
  find:`<svg viewBox="0 0 54 54"><circle cx="23" cy="23" r="15" fill="#fff" stroke="#fff" stroke-width="5"/><circle cx="23" cy="23" r="9" fill="#FF8FC0"/><path d="M35 35l14 14" stroke="#fff" stroke-width="7" stroke-linecap="round"/></svg>`
};
const tileBg={sky:['#4C8DFF','#2F6BDB'],sun:['#FFC933','#DDA200'],coral:['#FF6B5E','#D94A3E']};

/* ---------- Title Screen ---------- */
function titleScreen(instant=false){
  if(curPage==='title'&&!instant)return;
  go(()=>{
    G=null;
    $('#hd').style.display='none';
    setNav('title');
    mode('title');
    const adm=curAdmin();
    const stu=curStudent();
    const signedLabel=adm
      ? `<span class="signed-pill purp">Teacher: <b>${esc(adm.username)}</b></span>`
      : stu
        ? `<span class="signed-pill sky">Student: <b>${esc(stu.name)}</b></span>`
        : '';
    const authControl=(adm||stu)
      ? `<div class="title-auth">${signedLabel}<button type="button" class="title-link" onclick="showRoleModal()">Switch user</button></div>`
      : `<div class="title-auth"><button type="button" class="title-link" onclick="showRoleModal()">Log in</button></div>`;

    show(`
      <div class="title-layout">
        <div class="hero title-hero">
          ${logo('big')}
          <p>Explore, mix, and spot colors with Pal!</p>
          <button class="btn btn-play" onclick="enterPlay()">Let’s play!</button>
          ${authControl}
        </div>
      </div>
    `);
    palSet('','happy',false);
  },instant);
}

function enterPlay(){
  const adm=curAdmin();
  if(adm){
    teacherDashboard();
    return;
  }
  const stu=curStudent();
  if(stu){
    S=load();
    if(stu.status==='approved')home();
    else pendingScreen();
    return;
  }
  showRoleModal();
}

/* ---------- Student Pending Approval Screen ---------- */
function pendingScreen(){
  const st=curStudent();
  if(!st){titleScreen();return;}
  const cls=DB.classes[st.classId];
  const adm=cls&&cls.adminName?{username:cls.adminName}:null;
  go(()=>{
    G=null;
    $('#hd').style.display='';
    setNav('pending');
    mode('welcome');
    show(`
      <div class="welcome-layout">
        <div class="card pending-card">
          <div class="pending-ico">
            <svg viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" fill="#FFF4D6"/>
              <circle cx="24" cy="24" r="12" stroke="#DDA200" stroke-width="3"/>
              <path d="M24 18v6l4 2.5" stroke="#DDA200" stroke-width="3" stroke-linecap="round"/>
            </svg>
          </div>
          <h2>Waiting for Approval</h2>
          <p class="pending-sub">Hi <b>${esc(st.name)}</b>! Your request to join <b>${cls?esc(cls.name):'your class'}</b>${adm?` (${esc(adm.username)})`:''} has been sent.</p>
          <div class="pending-ticket">
            <span>Class Code</span>
            <b>${esc(st.classCode)}</b>
          </div>
          <div class="acts">
            <button class="btn" onclick="refreshStudentStatus()">Check status</button>
            <button class="btn ghost" onclick="showRoleModal()">Switch user</button>
          </div>
        </div>
      </div>
    `);
    palSet(`Hang tight, ${esc(st.name)}! Once your teacher approves you, we’ll start playing!`,talkMood(),true);
  });
}

async function refreshStudentStatus(){
  let st=curStudent();
  if(!st){titleScreen();return;}
  try{st=await hydrateStudent(st.id)||st}catch(ex){console.error(ex)}
  if(st.status==='approved'){
    S=load();
    home();
  }else{
    palSet('Still waiting for your teacher to approve! Ask them to check their dashboard!','think',true);
  }
}

/* ---------- Student Home & Profile ---------- */
function home(){
  const st=curStudent();
  if(!st){titleScreen();return;}
  if(st.status!=='approved'){pendingScreen();return;}
  S=load();
  if(curPage==='home')return;
  go(()=>{
    G=null;
    $('#hd').style.display='';
    setNav('home');
    mode('home');
    const strk=streak();
    show(`<div class="home-layout"><div class="top"><h2>Hi, ${esc(S.name)}!</h2><span class="chip">${strk} day streak</span></div><p style="color:var(--mute)">Pick a game to play. Click Pal for a color fun fact!</p><div class="games">${Object.keys(GD).map(id=>{const g=GD[id],c=tileBg[g.c];return `<button class="card game" onclick="play('${id}')"><div class="tile" style="background:${c[0]};box-shadow:0 5px 0 ${c[1]}">${tile[id]}</div><div><h3>${g.t}</h3><span>${g.d}</span></div><div class="stars">${[1,2,3].map(n=>star((S.best||{})[id]>=n)).join('')}</div></button>`}).join('')}</div></div>`);
    palQuiet();
  });
}

function renderProfileHeading(){
  return `<h2>${esc(S.name)}’s profile</h2><button class="edit-btn" onclick="editName()" aria-label="Edit name" title="Edit name"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg></button>`;
}
function editName(){
  const row=$('#nameRow');
  if(!row)return;
  row.innerHTML=`<input id="editNm" class="edit-inp" maxlength="14" value="${esc(S.name)}" aria-label="New name"><button class="edit-save" onclick="saveName()" aria-label="Save name" title="Save"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button><button class="edit-cancel" onclick="cancelEdit()" aria-label="Cancel" title="Cancel">✕</button>`;
  const inp=$('#editNm');
  inp.focus();
  inp.select();
  inp.onkeydown=e=>{
    if(e.key==='Enter')saveName();
    if(e.key==='Escape')cancelEdit();
  };
}
async function saveName(){
  const inp=$('#editNm');
  const v=inp?inp.value.trim():'';
  if(v&&v!==S.name){
    const old=S.name;
    S.name=v;
    save(S);
    const err=await pushProgress();
    if(err){
      S.name=old;
      save(S);
      palSet(/duplicate|23505/i.test(err.message+(err.code||''))?'That name is already taken in your class!':'Oops! I couldn’t save your name. Try again!','oops',true);
    }
  }
  cancelEdit();
}
function cancelEdit(){
  const row=$('#nameRow');
  if(row)row.innerHTML=renderProfileHeading();
}

function profile(){
  if(!curStudent()){titleScreen();return;}
  if(curPage==='profile')return;
  go(()=>{
    G=null;
    clearTimeout(idle);
    setNav('profile');
    mode('none');
    const stObj=curStudent();
    const cls=stObj?DB.classes[stObj.classId]:null;
    const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return[d,S.days[key(d)]]});
    const tot=Object.values(S.days).reduce((a,d)=>({g:a.g+d.g,r:a.r+d.r,w:a.w+d.w}),{g:0,r:0,w:0}),acc=tot.r+tot.w?Math.round(tot.r/(tot.r+tot.w)*100):0,b=S.b||{},st=streak();
    const prog={streak:`${Math.min(st,STREAK_DAYS)}/${STREAK_DAYS} days`,perfect:b.perfect?'Earned!':'Not yet',swift:b.swift?'Earned!':'Not yet',master:`${['streak','perfect','swift'].filter(k=>b[k]).length}/3 badges`};
    show(`<div class="top"><div class="name-row" id="nameRow">${renderProfileHeading()}</div>${cls?`<span class="chip">${esc(cls.name)} · ${esc(cls.code)}</span>`:''}</div><div class="stats"><div class="card stat"><b>${st}</b><span>day streak</span></div><div class="card stat"><b>${tot.g}</b><span>games played</span></div><div class="card stat"><b>${acc}%</b><span>correct</span></div></div>
    <div class="card chart"><h3>Last 7 days</h3><div class="bars">${days.map(([d,v])=>{const a=v&&v.r+v.w?Math.round(v.r/(v.r+v.w)*100):0;return `<div class="bar"><em>${v?a+'%':''}</em><i class="${v?'has':''}" data-h="${v?Math.max(a,12):0}" style="height:10px" title="${v?v.g+' games':'No games'}"></i>${d.toLocaleDateString('en',{weekday:'short'}).slice(0,2)}</div>`}).join('')}</div></div>
    <h3 class="disp" style="font-size:26px;margin-bottom:14px">Badges</h3><div class="badges">${Object.keys(BD).map(k=>`<div class="card badge ${b[k]?'':'lock'}">${badgeSvg(k)}<div><h3>${BD[k].t}</h3><span>${BD[k].d}</span><br><span style="color:${b[k]?'var(--tealD)':'var(--mute)'}">${prog[k]}</span></div></div>`).join('')}</div>`);
    setTimeout(()=>document.querySelectorAll('.bar i').forEach(i=>i.style.height=(i.dataset.h*1.1||10)+'px'),60);
  });
}

/* ---------- game engine ---------- */
function play(id){
  go(()=>{
    setNav('game');
    mode('game');
    G={id,i:0,n:ROUNDS,wrong:0,right:0,qw:0,slow:false,stuck:0,lock:false,deck:[],tStart:Date.now()};
    if(id=='name'){while(G.deck.length<ROUNDS)G.deck.push(...shuffle(K))}
    if(id=='mix'){while(G.deck.length<ROUNDS)G.deck.push(...shuffle(MIX))}
    if(id=='find'){const pool=SCENES.filter(s=>s!==lastScene);G.scene=lastScene=pick(pool.length?pool:SCENES,1)[0];G.seenScenes=[G.scene];G.asked=[]}
    show(`<div class="gtop"><button class="x" onclick="home()" aria-label="Close">✕</button><div class="pips">${'<b></b>'.repeat(ROUNDS)}</div></div><div id="q" class="q"></div>`);
    next();
  });
}
function fb(t,c=''){const e=$('#fb');if(e){e.textContent=t;e.className='fb '+c}}
function next(){if(G.i>=G.n)return finish();G.i++;G.t0=Date.now();G.stuck=0;G.qw=0;G.lock=false;palHide();
document.querySelectorAll('.pips b').forEach((b,i)=>b.className=i<G.i-1?'on':i==G.i-1?'cur':'');({name:qName,mix:qMix,find:qFind})[G.id]();idleReset()}
function idleReset(){clearTimeout(idle);idle=setTimeout(()=>{if(G&&!G.lock){G.stuck++;palCall(hint(),talkMood());idleReset()}},IDLE_MS)}
function hint(){if(G.id=='name')return G.stuck>1?`It’s the one that looks like ${HINT[G.t]}!`:`Psst! Think of ${HINT[G.t]}.`;
if(G.id=='mix')return G.stuck>1?`Try ${G.r[0]} and ${G.r[1]}!`:`Which two colors make ${G.res}? Drag them into the bowl!`;
G.pulse&&G.pulse();return G.stuck>1?`Look for something ${G.t}. See the circle?`:'Look closely at the whole picture!'}
function right(el){G.lock=true;clearTimeout(idle);palHide();if((Date.now()-G.t0)/1000>SWIFT_SEC)G.slow=true;G.right++;pop(el);fb(SAY.praise[Math.floor(Math.random()*SAY.praise.length)],'good');setTimeout(next,G.id=='mix'?1900:1500)}
function wrong(el,msg){G.wrong++;G.qw++;G.stuck++;if(el){el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake')}
fb(msg,'bad');if(G.qw>=2)palCall(hint(),'oops');idleReset()}
function finish(){clearTimeout(idle);palHide();const perf=G.wrong==0,sw=perf&&!G.slow,k=key(new Date()),d=S.days[k]=S.days[k]||{g:0,r:0,w:0};d.g++;d.r+=G.right;d.w+=G.wrong;
const s=perf?3:G.wrong<=2?2:1;S.best=S.best||{};S.best[G.id]=Math.max(S.best[G.id]||0,s);if(perf)(S.perf=S.perf||{})[G.id]=1;if(sw)(S.swift=S.swift||{})[G.id]=1;const nb=evalBadges();save(S);logGame({game:G.id,rounds:G.n,right:G.right,wrong:G.wrong,stars:s,perfect:perf,swift:sw,duration:Math.round((Date.now()-G.tStart)/1000)});
document.querySelectorAll('.pips b').forEach(b=>b.className='on');
show(`<div class="res"><h2>${perf?'Perfect!':'Great job!'}</h2><div class="big">${[1,2,3].map(n=>star(s>=n)).join('')}</div><p style="color:var(--mute);font-size:20px">${G.right} right${G.wrong?`, ${G.wrong} oops`:''}</p>${nb.length?`<h3 class="disp" style="font-size:24px;margin-top:22px">New badge!</h3><div class="newb">${nb.map(b=>`<div class="badge" style="flex-direction:column;text-align:center">${badgeSvg(b)}<h3>${BD[b].t}</h3></div>`).join('')}</div>`:'<div style="height:26px"></div>'}<div class="acts"><button class="btn ghost" onclick="home()">Home</button><button class="btn" onclick="play('${G.id}')">Play again</button></div></div>`);
setTimeout(()=>pop($('.big')),200)}

/* ---------- Name It! ---------- */
function qName(){const t=G.t=G.deck.pop(),o=shuffle([t,...pick(K.filter(k=>k!=t),2)]);
$('#q').innerHTML=`<h2>Which one is <span style="${ul(t)}">${t}</span>?</h2><div class="opts">${o.map(k=>`<button class="sw ${k=='white'?'white':''}" data-k="${k}" style="background:${COL[k]}" aria-label="${k}"></button>`).join('')}</div><p id="fb" class="fb"></p>`;
document.querySelectorAll('.sw').forEach(b=>b.onclick=()=>{if(G.lock)return;b.dataset.k==t?(b.classList.add('ok'),right(b)):wrong(b,`That’s ${b.dataset.k}. Try again!`)})}

/* ---------- Mix It! ---------- */
function qMix(){const r=G.deck.pop(),[a,b,res]=r;G.r=[a,b];G.res=res;G.in=[];
const dis=pick(['red','blue','yellow','white','green'].filter(k=>!r.includes(k)),1)[0],bl=shuffle([a,b,dis]);
$('#q').innerHTML=`<h2>Make <span style="${ul(res)}">${res}</span>!</h2><div id="bowl"><i class="d1"></i><i class="d2"></i></div><div class="blobs">${bl.map(k=>`<div class="blob ${k=='white'?'white':''}" data-k="${k}" style="background:${COL[k]}"></div>`).join('')}</div><p id="fb" class="fb"></p>`;
document.querySelectorAll('.blob').forEach(el=>el.onpointerdown=e=>{if(G.lock||el.dataset.used)return;el.setPointerCapture(e.pointerId);const sx=e.clientX,sy=e.clientY;el.classList.add('drag');G.stuck=0;idleReset();
const mv=ev=>el.style.transform=`translate(${ev.clientX-sx}px,${ev.clientY-sy}px) scale(1.12)`,
up=ev=>{el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);el.classList.remove('drag');const r=$('#bowl').getBoundingClientRect();
if(Math.hypot(ev.clientX-r.left-r.width/2,ev.clientY-r.top-r.height/2)<r.width/2+14)drop(el);else el.style.transform=''};
el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)})}
function drop(el){const k=el.dataset.k,bw=$('#bowl');
if(G.r.includes(k)&&!G.in.includes(k)){G.in.push(k);el.dataset.used=1;el.style.transform='';el.style.opacity=0;const n=G.in.length;$('.d'+n).style.background=COL[k];bw.classList.add('in'+n);
if(n==1)fb('Good! Now add another color.','good');
else{G.lock=true;clearTimeout(idle);fb('Mixing…');bw.classList.add('mixing');
setTimeout(()=>{bw.classList.remove('mixing');bw.style.background=COL[G.res];bw.classList.add('done');$('#q h2').innerHTML=`You made <span style="${ul(G.res)}">${G.res}</span>!`;right(bw)},1400)}}
else{el.style.transform='';wrong(el,k==G.in[0]?'You already added that one!':`${k} doesn’t help make ${G.res}. Try another!`)}}

/* ---------- Find It! ---------- */
function colorOf(r,g,b){
  r/=255;g/=255;b/=255;
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;
  if(l<.2)return'black';
  if(l>.91)return'white';
  if(!d)return null;
  const sv=d/mx;
  if(sv<.26)return null;
  let h=mx==r?((g-b)/d+6)%6:mx==g?(b-r)/d+2:(r-g)/d+4;h*=60;
  if(h>=348||h<14)return l>.66?'pink':'red';
  if(h<42){
    if(sv>=.56&&d>=.44&&l>=.47&&l<=.72)return'orange';
    if(sv>=.34&&d>=.24&&l<.68)return'brown';
    return null;
  }
  if(h<70){
    if(sv>=.42&&d>=.34&&l<.84)return'yellow';
    return null;
  }
  if(h<145){
    if(sv>=.36&&d>=.21&&l<.76)return'green';
    return null;
  }
  if(h<190)return null;
  if(h<255){
    if(sv>=.45&&d>=.28&&l<.80)return'blue';
    return null;
  }
  if(h<305)return'purple';
  return'pink';
}
function scan(img){const w=200,h=Math.round(w*img.naturalHeight/img.naturalWidth)||150,c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,w,h);
const px=x.getImageData(0,0,w,h).data,grid=[];for(let i=0;i<w*h;i++)grid.push(colorOf(px[i*4],px[i*4+1],px[i*4+2]));
const spots={};for(let y=1;y<h-1;y++)for(let i=1;i<w-1;i++){const c0=grid[y*w+i];if(c0&&c0==grid[y*w+i+1]&&c0==grid[(y+1)*w+i]&&c0==grid[y*w+i-1]&&c0==grid[(y-1)*w+i])(spots[c0]=spots[c0]||[]).push([i/w,y/h])}
return{w,h,grid,spots}}
function qFind(){
  const loadScene=src=>{
    $('#q').innerHTML=`<h2 id="spy">Getting the picture ready…</h2><div class="card scene"><img id="pic" alt="Find the color in this picture" draggable="false" src="${encodeURI(src)}"><div id="ring"></div></div><p id="fb" class="fb"></p>`;
    const img=$('#pic'),ring=$('#ring');
    G.lock=true;

    img.onload=()=>{
      let sc=null;
      try{sc=scan(img)}catch(e){console.warn('Find It! needs the page served over http to read pixel colors.',e)}
      G.sc=sc;
      const banned=(typeof SCENE_BAN!=='undefined'&&SCENE_BAN[src])||[];
      const set=SCENE_COLORS[src]?SCENE_COLORS[src].filter(c=>!banned.includes(c)):null;
      let cand=set||(sc?Object.keys(sc.spots).filter(c=>FIND_ASK.includes(c)&&!banned.includes(c)&&sc.spots[c].length>=5):[]);
      if(cand.length<ROUNDS&&sc)cand=Object.keys(sc.spots).filter(c=>FIND_ASK.includes(c)&&!banned.includes(c));
      if(!cand.length)cand=FIND_ASK.filter(c=>!banned.includes(c));
      G.cand=cand;

      G.pulse=()=>{
        const s=G.sc&&G.sc.spots[G.t];
        if(!s)return;
        const p=s[Math.floor(Math.random()*s.length)];
        ring.className='';
        void ring.offsetWidth;
        ring.style.left=p[0]*100+'%';
        ring.style.top=p[1]*100+'%';
        ring.className='go';
      };

      img.onclick=e=>{
        if(G.lock)return;
        const r=img.getBoundingClientRect(),fx=(e.clientX-r.left)/r.width,fy=(e.clientY-r.top)/r.height;
        if(!G.sc){fb('Serve the app over http to check colors.','bad');return}
        const n={},cx=Math.round(fx*G.sc.w),cy=Math.round(fy*G.sc.h);
        for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
          const nx=cx+dx,ny=cy+dy;
          if(nx>=0&&nx<G.sc.w&&ny>=0&&ny<G.sc.h){
            const c=G.sc.grid[ny*G.sc.w+nx];
            if(c)n[c]=(n[c]||0)+1;
          }
        }
        const got=Object.keys(n).sort((a,b)=>n[b]-n[a])[0];
        if(got==G.t){
          ring.className='ok';
          ring.style.left=fx*100+'%';
          ring.style.top=fy*100+'%';
          right(ring);
        }else{
          wrong(null,got?`That’s ${got}. Find ${G.t}!`:`Not quite. Find ${G.t}!`);
        }
      };

      pickTarget();
    };

    img.onerror=()=>{$('#spy').textContent='Picture not found';console.warn('Missing image',src)};
  };

  const pickTarget=()=>{
    const rem=G.cand.filter(c=>!G.asked.includes(c));
    if(!rem.length){
      const nextPool=SCENES.filter(s=>!G.seenScenes.includes(s));
      G.scene=lastScene=pick(nextPool.length?nextPool:SCENES.filter(s=>s!==G.scene),1)[0];
      G.seenScenes.push(G.scene);
      G.asked=[];
      G.cand=null;
      loadScene(G.scene);
      return;
    }
    const ring=$('#ring');
    ring.className='';
    fb('');
    const t=G.t=pick(rem,1)[0];
    G.last=t;
    G.asked.push(t);
    $('#spy').innerHTML=`I spy something <span style="${ul(t)}">${t}</span>!`;
    G.lock=false;
    G.t0=Date.now();
    idleReset();
  };

  if($('#pic')&&G.cand){
    pickTarget();
    return;
  }

  loadScene(G.scene);
}

initAuth().then(()=>{S=load();titleScreen(true)},()=>{titleScreen(true)});
