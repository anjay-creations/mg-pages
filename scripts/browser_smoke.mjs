// Optional real-Chrome integration check. Requires a running local server and Chrome.
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const base=process.env.SITE_URL || 'http://127.0.0.1:5175';
const chromePath=process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile=await mkdtemp(join(tmpdir(),'gyaan-browser-'));
const browser=spawn(chromePath,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
let socket;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(fn,label){for(let i=0;i<100;i++){try{const result=await fn();if(result)return result;}catch{}await pause(100);}throw Error('Timed out: '+label);}
try {
  const port=await waitFor(async()=>Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'Chrome debugger');
  const tabs=await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let sequence=0;const pending=new Map();const errors=[];
  socket.onmessage=event=>{const data=JSON.parse(event.data);if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.text);if(data.id&&pending.has(data.id)){const {resolve,reject}=pending.get(data.id);pending.delete(data.id);data.error?reject(Error(data.error.message)):resolve(data.result);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
  await send('Runtime.enable');await send('Page.enable');
  await send('Page.navigate',{url:base});
  await waitFor(()=>evaluate(`document.querySelector('#careerStatus')?.textContent.includes('Latest successful')`),'jobs loaded');
  const initial=await evaluate(`({cards:document.querySelectorAll('#careerResults .job-card').length,health:document.querySelector('#pipelineHealth').textContent,status:document.querySelector('#careerStatus').textContent})`);
  assert.ok(initial.cards>0);assert.ok(initial.health.includes('Stripe'));
  await evaluate(`document.querySelector('[name=resume]').value='SQL Python analytics';document.querySelector('[name=query]').value='zzznomatchingrole';document.querySelector('#filterJobs').click()`);
  assert.equal(await evaluate(`document.querySelectorAll('#careerResults .job-card').length`),0);
  await evaluate(`document.querySelector('[name=query]').value='';document.querySelector('#filterJobs').click();document.querySelector('[data-save-job]').click()`);
  assert.equal(await evaluate(`document.querySelectorAll('#savedJobs .saved-job').length`),1);
  await evaluate(`document.querySelector('[data-application]').value='Applied';document.querySelector('[data-application]').dispatchEvent(new Event('change'))`);
  await send('Page.reload');
  await waitFor(()=>evaluate(`document.querySelector('#savedJobs [data-application]')?.value==='Applied'`),'persisted application history');
  await waitFor(()=>evaluate(`!!document.querySelector('[data-prepare]')`),'job cards after reload');
  await evaluate(`document.querySelector('[data-prepare]').click()`);
  assert.ok(await evaluate(`document.querySelector('#letterForm').elements.description.value.length>30`));
  await evaluate(`document.querySelector('#letterForm').requestSubmit()`);
  assert.ok(await evaluate(`document.querySelector('#letterDraft').value.includes('Dear Hiring Manager')`));
  await evaluate(`document.querySelector('#prepareCv').click()`);
  assert.ok(await evaluate(`document.querySelector('#rbJobDescription').value.length>30`));
  assert.equal(await evaluate(`document.querySelector('#rbSource').value`),'SQL Python analytics');
  const theme=await evaluate(`document.documentElement.dataset.theme`);
  await evaluate(`document.querySelector('#themeToggle').click()`);
  assert.notEqual(await evaluate(`document.documentElement.dataset.theme`),theme);
  await evaluate(`document.querySelector('[data-view=jobs]').click()`);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.ok(await evaluate(`document.documentElement.scrollWidth<=window.innerWidth+1`),'mobile page overflows');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  const screenshot=await send('Page.captureScreenshot',{format:'png'});
  await writeFile('/private/tmp/gyaan-jobs-dashboard.png',Buffer.from(screenshot.data,'base64'));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,...initial,screenshot:'/private/tmp/gyaan-jobs-dashboard.png'},null,2));
} finally {
  socket?.close();browser.kill();
  await pause(600);await rm(profile,{recursive:true,force:true});
}
