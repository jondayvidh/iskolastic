"use strict";

const STORAGE_KEY = "iskolastic.workspace.v1";
const LETTERS = ["A", "B", "C", "D"];
const SAMPLE = {
  id: "sample-cs-foundations",
  title: "Introduction to Computer Science",
  subject: "Computer Science",
  difficulty: "Beginner",
  description: "A foundational review of computer science concepts, from hardware and data structures to algorithms and the web.",
  status: "published",
  createdAt: "2026-11-17T00:00:00.000Z",
  updatedAt: "2026-11-17T00:00:00.000Z",
  isSample: true,
  questions: [
    {type:"mcq",text:"What does CPU stand for?",options:["Central Processing Unit","Computer Processing Utility","Core Power Unit","Central Program Uplink"],correct:"A",explanation:"CPU stands for Central Processing Unit. It executes program instructions and performs arithmetic, logic, control, and input/output operations."},
    {type:"mcq",text:"Which data structure follows a Last-In, First-Out (LIFO) principle?",options:["Queue","Linked List","Stack","Binary Tree"],correct:"C",explanation:"A stack follows LIFO: the last item added is the first item removed."},
    {type:"mcq",text:"What is the binary representation of decimal 10?",options:["1100","1010","1001","0110"],correct:"B",explanation:"Decimal 10 is 8 + 2, which is 1010 in binary."},
    {type:"mcq",text:"In object-oriented programming, what does encapsulation mean?",options:["Inheriting properties from a parent class","Bundling data and methods while controlling access to internal details","Overriding parent class methods","Using multiple classes in one program"],correct:"B",explanation:"Encapsulation groups related data and behavior and controls access to an object's internal state."},
    {type:"mcq",text:"What is the average-case time complexity of binary search?",options:["O(n)","O(n²)","O(log n)","O(n log n)"],correct:"C",explanation:"Binary search halves the remaining search space after each comparison, giving it logarithmic time complexity. The input must be sorted."},
    {type:"mcq",text:"Which protocol is primarily used to transfer web pages?",options:["FTP","SMTP","HTTP / HTTPS","SSH"],correct:"C",explanation:"HTTP and its encrypted counterpart HTTPS are used by browsers and web servers to exchange web resources."},
    {type:"mcq",text:"What does RAM stand for?",options:["Read Access Memory","Random Access Memory","Rapid Application Module","Read-And-Memory"],correct:"B",explanation:"RAM means Random Access Memory. It is volatile working memory used by programs and data currently in use."},
    {type:"mcq",text:"In HTML, which element creates a hyperlink?",options:["<link>","<href>","<a>","<url>"],correct:"C",explanation:"The anchor element, written as <a>, creates hyperlinks. Its href attribute specifies the destination."},
    {type:"mcq",text:"Which sorting algorithm has an average-case time complexity of O(n log n)?",options:["Bubble Sort","Selection Sort","Insertion Sort","Merge Sort"],correct:"D",explanation:"Merge Sort uses divide and conquer to achieve O(n log n) average-case time complexity."},
    {type:"mcq",text:"What is an IP address?",options:["A unique name for software applications","A numerical label assigned to a device on a network","The speed of an internet connection","A processor architecture"],correct:"B",explanation:"An Internet Protocol address identifies a network interface and helps route data to the correct destination."}
  ]
};

let state = loadState();
let currentPage = "overview";
let activeExamId = null;
let activeAnswers = {};
let latestAttemptId = null;
let myFilter = "all";
let pendingConfirm = null;
let toastTimer = null;

function clone(value){ return JSON.parse(JSON.stringify(value)); }
function loadState(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved && Array.isArray(saved.exams) && Array.isArray(saved.attempts) && Array.isArray(saved.savedIds)){
      const sampleIndex = saved.exams.findIndex(e => e.id === SAMPLE.id);
      if(sampleIndex < 0) saved.exams.unshift(clone(SAMPLE)); else saved.exams[sampleIndex] = clone(SAMPLE);
      return saved;
    }
  } catch(error){ console.warn("Could not read local workspace:", error); }
  return {exams:[clone(SAMPLE)],attempts:[],savedIds:[]};
}
function persist(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch(error){ toast("Unable to save. Browser storage may be full.", true); }
}
function el(tag, className, text){
  const node = document.createElement(tag);
  if(className) node.className = className;
  if(text !== undefined && text !== null) node.textContent = String(text);
  return node;
}
function makeButton(label, className, handler){
  const b = el("button", className, label); b.type="button"; if(handler) b.addEventListener("click",handler); return b;
}
const SVG_NS="http://www.w3.org/2000/svg";
function icon(name){
  const svg=document.createElementNS(SVG_NS,"svg"),use=document.createElementNS(SVG_NS,"use");
  svg.setAttribute("class","icon");svg.setAttribute("viewBox","0 0 24 24");
  svg.setAttribute("aria-hidden","true");svg.setAttribute("focusable","false");
  use.setAttribute("href",`#i-${name}`);svg.append(use);return svg;
}
function withIcon(button,name){button.append(icon(name));return button;}
function iconBox(className,name){const box=el("div",className);box.append(icon(name));return box;}
function iconButton(name,className,label,handler){const b=makeButton("",className,handler);b.setAttribute("aria-label",label);b.append(icon(name));return b;}
function emptyState(symbol,title,copy,actionLabel,action){
  const wrap=el("div","empty-state"); wrap.append(iconBox("empty-symbol",symbol),el("h3","",title),el("p","",copy));
  if(actionLabel) wrap.append(makeButton(actionLabel,"button button-outline",action));
  return wrap;
}
function toast(message,isError=false){
  const box=document.getElementById("toast"); box.textContent=message;
  box.style.background=isError?"var(--burgundy)":"var(--maroon-dark)"; box.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>box.classList.remove("show"),2800);
}
function formatDate(value){
  if(!value) return "Date unavailable";
  const date=new Date(value);
  if(Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
}
function getExam(id){ return state.exams.find(exam=>exam.id===id); }
function getAttempts(id){ return state.attempts.filter(a=>a.examId===id); }
function plural(n,one,many){ return `${n} ${n===1?one:many}`; }
function average(values){ return values.length ? Math.round(values.reduce((a,b)=>a+b,0)/values.length) : 0; }
function pageLabel(page){ return ({overview:"Overview",create:"Create examination",explore:"Explore examinations","my-exams":"My examinations",analytics:"Results and analytics",saved:"Saved examinations",taking:"Practice session",result:"Result"})[page]||"Overview"; }
function showPage(page){
  currentPage=page;
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${page}`));
  document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  document.getElementById("current-page-label").textContent=pageLabel(page);
  document.getElementById("sidebar").classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
  if(page==="overview") renderOverview();
  if(page==="explore") renderExplore();
  if(page==="my-exams") renderMyExams();
  if(page==="analytics") renderAnalytics();
  if(page==="saved") renderSaved();
}
function statCard(label,value,foot){
  const card=el("div","stat-card"); card.append(el("div","stat-label",label),el("div","stat-value",value),el("div","stat-foot",foot)); return card;
}
function renderOverview(){
  const completed=state.attempts, avg=average(completed.map(a=>a.percent));
  const stats=document.getElementById("overview-stats"); stats.replaceChildren(
    statCard("EXAMINATIONS CREATED",state.exams.filter(e=>!e.isSample).length,"Examinations you have created"),
    statCard("EXAMINATIONS COMPLETED",completed.length,"Practice sessions submitted"),
    statCard("AVERAGE SCORE",completed.length?`${avg}%`:"—",completed.length?"Across all attempts":"No completed attempts"),
    statCard("SAVED EXAMINATIONS",state.savedIds.length,"Examinations saved for later")
  );
  const recent=document.getElementById("recent-activity"); recent.replaceChildren();
  const items=[...completed].sort((a,b)=>new Date(b.completedAt)-new Date(a.completedAt)).slice(0,4);
  if(!items.length) recent.append(emptyState("arrow-up-right","No activity recorded","Complete an examination to view scores and history.","Explore examinations",()=>showPage("explore")));
  else items.forEach(a=>{
    const exam=getExam(a.examId); const row=el("div","activity-row");
    row.append(iconBox("activity-symbol","check"));
    const copy=el("div","activity-copy"); copy.append(el("strong","",exam?.title||"Deleted examination"),el("small","",`${formatDate(a.completedAt)} · ${a.correct}/${a.total} correct`));
    row.append(copy,el("div","activity-score",`${a.percent}%`)); recent.append(row);
  });
  const cont=document.getElementById("continue-list"); cont.replaceChildren();
  const candidates=state.exams.filter(e=>e.status==="published").sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,3);
  if(!candidates.length) cont.append(el("p","empty-copy","Publish an examination to display it here."));
  else candidates.forEach(exam=>{
    const row=el("div","continue-item"),copy=el("div","continue-copy");
    copy.append(el("strong","",exam.title),el("small","",`${plural(exam.questions.length,"question","questions")} · ${exam.subject||"General"}`));
    row.append(iconBox("activity-symbol","doc"),copy,makeButton("Practice","mini-action",()=>startExam(exam.id))); cont.append(row);
  });
}
function examCard(exam,showOwnerActions=false){
  const card=el("article","exam-card");
  const top=el("div","exam-card-top"); top.append(iconBox("subject-icon",iconFor(exam.subject)));
  const saved=state.savedIds.includes(exam.id);
  const save=iconButton("heart",saved?"card-menu saved":"card-menu",saved?"Remove from saved examinations":"Save examination",()=>toggleSaved(exam.id));
  save.setAttribute("aria-pressed",String(saved)); if(saved) save.querySelector(".icon").classList.add("is-filled"); top.append(save);
  card.append(top,el("div","exam-subject",exam.subject||"GENERAL"),el("h3","",exam.title),el("p","exam-description",exam.description||"A self-directed practice examination."));
  const meta=el("div","exam-meta"); meta.append(el("span","",plural(exam.questions.length,"question","questions")),el("span","",plural(getAttempts(exam.id).length,"attempt","attempts")));
  card.append(meta);
  const bottom=el("div","exam-card-bottom"); bottom.append(el("span",`difficulty ${exam.difficulty||"Not specified"}`,exam.difficulty||"Not specified"));
  const actions=el("div","card-actions");
  if(showOwnerActions && !exam.isSample){
    actions.append(makeButton("Edit", "",()=>editExam(exam.id)));
    actions.append(makeButton(exam.status==="draft"?"Publish":"Practice","",()=>exam.status==="draft"?publishDraft(exam.id):startExam(exam.id)));
  } else actions.append(withIcon(makeButton("Start practice","",()=>startExam(exam.id)),"arrow-up-right"));
  bottom.append(actions); card.append(bottom); return card;
}
function iconFor(subject=""){
  const s=subject.toLowerCase();
  if(s.includes("computer")||s.includes("program")) return "code";
  if(s.includes("math")) return "sigma";
  if(s.includes("science")) return "flask";
  if(s.includes("english")||s.includes("language")) return "book";
  if(s.includes("history")) return "clock";
  return "spark";
}
function renderExplore(){
  const search=document.getElementById("explore-search").value.trim().toLowerCase();
  const subject=document.getElementById("explore-subject").value;
  const difficulty=document.getElementById("explore-difficulty").value;
  const list=state.exams.filter(e=>e.status==="published"&&(!search||`${e.title} ${e.subject} ${e.description}`.toLowerCase().includes(search))&&(!subject||e.subject===subject)&&(!difficulty||e.difficulty===difficulty));
  const grid=document.getElementById("explore-grid"); grid.replaceChildren();
  document.getElementById("explore-count").textContent=`${list.length} ${list.length===1?"examination":"examinations"} available`;
  if(!list.length) grid.append(emptyState("search","No matching examinations","Revise the search criteria or create a new examination.","Create examination",()=>openBuilder()));
  else list.forEach(e=>grid.append(examCard(e)));
  const select=document.getElementById("explore-subject"),current=select.value;
  const subjects=[...new Set(state.exams.filter(e=>e.status==="published").map(e=>e.subject).filter(Boolean))].sort();
  select.replaceChildren(new Option("All subjects",""),...subjects.map(s=>new Option(s,s))); select.value=subjects.includes(current)?current:"";
}
function renderMyExams(){
  const all=state.exams.filter(e=>!e.isSample);
  document.getElementById("my-count-all").textContent=all.length;
  const list=all.filter(e=>myFilter==="all"||e.status===myFilter);
  const grid=document.getElementById("my-exams-grid"); grid.replaceChildren();
  if(!list.length) grid.append(emptyState("doc",myFilter==="draft"?"No drafts available":"No examinations created","Create an examination to convert study material into a reusable practice resource.","Create examination",()=>openBuilder()));
  else list.forEach(e=>grid.append(examCard(e,true)));
}
function renderSaved(){
  const grid=document.getElementById("saved-grid"); grid.replaceChildren();
  const list=state.exams.filter(e=>state.savedIds.includes(e.id)&&e.status==="published");
  if(!list.length) grid.append(emptyState("heart","No saved examinations","Save examinations from the Explore examinations page for quick access.","Explore examinations",()=>showPage("explore")));
  else list.forEach(e=>grid.append(examCard(e)));
}
function toggleSaved(id){
  state.savedIds=state.savedIds.includes(id)?state.savedIds.filter(x=>x!==id):[...state.savedIds,id];
  persist(); toast(state.savedIds.includes(id)?"Added to saved examinations.":"Removed from saved examinations.");
  if(currentPage==="explore") renderExplore(); if(currentPage==="saved") renderSaved();
}
function renderAnalytics(){
  const attempts=state.attempts, avg=average(attempts.map(a=>a.percent));
  const stats=document.getElementById("analytics-stats"); stats.replaceChildren(
    statCard("TOTAL ATTEMPTS",attempts.length,"Completed practice sessions"),
    statCard("AVERAGE SCORE",attempts.length?`${avg}%`:"—","Across all completed attempts"),
    statCard("HIGHEST SCORE",attempts.length?`${Math.max(...attempts.map(a=>a.percent))}%`:"—","Best recorded result"),
    statCard("EXAMINATIONS IN LIBRARY",state.exams.length,"Includes the sample examination")
  );
  const sorted=[...attempts].sort((a,b)=>new Date(b.completedAt)-new Date(a.completedAt)).slice(0,7).reverse();
  const history=document.getElementById("score-history"); history.replaceChildren();
  if(!sorted.length) history.append(emptyState("chart","No scores available","Score history will appear after the first completed examination."));
  else sorted.forEach(a=>{
    const row=el("div","score-bar-row"); row.append(el("span","",formatDate(a.completedAt)));
    const track=el("div","bar-track"),fill=el("i"); fill.style.width=`${a.percent}%`; track.append(fill);
    row.append(track,el("strong","",`${a.percent}%`)); history.append(row);
  });
  const groups={}; attempts.forEach(a=>{const exam=getExam(a.examId);const key=exam?.subject||"General";(groups[key]??=[]).push(a.percent);});
  const subjectBox=document.getElementById("subject-performance"); subjectBox.replaceChildren();
  const subjects=Object.entries(groups).sort((a,b)=>average(b[1])-average(a[1]));
  if(!subjects.length) subjectBox.append(emptyState("sigma","No subject data available","Complete several examinations to compare performance by subject."));
  else subjects.forEach(([name,scores])=>{
    const row=el("div","score-bar-row"); row.append(el("span","",name));
    const track=el("div","bar-track"),fill=el("i"); fill.style.width=`${average(scores)}%`; track.append(fill);
    row.append(track,el("strong","",`${average(scores)}%`)); subjectBox.append(row);
  });
  const table=document.getElementById("attempt-history"); table.replaceChildren();
  const recent=[...attempts].sort((a,b)=>new Date(b.completedAt)-new Date(a.completedAt));
  if(!recent.length) table.append(emptyState("arrow-up-right","No attempts recorded","Completed examinations and scores will be listed here."));
  else recent.forEach(a=>{
    const exam=getExam(a.examId),row=el("div","history-row"),copy=el("div");
    copy.append(el("strong","",exam?.title||"Deleted examination"),el("small","",`${formatDate(a.completedAt)} · ${a.correct}/${a.total} correct`));
    row.append(copy,el("div","history-score",`${a.percent}%`),withIcon(makeButton("Review","",()=>showAttempt(a.id)),"arrow-up-right")); table.append(row);
  });
}

function openBuilder(exam=null){
  document.getElementById("exam-form").reset();
  document.getElementById("builder-heading").textContent=exam?"Edit examination":"Create examination";
  document.getElementById("exam-title").value=exam?.title||"";
  document.getElementById("exam-subject").value=exam?.subject||"";
  document.getElementById("exam-difficulty").value=exam?.difficulty||"Not specified";
  document.getElementById("exam-description").value=exam?.description||"";
  document.getElementById("exam-form").dataset.editId=exam?.id||"";
  builderQuestions=exam?clone(exam.questions):[blankQuestion()];
  renderBuilderQuestions(); showPage("create");
}
let builderQuestions=[];
function blankQuestion(){return {type:"mcq",text:"",options:["","","",""],correct:"",explanation:""};}
const TF_OPTIONS=["True","False"];
function clearQuestionError(card){card.classList.remove("invalid");card.querySelectorAll(".builder-error").forEach(n=>n.remove());}
function renderBuilderQuestions(){
  const list=document.getElementById("question-builder-list"); list.replaceChildren();
  document.getElementById("question-count").textContent=builderQuestions.length;
  builderQuestions.forEach((q,index)=>{
    const card=el("article","builder-question"); card.dataset.index=index;
    const refs={}; card._refs=refs;
    card.addEventListener("input",()=>clearQuestionError(card));
    card.addEventListener("change",()=>clearQuestionError(card));
    const head=el("div","builder-question-top"); head.append(el("strong","",`QUESTION ${String(index+1).padStart(2,"0")}`));
    const actions=el("div","question-actions");
    actions.append(iconButton("arrow-up","icon-button","Move question up",()=>moveQuestion(index,-1)),iconButton("arrow-down","icon-button","Move question down",()=>moveQuestion(index,1)),iconButton("x","icon-button danger","Remove question",()=>removeQuestion(index)));
    head.append(actions); card.append(head);
    const grid=el("div","builder-question-grid"); refs.promptHost=grid;
    const prompt=el("label",""); prompt.append(el("span","builder-label","Question text"));
    const textarea=el("textarea"); textarea.placeholder="Enter a clear and unambiguous question"; textarea.value=q.text; textarea.addEventListener("input",()=>q.text=textarea.value); prompt.append(textarea); refs.prompt=textarea;
    const type=el("label",""); type.append(el("span","builder-label","Question type"));
    const select=el("select"); [["mcq","Multiple choice"],["truefalse","True or false"],["short","Identification"]].forEach(([v,t])=>select.add(new Option(t,v)));
    select.value=q.type;
    select.addEventListener("change",()=>{
      const next=select.value;
      if(q.type==="mcq") q._opts=q.options.slice();
      q.type=next; q.correct="";
      q.options=next==="truefalse"?TF_OPTIONS.slice():next==="short"?[]:(q._opts||["","","",""]);
      renderBuilderQuestions();
    });
    type.append(select); grid.append(prompt,type); card.append(grid);
    if(q.type==="mcq"){
      const label=el("span","builder-label","Answer options");
      const options=el("div","option-editor"); refs.optionsHost=options; refs.options=[];
      q.options.forEach((value,oi)=>{
        const wrap=el("label","option-edit");wrap.append(el("span","",LETTERS[oi]));
        const input=el("input");input.value=value;input.placeholder=`Option ${LETTERS[oi]}`;input.maxLength=180;input.addEventListener("input",()=>q.options[oi]=input.value);wrap.append(input);options.append(wrap);refs.options.push(input);
      });card.append(label,options);
      const correct=el("div","correct-select");correct.append(el("label","","CORRECT ANSWER"));
      const answer=el("select");answer.setAttribute("aria-label","Correct answer");
      const none=new Option("Select the correct answer","");none.disabled=true;answer.add(none);
      LETTERS.forEach(l=>answer.add(new Option(`Option ${l}`,l)));
      answer.selectedIndex=LETTERS.indexOf(q.correct)+1;
      answer.addEventListener("change",()=>q.correct=answer.value);correct.append(answer);card.append(correct);
      refs.correct=answer; refs.correctHost=correct;
    } else if(q.type==="truefalse"){
      const label=el("span","builder-label","Correct answer");
      const group=el("div","option-editor");group.setAttribute("role","radiogroup");group.setAttribute("aria-label","Correct answer");
      const hint=el("p","correct-hint");
      const buttons=TF_OPTIONS.map((text,oi)=>{
        const b=makeButton("","answer-option",()=>{q.correct=LETTERS[oi];sync();});
        b.setAttribute("role","radio");b.append(el("span","option-letter",LETTERS[oi]),el("span","",text));return b;
      });
      const sync=()=>{
        buttons.forEach((b,oi)=>{const on=q.correct===LETTERS[oi];b.classList.toggle("selected",on);b.setAttribute("aria-checked",String(on));});
        const i=LETTERS.indexOf(q.correct);hint.textContent=i===0||i===1?`Correct answer: ${TF_OPTIONS[i]}`:"No correct answer selected.";
      };
      group.append(...buttons);sync();card.append(label,group,hint);
      refs.correct=buttons[0]; refs.correctHost=hint;
    } else {
      const correct=el("label",""); refs.correctHost=correct; correct.append(el("span","builder-label","Accepted answer"));
      const input=el("input");input.value=q.correct||"";input.placeholder="Enter the accepted answer";input.addEventListener("input",()=>q.correct=input.value);correct.append(input);card.append(correct);
      refs.correct=input;
    }
    const explain=el("label","");explain.style.display="block";explain.style.marginTop="13px";explain.append(el("span","builder-label","Explanation (shown after submission)"));
    const exp=el("textarea");exp.value=q.explanation||"";exp.placeholder="Explain the concept or the reason this answer is correct";exp.addEventListener("input",()=>q.explanation=exp.value);explain.append(exp);card.append(explain);
    list.append(card);
  });
}
function moveQuestion(index,delta){const target=index+delta;if(target<0||target>=builderQuestions.length)return;[builderQuestions[index],builderQuestions[target]]=[builderQuestions[target],builderQuestions[index]];renderBuilderQuestions();}
function removeQuestion(index){if(builderQuestions.length===1){toast("An examination requires at least one question.",true);return;}builderQuestions.splice(index,1);renderBuilderQuestions();}
function flagQuestion(i,hostKey,focusEl,message){
  const card=document.querySelectorAll("#question-builder-list .builder-question")[i];
  if(card){
    clearQuestionError(card); card.classList.add("invalid");
    const err=el("p","builder-error",message); err.setAttribute("role","alert");
    const host=card._refs&&card._refs[hostKey]; if(host) host.after(err); else card.append(err);
    card.scrollIntoView({behavior:"smooth",block:"center"});
    if(focusEl) focusEl.focus({preventScroll:true});
  }
  toast(message,true);
}
function validateBuilder(){
  document.querySelectorAll("#question-builder-list .builder-question").forEach(clearQuestionError);
  const title=document.getElementById("exam-title").value.trim();
  if(!title){toast("Enter an examination title.",true);document.getElementById("exam-title").focus();return null;}
  if(!builderQuestions.length){toast("Add at least one question.",true);return null;}
  const cards=document.querySelectorAll("#question-builder-list .builder-question");
  for(let i=0;i<builderQuestions.length;i++){
    const q=builderQuestions[i],refs=cards[i]?._refs||{};
    if(!q.text.trim()){flagQuestion(i,"promptHost",refs.prompt,`Enter the text for question ${i+1}.`);return null;}
    if(q.type==="mcq"){
      if(q.options.length!==4||q.options.some(o=>!o.trim())){flagQuestion(i,"optionsHost",(refs.options||[]).find((_,oi)=>!q.options[oi]?.trim()),`Complete all four answer options for question ${i+1}.`);return null;}
      if(!LETTERS.includes(q.correct)){flagQuestion(i,"correctHost",refs.correct,`Select the correct answer for question ${i+1}.`);return null;}
    } else if(q.type==="truefalse"){
      if(q.correct!=="A"&&q.correct!=="B"){flagQuestion(i,"correctHost",refs.correct,`Select True or False as the correct answer for question ${i+1}.`);return null;}
    } else if(!String(q.correct||"").trim()){
      flagQuestion(i,"correctHost",refs.correct,`Enter the accepted answer for question ${i+1}.`);return null;
    }
  }
  const questions=clone(builderQuestions).map(({_opts,...q})=>q.type==="truefalse"?{...q,options:TF_OPTIONS.slice()}:q);
  return {title,subject:document.getElementById("exam-subject").value.trim()||"General",difficulty:document.getElementById("exam-difficulty").value,description:document.getElementById("exam-description").value.trim(),questions};
}
function saveBuilder(status){
  const data=validateBuilder();if(!data)return;
  const editId=document.getElementById("exam-form").dataset.editId;
  if(editId){
    const existing=getExam(editId);if(!existing)return;
    Object.assign(existing,data,{status,updatedAt:new Date().toISOString()});
  } else {
    state.exams.push({...data,id:`exam-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,status,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  }
  persist();toast(status==="published"?"Examination published to this workspace.":"Draft saved on this device.");
  document.getElementById("exam-form").dataset.editId="";
  showPage("my-exams");
}
function editExam(id){const exam=getExam(id);if(exam)openBuilder(exam);}
function publishDraft(id){const exam=getExam(id);if(exam){exam.status="published";exam.updatedAt=new Date().toISOString();persist();renderMyExams();toast("Draft published.");}}

function startExam(id){
  const exam=getExam(id);if(!exam||exam.status!=="published")return;
  activeExamId=id;activeAnswers={};
  document.getElementById("taking-subject").textContent=exam.subject||"GENERAL";
  document.getElementById("taking-title").textContent=exam.title;
  document.getElementById("taking-description").textContent=exam.description||"Respond to each question below.";
  renderTaking();showPage("taking");
}
function renderTaking(){
  const exam=getExam(activeExamId);if(!exam)return;
  const container=document.getElementById("taking-questions");container.replaceChildren();
  exam.questions.forEach((q,i)=>{
    const card=el("article","take-question");card.id=`take-q-${i}`;
    const head=el("div","take-question-head");head.append(el("span","",`QUESTION ${String(i+1).padStart(2,"0")}`),el("span","",typeLabel(q.type)));card.append(head,el("h3","",q.text));
    if(q.type==="mcq"||q.type==="truefalse"){
      const opts=el("div","answer-options");
      q.options.forEach((option,oi)=>{
        const letter=LETTERS[oi];
        const button=makeButton("",`answer-option${activeAnswers[i]===letter?" selected":""}`,()=>{
          activeAnswers[i]=letter;
          card.querySelectorAll(".answer-option").forEach(optionButton=>optionButton.classList.remove("selected"));
          button.classList.add("selected");
          updateTakingProgress(exam);
        });
        button.append(el("span","option-letter",letter),el("span","",option));opts.append(button);
      });card.append(opts);
    }else{
      const input=el("input","answer-text");input.placeholder="Enter your response";input.value=activeAnswers[i]||"";input.addEventListener("input",()=>{activeAnswers[i]=input.value;updateTakingProgress(exam);});card.append(input);
    }
    container.append(card);
  });
  const jump=document.getElementById("question-jump-list");jump.replaceChildren();const grid=el("div","jump-grid");
  exam.questions.forEach((_,i)=>grid.append(makeButton(String(i+1),"",()=>document.getElementById(`take-q-${i}`).scrollIntoView({behavior:"smooth",block:"start"}))));
  jump.append(grid);updateTakingProgress(exam);
}
function typeLabel(type){return type==="mcq"?"MULTIPLE CHOICE":type==="truefalse"?"TRUE OR FALSE":"IDENTIFICATION";}
function isAnswered(answer){
  return answer!==undefined&&answer!==null&&String(answer).trim()!=="";
}
function updateTakingProgress(exam){
  const answered=exam.questions.filter((_,i)=>isAnswered(activeAnswers[i])).length;
  document.getElementById("taking-progress").textContent=`${answered} of ${exam.questions.length} answered`;
  document.getElementById("taking-progress-bar").style.width=`${answered/exam.questions.length*100}%`;
  const buttons=document.querySelectorAll("#question-jump-list button");
  buttons.forEach((b,i)=>b.classList.toggle("done",isAnswered(activeAnswers[i])));
}
function normalized(value){return String(value??"").trim().toLowerCase().replace(/\s+/g," ");}
function answerIsCorrect(q,answer){
  if(q.type==="short")return normalized(answer)===normalized(q.correct);
  return answer===q.correct;
}
function submitAttempt(){
  const exam=getExam(activeExamId);if(!exam)return;
  const missing=exam.questions.reduce((arr,_,i)=>{if(!isAnswered(activeAnswers[i]))arr.push(i+1);return arr;},[]);
  if(missing.length){toast(`Respond to all questions before submitting. Unanswered: ${missing.slice(0,5).join(", ")}${missing.length>5?"…":""}`,true);return;}
  const results=exam.questions.map((q,i)=>({question:clone(q),answer:activeAnswers[i],correct:answerIsCorrect(q,activeAnswers[i])}));
  const correct=results.filter(r=>r.correct).length;
  const attempt={id:`attempt-${Date.now()}`,examId:exam.id,completedAt:new Date().toISOString(),correct,total:results.length,percent:Math.round(correct/results.length*100),results};
  state.attempts.push(attempt);persist();latestAttemptId=attempt.id;renderResult(attempt);showPage("result");
}
function renderResult(attempt){
  const exam=getExam(attempt.examId);
  document.getElementById("result-score").replaceChildren(document.createTextNode(String(attempt.correct)),el("span","",`/${attempt.total}`));
  document.getElementById("result-percent").textContent=`${attempt.percent}%`;
  document.getElementById("result-message").textContent=attempt.percent===100?"Excellent performance.":attempt.percent>=80?"Strong understanding demonstrated.":attempt.percent>=60?"Satisfactory progress. Continue to address the remaining gaps.":"Further review is recommended. Revise the material and try again.";
  document.getElementById("result-subtitle").textContent=`${exam?.title||"Examination"} · Completed ${formatDate(attempt.completedAt)}`;
  document.getElementById("result-meter-fill").style.width=`${attempt.percent}%`;
  const summary=document.getElementById("result-summary");summary.replaceChildren();
  [[attempt.correct,"Correct answers"],[attempt.total-attempt.correct,"Incorrect responses"],[attempt.total,"Total questions"]].forEach(([v,l])=>{const item=el("div","result-summary-item");item.append(el("strong","",v),el("small","",l));summary.append(item);});
  const review=document.getElementById("result-review");review.replaceChildren();
  attempt.results.forEach((r,i)=>{
    const card=el("article","review-card"),head=el("div","review-head");const status=el("span",r.correct?"correct":"incorrect");status.append(icon(r.correct?"check":"arrow-up-right"),document.createTextNode(r.correct?"CORRECT":"INCORRECT"));head.append(el("span","",`QUESTION ${i+1}`),status);card.append(head,el("p","review-question",r.question.text));
    const given=r.question.type==="mcq"||r.question.type==="truefalse"?r.question.options[LETTERS.indexOf(r.answer)]||"—":r.answer;
    const expected=r.question.type==="mcq"||r.question.type==="truefalse"?r.question.options[LETTERS.indexOf(r.question.correct)]||"—":r.question.correct;
    card.append(el("p","review-answer",`Your response: ${given}`),el("p","review-answer",`Correct answer: ${expected}`));
    if(r.question.explanation)card.append(el("div","review-explanation",r.question.explanation));
    review.append(card);
  });
}
function showAttempt(id){
  const attempt=state.attempts.find(a=>a.id===id);if(!attempt)return;
  latestAttemptId=id;renderResult(attempt);showPage("result");
}
function confirmLeave(){
  if(!activeExamId){showPage("explore");return;}
  pendingConfirm=()=>{activeExamId=null;activeAnswers={};showPage("explore");};
  document.getElementById("confirm-modal").classList.remove("hidden");
}
function closeConfirm(){document.getElementById("confirm-modal").classList.add("hidden");pendingConfirm=null;}

function wireEvents(){
  document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",e=>{e.preventDefault();showPage(b.dataset.page);}));
  document.querySelectorAll("[data-action]").forEach(b=>b.addEventListener("click",()=>b.dataset.action==="create"?openBuilder():showPage(b.dataset.action)));
  document.getElementById("mobile-menu").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
  document.getElementById("back-to-overview").addEventListener("click",()=>showPage("overview"));
  document.getElementById("add-question").addEventListener("click",()=>{builderQuestions.push(blankQuestion());renderBuilderQuestions();});
  document.getElementById("exam-form").addEventListener("submit",e=>{e.preventDefault();saveBuilder("published");});
  document.getElementById("save-draft").addEventListener("click",()=>saveBuilder("draft"));
  document.getElementById("explore-search").addEventListener("input",renderExplore);
  document.getElementById("explore-subject").addEventListener("change",renderExplore);
  document.getElementById("explore-difficulty").addEventListener("change",renderExplore);
  document.getElementById("my-exam-tabs").addEventListener("click",e=>{const b=e.target.closest("button[data-filter]");if(!b)return;myFilter=b.dataset.filter;document.querySelectorAll("#my-exam-tabs button").forEach(x=>x.classList.toggle("selected",x===b));renderMyExams();});
  document.getElementById("exit-exam").addEventListener("click",confirmLeave);
  document.getElementById("clear-answers").addEventListener("click",()=>{activeAnswers={};renderTaking();toast("Responses cleared.");});
  document.getElementById("submit-attempt").addEventListener("click",submitAttempt);
  document.getElementById("result-back").addEventListener("click",()=>showPage("explore"));
  document.getElementById("retake-exam").addEventListener("click",()=>{const id=state.attempts.find(a=>a.id===latestAttemptId)?.examId;if(id)startExam(id);});
  document.getElementById("confirm-cancel").addEventListener("click",closeConfirm);
  document.getElementById("confirm-accept").addEventListener("click",()=>{const fn=pendingConfirm;closeConfirm();if(fn)fn();});
  document.getElementById("confirm-modal").addEventListener("click",e=>{if(e.target.id==="confirm-modal")closeConfirm();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeConfirm();document.getElementById("sidebar").classList.remove("open");}});
}

function init(){
  wireEvents();persist();renderOverview();renderExplore();renderMyExams();
}
document.addEventListener("DOMContentLoaded",init);
