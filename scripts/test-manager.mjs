import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { spawnSync } from 'node:child_process';
assert.equal(process.env.GHOSTSHIFT_TEST_FIXTURE,'1','Use only the disposable synthetic provider stack.');
const base=process.env.GHOSTSHIFT_URL||'http://127.0.0.1:3000';
async function json(path,data){const r=await fetch(base+path,data?{method:'POST',headers:{'Content-Type':'application/json',Connection:'close'},body:JSON.stringify(data)}:{headers:{Connection:'close'}});return {status:r.status,body:await r.json()};}
async function create(title){const r=await json('/api/manager',{title});assert.equal(r.status,201);return r.body.conversation.id;}
async function detail(id){const r=await json(`/api/manager/${id}`);assert.equal(r.status,200);return r.body.conversation;}
async function act(id,data,status=200){const c=await detail(id);const r=await json(`/api/manager/${id}`,{revision:c.revision,briefId:c.briefs[0]?.id,...data});assert.equal(r.status,status,JSON.stringify(r.body));return r;}
async function wait(id,predicate){for(let i=0;i<180;i++){const c=await detail(id);if(predicate(c))return c;await delay(500);}throw new Error('Manager timeout');}
const model={provider:'ollama',model:'qwen3:4b'};
console.log('Checking manager memory, review, concurrent requests and handoff…');
const id=await create(`Manager lifecycle ${Date.now()}`);
await act(id,{action:'brief',...model},400);
await act(id,{action:'memory',memory:'No payments in MVP. Owner confirmed.'});
let c=await detail(id);const old=c.revision;
const duplicates=await Promise.all([1,2].map(()=>json(`/api/manager/${id}`,{revision:old,action:'chat',message:'I want a small task tracker.',...model})));
assert.deepEqual(duplicates.map(r=>r.status).sort(),[200,409]);
c=await wait(id,c=>c.jobs[0]?.status==='succeeded');assert.equal(c.messages.length,2);assert.match(c.messages[1].content,/No payments/);assert.equal(c.memory,'No payments in MVP. Owner confirmed.');assert.ok(c.summary);assert.equal(c.jobs[0].input_tokens,100);
await act(id,{action:'chat',message:'x',provider:'compatible',model:'x'},400);
// Configure a synthetic key only to verify paid requests are refused before queueing. Never allowPaid.
const r=await json('/api/configuration/openai',{action:'save',apiKey:'sk-synthetic-manager-test'});
assert.equal(r.status,200,JSON.stringify(r.body));
await act(id,{action:'chat',message:'Do not bill.',provider:'openai',model:'gpt-5-mini'},400);
await json('/api/configuration/openai',{action:'remove'});
assert.equal((await detail(id)).messages.length,2);
await act(id,{action:'brief',...model});c=await wait(id,c=>c.briefs.length===1);assert.equal(c.briefs[0].source,'ai');assert.equal(c.project_id,null);
const first=c.briefs[0];await act(id,{action:'save_brief',content:first.content+' Owner edit: no analytics.'});
c=await detail(id);assert.equal(c.briefs[0].version,2);assert.equal(c.briefs[0].source,'human');
await act(id,{action:'approve',briefId:first.id},409);
await act(id,{action:'approve'});c=await detail(id);assert.ok(c.project_id);assert.ok(c.briefs[0].approved_at);
const project=await json(`/api/projects/${c.project_id}`);assert.equal(project.body.project.status,'draft');assert.equal(project.body.project.jobs.length,0);assert.match(project.body.project.brief,/Owner edit/);
await act(id,{action:'approve'},409);await act(id,{action:'brief',...model},409);
const other=await create('Separate client');await act(other,{action:'chat',message:'Unrelated idea.',...model});const separate=await wait(other,c=>c.jobs[0]?.status==='succeeded');assert.doesNotMatch(separate.messages[1].content,/No payments/);
const cross=await fetch(`${base}/api/manager/${id}`,{method:'POST',headers:{'Content-Type':'application/json',Connection:'close',Origin:'https://example.org'},body:'{}'});assert.equal(cross.status,403);
console.log('Checking manager cancellation, invalid output and retries…');
const slow=await create('Cancel slow manager');await act(slow,{action:'chat',message:'[slow]',...model});await wait(slow,c=>c.jobs[0]?.status==='running');await act(slow,{action:'cancel'});await delay(26000);c=await detail(slow);assert.equal(c.jobs[0].status,'cancelled');assert.equal(c.messages.length,1);assert.equal(c.summary,'');
const retry=await create('Retry manager');await act(retry,{action:'chat',message:'[fail-once]',...model});c=await wait(retry,c=>c.jobs[0]?.status==='succeeded');assert.equal(c.jobs[0].attempts,2);assert.equal(c.messages.length,2);
const invalid=await create('Invalid manager');await act(invalid,{action:'chat',message:'[invalid]',...model});c=await wait(invalid,c=>c.jobs[0]?.status==='failed');assert.equal(c.messages.length,1);assert.equal(c.briefs.length,0);
if(process.env.TEST_COMPOSE_PROJECT){
  const name=process.env.TEST_COMPOSE_PROJECT;assert.ok(['ghostshift-ci','ghostshift-workflow-test'].includes(name));
  function compose(args,input){const r=spawnSync('docker',['compose','-f','compose.yaml','-f','compose.test.yaml','-p',name,...args],{input,encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
  const recovery=await create('Recover manager');await act(recovery,{action:'chat',message:'[slow] recover',...model});await wait(recovery,c=>c.jobs[0]?.status==='running');
  compose(['kill','-s','SIGKILL','worker']);compose(['exec','-T','database','psql','-U','ghostshift','-d','ghostshift','-v','ON_ERROR_STOP=1'],`UPDATE manager_jobs SET lease_until=now()-interval '1 second' WHERE conversation_id='${recovery}' AND status='running';`);compose(['up','-d','--no-deps','worker']);
  c=await wait(recovery,c=>c.jobs[0]?.status==='succeeded');assert.equal(c.jobs[0].attempts,2);assert.equal(c.messages.length,2);
  const before=await detail(id);
  compose(['down']);compose(['up','-d','--wait']);
  const after=await detail(id);
  for(const key of ['id','memory','summary','project_id','messages','briefs'])assert.deepEqual(after[key],before[key],`Restart changed ${key}`);
  assert.equal((await json(`/api/projects/${after.project_id}`)).status,200);
}
const page=await fetch(base+`/manager/${id}`,{headers:{Connection:'close'}});assert.equal(page.status,200);assert.match(await page.text(),/Brief approved/);
console.log(`Manager passed. Persistence fixture conversation: ${id}; project: ${(await detail(id)).project_id}`);
