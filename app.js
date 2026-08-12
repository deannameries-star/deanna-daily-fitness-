const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const now=new Date(), todayName=days[now.getDay()];
const STORAGE_KEY="builtDailyV7";
const SYNC_URL="https://script.google.com/macros/s/AKfycbyVY3AAUJeITgisNRYD0FKb-XXExdQ1IOkEyGk1U-VLNgaL1kuVmfzRX6cgUdyNc3Vc/exec";
const PROGRAM_START=new Date(2026,7,1);
const TRACKED_EXERCISES=new Set(["Incline Bridges (Smith Machine or Barbell)","Elevated Reverse Lunges (Smith Machine)","DB Lateral Raises","Shoulder Press","Wide Grip Lat Pulldown","High Row Machine","Abductors","Barbell KAS Bridge / Hip Thrust"]);
const SHEET_EXERCISE_NAMES={"Incline Bridges (Smith Machine or Barbell)":"incline bridges (smith machine or barbell)","Elevated Reverse Lunges (Smith Machine)":"elevated reverse lunges (smith machine)","DB Lateral Raises":"DB lateral raises","Shoulder Press":"shoulder press","Wide Grip Lat Pulldown":"wide grip lat pull down","High Row Machine":"high row machine","Abductors":"abductors","Barbell KAS Bridge / Hip Thrust":"barbell KAS bridge/hip thrust"};
const TRAINING_WEEK_COLUMNS={1:[6,7],2:[8,9],3:[10,12],4:[13,14],5:[15,16],6:[17,18],7:[19,20],8:[21,22],10:[23,24],11:[25,26],12:[27,28],14:[29,30],15:[31,32],16:[33,34],17:[35,36],18:[37,38],19:[39,40],20:[41,42]};
let state=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
$("#todayDate").textContent=now.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});

function save(){
  state.meta=state.meta||{};
  state.meta.lastSaved=new Date().toISOString();
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
}
function localKey(d=new Date()){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function key(){return localKey(now)}
function exKey(day,i,dateKey=key()){return `${dateKey}|${day}|${i}`}
function getEx(day,i,dateKey=key()){
  state.logs=state.logs||{};
  const k=exKey(day,i,dateKey);
  state.logs[k]=state.logs[k]||{sets:[]};
  return state.logs[k];
}
function ensureDay(dateKey=key()){
  state.progress=state.progress||{};
  state.progress[dateKey]=state.progress[dateKey]||{};
  return state.progress[dateKey];
}

function openDemo(day,i){
  const e=DATA.workouts[day].exercises[i];
  $("#demoTitle").textContent=e.name;
  if(e.video){
    $("#demoContent").innerHTML=`<div class="videoWrap"><video src="${e.video}" controls playsinline loop preload="metadata"></video></div><div class="credit">${e.videoLabel||"Movement example"} · Specialized variations may differ from the exact exercise in your program.</div>`;
  } else {
    $("#demoContent").innerHTML=`<div class="noDemo"><b>No in-app video yet for this one.</b><br><br>${e.notes||"Use your coach's form notes for this movement."}</div>`;
  }
  $("#demoModal").classList.add("on");$("#demoModal").setAttribute("aria-hidden","false");
}
function closeDemo(){const v=$("#demoModal video");if(v)v.pause();$("#demoModal").classList.remove("on");$("#demoModal").setAttribute("aria-hidden","true")}
$("#closeDemo").onclick=closeDemo;$("#demoModal").onclick=e=>{if(e.target.id==="demoModal")closeDemo()};

function workoutStatus(dateKey,dayName){
  const w=DATA.workouts[dayName];
  if(!w||!w.exercises.length)return {label:"Rest",done:0,total:0};
  let total=0,done=0;
  w.exercises.forEach((e,i)=>{const x=getEx(dayName,i,dateKey);total+=e.sets;done+=(x.sets||[]).filter(s=>s&&s.done).length});
  return {label:done===total&&total?"Complete":done?"Partial":"Not logged",done,total};
}


function currentProgramWeek(d=new Date()){return Math.max(1,Math.floor((d-PROGRAM_START)/(7*24*60*60*1000))+1);}
async function postSync(payload){
  try{
    const res=await fetch(SYNC_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)});
    const txt=await res.text();let parsed={};try{parsed=JSON.parse(txt)}catch(e){}
    if(parsed.ok===false)throw new Error(parsed.error||"Sync failed");
    state.meta=state.meta||{};state.meta.lastCloudSync=new Date().toISOString();delete state.meta.lastSyncError;save();return true;
  }catch(err){state.meta=state.meta||{};state.meta.lastSyncError=String(err);save();return false;}
}
async function syncDailyProgress(){
  const p=ensureDay(),week=currentProgramWeek();
  return postSync({type:"daily_progress",day:todayName,date:key(),weekColumn:week+1,weight:p.weight||"",steps:p.steps||"",cardio:p.cardio||"",water:p.water||"",notes:p.notes||""});
}
async function syncTrackedExercise(dayName,i){
  const e=DATA.workouts[dayName].exercises[i];
  if(!TRACKED_EXERCISES.has(e.name))return true;
  const x=getEx(dayName,i),last=(x.sets||[])[e.sets-1]||{};
  if(!last.weight&&!last.reps)return true;
  const week=currentProgramWeek(),cols=TRAINING_WEEK_COLUMNS[week];
  if(!cols)return false;
  return postSync({type:"training",date:key(),week:week,exercise:SHEET_EXERCISE_NAMES[e.name]||e.name,weight:last.weight||"",reps:last.reps||"",weightColumn:cols[0],repsColumn:cols[1]});
}

function renderToday(){
  const w=DATA.workouts[todayName],items=w.exercises;let total=0,done=0;
  items.forEach((e,i)=>{total+=e.sets;done+=(getEx(todayName,i).sets||[]).filter(x=>x&&x.done).length});
  let h=`<div class="card hero"><div class="eyebrow">${todayName}</div><h2>${w.title}</h2><div class="muted">${items.length?`${done} of ${total} sets complete`:"Recovery day"}</div>${items.length?`<div class="progress"><div class="bar" style="width:${Math.round(done/total*100)}%"></div></div>`:""}</div>`;
  if(!items.length)h+=`<div class="card rest"><div class="emoji">☁️</div><h2>Rest + recover</h2><div class="muted">Hydrate, hit your meals, get your steps and come back ready.</div></div>`;
  items.forEach((e,i)=>{
    const x=getEx(todayName,i);
    h+=`<section class="card exercise"><div class="exerciseHead"><div class="eyebrow">Exercise ${i+1}</div><h3>${e.name}</h3><div class="protocol">${e.protocol}</div>${e.notes?`<div class="notes">${e.notes}</div>`:""}</div><div class="demoStrip"><span>${e.video?"Demo stays inside the app":"Form notes available"}</span><button class="demoBtn" data-demo="${todayName}|${i}">${e.video?"▶ Demo":"View cues"}</button></div><div class="sets">`;
    for(let s=0;s<e.sets;s++){const v=x.sets[s]||{};h+=`<div class="setrow"><div class="setnum">SET ${s+1}</div><input inputmode="decimal" placeholder="Weight" value="${v.weight||""}" data-day="${todayName}" data-i="${i}" data-s="${s}" data-f="weight"><input placeholder="Reps" value="${v.reps||""}" data-day="${todayName}" data-i="${i}" data-s="${s}" data-f="reps"><button class="check ${v.done?"on":""}" data-done="${todayName}|${i}|${s}">✓</button></div>`}
    h+=`</div></section>`;
  });
  $("#view").innerHTML=h;
  document.querySelectorAll("[data-demo]").forEach(b=>b.onclick=()=>{const[d,i]=b.dataset.demo.split("|");openDemo(d,+i)});
  document.querySelectorAll("input[data-day]").forEach(el=>el.oninput=()=>{let x=getEx(el.dataset.day,+el.dataset.i);x.sets[+el.dataset.s]=x.sets[+el.dataset.s]||{};x.sets[+el.dataset.s][el.dataset.f]=el.value;save()});
  document.querySelectorAll("[data-done]").forEach(el=>el.onclick=async()=>{const[d,i,s]=el.dataset.done.split("|");let x=getEx(d,+i);x.sets[+s]=x.sets[+s]||{};x.sets[+s].done=!x.sets[+s].done;save();if(x.sets[+s].done&&+s===DATA.workouts[d].exercises[+i].sets-1){await syncTrackedExercise(d,+i)}renderToday()});
}
function renderWeek(){
  let h=`<div class="card hero"><div class="eyebrow">Your Week</div><h2>Training split</h2><div class="muted">Wednesday + Sunday are recovery days.</div></div><div class="card">`;
  ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].forEach(d=>{const w=DATA.workouts[d];h+=`<div class="weekrow"><div><b>${d}</b><div class="muted">${w.title}</div></div><span class="pill">${w.exercises.length?w.exercises.length+" moves":"REST"}</span></div>`});
  h+=`</div><div class="card"><div class="eyebrow">Cardio</div><h3>4× LISS per week</h3><div class="muted">30 min · incline 8 · 3.2 mph · target HR 130 bpm</div></div>`;
  $("#view").innerHTML=h;
}
function renderMeals(){
  let h=`<div class="card hero"><div class="eyebrow">Daily Fuel</div><h2>Meal plan</h2><div class="grid3"><div class="stat"><span>Protein</span><b>148g</b></div><div class="stat"><span>Carbs</span><b>170g</b></div><div class="stat"><span>Fat</span><b>52g</b></div></div></div>`;
  DATA.meals.forEach(m=>h+=`<div class="card meal"><div class="eyebrow">${m.name}</div><ul>${m.items.map(x=>`<li>${x}</li>`).join("")}</ul></div>`);
  $("#view").innerHTML=h;
}
function renderProgress(){
  const p=ensureDay();
  $("#view").innerHTML=`<div class="card hero"><div class="eyebrow">Today</div><h2>Your progress</h2><div class="grid2"><div class="stat"><span>Weight</span><b>${p.weight||"—"}</b></div><div class="stat"><span>Steps</span><b>${p.steps||"—"}</b></div><div class="stat"><span>Cardio</span><b>${p.cardio?p.cardio+" min":"—"}</b></div><div class="stat"><span>Water</span><b>${p.water||"—"}</b></div></div></div>
  <div class="card"><input class="field" id="weight" inputmode="decimal" placeholder="Fasted weight" value="${p.weight||""}"><div class="spacer8"></div><input class="field" id="steps" inputmode="numeric" placeholder="Steps" value="${p.steps||""}"><div class="spacer8"></div><input class="field" id="cardio" inputmode="numeric" placeholder="Cardio minutes" value="${p.cardio||""}"><div class="spacer8"></div><input class="field" id="water" placeholder="Water" value="${p.water||""}"><div class="spacer8"></div><textarea class="field" id="notes" placeholder="Sleep, energy, cycle, digestion, pumps, anything to remember…">${p.notes||""}</textarea><div class="spacer8"></div><button class="primary" id="saveP">Save + Sync Today</button></div>`;
  ["weight","steps","cardio","water","notes"].forEach(id=>$("#"+id).oninput=()=>{const q=ensureDay();q[id]=$("#"+id).value;save()});
  $("#saveP").onclick=async()=>{save();$("#saveP").textContent="Syncing…";const ok=await syncDailyProgress();$("#saveP").textContent=ok?"Saved + Synced ✓":"Saved on phone — sync retry needed";setTimeout(renderProgress,1300)};
}
function lastTuesdayRange(){
  const end=new Date(now);
  const delta=(end.getDay()-2+7)%7;
  end.setDate(end.getDate()-delta);
  const start=new Date(end);start.setDate(start.getDate()-6);
  return {start,end};
}
function weeklySummaryText(){
  const {start,end}=lastTuesdayRange();
  const rows=[];let weights=[],totalSteps=0,totalCardio=0,daysLogged=0;
  for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){
    const dk=localKey(d),dn=days[d.getDay()],p=(state.progress||{})[dk]||{},ws=workoutStatus(dk,dn);
    if(p.weight){const n=parseFloat(p.weight);if(!isNaN(n))weights.push(n)}
    if(p.steps){const n=parseFloat(p.steps);if(!isNaN(n))totalSteps+=n}
    if(p.cardio){const n=parseFloat(p.cardio);if(!isNaN(n))totalCardio+=n}
    if(Object.keys(p).length)daysLogged++;
    rows.push(`${dn} ${d.toLocaleDateString(undefined,{month:"numeric",day:"numeric"})}: Weight ${p.weight||"—"} | Steps ${p.steps||"—"} | Cardio ${p.cardio||"—"} min | Water ${p.water||"—"} | Workout ${ws.label}${p.notes?` | Notes: ${p.notes}`:""}`);
  }
  const avg=weights.length?(weights.reduce((a,b)=>a+b,0)/weights.length).toFixed(1):"—";
  return `BUILT DAILY — TUESDAY CHECK-IN\n${start.toLocaleDateString()}–${end.toLocaleDateString()}\n\nAverage weight: ${avg}\nWeight days logged: ${weights.length}/7\nTotal steps: ${Math.round(totalSteps).toLocaleString()}\nTotal cardio: ${Math.round(totalCardio)} min\nProgress days logged: ${daysLogged}/7\n\n${rows.join("\n")}`;
}
function renderCheckin(){
  const txt=weeklySummaryText();
  $("#view").innerHTML=`<div class="card hero"><div class="eyebrow">Tuesday Check-In</div><h2>Your week, ready to use</h2><div class="muted">Everything you save during the week stays here and rolls into this summary.</div></div>
  <div class="card"><div class="eyebrow">Weekly Summary</div><textarea class="copyArea" id="summaryText" readonly>${txt}</textarea><div class="inlineBtns"><button class="secondary" id="copySummary">Copy Summary</button><button class="secondary" id="exportBackup">Export Backup</button></div><div class="spacer8"></div><a class="primary" href="${CLIENT_URL}" target="_blank" rel="noopener">Open Coach Check-In</a></div>
  <div class="card"><div class="eyebrow">Saving</div><div class="muted">BUILT DAILY saves workout weights/reps, completed sets, fasted weight, steps, cardio, water and notes on this device as you type. Export Backup gives you a file copy in case you change phones/browsers.</div></div>`;
  $("#copySummary").onclick=async()=>{try{await navigator.clipboard.writeText($("#summaryText").value);$("#copySummary").textContent="Copied ✓"}catch(e){$("#summaryText").select();document.execCommand("copy")}};
  $("#exportBackup").onclick=()=>{save();const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`built-daily-backup-${key()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
}
function switchView(v){
  document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===v));
  ({today:renderToday,week:renderWeek,meals:renderMeals,progress:renderProgress,checkin:renderCheckin}[v])();
}
document.querySelectorAll(".nav button").forEach(b=>b.onclick=()=>switchView(b.dataset.view));
renderToday();
