/* ===== Color Me! Supabase connection, data access & activity log =====
   1) Paste your project URL + anon key below (Supabase > Project Settings > API).
   2) Run supabase/schema.sql once in the Supabase SQL Editor.
   The anon key is safe to ship in the browser: access is controlled by the
   Row Level Security policies and RPC functions defined in schema.sql. */

const SUPABASE_URL='https://qsnvktoreefuzqoktkcr.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_590tGSvqkzoDdCtqnmfZug_e7LOy43V';

const SB_READY=!!(window.supabase&&!SUPABASE_URL.includes('YOUR-PROJECT')&&!SUPABASE_ANON_KEY.includes('YOUR-ANON-KEY'));
const sb=SB_READY?window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true}}):null;

const STU_KEY='colorme_student_session_v2';
const RECENT_KEY='colorme_recent_students_v2';
const LOGQ_KEY='colorme_pending_logs_v2';
const NO_DB_MSG='Database is not set up yet. Add your Supabase URL and key in js/supabase.js.';

/* ---------- row mappers (database rows -> the shapes the UI already uses) ---------- */
function normProgress(p,name){
  return Object.assign({name:name||'',days:{},best:{},perf:{},swift:{},b:{}},p&&typeof p==='object'?p:{},{name:name||''});
}
function mapClass(r,adminName){
  return {id:r.id,adminId:r.admin_id||null,name:r.name,code:r.code,createdAt:r.created_at?Date.parse(r.created_at):0,adminName:adminName||r.admin_name||''};
}
function mapStudent(r,code){
  return {id:r.id,name:r.name,classId:r.class_id,classCode:code||'',status:r.status,progress:normProgress(r.progress,r.name),createdAt:r.created_at?Date.parse(r.created_at):0};
}

/* ---------- local helpers (device only) ---------- */
function getRecents(){try{const a=JSON.parse(localStorage.getItem(RECENT_KEY));return Array.isArray(a)?a:[]}catch(e){return []}}
function addRecent(name,code){
  try{
    const list=getRecents().filter(r=>!(r.code===code&&r.name.toLowerCase()===name.toLowerCase()));
    list.push({name,code});
    localStorage.setItem(RECENT_KEY,JSON.stringify(list.slice(-4)));
  }catch(e){}
}
function setStudentSession(id){try{id?localStorage.setItem(STU_KEY,id):localStorage.removeItem(STU_KEY)}catch(e){}}
function clearCaches(){DB.admins={};DB.classes={};DB.students={}}

/* ---------- teacher (Supabase Auth) ---------- */
async function hydrateAdmin(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session)return false;
  const uid=session.user.id;
  const [p,c,s]=await Promise.all([
    sb.from('profiles').select('*').eq('id',uid).maybeSingle(),
    sb.from('classes').select('*').order('created_at'),
    sb.from('students').select('*').order('created_at')
  ]);
  const bad=p.error||c.error||s.error;
  if(bad)throw bad;
  clearCaches();
  const prof=p.data||{id:uid,username:(session.user.email||'Teacher').split('@')[0],email:session.user.email};
  DB.admins[uid]={id:uid,username:prof.username,email:prof.email};
  (c.data||[]).forEach(r=>{DB.classes[r.id]=mapClass(r,prof.username)});
  (s.data||[]).forEach(r=>{
    const cls=DB.classes[r.class_id];
    DB.students[r.id]=mapStudent(r,cls?cls.code:'');
  });
  DB.session={role:'admin',id:uid};
  return true;
}

async function adminSignIn(email,password){
  const {error}=await sb.auth.signInWithPassword({email,password});
  if(error)throw error;
  setStudentSession(null);
  await hydrateAdmin();
}

async function adminSignUp(username,email,password){
  const {data,error}=await sb.auth.signUp({email,password,options:{data:{username}}});
  if(error)throw error;
  if(!data.session)return {needsConfirm:true};   // project requires email confirmation
  setStudentSession(null);
  await hydrateAdmin();
  return {needsConfirm:false};
}

async function createClassDB(name){
  const uid=DB.session&&DB.session.id;
  for(let i=0;i<6;i++){
    const code=genClassCode();
    const {error}=await sb.from('classes').insert({admin_id:uid,name,code});
    if(!error)return;
    if(error.code!=='23505')throw error;       // 23505 = code already taken -> try another
  }
  throw new Error('Could not generate a unique class code. Please try again.');
}

async function setStudentStatusDB(studentId,status){
  const {error}=await sb.from('students').update({status}).eq('id',studentId);
  if(error)throw error;
}

async function deleteStudentDB(studentId){
  const {error}=await sb.from('students').delete().eq('id',studentId);
  if(error)throw error;
}

/* ---------- student (class code, no password) ---------- */
function applyStudentPayload(d){
  const c=d.class,r=d.student;
  DB.classes[c.id]=mapClass({id:c.id,name:c.name,code:c.code},c.admin_name);
  DB.students[r.id]=mapStudent(r,c.code);
  return DB.students[r.id];
}

async function studentJoin(name,code){
  const {data,error}=await sb.rpc('join_class',{p_name:name,p_code:code});
  if(error)throw error;
  const hadAdmin=DB.session&&DB.session.role==='admin';
  if(hadAdmin)await sb.auth.signOut();          // never keep a teacher session next to a student
  clearCaches();
  const st=applyStudentPayload(data);
  DB.session={role:'student',id:st.id};
  setStudentSession(st.id);
  addRecent(st.name,st.classCode);
  flushLogQueue();
  return st;
}

async function hydrateStudent(id){
  const {data,error}=await sb.rpc('get_student',{p_student_id:id});
  if(error)throw error;
  if(!data)return null;
  return applyStudentPayload(data);
}

/* push the current progress (used for renames). Returns the error, if any. */
async function pushProgress(){
  const st=curStudent();
  if(!SB_READY||!st||st.status!=='approved')return null;
  const {error}=await sb.rpc('save_progress',{p_student_id:st.id,p_name:st.name,p_progress:st.progress});
  return error||null;
}

/* ---------- student activity log ---------- */
function queueLog(payload){
  try{
    const q=JSON.parse(localStorage.getItem(LOGQ_KEY)||'[]');
    q.push(payload);
    localStorage.setItem(LOGQ_KEY,JSON.stringify(q.slice(-50)));
  }catch(e){}
}

let flushing=false;
async function flushLogQueue(){
  if(!SB_READY||flushing)return;
  let q=[];
  try{q=JSON.parse(localStorage.getItem(LOGQ_KEY)||'[]')}catch(e){}
  if(!q.length)return;
  flushing=true;
  const left=[];
  for(const p of q){
    const {error}=await sb.rpc('log_game',p);
    if(error&&!['not_approved'].includes(error.message))left.push(p);   // keep for retry, drop rejected ones
  }
  try{localStorage.setItem(LOGQ_KEY,JSON.stringify(left))}catch(e){}
  flushing=false;
}

/* Called when a game finishes: writes one activity_log row and saves progress. */
async function logGame(info){
  const st=curStudent();
  if(!SB_READY||!st||st.status!=='approved')return;
  const payload={
    p_student_id:st.id,p_game:info.game,p_rounds:info.rounds,p_right:info.right,p_wrong:info.wrong,
    p_stars:info.stars,p_perfect:info.perfect,p_swift:info.swift,p_duration:info.duration,p_progress:st.progress
  };
  const {error}=await sb.rpc('log_game',payload);
  if(error){
    console.error('log_game failed, will retry later',error);
    queueLog(payload);
  }else flushLogQueue();
}

/* Teacher: read the activity log (RLS limits it to their own classes). */
async function fetchActivity({studentId=null,limit=15}={}){
  let q=sb.from('activity_log')
    .select('id,event,game,rounds,right_count,wrong_count,stars,perfect,swift,duration_sec,created_at,student_id,students(name),classes(name)')
    .order('created_at',{ascending:false}).limit(limit);
  if(studentId)q=q.eq('student_id',studentId);
  const {data,error}=await q;
  if(error)throw error;
  return data||[];
}

/* ---------- boot ---------- */
async function initAuth(){
  if(!SB_READY){console.warn(NO_DB_MSG);return;}
  try{
    if(await hydrateAdmin())return;
    const sid=localStorage.getItem(STU_KEY);
    if(sid){
      const st=await hydrateStudent(sid);
      if(st){DB.session={role:'student',id:st.id};flushLogQueue();}
      else setStudentSession(null);
    }
  }catch(e){console.error('initAuth',e)}
}
