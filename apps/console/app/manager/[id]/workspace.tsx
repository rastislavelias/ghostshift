'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ModelOption } from '@/lib/providers';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
type Conversation = { id:string; revision:number; memory:string; summary:string; project_id:string|null;
  messages:Array<{id:string;role:string;content:string;provider:string|null;model:string|null}>;
  briefs:Array<{id:string;version:number;content:string;source:string;approved_at:string|null}>;
  jobs:Array<{id:string;kind:string;status:string;provider:string;model:string;attempts:number;max_attempts:number;input_tokens:number|null;output_tokens:number|null;error:string|null}>;
};
export function ManagerWorkspace({conversation:c,models}:{conversation:Conversation;models:ModelOption[]}) {
  const router=useRouter(); const latest=c.briefs[0]; const active=c.jobs.find(j=>['queued','running'].includes(j.status));
  const previous=models.findIndex(m=>m.provider===c.jobs[0]?.provider&&m.model===c.jobs[0]?.model);
  const [modelIndex,setModelIndex]=useState(previous<0?0:previous); const selected=models[modelIndex];
  const [message,setMessage]=useState(''); const [memory,setMemory]=useState(c.memory); const [content,setContent]=useState(latest?.content||'');
  const [paid,setPaid]=useState(false); const [pending,setPending]=useState(false); const [error,setError]=useState('');
  const messageList=useRef<HTMLOListElement>(null);
  useEffect(()=>{if(messageList.current)messageList.current.scrollTop=messageList.current.scrollHeight;},[c.messages.at(-1)?.id]);
  const [viewed,setViewed]=useState(latest?.id); const brief=c.briefs.find(b=>b.id===viewed)||latest;
  useEffect(()=>{setMemory(c.memory);},[c.memory]);
  useEffect(()=>{setContent(latest?.content||'');setViewed(latest?.id);},[latest?.id,latest?.content]);
  useEffect(()=>{ if (!active) return; const timer=setInterval(()=>router.refresh(),2000); return ()=>clearInterval(timer); },[active?.id,router]);
  async function act(action:string) {
    setPending(true);setError('');
    try { const r=await fetch(`/api/manager/${c.id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,revision:c.revision,message,memory,content,briefId:latest?.id,provider:selected?.provider,model:selected?.model,allowPaid:paid})});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'Request failed.');setPaid(false);if(action==='chat')setMessage('');router.refresh();
    } catch(e){setError(e instanceof Error?e.message:'Connection failed.');} finally{setPending(false);}
  }
  const blocked=pending||!!active; const canGenerate=!blocked&&!!selected&&(!selected.paid||paid)&&memory===c.memory&&(!latest||content===latest.content);
  return <div className="space-y-6">
    {c.project_id&&<p role="status" className="rounded-lg border p-4 text-sm">Brief approved. <Link className="text-primary underline" href={`/projects/${c.project_id}`}>Open project and prepare its plan</Link>. Approval did not start AI work or development.</p>}
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="grid items-start gap-6 xl:grid-cols-[1.3fr_1fr]">
      <Card><CardHeader><CardTitle>Discussion</CardTitle></CardHeader><CardContent className="space-y-5">
        <div className="space-y-2"><Label htmlFor="manager-model">Manager model</Label><select id="manager-model" className="w-full rounded-md border border-input bg-background p-2 text-sm" value={modelIndex} disabled={blocked} onChange={e=>{setModelIndex(Number(e.target.value));setPaid(false);}}>{models.map((m,i)=><option key={`${m.provider}/${m.model}`} value={i}>{m.label}</option>)}</select><p className="text-xs text-muted-foreground">Changing models keeps this discussion and project memory. Configure OpenAI in <Link className="underline" href="/configuration">Configuration</Link>.</p></div>
        {selected?.paid&&<label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={paid} disabled={blocked} onChange={e=>setPaid(e.target.checked)}/>I allow the next request and its bounded retries to incur API charges and send this discussion’s context to the selected provider.</label>}
        <ol ref={messageList} aria-label="Conversation messages" className="max-h-[32rem] space-y-4 overflow-auto">{c.messages.map(m=><li key={m.id} className="rounded-lg border p-4"><p className="mb-2 text-xs font-medium text-muted-foreground">{m.role==='user'?'You':`Manager · ${m.provider} · ${m.model}`}</p><p className="text-sm leading-7 whitespace-pre-wrap wrap-anywhere">{m.content}</p></li>)}</ol>
        {!c.messages.length&&<p className="text-sm text-muted-foreground">Describe your idea, who it helps, and what you want to explore. You can paste relevant project notes; links and repositories are not fetched in this version.</p>}
        {active&&<div role="status" className="space-y-2 rounded-lg border p-3 text-sm"><p>{active.kind==='brief'?'Preparing brief':'Manager request'} · {active.status} · attempt {active.attempts}/{active.max_attempts}</p><Button variant="outline" disabled={pending} onClick={()=>act('cancel')}>Cancel request</Button></div>}
        <form className="space-y-3" onSubmit={e=>{e.preventDefault();void act('chat');}}><Label htmlFor="manager-message">Your message</Label><Textarea id="manager-message" rows={4} maxLength={4000} value={message} onChange={e=>setMessage(e.target.value)} disabled={blocked}/><Button disabled={!canGenerate||!message.trim()}>Send message</Button></form>
        {(memory!==c.memory||(latest&&content!==latest.content))&&<p className="text-sm text-muted-foreground">Save or discard memory and brief edits before sending a request.</p>}
        <details className="text-sm"><summary className="cursor-pointer">Recent requests and usage</summary><ul className="mt-3 space-y-3">{c.jobs.map(j=><li key={j.id} className="rounded border p-3">{j.kind} · {j.provider}/{j.model} · {j.status}<p className="text-xs text-muted-foreground">Attempts {j.attempts}/{j.max_attempts}. Successful attempt tokens: {j.input_tokens??'unknown'} input / {j.output_tokens??'unknown'} output.</p>{j.error&&<p className="text-destructive">{j.error}</p>}</li>)}</ul><p className="mt-2 text-xs text-muted-foreground">Usage for failed or interrupted attempts is unknown and may still be billed. Latest 100 messages are displayed; the full transcript stays in the database.</p></details>
      </CardContent></Card>
      <div className="space-y-6"><Card><CardHeader><CardTitle>Confirmed project memory</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Only you edit these facts and decisions. AI suggestions in the conversation are not automatically confirmed.</p><Label htmlFor="manager-memory">Goals, scope, constraints and decisions</Label><Textarea id="manager-memory" rows={7} maxLength={4000} value={memory} disabled={blocked} onChange={e=>setMemory(e.target.value)}/><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={blocked||memory===c.memory} onClick={()=>act('memory')}>Save memory</Button><Button variant="ghost" disabled={blocked||memory===c.memory} onClick={()=>setMemory(c.memory)}>Discard edits</Button></div><details className="text-sm"><summary className="cursor-pointer">AI conversation summary · unconfirmed</summary><p className="mt-3 whitespace-pre-wrap wrap-anywhere text-muted-foreground">{c.summary||'Appears after the first response. It may omit or misinterpret details; keep essential decisions in confirmed memory.'}</p></details></CardContent></Card>
      <Card><CardHeader><CardTitle>Project brief</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Prepare a draft from the discussion and saved memory. Review it before handing it to project planning.</p><Button variant="outline" disabled={!canGenerate||!c.messages.length||!!c.project_id} onClick={()=>act('brief')}>{latest?'Generate revised brief':'Prepare project brief'}</Button>
        {latest&&<><Label htmlFor="brief-version">Saved version</Label><select id="brief-version" className="w-full rounded-md border border-input bg-background p-2 text-sm" value={brief?.id} onChange={e=>setViewed(e.target.value)} disabled={blocked}>{c.briefs.map(b=><option key={b.id} value={b.id}>Version {b.version} · {b.source}{b.approved_at?' · approved':''}</option>)}</select>
        {brief?.id===latest.id&&!c.project_id?<><Label htmlFor="manager-brief">Review and edit latest brief</Label><Textarea id="manager-brief" rows={15} maxLength={10000} value={content} disabled={blocked} onChange={e=>setContent(e.target.value)}/><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={blocked||!content.trim()||content===latest.content} onClick={()=>act('save_brief')}>Save new version</Button><Button variant="ghost" disabled={blocked||content===latest.content} onClick={()=>setContent(latest.content)}>Discard edits</Button><Button disabled={blocked||content!==latest.content||memory!==c.memory} onClick={()=>act('approve')}>Approve brief and create project</Button></div><p className="text-xs text-muted-foreground">Approval applies to the saved version. Save edits first. The project’s plan will require separate review.</p></>:<p className="text-sm leading-7 whitespace-pre-wrap wrap-anywhere">{brief?.content}</p>}</>}
      </CardContent></Card></div>
    </div>
  </div>;
}
