import test from 'node:test';
import assert from 'node:assert/strict';
import {parseResume,missingFields,reviewedResumeText,textFromItems,validatePdf} from '../src/resume-intake-core.mjs';

test('extracts labelled and sectioned resume details without inventing missing fields',()=>{
  const data=parseResume('Jamie Example\nData Analyst\njamie@example.test\n+91 9000000000\nSkills: SQL, Python\nWork Experience\nAnalyst at Example Co, 2022–2025\nEducation\nBSc, Example University\nProjects\nSales dashboard');
  assert.equal(data.fullName,'Jamie Example');assert.equal(data.email,'jamie@example.test');
  assert.equal(data.professionalTitle,'Data Analyst');assert.equal(data.phone,'+91 9000000000');
  assert.equal(data.skills,'SQL, Python');assert.equal(data.experience,'Analyst at Example Co, 2022–2025');
  assert.equal(data.education,'BSc, Example University');assert.equal(data.location,'');
  assert.deepEqual(missingFields(data).map(f=>f.key),['location']);
});
test('does not treat role headings or date ranges as a name or phone',()=>{
  const data=parseResume('Data Analyst\nProfessional Summary\nSQL analyst, 2019 - 2023');
  assert.equal(data.fullName,'');assert.equal(data.phone,'');
});
test('supports Unicode names and asks missing required details even if marked skipped',()=>{
  assert.equal(parseResume('Élodie Martin\nSkills: research').fullName,'Élodie Martin');
  assert.ok(missingFields({}, {fullName:true}).some(f=>f.key==='fullName'));
  assert.ok(!missingFields({}, {experience:true}).some(f=>f.key==='experience'));
});
test('matching text contains reviewed corrections and preserves other resume sections',()=>{
  const text=reviewedResumeText({fullName:'Correct Name',skills:'SQL',experience:'Verified role',projects:'Revenue dashboard'});
  assert.ok(text.includes('Correct Name'));assert.ok(text.includes('Revenue dashboard'));
  assert.ok(!text.includes('undefined'));
});
test('PDF text reconstructs lines from text items and position changes',()=>{
  assert.equal(textFromItems([{str:'Jamie',transform:[1,0,0,1,0,100]},{str:'Example',hasEOL:true,transform:[1,0,0,1,50,100]},{str:'SQL',transform:[1,0,0,1,0,80]},{str:'Python',transform:[1,0,0,1,0,60]}]),'Jamie Example\nSQL\nPython');
});
test('rejects renamed non-PDFs, unsupported types, oversized and empty files',()=>{
  const file={name:'resume.pdf',size:100};
  assert.doesNotThrow(()=>validatePdf(file,new TextEncoder().encode('%PDF-1.7')));
  assert.throws(()=>validatePdf({...file,name:'resume.txt'}),/PDF/);
  assert.throws(()=>validatePdf({...file,size:0}),/empty/);
  assert.throws(()=>validatePdf({...file,size:11*1024*1024}),/10 MB/);
  assert.throws(()=>validatePdf(file,new TextEncoder().encode('not a PDF')),/not a valid PDF/);
});
