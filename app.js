const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const now=new Date();
let selectedDate=new Date(now);
const STORAGE_KEY="builtDailyV7";
const SYNC_URL="https://script.google.com/macros/s/AKfycbyVY3AAUJeITgisNRYD0FKb-XXExdQ1IOkEyGk1U-VLNgaL1kuVmfzRX6cgUdyNc3Vc/exec";
const PROGRAM_START=new Date(2026,7,1);
const TRACKED_EXERCISES=new Set(["Incline Bridges (Smith Machine or Barbell)","Elevated Reverse Lunges (Smith Machine)","DB Lateral Raises","Shoulder Press","Wide Grip Lat Pulldown","High Row Machine","Abductors","Barbell KAS Bridge / Hip Thrust"]);
const SHEET_EXERCISE_NAMES={"Incline Bridges (Smith Machine or Barbell)":"incline bridges (smith machine or barbell)","Elevated Reverse Lunges (Smith Machine)":"elevated reverse lunges (smith machine)","DB Lateral Raises":"DB lateral raises","Shoulder Press":"shoulder press","Wide Grip Lat Pulldown":"wide grip lat pull down","High Row Machine":"high row machine","Abductors":"abductors","Barbell KAS Bridge / Hip Thrust":"barbell KAS bridge/hip thrust"};
const TRAINING_WEEK_COLUMNS={1:[6,7],2:[8,9],3:[10,12],4:[13,14],5:[15,16],6:[17,18],7:[19,20],8:[21,22],10:[23,24],11:[25,26],12:[27,28],14:[29,30],15:[31,32],16:[33,34],17:[35,36],18:[37,38],19:[39,40],20:[41,42]};
let state=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
function selectedDayName(){return days[selectedDate.getDay()]}
function selectedKey(){return localKey(selectedDate)}
function refreshHeaderDate(){$("#todayDate").textContent=selectedDate.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})}

function save(){
  state.meta=state.meta||{};
  state.meta.lastSaved=new Date().toISOString();
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
}
function localKey(d=new Date()){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function key(){return selectedKey()}
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


const DEMO_GUIDES = {
  "Weighted Step Downs": {equipment:"Step + dumbbell/bodyweight", start:"Stand tall on the step with one foot near the edge.", finish:"Lower the free heel toward the floor by bending the working knee, then drive back up.", cue:"Keep the working knee tracking over the toes. Move slowly and keep the pelvis level.", type:"stepdown"},
  "Incline Bridges (Smith Machine or Barbell)": {equipment:"Bench + Smith/barbell", start:"Upper back supported on an incline/bench, bar over hips, feet planted.", finish:"Drive hips upward until glutes are fully shortened, then lower under control.", cue:"Chin tucked, ribs down, push through the heels. Do not overextend the low back.", type:"bridge"},
  "Elevated Reverse Lunges (Smith Machine)": {equipment:"Smith machine + small step", start:"Front foot stays elevated on the step under the Smith bar.", finish:"Step the other leg back and lower into a reverse lunge, then drive through the front leg to stand.", cue:"Keep pressure through the front heel/midfoot and let the front knee track naturally.", type:"reverselunge"},
  "Cable Kickbacks": {equipment:"Low cable + ankle strap", start:"Stand tall with the strapped leg slightly forward and torso braced.", finish:"Extend that leg back from the hip without arching your low back.", cue:"Think heel back, glute squeeze, small controlled range.", type:"kickback"},
  "Elevated Deficit KB Sumo Squat": {equipment:"Two platforms + kettlebell", start:"Wide stance on raised platforms, kettlebell hanging between the legs.", finish:"Sit down deep into the deficit, then drive through the feet to stand.", cue:"Toes turned out, knees follow toes, chest tall.", type:"sumosquat"},
  "Cross Cable Rear Delt Fly": {equipment:"Dual cables", start:"Hold opposite cables with arms crossed in front at shoulder height.", finish:"Open the arms out and back until they line up with the torso.", cue:"Lead with elbows, keep shoulders down, avoid shrugging.", type:"fly"},
  "DB Lateral Raises": {equipment:"Dumbbells", start:"Dumbbells by your sides, elbows softly bent.", finish:"Raise arms out to the sides to about shoulder height, then lower slowly.", cue:"Lead with elbows and keep traps relaxed.", type:"lateralraise"},
  "Shoulder Press": {equipment:"Dumbbells or machine", start:"Hands at shoulder level, elbows slightly forward of the body.", finish:"Press overhead until arms are nearly straight, then lower to shoulder level.", cue:"Brace ribs down and avoid over-arching.", type:"press"},
  "Cable Lateral Raise + Cable Front Raise": {equipment:"Cable", start:"Cable starts low with arm near your side.", finish:"Perform the programmed lateral raise, then front raise, each to about shoulder height.", cue:"Keep torso still and move from the shoulder.", type:"combo_raise"},
  "Reverse Pec Deck": {equipment:"Reverse pec deck", start:"Chest against pad, arms reaching forward to handles.", finish:"Sweep arms out and back until in line with shoulders.", cue:"Keep shoulders slightly protracted and move through the rear delts.", type:"pecdeck"},
  "High Row Cable Pull": {equipment:"High cable", start:"Arms extended toward a high cable attachment.", finish:"Pull elbows down and back toward the ribs/upper waist.", cue:"Let shoulder blades stretch forward, then drive elbows back.", type:"row"},
  "Wide Grip Lat Pulldown": {equipment:"Lat pulldown", start:"Wide overhand grip with arms extended overhead.", finish:"Pull the bar toward the upper chest while driving elbows down.", cue:"Keep chest tall and avoid yanking with momentum.", type:"pulldown"},
  "High Row Machine": {equipment:"High-row machine", start:"Arms extended and shoulders reaching forward.", finish:"Drive elbows back and down until handles approach the torso.", cue:"Use a full stretch, then squeeze the upper back.", type:"row"},
  "DB or Smith Machine RDL": {equipment:"Dumbbells or Smith machine", start:"Stand tall with weight close to thighs, knees softly bent.", finish:"Push hips back until hamstrings load, then drive hips forward to stand.", cue:"Back stays flat; this is a hip hinge, not a squat.", type:"hinge"},
  "Smith Machine Good Mornings": {equipment:"Smith machine", start:"Bar across upper back, feet set under hips, knees softly bent.", finish:"Hinge hips back with a long neutral spine, then squeeze glutes to stand.", cue:"Keep bar path vertical and stop before the low back rounds.", type:"goodmorning"},
  "DB Walking Lunges": {equipment:"Dumbbells", start:"Stand tall holding dumbbells at your sides.", finish:"Step forward, lower both knees, push through the front foot, then step into the next rep.", cue:"Brace and keep each rep controlled.", type:"walkinglunge"},
  "Stairmill Warm-Up": {equipment:"Stairmill", start:"Stand tall on the moving stairs with light hand support only if needed.", finish:"Step continuously at an easy warm-up pace.", cue:"Avoid leaning heavily on the handles.", type:"stairmill"},
  "Abductors": {equipment:"Hip abductor machine", start:"Sit tall with knees/pads together or near together.", finish:"Press knees outward against the pads, pause, then return slowly.", cue:"Keep torso stable and control both directions.", type:"abductor"},
  "Barbell KAS Bridge / Hip Thrust": {equipment:"Bench + barbell", start:"Upper back on bench, hips below the top position.", finish:"Drive hips to full glute lockout using the short KAS range, then lower only a few inches.", cue:"Stay in the top portion of the hip thrust; ribs down and chin tucked.", type:"kas"},
  "Cable Side Kick": {equipment:"Low cable + ankle strap", start:"Stand sideways to the stack with working leg near midline.", finish:"Move the working leg out to the side without rotating the pelvis.", cue:"Stay tall and keep toes mostly forward.", type:"sidekick"},
  "Smith Machine Reverse Frog Pumps": {equipment:"Smith machine", start:"Lie under bar with soles together and knees opened, hips flexed.", finish:"Drive hips upward by squeezing glutes, then lower under control.", cue:"Keep the frog-leg position and avoid pushing from the low back.", type:"frogpump"},
  "Sumo Deadlifts": {equipment:"Barbell", start:"Wide stance with toes out, hands inside the knees on the bar.", finish:"Push the floor away and stand tall with hips and knees extending together.", cue:"Keep chest tall and bar close.", type:"sumodeadlift"},
  "Planks": {equipment:"Bodyweight", start:"Forearms under shoulders, body in one straight line.", finish:"Hold the same straight-line position for the full interval.", cue:"Squeeze glutes, brace abs, and keep hips from sagging or piking.", type:"plank"},
  "Dead Bugs": {equipment:"Bodyweight", start:"Lie on back with hips/knees at 90° and arms up.", finish:"Extend opposite arm and leg away while keeping low back gently pressed down, then switch.", cue:"Move slowly and keep the ribs down.", type:"deadbug"},
  "Leg Lifts": {equipment:"Bodyweight", start:"Lie on back with legs straight and together.", finish:"Raise legs toward vertical, then lower only as far as you can keep the low back controlled.", cue:"Do not let the low back arch off the floor.", type:"leglift"},
  "Hip / Low Back Mobility": {equipment:"Bodyweight", start:"Begin in a comfortable neutral position.", finish:"Move slowly through hip and low-back ranges without forcing end range.", cue:"Mobility should feel controlled, not painful.", type:"mobility"},
  "Cable Face Pulls": {equipment:"Rope cable", start:"Rope set around face height, arms extended.", finish:"Pull rope toward face while separating the rope ends and driving elbows out.", cue:"Finish with upper back/rear delts, not a shrug.", type:"facepull"},
  "Push-Ups": {equipment:"Bodyweight", start:"Hands just outside shoulders, body straight from head to heels.", finish:"Lower chest toward floor, then press back to the top.", cue:"Keep elbows angled slightly back and core braced.", type:"pushup"},
  "Seated Overhead Tricep Extensions": {equipment:"Dumbbell or cable", start:"Sit tall with weight overhead and elbows pointing forward/up.", finish:"Bend elbows to lower weight behind the head, then extend elbows to return overhead.", cue:"Keep upper arms mostly still.", type:"tricep"},
  "Preacher Curl Machine": {equipment:"Preacher curl machine", start:"Upper arms supported on the pad with elbows nearly extended.", finish:"Curl the handles toward the shoulders, then lower under control.", cue:"Keep upper arms glued to the pad and avoid bouncing.", type:"curl"}
};

function demoFigure(type){
  const common = `<svg viewBox="0 0 360 170" class="motionSvg" role="img" aria-label="Animated exercise motion guide">
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="currentColor"/></marker>
    </defs>`;
  const end = `</svg>`;
  const label=(a,b)=>`<text x="54" y="158" class="svgLabel">${a}</text><text x="250" y="158" class="svgLabel">${b}</text>`;
  const human=(x,y,pose="stand")=>{
    if(pose==="hinge") return `<g class="person"><circle cx="${x}" cy="${y-55}" r="8"/><line x1="${x}" y1="${y-47}" x2="${x+28}" y2="${y-18}"/><line x1="${x+28}" y1="${y-18}" x2="${x+45}" y2="${y+18}"/><line x1="${x+28}" y1="${y-18}" x2="${x+5}" y2="${y+18}"/><line x1="${x+13}" y1="${y-33}" x2="${x+45}" y2="${y-20}"/></g>`;
    if(pose==="lunge") return `<g class="person"><circle cx="${x}" cy="${y-62}" r="8"/><line x1="${x}" y1="${y-54}" x2="${x}" y2="${y-20}"/><line x1="${x}" y1="${y-20}" x2="${x-25}" y2="${y+15}"/><line x1="${x}" y1="${y-20}" x2="${x+35}" y2="${y+5}"/><line x1="${x}" y1="${y-40}" x2="${x-18}" y2="${y-12}"/><line x1="${x}" y1="${y-40}" x2="${x+18}" y2="${y-12}"/></g>`;
    if(pose==="armsup") return `<g class="person"><circle cx="${x}" cy="${y-55}" r="8"/><line x1="${x}" y1="${y-47}" x2="${x}" y2="${y-8}"/><line x1="${x}" y1="${y-8}" x2="${x-14}" y2="${y+25}"/><line x1="${x}" y1="${y-8}" x2="${x+14}" y2="${y+25}"/><line x1="${x}" y1="${y-37}" x2="${x-16}" y2="${y-65}"/><line x1="${x}" y1="${y-37}" x2="${x+16}" y2="${y-65}"/></g>`;
    if(pose==="armsout") return `<g class="person"><circle cx="${x}" cy="${y-55}" r="8"/><line x1="${x}" y1="${y-47}" x2="${x}" y2="${y-8}"/><line x1="${x}" y1="${y-8}" x2="${x-14}" y2="${y+25}"/><line x1="${x}" y1="${y-8}" x2="${x+14}" y2="${y+25}"/><line x1="${x}" y1="${y-36}" x2="${x-35}" y2="${y-36}"/><line x1="${x}" y1="${y-36}" x2="${x+35}" y2="${y-36}"/></g>`;
    return `<g class="person"><circle cx="${x}" cy="${y-55}" r="8"/><line x1="${x}" y1="${y-47}" x2="${x}" y2="${y-8}"/><line x1="${x}" y1="${y-8}" x2="${x-14}" y2="${y+25}"/><line x1="${x}" y1="${y-8}" x2="${x+14}" y2="${y+25}"/><line x1="${x}" y1="${y-36}" x2="${x-18}" y2="${y-10}"/><line x1="${x}" y1="${y-36}" x2="${x+18}" y2="${y-10}"/></g>`;
  };
  if(["hinge","goodmorning","sumodeadlift"].includes(type)) return common+human(70,105,"stand")+human(270,105,"hinge")+`<path class="motionArrow" d="M135 70 Q180 35 225 70" marker-end="url(#arrow)"/>`+label("START","HINGE")+end;
  if(["reverselunge","walkinglunge","stepdown"].includes(type)) return common+human(70,105,"stand")+human(270,105,"lunge")+`<path class="motionArrow" d="M135 82 Q180 120 225 82" marker-end="url(#arrow)"/>`+label("START","LOWER")+end;
  if(["lateralraise","fly","pecdeck"].includes(type)) return common+human(70,105,"stand")+human(270,105,"armsout")+`<path class="motionArrow" d="M135 78 Q180 45 225 78" marker-end="url(#arrow)"/>`+label("START","OPEN/RAISE")+end;
  if(["press","combo_raise","facepull"].includes(type)) return common+human(70,105,"armsout")+human(270,105,"armsup")+`<path class="motionArrow" d="M135 90 Q180 45 225 65" marker-end="url(#arrow)"/>`+label("START","FINISH")+end;
  return common+human(70,105,"stand")+human(270,105,"stand")+`<path class="motionArrow pulse" d="M135 85 L225 85" marker-end="url(#arrow)"/>`+label("START","FINISH")+end;
}

function openDemo(day,i){
  const e=DATA.workouts[day].exercises[i];
  const g=DEMO_GUIDES[e.name]||{equipment:"Programmed equipment",start:"Set up exactly as written in your program.",finish:"Move through the programmed range under control.",cue:e.notes||"Use controlled form.",type:"default"};
  $("#demoTitle").textContent=e.name;
  const videoBlock=e.video?`<div class="videoWrap"><video src="${e.video}" controls playsinline loop preload="metadata"></video></div>`:"";
  $("#demoContent").innerHTML=`${videoBlock}
    <div class="motionGuide">
      <div class="guideBadge">${e.video?"VIDEO + MOTION GUIDE":"IN-APP MOTION GUIDE"}</div>
      ${demoFigure(g.type)}
      <div class="guideGrid">
        <div><span>Equipment</span><b>${g.equipment}</b></div>
        <div><span>Start</span><b>${g.start}</b></div>
        <div><span>Move</span><b>${g.finish}</b></div>
        <div><span>Key cue</span><b>${g.cue}</b></div>
      </div>
      <div class="credit">This guide is matched to the exact exercise name in your program. Use your coach’s setup if it differs.</div>
    </div>`;
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
  const p=ensureDay(selectedKey()),week=currentProgramWeek(selectedDate),dayName=selectedDayName();
  return postSync({type:"daily_progress",day:dayName,date:selectedKey(),weekColumn:week+1,weight:p.weight||"",steps:p.steps||"",cardio:p.cardio||"",water:p.water||"",notes:p.notes||""});
}
async function syncTrackedExercise(dayName,i,dateObj=selectedDate){
  const e=DATA.workouts[dayName].exercises[i];
  if(!TRACKED_EXERCISES.has(e.name))return true;
  const dateKey=localKey(dateObj),x=getEx(dayName,i,dateKey),last=(x.sets||[])[e.sets-1]||{};
  if(!last.weight&&!last.reps)return true;
  const week=currentProgramWeek(dateObj),cols=TRAINING_WEEK_COLUMNS[week];
  if(!cols)return false;
  return postSync({type:"training",date:dateKey,week:week,exercise:SHEET_EXERCISE_NAMES[e.name]||e.name,weight:last.weight||"",reps:last.reps||"",weightColumn:cols[0],repsColumn:cols[1]});
}

function changeSelectedDate(delta){selectedDate.setDate(selectedDate.getDate()+delta);refreshHeaderDate();renderToday()}
function renderToday(){
  const dayName=selectedDayName(),dateKey=selectedKey(),w=DATA.workouts[dayName],items=w.exercises;let total=0,done=0;
  items.forEach((e,i)=>{total+=e.sets;done+=(getEx(dayName,i,dateKey).sets||[]).filter(x=>x&&x.done).length});
  const isToday=dateKey===localKey(now);
  let h=`<div class="dateNav"><button id="prevDay">‹</button><input id="workoutDate" type="date" value="${dateKey}"><button id="nextDay">›</button></div><div class="card hero"><div class="eyebrow">${dayName}${isToday?" • TODAY":""}</div><h2>${w.title}</h2><div class="muted">${selectedDate.toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"})}</div><div class="muted">${items.length?`${done} of ${total} sets complete`:"Recovery day"}</div>${items.length?`<div class="progress"><div class="bar" style="width:${Math.round(done/total*100)}%"></div></div>`:""}</div>`;
  if(!items.length)h+=`<div class="card rest"><div class="emoji">☁️</div><h2>Rest + recover</h2><div class="muted">You can still log weight, steps, cardio, water and notes for this date in Progress.</div></div>`;
  items.forEach((e,i)=>{const x=getEx(dayName,i,dateKey);h+=`<section class="card exercise"><div class="exerciseHead"><div class="eyebrow">Exercise ${i+1}</div><h3>${e.name}</h3><div class="protocol">${e.protocol}</div>${e.notes?`<div class="notes">${e.notes}</div>`:""}</div><div class="demoStrip"><span>${e.video?"Video + exact motion guide":"Exact in-app motion guide"}</span><button class="demoBtn" data-demo="${dayName}|${i}">▶ Demo</button></div><div class="sets">`;for(let s=0;s<e.sets;s++){const v=x.sets[s]||{};h+=`<div class="setrow"><div class="setnum">SET ${s+1}</div><input inputmode="decimal" placeholder="Weight" value="${v.weight||""}" data-day="${dayName}" data-date="${dateKey}" data-i="${i}" data-s="${s}" data-f="weight"><input placeholder="Reps" value="${v.reps||""}" data-day="${dayName}" data-date="${dateKey}" data-i="${i}" data-s="${s}" data-f="reps"><button class="check ${v.done?"on":""}" data-done="${dayName}|${dateKey}|${i}|${s}">✓</button></div>`}h+=`</div></section>`});
  $("#view").innerHTML=h;
  $("#prevDay").onclick=()=>changeSelectedDate(-1);$("#nextDay").onclick=()=>changeSelectedDate(1);$("#workoutDate").onchange=e=>{selectedDate=new Date(e.target.value+"T12:00:00");refreshHeaderDate();renderToday()};
  document.querySelectorAll("[data-demo]").forEach(b=>b.onclick=()=>{const[d,i]=b.dataset.demo.split("|");openDemo(d,+i)});
  document.querySelectorAll("input[data-day]").forEach(el=>el.oninput=()=>{let x=getEx(el.dataset.day,+el.dataset.i,el.dataset.date);x.sets[+el.dataset.s]=x.sets[+el.dataset.s]||{};x.sets[+el.dataset.s][el.dataset.f]=el.value;save()});
  document.querySelectorAll("[data-done]").forEach(el=>el.onclick=async()=>{const[d,dk,i,s]=el.dataset.done.split("|");let x=getEx(d,+i,dk);x.sets[+s]=x.sets[+s]||{};x.sets[+s].done=!x.sets[+s].done;save();if(x.sets[+s].done&&+s===DATA.workouts[d].exercises[+i].sets-1){await syncTrackedExercise(d,+i,new Date(dk+"T12:00:00"))}renderToday()});
}
function startOfWeek(d){const x=new Date(d);const diff=(x.getDay()+6)%7;x.setDate(x.getDate()-diff);x.setHours(12,0,0,0);return x}
function renderWeek(){
  const mon=startOfWeek(selectedDate);let h=`<div class="card hero"><div class="eyebrow">Your Week</div><h2>Pick any day</h2><div class="muted">Open a previous workout, catch up later, or log a missed day to the date it belongs to.</div></div><div class="card">`;
  for(let n=0;n<7;n++){const d=new Date(mon);d.setDate(mon.getDate()+n);const dn=days[d.getDay()],w=DATA.workouts[dn],dk=localKey(d),status=workoutStatus(dk,dn);h+=`<button class="weekrow weekPick" data-date="${dk}"><div><b>${dn}</b><div class="muted">${d.toLocaleDateString(undefined,{month:"short",day:"numeric"})} · ${w.title}</div></div><span class="pill">${w.exercises.length?(status.label==="Not logged"?w.exercises.length+" moves":status.label):"REST"}</span></button>`}
  h+=`</div><div class="card"><div class="eyebrow">Cardio</div><h3>4× LISS per week</h3><div class="muted">30 min · incline 8 · 3.2 mph · target HR 130 bpm</div></div>`;$("#view").innerHTML=h;document.querySelectorAll(".weekPick").forEach(b=>b.onclick=()=>{selectedDate=new Date(b.dataset.date+"T12:00:00");refreshHeaderDate();switchView("today")})
}
function renderMeals(){
  let h=`<div class="card hero"><div class="eyebrow">Daily Fuel</div><h2>Meal plan</h2><div class="grid3"><div class="stat"><span>Protein</span><b>148g</b></div><div class="stat"><span>Carbs</span><b>170g</b></div><div class="stat"><span>Fat</span><b>52g</b></div></div></div>`;
  DATA.meals.forEach(m=>h+=`<div class="card meal"><div class="eyebrow">${m.name}</div><ul>${m.items.map(x=>`<li>${x}</li>`).join("")}</ul></div>`);
  $("#view").innerHTML=h;
}
function renderProgress(){
  const dk=selectedKey(),dayName=selectedDayName(),p=ensureDay(dk);
  $("#view").innerHTML=`<div class="dateNav"><button id="prevP">‹</button><input id="progressDate" type="date" value="${dk}"><button id="nextP">›</button></div><div class="card hero"><div class="eyebrow">${dayName}</div><h2>Your progress</h2><div class="muted">${selectedDate.toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"})}</div><div class="grid2"><div class="stat"><span>Weight</span><b>${p.weight||"—"}</b></div><div class="stat"><span>Steps</span><b>${p.steps||"—"}</b></div><div class="stat"><span>Cardio</span><b>${p.cardio?p.cardio+" min":"—"}</b></div><div class="stat"><span>Water</span><b>${p.water||"—"}</b></div></div></div><div class="card"><input class="field" id="weight" inputmode="decimal" placeholder="Fasted weight" value="${p.weight||""}"><div class="spacer8"></div><input class="field" id="steps" inputmode="numeric" placeholder="Steps" value="${p.steps||""}"><div class="spacer8"></div><input class="field" id="cardio" inputmode="numeric" placeholder="Cardio minutes" value="${p.cardio||""}"><div class="spacer8"></div><input class="field" id="water" placeholder="Water" value="${p.water||""}"><div class="spacer8"></div><textarea class="field" id="notes" placeholder="Sleep, energy, cycle, digestion, pumps, anything to remember…">${p.notes||""}</textarea><div class="spacer8"></div><button class="primary" id="saveP">Save + Sync ${dayName}</button></div>`;
  ["weight","steps","cardio","water","notes"].forEach(id=>$("#"+id).oninput=()=>{const q=ensureDay(dk);q[id]=$("#"+id).value;save()});
  $("#prevP").onclick=()=>{selectedDate.setDate(selectedDate.getDate()-1);refreshHeaderDate();renderProgress()};$("#nextP").onclick=()=>{selectedDate.setDate(selectedDate.getDate()+1);refreshHeaderDate();renderProgress()};$("#progressDate").onchange=e=>{selectedDate=new Date(e.target.value+"T12:00:00");refreshHeaderDate();renderProgress()};
  $("#saveP").onclick=async()=>{save();$("#saveP").textContent="Syncing…";const ok=await syncDailyProgress();$("#saveP").textContent=ok?`Saved + Synced ${dayName} ✓`:"Saved on phone — sync retry needed";setTimeout(renderProgress,1300)};
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
refreshHeaderDate();
renderToday();
