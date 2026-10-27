import test from 'node:test';
import assert from 'node:assert/strict';
import { managerContext, managerOutput, managerText } from '../apps/console/lib/manager-contract.ts';
import { generateDocument } from '../services/orchestrator/provider.ts';
import { managerSchema } from '../apps/console/lib/manager-contract.ts';
test('manager context keeps whole recent messages under a budget without changing the transcript',()=>{
  const messages=[{role:'user',content:'a'.repeat(6000)},{role:'assistant',content:'b'.repeat(4000)},{role:'user',content:'latest'}];
  const selected=managerContext(messages); assert.deepEqual(selected,messages.slice(1)); assert.equal(messages.length,3);
  assert.equal(managerText(' decision ',4000),'decision'); assert.throws(()=>managerText('',4000)); assert.throws(()=>managerText('x'.repeat(4001),4000));
  assert.throws(()=>managerOutput.parse({reply:'ok',summary:'',brief:'',approved:true}));
});
test('manager uses the existing structured adapters without provider-owned conversation state',async()=>{
  const originalFetch=globalThis.fetch; const originalKey=process.env.OPENAI_API_KEY; const originalModels=process.env.OPENAI_MODELS;
  process.env.OPENAI_API_KEY='synthetic';process.env.OPENAI_MODELS='synthetic';
  const content={reply:'What should the MVP include?',summary:'Owner has not yet selected the scope.',brief:''};
  try {
    globalThis.fetch=async (_url,options)=>{ const body=JSON.parse(options.body); assert.equal(body.store,false);assert.match(body.input,/confirmedMemory/); assert.equal(body.text.format.name,'manager_response');
      return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(content)}]}],usage:{input_tokens:8,output_tokens:16}}); };
    const result=await generateDocument({schema:managerSchema,instructions:'Do not approve.',parse:v=>managerOutput.parse(v),name:'manager_response'},{provider:'openai',model:'synthetic',input:{confirmedMemory:'No payments in MVP.'},max_output_tokens:512},new AbortController().signal);
    assert.deepEqual(result.content,content);
  } finally {globalThis.fetch=originalFetch; for(const [key,value] of [['OPENAI_API_KEY',originalKey],['OPENAI_MODELS',originalModels]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
