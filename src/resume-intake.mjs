import {resumeFields, parseResume, missingFields, reviewedResumeText, textFromItems, validatePdf} from './resume-intake-core.mjs';

const KEY='career-resume-intake';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}};
let intake=read(KEY,{version:1,stage:'upload',data:{},skipped:{}});
if(intake.version!==1 || !intake.data || !intake.skipped)intake={version:1,stage:'upload',data:{},skipped:{}};
let busy=false, error='', progress='', generation=0;

export function resumeReady(){return intake.stage==='complete' && !!intake.fileName && missingFields(intake.data,intake.skipped).length===0;}
export function resumeText(){return resumeReady()?reviewedResumeText(intake.data):'';}
export function resumeName(){return intake.fileName||'Your PDF resume';}
export function resumeData(){return resumeReady()?{...intake.data}:{};}
export function resumeSkipped(){return resumeReady()?{...intake.skipped}:{};}
function persist(){localStorage.setItem(KEY,JSON.stringify(intake));}

export function mountResumeIntake(complete, back) {
  const root=document.querySelector('#app');
  root.classList.add('onboarding-layout');
  root.innerHTML=`<main class="intake-shell"><header class="intake-header"><div class="brand"><div class="brand-mark" aria-hidden="true">✦</div><strong>AI Gyaan</strong></div><div class="download-row">${back&&resumeReady()?'<button class="ghost-btn" id="intakeBack">Back to jobs</button>':''}<button class="ghost-btn" id="themeToggle" type="button">Toggle light / dark</button></div></header>${renderResumeIntake()}</main>`;
  document.querySelector('#themeToggle').onclick=()=>{
    const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
    document.documentElement.dataset.theme=theme;
    try{localStorage.setItem('career-theme',theme);}catch{}
  };
  document.querySelector('#intakeBack')?.addEventListener('click',back);
  bindResumeIntake(()=>mountResumeIntake(complete,back),complete);
}

export async function extractPdf(file, onProgress=()=>{}) {
  validatePdf(file);
  const bytes=new Uint8Array(await file.arrayBuffer());
  validatePdf(file,bytes);
  const pdfjs=await import('./vendor/pdfjs/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;
  const task=pdfjs.getDocument({data:bytes,isEvalSupported:false,
    cMapUrl:new URL('./vendor/pdfjs/cmaps/',import.meta.url).href,cMapPacked:true,
    standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',import.meta.url).href,
    wasmUrl:new URL('./vendor/pdfjs/wasm/',import.meta.url).href});
  try {
    const pdf=await task.promise;
    if(pdf.numPages>30)throw Error('Please upload a resume of 30 pages or fewer.');
    const pages=[];
    for(let number=1;number<=pdf.numPages;number++) {
      onProgress(`Reading page ${number} of ${pdf.numPages}…`);
      const page=await pdf.getPage(number);
      const text=textFromItems((await page.getTextContent()).items);
      if(text.replace(/\s/g,'').length<20)throw Error(`Page ${number} has too little readable text. Scanned or image-only pages need OCR first. Export a text-based PDF and try again.`);
      pages.push(text);page.cleanup();
    }
    return pages.join('\n\n');
  } catch(error) {
    if(error.name==='PasswordException')throw Error('This PDF is password-protected. Upload an unlocked copy.');
    if(error.name==='InvalidPDFException')throw Error('This PDF could not be read. Export it again and retry.');
    throw error;
  } finally {await task.destroy();}
}

function fieldMarkup(field, missing=false) {
  const value=intake.data[field.key]||'';
  const skipped=intake.skipped[field.key];
  return `<div class="intake-field"><label>${esc(missing?field.question:field.label)}${field.multiline?`<textarea name="${field.key}" ${skipped?'disabled':''}>${esc(value)}</textarea>`:`<input name="${field.key}" type="${field.type||'text'}" value="${esc(value)}" ${skipped?'disabled':''}>`}</label>${field.optional?`<label class="confirm-row"><input type="checkbox" data-skip="${field.key}" ${skipped?'checked':''}>${esc(field.skipLabel||'Leave this out for now')}</label>`:''}</div>`;
}

export function renderResumeIntake() {
  const hasData=!!intake.fileName;
  const gaps=missingFields(intake.data,intake.skipped);
  const gapKeys=new Set(gaps.map(f=>f.key));
  return `<section class="pdf-intake"><p class="eyebrow">Your career starts with your story</p><h1>${hasData?'Let’s check your resume.':'First, add your resume.'}</h1><p>${hasData?'Review the extracted information and fill in anything we couldn’t find.':'Upload your PDF. We’ll extract your details, then ask only for what’s missing.'}</p><ol class="intake-steps"><li class="${!hasData?'active':''}">1. Upload PDF</li><li class="${hasData?'active':''}">2. Review & complete</li><li>3. Find matching jobs</li></ol><section class="resume-section"><label class="pdf-upload">${hasData?'Replace PDF resume':'Choose your PDF resume'}<input id="intakePdf" type="file" accept="application/pdf,.pdf" ${busy?'disabled':''}><span>PDF only · up to 10 MB · text-based PDF</span></label>${hasData?`<p>Uploaded: <strong>${esc(intake.fileName)}</strong></p>`:''}<p>Processed on this device. The PDF is not uploaded; reviewed details are saved in this browser.</p><p id="intakeProgress" role="status" aria-live="polite">${esc(progress)}</p><p id="intakeError" role="alert">${esc(error)}</p></section>${hasData&&!busy?`<form id="intakeReview" class="resume-section"><div><h2>${gaps.length?`${gaps.length} detail${gaps.length===1?'':'s'} need your input`:'Your details are ready to review'}</h2><p>${gaps.length?'We couldn’t confidently extract these details. Add them below, or explicitly leave optional items out.':'Please check the extracted information before continuing.'}</p></div><div class="resume-field-grid">${gaps.map(f=>fieldMarkup(f,true)).join('')}</div><details class="extracted-details" open><summary>Review extracted details</summary><div class="resume-field-grid">${resumeFields.filter(f=>!gapKeys.has(f.key)).map(f=>fieldMarkup(f)).join('')}</div>${['summary','projects','certifications','linkedin'].filter(key=>intake.data[key]).map(key=>`<label>${key.charAt(0).toUpperCase()+key.slice(1)}<textarea name="${key}">${esc(intake.data[key])}</textarea></label>`).join('')}</details><details><summary>View the original extracted text</summary><pre class="extracted-text">${esc(intake.rawText)}</pre></details><label class="confirm-row"><input id="intakeConfirmed" type="checkbox" required>I have reviewed the details and corrected any extraction errors.</label><button class="primary-btn" type="submit">Save resume & find matching jobs →</button><button class="ghost-btn" type="button" id="clearIntake">Remove this resume</button></form>`:''}</section>`;
}

function syncForm(form) {
  for(const field of [...resumeFields,{key:'summary'},{key:'projects'},{key:'certifications'},{key:'linkedin'}]) {
    const input=form.elements[field.key];
    if(input)intake.data[field.key]=input.disabled?'':input.value.trim();
  }
  form.querySelectorAll('[data-skip]').forEach(input=>{intake.skipped[input.dataset.skip]=input.checked;});
}

export function bindResumeIntake(rerender, complete) {
  document.querySelector('#intakePdf')?.addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    const token=++generation;busy=true;error='';progress='Opening your PDF…';rerender();
    try {
      const rawText=await extractPdf(file,message=>{if(token!==generation)return;progress=message;const el=document.querySelector('#intakeProgress');if(el)el.textContent=message;});
      if(token!==generation)return;
      intake={version:1,stage:'review',fileName:file.name,rawText,data:parseResume(rawText),skipped:{}};
      persist();progress='Extraction complete. Please review your details.';
    } catch(exc) {error=exc.message||'We could not read that PDF. Please try another file.';progress='';}
    finally {if(token===generation){busy=false;rerender();}}
  });
  const form=document.querySelector('#intakeReview');
  form?.addEventListener('input',()=>{syncForm(form);intake.stage='review';try{persist();}catch{document.querySelector('#intakeError').textContent='Browser storage is full. Free some space before saving your resume.';}});
  form?.querySelectorAll('[data-skip]').forEach(input=>input.addEventListener('change',()=>{
    form.elements[input.dataset.skip].disabled=input.checked;
    syncForm(form);persist();
  }));
  form?.addEventListener('submit',event=>{
    event.preventDefault();syncForm(form);
    const gaps=missingFields(intake.data,intake.skipped);
    if(gaps.length){error='Please complete the missing details or leave optional items out.';persist();rerender();document.querySelector(`[name="${gaps[0].key}"]`)?.focus();return;}
    if(!document.querySelector('#intakeConfirmed').checked)return;
    try {
      const sourceText=reviewedResumeText(intake.data);
      const search=read('career-search',{});search.resume=sourceText;
      localStorage.setItem('career-search',JSON.stringify(search));
      const builder=read('aigyaan-resume-builder',{});
      localStorage.setItem('aigyaan-resume-builder',JSON.stringify({...builder,sourceText,data:{...intake.data},confirmed:false,step:1}));
      const profile=read('career-profile',{});
      if(intake.data.email)profile.email=intake.data.email;
      if(intake.data.phone)profile.phone=intake.data.phone;
      // Names are deliberately not split into assumed given/family components.
      localStorage.setItem('career-profile',JSON.stringify(profile));
      intake.stage='complete';persist();error='';complete();
    }catch{intake.stage='review';error='Your browser could not save these details. Free some storage and try again.';rerender();}
  });
  document.querySelector('#clearIntake')?.addEventListener('click',()=>{
    const profile=read('career-profile',{});
    for(const key of ['email','phone'])if(profile[key]===intake.data[key])delete profile[key];
    localStorage.setItem('career-profile',JSON.stringify(profile));
    intake={version:1,stage:'upload',data:{},skipped:{}};localStorage.removeItem(KEY);
    const search=read('career-search',{});delete search.resume;localStorage.setItem('career-search',JSON.stringify(search));
    localStorage.removeItem('aigyaan-resume-builder');error='';progress='';rerender();
  });
}
