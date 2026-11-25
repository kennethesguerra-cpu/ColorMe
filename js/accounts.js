/* ===== Color Me! Account Storage, Sessions & Authentication Modals ===== */

const DB_KEY='colorme_db_v1';

const EYE_OPEN=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.4 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.6 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`;

function togglePw(id,btn){
  const inp=document.getElementById(id);
  if(!inp)return;
  const show=inp.type==='password';
  inp.type=show?'text':'password';
  btn.innerHTML=show?EYE_OFF:EYE_OPEN;
  btn.classList.toggle('showing',show);
  btn.setAttribute('aria-label',show?'Hide password':'Show password');
  btn.setAttribute('title',show?'Hide password':'Show password');
  inp.focus();
}

function freshProgress(name=''){
  return {name,days:{},best:{},perf:{},swift:{},b:{}};
}

/* In-memory cache of what Supabase returned. Supabase is the source of truth. */
let DB={admins:{},classes:{},students:{},session:null};

function loadDB(){return DB}   // kept for old callers; data now comes from Supabase

function saveDB(){}            // nothing to persist locally any more

function makeId(prefix){
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;
}

function curAdmin(){
  if(DB.session&&DB.session.role==='admin')return DB.admins[DB.session.id]||null;
  return null;
}

function curStudent(){
  if(DB.session&&DB.session.role==='student')return DB.students[DB.session.id]||null;
  return null;
}

function load(){
  const st=curStudent();
  if(st){
    st.progress=st.progress||freshProgress(st.name);
    st.progress.name=st.name;
    return st.progress;
  }
  return freshProgress('');
}

/* local cache only; the network write happens in logGame() / pushProgress() */
function save(data){
  const state=data||(typeof S!=='undefined'?S:null);
  const st=curStudent();
  if(st&&state){
    st.name=state.name||st.name;
    st.progress=state;
  }
}

function friendlyErr(e){
  const m=(e&&e.message)||'';
  if(/Invalid login credentials/i.test(m))return 'Incorrect email or password. Try again!';
  if(/Email not confirmed/i.test(m))return 'Please confirm your email first, then log in.';
  if(/already registered|already been registered/i.test(m))return 'That email is already registered.';
  if(/class_not_found/.test(m))return 'Class code not found. Check with your teacher!';
  if(/invalid_name/.test(m))return 'Please enter a name (up to 16 letters).';
  if(/password/i.test(m)&&/6/.test(m))return 'Password should be at least 6 characters.';
  if(/Failed to fetch|NetworkError|network/i.test(m))return 'Can’t reach the server. Check your internet and try again.';
  return m||'Something went wrong. Please try again.';
}

/* disables the submit button while a request runs */
async function withBusy(e,fn){
  const btn=e.target.querySelector('button[type=submit]');
  if(btn)btn.disabled=true;
  try{await fn()}finally{if(btn)btn.disabled=false}
}

/* ---------- Modal Helpers ---------- */
function openModal(html){
  const wrap=$('#modalWrap'),box=$('#modalBox');
  box.innerHTML=html;
  wrap.classList.add('open');
  wrap.setAttribute('aria-hidden','false');
  const firstInp=box.querySelector('input');
  if(firstInp)setTimeout(()=>firstInp.focus(),80);
}

function closeModal(){
  const wrap=$('#modalWrap');
  wrap.classList.remove('open');
  wrap.setAttribute('aria-hidden','true');
}

$('#modalWrap').onclick=e=>{if(e.target===$('#modalWrap'))closeModal()};
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&$('#modalWrap').classList.contains('open'))closeModal();
});

/* ---------- Role Selection Modal ---------- */
function showRoleModal(){
  openModal(`
    <button class="modal-x" onclick="closeModal()" aria-label="Close">✕</button>
    <div class="modal-head">
      <span class="modal-badge">Welcome to Color Me!</span>
      <h3>Who’s signing in?</h3>
      <p>Choose your role to continue</p>
    </div>
    <div class="role-grid">
      <button class="role-card role-student" onclick="showStudentLogin()">
        <div class="role-ico">
          <svg viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" fill="#E6F0FF"/>
            <path d="M24 11l3.6 7.3 8.1 1.2-5.8 5.7 1.4 8.1L24 29.4l-7.3 3.9 1.4-8.1-5.8-5.7 8.1-1.2L24 11z" fill="#2F7BF5" stroke="#1E5AC8" stroke-width="2" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="role-copy">
          <b>Student</b>
          <span>Enter your class code to play</span>
        </div>
        <span class="role-arr">›</span>
      </button>
      <button class="role-card role-admin" onclick="showAdminLogin()">
        <div class="role-ico">
          <svg viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" fill="#F1EAFF"/>
            <path d="M24 13L10 20l14 7 14-7-14-7z" fill="#8E5BE8" stroke="#6A3BC2" stroke-width="2" stroke-linejoin="round"/>
            <path d="M15 23.5V31c0 2.5 4 4.5 9 4.5s9-2 9-4.5v-7.5" stroke="#6A3BC2" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M36 21v8" stroke="#FF8A2B" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="role-copy">
          <b>Admin</b>
          <span>Teacher dashboard &amp; classes</span>
        </div>
        <span class="role-arr">›</span>
      </button>
    </div>
  `);
}

/* ---------- Admin Login & Registration ---------- */
function showAdminLogin(prefillEmail=''){
  openModal(`
    <button class="modal-back" onclick="showRoleModal()" aria-label="Back">‹</button>
    <button class="modal-x" onclick="closeModal()" aria-label="Close">✕</button>
    <div class="modal-head">
      <span class="modal-badge purp">Admin Portal</span>
      <h3>Teacher Log In</h3>
      <p>Sign in to manage your classes and students</p>
    </div>
    <form class="auth-form" onsubmit="submitAdminLogin(event)">
      <label class="field">
        <span>Email</span>
        <input id="admEmail" type="email" autocomplete="email" placeholder="teacher@school.edu" value="${esc(prefillEmail)}" required>
      </label>
      <label class="field">
        <span>Password</span>
        <div class="pw-wrap">
          <input id="admPass" type="password" autocomplete="current-password" placeholder="Enter your password" required>
          <button type="button" class="pw-eye" onclick="togglePw('admPass',this)" aria-label="Show password" title="Show password">${EYE_OPEN}</button>
        </div>
      </label>
      <p id="authErr" class="auth-err"></p>
      <button type="submit" class="btn modal-submit">Log in</button>
    </form>
    <div class="modal-foot">
      <span>New teacher here?</span>
      <button type="button" class="link-btn" onclick="showAdminRegister()">Create account</button>
    </div>
  `);
}

async function submitAdminLogin(e){
  e.preventDefault();
  const email=$('#admEmail').value.trim().toLowerCase();
  const pass=$('#admPass').value;
  const err=$('#authErr');
  if(!SB_READY){err.textContent=NO_DB_MSG;return;}
  err.textContent='';
  await withBusy(e,async()=>{
    try{
      await adminSignIn(email,pass);
      S=freshProgress('');
      closeModal();
      teacherDashboard();
    }catch(ex){err.textContent=friendlyErr(ex)}
  });
}

function showAdminRegister(){
  openModal(`
    <button class="modal-back" onclick="showAdminLogin()" aria-label="Back">‹</button>
    <button class="modal-x" onclick="closeModal()" aria-label="Close">✕</button>
    <div class="modal-head">
      <span class="modal-badge purp">Admin Portal</span>
      <h3>Create Account</h3>
      <p>Set up your teacher profile to create classes</p>
    </div>
    <form class="auth-form" onsubmit="submitAdminRegister(event)">
      <label class="field">
        <span>Username</span>
        <input id="regUser" type="text" maxlength="24" placeholder="Ms. Clara" required>
      </label>
      <label class="field">
        <span>Email</span>
        <input id="regEmail" type="email" autocomplete="email" placeholder="teacher@school.edu" required>
      </label>
      <label class="field">
        <span>Password</span>
        <div class="pw-wrap">
          <input id="regPass" type="password" autocomplete="new-password" placeholder="Create a password" required>
          <button type="button" class="pw-eye" onclick="togglePw('regPass',this)" aria-label="Show password" title="Show password">${EYE_OPEN}</button>
        </div>
      </label>
      <label class="field">
        <span>Confirm password</span>
        <div class="pw-wrap">
          <input id="regConfirm" type="password" autocomplete="new-password" placeholder="Re-enter password" required>
          <button type="button" class="pw-eye" onclick="togglePw('regConfirm',this)" aria-label="Show password" title="Show password">${EYE_OPEN}</button>
        </div>
      </label>
      <p id="authErr" class="auth-err"></p>
      <button type="submit" class="btn modal-submit">Create account</button>
    </form>
    <div class="modal-foot">
      <span>Already have an account?</span>
      <button type="button" class="link-btn" onclick="showAdminLogin()">Log in</button>
    </div>
  `);
}

async function submitAdminRegister(e){
  e.preventDefault();
  const username=$('#regUser').value.trim();
  const email=$('#regEmail').value.trim().toLowerCase();
  const password=$('#regPass').value;
  const confirm=$('#regConfirm').value;
  const err=$('#authErr');

  if(!username||!email||!password||!confirm){
    err.textContent='Please fill out all fields.';
    return;
  }
  if(!email.includes('@')||!email.includes('.')){
    err.textContent='Please enter a valid email address.';
    return;
  }
  if(password.length<6){
    err.textContent='Password should be at least 6 characters.';
    return;
  }
  if(password!==confirm){
    err.textContent='Passwords do not match!';
    return;
  }
  if(!SB_READY){err.textContent=NO_DB_MSG;return;}
  err.textContent='';
  await withBusy(e,async()=>{
    try{
      const r=await adminSignUp(username,email,password);
      if(r.needsConfirm){
        showAdminLogin(email);
        const e2=$('#authErr');
        if(e2){e2.style.color='#2E8B57';e2.textContent='Account created! Check your email to confirm, then log in.';}
        return;
      }
      S=freshProgress('');
      closeModal();
      teacherDashboard();
    }catch(ex){err.textContent=friendlyErr(ex)}
  });
}

/* ---------- Student Login & Class Code Join ---------- */
function showStudentLogin(){
  const recents=getRecents();
  openModal(`
    <button class="modal-back" onclick="showRoleModal()" aria-label="Back">‹</button>
    <button class="modal-x" onclick="closeModal()" aria-label="Close">✕</button>
    <div class="modal-head">
      <span class="modal-badge sky">Student Portal</span>
      <h3>Join Your Class</h3>
      <p>Enter your name and the class code from your teacher</p>
    </div>
    <form class="auth-form" onsubmit="submitStudentLogin(event)">
      <label class="field">
        <span>Your Name</span>
        <input id="stuName" type="text" maxlength="16" placeholder="e.g. Kyi" required>
      </label>
      <label class="field">
        <span>Class Code</span>
        <input id="stuCode" class="code-inp" type="text" maxlength="8" placeholder="ABC123" oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,'')" required>
      </label>
      <p id="authErr" class="auth-err"></p>
      <button type="submit" class="btn modal-submit">Continue</button>
    </form>
    ${recents.length?`
      <div class="quick-accounts">
        <span class="qa-label">Recent students on this device</span>
        <div class="qa-list">
          ${recents.slice().reverse().map((r,i)=>`<button type="button" class="qa-chip" onclick="quickStudent(${recents.length-1-i})">
              <b>${esc(r.name)}</b>
              <em>${esc(r.code)}</em>
            </button>`).join('')}
        </div>
      </div>
    `:''}
  `);
}

async function enterAsStudent(name,code){
  const err=$('#authErr');
  if(!SB_READY){if(err)err.textContent=NO_DB_MSG;return;}
  try{
    const st=await studentJoin(name,code);
    S=load();
    closeModal();
    if(st.status==='approved')home();
    else pendingScreen();
  }catch(ex){if(err)err.textContent=friendlyErr(ex)}
}

async function quickStudent(i){
  const r=getRecents()[i];
  if(r)await enterAsStudent(r.name,r.code);
}

async function submitStudentLogin(e){
  e.preventDefault();
  const name=$('#stuName').value.trim();
  const code=$('#stuCode').value.trim().toUpperCase();
  const err=$('#authErr');
  if(!name||!code){
    err.textContent='Please enter your name and class code.';
    return;
  }
  err.textContent='';
  await withBusy(e,()=>enterAsStudent(name,code));
}

async function logout(){
  try{if(SB_READY)await sb.auth.signOut()}catch(e){}
  DB.session=null;
  clearCaches();
  setStudentSession(null);
  S=freshProgress('');
  titleScreen();
}
