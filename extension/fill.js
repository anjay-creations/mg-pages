// Runs only in the active tab after the user invokes the extension.
function fillApplication(profile,automatic){
 const aliases={firstName:['given name','given names','first name','firstname'],lastName:['family name','last name','surname','lastname'],localFirstName:['local given name','local given names'],localLastName:['local family name'],country:['country','country region'],address:['address line 1','street address','address1'],city:['city','town'],postalCode:['postal code','zip code','postcode'],state:['state','province'],email:['email','email address'],phoneType:['phone device type','phone type'],phoneCode:['country phone code','phone country code','dial code'],phone:['phone number','mobile number','telephone'],extension:['phone extension'],source:['how did you hear about us','source']};
 const norm=s=>s.toLowerCase().replace(/[()]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
 window.__gyaanObserver?.disconnect();
 clearTimeout(window.__gyaanTimer);
 let filled=0,unknown=0;
 function fill(){document.querySelectorAll('input,select,textarea').forEach(el=>{
  if(el.disabled||el.readOnly||!el.getClientRects().length||['hidden','checkbox','radio','file','password','submit','button'].includes(el.type)||el.value)return;
  const labels=[...(el.labels||[])].map(l=>l.textContent);
  const labelled=(el.getAttribute('aria-labelledby')||'').split(' ').map(id=>document.getElementById(id)?.textContent||'').join(' ');
  const names=[...labels,el.getAttribute('aria-label')||'',labelled,el.name,el.id].map(norm);
  const key=Object.keys(aliases).find(k=>aliases[k].some(a=>names.includes(a)));
  if(!key||!profile[key]){unknown++;return;}
  let value=profile[key];
  if(el.tagName==='SELECT'){
   const option=[...el.options].find(o=>!o.disabled&&(norm(o.textContent)===norm(value)||norm(o.value)===norm(value)));
   if(!option){unknown++;return;}value=option.value;
  }
  const proto=el.tagName==='SELECT'?HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);
  el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));filled++;
 });}
 fill();
 if(automatic){window.__gyaanObserver=new MutationObserver(()=>{clearTimeout(window.__gyaanTimer);window.__gyaanTimer=setTimeout(fill,150);});window.__gyaanObserver.observe(document.body,{childList:true,subtree:true});}
 return {filled,unknown};
}
