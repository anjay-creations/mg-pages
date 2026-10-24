import {terms} from './career-core.mjs';

export const resumeFields = [
  {key:'fullName', label:'Full name', question:'What is your full name?'},
  {key:'email', label:'Email address', question:'Which email should employers use?', type:'email'},
  {key:'phone', label:'Phone number', question:'What phone number should employers use?', optional:true},
  {key:'location', label:'Current city / country', question:'Where are you currently based?', optional:true},
  {key:'professionalTitle', label:'Professional title', question:'What role best describes your work?', optional:true},
  {key:'skills', label:'Skills', question:'Which skills should we use to match jobs?', multiline:true},
  {key:'experience', label:'Work experience', question:'What work experience should we include?', multiline:true, optional:true, skipLabel:'No professional experience yet / not applicable'},
  {key:'education', label:'Education', question:'What education or training should we include?', multiline:true, optional:true}
];

const headings = {
  skills:/^(?:(?:technical|core|key|professional)\s+)?skills$|^competencies$|^expertise$/i,
  experience:/^(?:(?:professional|work|relevant)\s+)?experience$|^employment(?: history)?$|^career history$/i,
  education:/^education(?: and training)?$|^academic(?: background| qualifications)?$|^qualifications$/i,
  summary:/^(?:(?:professional|career)\s+)?summary$|^profile$|^objective$/i,
  projects:/^(?:key |personal |academic )?projects$/i,
  certifications:/^certifications?$|^certificates$|^training$/i,
  other:/^languages$|^interests$|^awards$|^achievements$|^references$|^publications$/i
};

function heading(line) {
  const [name, ...rest] = line.split(':');
  const key = Object.keys(headings).find(key => headings[key].test(name.trim()));
  return key ? {key, inline:rest.join(':').trim()} : null;
}

export function parseResume(text) {
  const lines = text.split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const sections = {};
  let section = null;
  for (const line of lines) {
    const found = heading(line);
    if (found) { section=found.key; sections[section] ||= []; if(found.inline) sections[section].push(found.inline); }
    else if(section) sections[section].push(line);
  }
  const email = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] || '';
  const phone = (text.match(/\+?\d[\d ().-]{7,}\d/g)||[]).find(s=>{const n=s.replace(/\D/g,'').length;return n>=10&&n<=15;})||'';
  const isRole = line => /\b(engineer|analyst|manager|developer|designer|consultant|specialist|scientist|architect|student|intern|director|lead|teacher|accountant|nurse)\b/i.test(line);
  const header = lines.slice(0, Math.min(10, lines.findIndex(l=>heading(l)) < 0 ? 10 : lines.findIndex(l=>heading(l))));
  const labelledName = lines.find(l=>/^name\s*:/i.test(l))?.replace(/^name\s*:\s*/i,'') || '';
  const fullName = labelledName || header.find(l=>l.length<65 && /^[\p{L}][\p{L}\p{M} .'’-]+$/u.test(l) && l.split(/\s+/).length>=2 && l.split(/\s+/).length<=5 && !isRole(l) && !/resume|curriculum vitae|contact|address|portfolio/i.test(l)) || '';
  const professionalTitle = header.find(l=>l!==fullName && isRole(l) && l.length<100 && !l.includes('@')) || '';
  const location = lines.find(l=>/^(?:location|based in|city)\s*:/i.test(l))?.replace(/^[^:]+:\s*/,'') ||
    header.find(l=>/^[\p{L}\p{M} .'’-]+,\s*(?:India|United States|USA|United Kingdom|UK|Canada|Australia|Singapore|Germany|France)$/iu.test(l)) || '';
  const data = {fullName,email,phone,location,professionalTitle};
  for (const key of ['skills','experience','education','summary','projects','certifications']) data[key]=(sections[key]||[]).join('\n');
  if(!data.skills) data.skills=terms(text).join(', ');
  data.linkedin = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[^\s|]+/i)?.[0] || '';
  return data;
}

export function missingFields(data={}, skipped={}) {
  return resumeFields.filter(f=>!String(data[f.key]||'').trim() && !(f.optional && skipped[f.key]));
}

export function reviewedResumeText(data) {
  // Matching uses reviewed fields rather than reintroducing corrected facts from raw extraction.
  return [...resumeFields, {key:'summary',label:'Summary'}, {key:'projects',label:'Projects'},
    {key:'certifications',label:'Certifications'}, {key:'linkedin',label:'LinkedIn'}]
    .filter(f=>String(data[f.key]||'').trim()).map(f=>`${f.label}\n${data[f.key].trim()}`).join('\n\n');
}

export function textFromItems(items) {
  let text='', previousY=null;
  for(const item of items) {
    if(typeof item.str !== 'string') continue;
    const y=item.transform?.[5];
    if(previousY!==null && Number.isFinite(y) && Math.abs(y-previousY)>3 && !text.endsWith('\n'))text+='\n';
    text+=item.str;
    text+=item.hasEOL?'\n':' ';
    if(Number.isFinite(y))previousY=y;
  }
  return text.replace(/[ \t]+\n/g,'\n').trim();
}

export function validatePdf(file, bytes) {
  if(!file || !/\.pdf$/i.test(file.name))throw Error('Please choose a PDF resume (.pdf).');
  if(file.size>10*1024*1024)throw Error('This PDF is larger than 10 MB. Please choose a smaller file.');
  if(file.size===0)throw Error('This PDF is empty. Please choose another file.');
  if(bytes && !new TextDecoder('latin1').decode(bytes.slice(0,1024)).includes('%PDF-'))throw Error('This file is not a valid PDF. Please choose an exported PDF resume.');
}
