// A synthetic text PDF for exercising the real reader without personal information.
export function makePdf(lines=[]) {
  const escape=s=>s.replace(/[\\()]/g,'\\$&');
  const stream='BT /F1 12 Tf 50 760 Td 18 TL\n'+lines.map((line,i)=>(i?'T* ':'')+'('+escape(line)+') Tj').join('\n')+'\nET';
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  ];
  let pdf='%PDF-1.4\n';const offsets=[0];
  for(let i=0;i<objects.length;i++){offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
  const start=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(const offset of offsets.slice(1))pdf+=`${String(offset).padStart(10,'0')} 00000 n \n`;
  pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return pdf;
}

export const sampleResumeLines=['Jamie Example','Data Analyst','jamie@example.test','+91 9000000000','Skills: SQL, Python','Work Experience','Data Analyst at Example Co, 2022-2025','Education','BSc, Example University','Projects','Revenue analytics dashboard'];
