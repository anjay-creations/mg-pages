export const fields = {firstName:'Given Name(s)',lastName:'Family Name',localFirstName:'Local Given Name(s)',localLastName:'Local Family Name',country:'Country',address:'Address Line 1',city:'City',postalCode:'Postal Code',state:'State',email:'Email Address',phoneType:'Phone Device Type',phoneCode:'Country Phone Code',phone:'Phone Number',extension:'Phone Extension',source:'How Did You Hear About Us?'};
export const skills = ['javascript','typescript','react','css','html','python','sql','excel','tableau','power bi','aws','azure','gcp','docker','kubernetes','java','agile','stakeholder','roadmap','analytics','communication','leadership','figma','research','testing','git','llm','rag','fastapi','nlp'];
export function terms(text){return skills.filter(s=>new RegExp('(^|[^a-z0-9])'+s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=$|[^a-z0-9])','i').test(text));}
export function match(resume,description){const required=terms(description), known=terms(resume);const matched=required.filter(s=>known.includes(s));return {score:required.length?Math.round(100*matched.length/required.length):null,matched,missing:required.filter(s=>!known.includes(s))};}
export function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';}}
export function normalizeJobs(rows) {
  if (!Array.isArray(rows)) throw Error('Expected a jobs array.');
  return rows.filter(j => j && typeof j === 'object').map(j => ({
    id: String(j.id || j.url || ''), title: String(j.title || ''),
    company: String(j.company || j.company_name || ''),
    location: String(j.location || j.candidate_required_location || ''),
    description: String(j.description || ''), url: safeUrl(j.url),
    postedAt: j.postedAt || j.publication_date || null,
    firstSeenAt: j.firstSeenAt || null, lastSeenAt: j.lastSeenAt || null,
    dateBasis: j.dateBasis || 'published', source: String(j.source || 'Imported'),
    sourceId: String(j.sourceId || ''), status: String(j.status || 'active')
  })).filter(j => {
    const date = Date.parse(j.postedAt || (j.dateBasis === 'first_seen' ? j.firstSeenAt : ''));
    return j.title && j.url && Number.isFinite(date) && date <= Date.now();
  });
}

export function filterJobs(jobs, {resume='', days=7, min=0, query='', location='', source='', includeUnknown=false}={}) {
  return jobs.map(j => ({...j, ...match(resume, j.description)})).filter(j => {
    const date = j.postedAt || (includeUnknown ? j.firstSeenAt : null);
    return date && j.status !== 'archived' && j.status !== 'unlisted' &&
      Date.now() - Date.parse(date) <= Math.min(Number(days), 30) * 86400000 &&
      (j.score === null ? Number(min) === 0 : j.score >= Number(min)) &&
      `${j.title} ${j.description}`.toLowerCase().includes(query.toLowerCase()) &&
      j.location.toLowerCase().includes(location.toLowerCase()) && (!source || j.sourceId === source);
  }).sort((a,b) => Date.parse(b.postedAt || b.firstSeenAt) - Date.parse(a.postedAt || a.firstSeenAt));
}
