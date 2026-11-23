/* STEROID — panneaux de dialogue intégrés à l'app (remplacent prompt/confirm du navigateur).
 * open({title, message, fields, actions}) → Promise<{action, values}> ou null si annulé.
 * fields : [{name, label, value, type:'text'|'number'|'select', options:[valeur|{value,label}]}]
 * actions : [{value, label, primary, danger}] ; « Annuler » et Échap renvoient null. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SteroidDialog=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function el(tag,props={},children=[]){const node=document.createElement(tag);for(const [k,v] of Object.entries(props)){if(k==='text')node.textContent=v;else if(v!==undefined&&v!==null&&v!==false)node.setAttribute(k,v===true?'':String(v))}for(const c of children)node.append(c);return node}

  function open({title,message='',fields=[],actions=[{value:'ok',label:'Valider',primary:true}],cancelLabel='Annuler'}={}){
    return new Promise(resolve=>{
      const form=el('form',{method:'dialog',class:'steroid-dialog-form'});
      const dialog=el('dialog',{class:'steroid-dialog','aria-labelledby':'steroid-dialog-title'},[form]);
      form.append(el('h2',{id:'steroid-dialog-title',text:title||''}));
      if(message)form.append(el('p',{class:'steroid-dialog-message',text:message}));
      fields.forEach((f,i)=>{
        const id='steroid-dialog-field-'+i;let input;
        if(f.type==='select'){
          input=el('select',{id,name:f.name,class:'select'});
          for(const o of f.options||[]){const value=typeof o==='object'?o.value:o,label=typeof o==='object'?o.label:o;const opt=el('option',{value,text:String(label)});if(String(value)===String(f.value??''))opt.selected=true;input.append(opt)}
        }else input=el('input',{id,name:f.name,type:'text',inputmode:f.type==='number'?'numeric':undefined,value:f.value??'',maxlength:f.maxlength||100,autocomplete:'off'});
        form.append(el('label',{for:id,text:f.label}),input);
      });
      const buttons=el('div',{class:'steroid-dialog-actions'});
      for(const a of actions)buttons.append(el('button',{type:'submit',value:a.value,class:a.primary?'primary':a.danger?'danger':'secondary',text:a.label}));
      buttons.append(el('button',{type:'button',class:'secondary','data-cancel':true,text:cancelLabel}));
      form.append(buttons);
      let done=false;const opened=Date.now();
      const finish=result=>{if(done)return;done=true;try{dialog.close()}catch{}dialog.remove();resolve(result)};
      form.addEventListener('submit',e=>{e.preventDefault();if(Date.now()-opened<350)return;const values={};for(const f of fields)values[f.name]=String(form.elements[f.name].value);finish({action:e.submitter?.value||actions[0].value,values})});
      buttons.querySelector('[data-cancel]').addEventListener('click',()=>{if(Date.now()-opened>=350)finish(null)});
      dialog.addEventListener('cancel',e=>{e.preventDefault();finish(null)});
      document.body.append(dialog);
      if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
      (form.querySelector('input,select')||form.querySelector('button[type="submit"]'))?.focus();
    });
  }

  async function confirm(message,{title='Confirmer',ok='Confirmer',cancel='Annuler',danger=false}={}){
    const r=await open({title,message,actions:[{value:'ok',label:ok,primary:!danger,danger}],cancelLabel:cancel});
    return r?.action==='ok';
  }

  async function yesNo(message,{title='Bilan du cycle'}={}){
    const r=await open({title,message,actions:[{value:'yes',label:'Oui',primary:true},{value:'no',label:'Non'}]});
    return r?r.action==='yes':null;
  }

  async function ask(message,field={},{title='Modifier',ok='Valider'}={}){
    const r=await open({title,fields:[{name:'value',label:message,...field}],actions:[{value:'ok',label:ok,primary:true}]});
    return r?r.values.value:null;
  }

  const range=(from,to,step=1)=>{const out=[];for(let n=from;n<=to;n+=step)out.push(n);return out};

  return {open,confirm,yesNo,ask,range};
});
