/* ===== Color Me! Teacher Dashboard, Class Codes & Approval Controls ===== */

function timeAgo(ts){
  const sec=Math.max(1,Math.floor((Date.now()-ts)/1000));
  if(sec<60)return 'Just now';
  const min=Math.floor(sec/60);
  if(min<60)return `${min}m ago`;
  const hr=Math.floor(min/60);
  if(hr<24)return `${hr}h ago`;
  return `${Math.floor(hr/24)}d ago`;
}

function genClassCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code='';
  do{
    code=Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join('');
  }while(Object.values(DB.classes).some(c=>c.code===code));
  return code;
}

function teacherDashboard(){
  const adm=curAdmin();
  if(!adm){titleScreen();return;}
  go(()=>{
    G=null;
    clearTimeout(idle);
    $('#hd').style.display='';
    setNav('teacher');
    mode('none');

    const myClasses=Object.values(DB.classes).filter(c=>c.adminId===adm.id);
    const myClassIds=new Set(myClasses.map(c=>c.id));
    const myStudents=Object.values(DB.students).filter(s=>myClassIds.has(s.classId));
    const approvedStudents=myStudents.filter(s=>s.status==='approved');
    const pendingStudents=myStudents.filter(s=>s.status==='pending');
    const unreadNotifs=pendingStudents.map(st=>({
      studentId:st.id,
      studentName:st.name,
      className:(DB.classes[st.classId]||{}).name||'',
      createdAt:st.createdAt
    }));

    show(`
      <div class="td-wrap">
        <div class="td-head">
          <div>
            <h2>Welcome, ${esc(adm.username)}!</h2>
            <p class="td-sub">Manage your classes, share class codes, and track student progress.</p>
          </div>
          <div class="td-head-acts">
            <button class="btn ghost" onclick="refreshTeacher()" title="Check for new requests and activity">↻ Refresh</button>
            <button class="btn td-create" onclick="showCreateClassModal()">+ Create class</button>
          </div>
        </div>

        <div class="td-metrics">
          <div class="card td-stat">
            <b>${myClasses.length}</b>
            <span>Active ${myClasses.length===1?'class':'classes'}</span>
          </div>
          <div class="card td-stat">
            <b>${approvedStudents.length}</b>
            <span>Approved ${approvedStudents.length===1?'student':'students'}</span>
          </div>
          <div class="card td-stat ${pendingStudents.length?'alert':''}">
            <b>${pendingStudents.length}</b>
            <span>Pending ${pendingStudents.length===1?'request':'requests'}</span>
          </div>
        </div>

        ${unreadNotifs.length?`
          <section class="card notif-panel" aria-label="Notifications">
            <div class="notif-top">
              <div class="notif-title">
                <span class="bell-dot">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </span>
                <h3>Notifications</h3>
                <span class="notif-count">${unreadNotifs.length} new</span>
              </div>
            </div>
            <div class="notif-list">
              ${unreadNotifs.map(n=>`
                <div class="notif-item">
                  <div class="notif-msg">
                    <b>${esc(n.studentName)}</b> requested to join <b>${esc(n.className)}</b>
                    <em>${timeAgo(n.createdAt)}</em>
                  </div>
                  <div class="notif-acts">
                    <button class="act-ok" onclick="decideStudent('${n.studentId}',true)">Approve</button>
                    <button class="act-no" onclick="decideStudent('${n.studentId}',false)">Decline</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </section>
        `:''}

        <div class="td-sec-head">
          <h3>Your Classes</h3>
        </div>

        ${myClasses.length?`
          <div class="class-grid">
            ${myClasses.map(cls=>{
              const clsPending=pendingStudents.filter(s=>s.classId===cls.id);
              const clsApproved=approvedStudents.filter(s=>s.classId===cls.id);
              return `
                <article class="card class-card">
                  <div class="class-top">
                    <div>
                      <h4>${esc(cls.name)}</h4>
                      <span class="class-meta">${clsApproved.length} ${clsApproved.length===1?'student':'students'}</span>
                    </div>
                    <button type="button" class="code-pill" onclick="copyCode('${esc(cls.code)}',this)" title="Click to copy class code">
                      <small>CLASS CODE</small>
                      <b>${esc(cls.code)}</b>
                    </button>
                  </div>

                  ${clsPending.length?`
                    <div class="cls-pending">
                      <span class="sub-lbl">Approval Requests (${clsPending.length})</span>
                      ${clsPending.map(st=>`
                        <div class="req-row">
                          <div class="stu-id">
                            <span class="stu-av warn">${esc(st.name[0]||'?')}</span>
                            <div>
                              <b>${esc(st.name)}</b>
                              <span>Wants to join class</span>
                            </div>
                          </div>
                          <div class="notif-acts">
                            <button class="act-ok" onclick="decideStudent('${st.id}',true)">Approve</button>
                            <button class="act-no" onclick="decideStudent('${st.id}',false)">Decline</button>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  `:''}

                  <div class="cls-roster">
                    <span class="sub-lbl">Students</span>
                    ${clsApproved.length?`
                      <div class="roster-list">
                        ${clsApproved.map(st=>{
                          const p=st.progress||freshProgress(st.name);
                          const tot=Object.values(p.days||{}).reduce((a,d)=>({g:a.g+d.g,r:a.r+d.r,w:a.w+d.w}),{g:0,r:0,w:0});
                          const acc=tot.r+tot.w?Math.round(tot.r/(tot.r+tot.w)*100):0;
                          const stars=Object.values(p.best||{}).reduce((a,b)=>a+b,0);
                          return `
                            <div class="roster-row">
                              <button type="button" class="roster-main" onclick="inspectStudent('${st.id}')">
                                <div class="stu-id">
                                  <span class="stu-av">${esc(st.name[0]||'?')}</span>
                                  <div>
                                    <b>${esc(st.name)}</b>
                                    <span>${tot.g} games · ${acc}% accuracy</span>
                                  </div>
                                </div>
                                <div class="stu-chips">
                                  <span class="mini-chip">${streakFor(p)}d</span>
                                  <span class="mini-chip star">★ ${stars}/9</span>
                                </div>
                              </button>
                              <button type="button" class="remove-stu-btn" onclick="confirmRemoveStudent('${st.id}')" title="Remove ${esc(st.name)}" aria-label="Remove ${esc(st.name)}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                              </button>
                            </div>
                          `;
                        }).join('')}
                      </div>
                    `:`<p class="empty-roster">No approved students yet. Share code <b>${esc(cls.code)}</b> with your class!</p>`}
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        `:`
          <div class="card empty-classes">
            <h3>No classes yet</h3>
            <p>Create your first class to generate a unique Class Code for your students.</p>
            <button class="btn" onclick="showCreateClassModal()">+ Create class</button>
          </div>
        `}

        ${myClasses.length?`
          <div class="td-sec-head"><h3>Student Activity Log</h3></div>
          <section class="card act-panel" id="actPanel"><p class="act-empty">Loading activity…</p></section>
        `:''}
      </div>
    `);
    if(myClasses.length)loadActivityPanel();
  });
}

/* ---------- Activity log (from the Supabase activity_log table) ---------- */
function activityLine(a){
  if(a.event==='login')return 'Logged in';
  const g=(GD[a.game]||{}).t||a.game||'Game';
  const stars='★'.repeat(a.stars||0)+'☆'.repeat(3-(a.stars||0));
  return `${esc(g)} · ${a.right_count} right${a.wrong_count?`, ${a.wrong_count} oops`:''} · <span class="act-stars">${stars}</span> · ${a.duration_sec||0}s`;
}

function activityRows(rows,showName){
  if(!rows.length)return '<p class="act-empty">No activity yet.</p>';
  return `<div class="act-list">${rows.map(a=>`
    <div class="act-row ${a.event==='login'?'login':''}">
      <div class="act-main">
        ${showName?`<b>${esc((a.students||{}).name||'Student')}</b>`:''}
        <span>${activityLine(a)}</span>
      </div>
      <em>${showName&&(a.classes||{}).name?esc(a.classes.name)+' · ':''}${timeAgo(Date.parse(a.created_at))}</em>
    </div>`).join('')}</div>`;
}

async function loadActivityPanel(){
  const box=$('#actPanel');
  if(!box)return;
  try{
    const rows=await fetchActivity({limit:20});
    const el=$('#actPanel');
    if(el)el.innerHTML=activityRows(rows,true);
  }catch(ex){
    const el=$('#actPanel');
    if(el)el.innerHTML=`<p class="act-empty">Couldn’t load activity: ${esc(friendlyErr(ex))}</p>`;
  }
}

async function refreshTeacher(){
  try{await hydrateAdmin()}catch(ex){console.error(ex)}
  teacherDashboard();
}

function showCreateClassModal(){
  openModal(`
    <button class="modal-x" onclick="closeModal()" aria-label="Close">✕</button>
    <div class="modal-head">
      <span class="modal-badge">New Class</span>
      <h3>Create a Class</h3>
      <p>A unique Class Code will be generated automatically</p>
    </div>
    <form class="auth-form" onsubmit="submitCreateClass(event)">
      <label class="field">
        <span>Class Name</span>
        <input id="clsName" type="text" maxlength="28" placeholder="e.g. Kinder - Sunflowers" required>
      </label>
      <p id="authErr" class="auth-err"></p>
      <button type="submit" class="btn modal-submit">Create class</button>
    </form>
  `);
}

async function submitCreateClass(e){
  e.preventDefault();
  const adm=curAdmin();
  if(!adm)return;
  const name=$('#clsName').value.trim();
  if(!name){
    $('#authErr').textContent='Please enter a class name.';
    return;
  }
  await withBusy(e,async()=>{
    try{
      await createClassDB(name);
      await hydrateAdmin();
      closeModal();
      teacherDashboard();
    }catch(ex){$('#authErr').textContent=friendlyErr(ex)}
  });
}

function copyCode(code,btn){
  if(navigator.clipboard)navigator.clipboard.writeText(code).catch(()=>{});
  const small=btn.querySelector('small');
  if(small){
    small.textContent='COPIED!';
    setTimeout(()=>{small.textContent='CLASS CODE'},1400);
  }
}

async function decideStudent(studentId,approve){
  const st=DB.students[studentId];
  if(!st)return;
  try{
    await setStudentStatusDB(studentId,approve?'approved':'declined');
    st.status=approve?'approved':'declined';
  }catch(ex){alert(friendlyErr(ex));return;}
  teacherDashboard();
}

function confirmRemoveStudent(studentId){
  const st=DB.students[studentId];
  if(!st)return;
  const cls=DB.classes[st.classId];
  openModal(`
    <button class="modal-x" onclick="closeModal()" aria-label="Close">✕</button>
    <div class="confirm-ico">
      <svg viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#FFF0EF"/>
        <path d="M24 15v11" stroke="#D94A3E" stroke-width="3.2" stroke-linecap="round"/>
        <circle cx="24" cy="32.5" r="2" fill="#D94A3E"/>
      </svg>
    </div>
    <div class="modal-head">
      <span class="modal-badge coral">Remove Student</span>
      <h3>Are you sure?</h3>
      <p>Do you want to remove <b>${esc(st.name)}</b>${cls?` from <b>${esc(cls.name)}</b>`:''}? Their saved progress will also be removed.</p>
    </div>
    <div class="confirm-acts">
      <button type="button" class="btn btn-danger" onclick="removeStudent('${st.id}')">Yes, remove</button>
      <button type="button" class="btn ghost" onclick="closeModal()">No, return</button>
    </div>
  `);
}

async function removeStudent(studentId){
  if(!DB.students[studentId])return;
  try{
    await deleteStudentDB(studentId);
  }catch(ex){alert(friendlyErr(ex));return;}
  delete DB.students[studentId];
  closeModal();
  teacherDashboard();
}

function inspectStudent(studentId){
  const st=DB.students[studentId];
  if(!st)return;
  const p=st.progress||freshProgress(st.name);
  const tot=Object.values(p.days||{}).reduce((a,d)=>({g:a.g+d.g,r:a.r+d.r,w:a.w+d.w}),{g:0,r:0,w:0});
  const acc=tot.r+tot.w?Math.round(tot.r/(tot.r+tot.w)*100):0;
  const b=p.b||{};
  openModal(`
    <button class="modal-x" onclick="closeModal()" aria-label="Close">✕</button>
    <div class="modal-head">
      <span class="modal-badge sky">Student Progress</span>
      <h3>${esc(st.name)}</h3>
      <p>Class Code: <b>${esc(st.classCode)}</b></p>
    </div>
    <div class="insp-stats">
      <div><b>${streakFor(p)}</b><span>Day streak</span></div>
      <div><b>${tot.g}</b><span>Games played</span></div>
      <div><b>${acc}%</b><span>Accuracy</span></div>
    </div>
    <div class="insp-games">
      ${Object.keys(GD).map(id=>`
        <div class="insp-game">
          <b>${GD[id].t}</b>
          <div class="stars">${[1,2,3].map(n=>star((p.best||{})[id]>=n)).join('')}</div>
        </div>
      `).join('')}
    </div>
    <div class="insp-badges">
      ${Object.keys(BD).map(k=>`<span class="ibadge ${b[k]?'on':''}">${BD[k].t}</span>`).join('')}
    </div>
    <div class="insp-log">
      <span class="sub-lbl">Recent activity</span>
      <div id="inspLog"><p class="act-empty">Loading…</p></div>
    </div>
    <div class="insp-foot">
      <button type="button" class="insp-remove" onclick="confirmRemoveStudent('${st.id}')">Remove student from class</button>
    </div>
  `);
  fetchActivity({studentId:st.id,limit:8}).then(rows=>{
    const el=$('#inspLog');
    if(el)el.innerHTML=activityRows(rows,false);
  }).catch(ex=>{
    const el=$('#inspLog');
    if(el)el.innerHTML=`<p class="act-empty">Couldn’t load activity.</p>`;
  });
}