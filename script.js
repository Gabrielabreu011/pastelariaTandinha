firebase.initializeApp({
  apiKey:"AIzaSyDFYXtlxVdmB_ISQyJdoHCid7W3wlq8vmk",
  authDomain:"tandinha-c5826.firebaseapp.com",
  projectId:"tandinha-c5826",
  storageBucket:"tandinha-c5826.firebasestorage.app",
  messagingSenderId:"467238347240",
  appId:"1:467238347240:web:4a3dd8774667ccf7ed045d"
});
var db = firebase.firestore();
var ST = function(){ return firebase.firestore.FieldValue.serverTimestamp(); };
var PIE = ['#5b8dee','#4caf72','#D4A843','#d06060','#a78bfa','#f97316','#22d3ee','#f472b6','#a3e635','#fbbf24'];

var C=[], V=[], M=[], ACR=[], IP=[], ACRS=[], editId=null, editIL=[];
var fmt = function(v){ return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); };
var hora = function(){ return new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); };

// RELÓGIO
setInterval(function(){ document.getElementById('clock').textContent = hora(); }, 1000);
document.getElementById('clock').textContent = hora();

// TOAST
function toast(msg, tipo){
  tipo = tipo||'success';
  var el = document.getElementById('toast');
  el.textContent = msg; el.className = 'toast '+tipo+' show';
  clearTimeout(el._t); el._t = setTimeout(function(){ el.classList.remove('show'); }, 3500);
}

// DB STATUS + SPLASH
function dbOk(ok){
  document.getElementById('dbTxt').textContent = ok ? 'Conectado' : 'Offline';
  document.getElementById('dbStatus').className = ok ? 'db-pill' : 'db-pill offline';
  if(ok){
    var sp = document.getElementById('splash');
    if(sp && sp.style.display !== 'none'){ sp.style.opacity='0'; setTimeout(function(){ sp.style.display='none'; },400); }
  }
}

// NAVEGAÇÃO
window.setTab = function(t){
  ['pedido','dashboard','vendas','estoque','cardapio'].forEach(function(n,i){
    document.querySelectorAll('.ntab')[i].classList.toggle('active',n===t);
    document.getElementById('page-'+n).classList.toggle('active',n===t);
  });
  if(t==='dashboard') rDash();
};

// MODAIS
window.fecharModal = function(id){ document.getElementById(id).classList.remove('open'); };
document.getElementById('modalPedido').addEventListener('click',function(e){ if(e.target===this) fecharModal('modalPedido'); });
document.getElementById('modalItem').addEventListener('click',function(e){ if(e.target===this) fecharModal('modalItem'); });

// SELECTS
function fillSelItem(){
  var s = document.getElementById('selItem'), v = s.value;
  s.innerHTML = '<option value="">— Selecionar item —</option>';
  var cats = {};
  C.forEach(function(i){ if(!cats[i.categoria]) cats[i.categoria]=[]; cats[i.categoria].push(i); });
  var catEmoji = {'Pastel Salgado':'🥟','Pastel Doce':'🍬','Bebida':'🥤','Acompanhamento':'🍟'};
  Object.keys(cats).forEach(function(cat){
    var g = document.createElement('optgroup');
    g.label = (catEmoji[cat]||'📦')+' '+cat.toUpperCase();
    cats[cat].forEach(function(i){
      var o = document.createElement('option');
      o.value = i.id;
      var av = i.estoque<=0 ? ' ❌ ESGOTADO' : i.estoque<=i.minEstoque ? ' ⚠️ ('+i.estoque+' un.)' : '';
      o.textContent = i.nome+'  —  '+fmt(i.preco)+av;
      if(i.estoque<=0) o.disabled=true;
      g.appendChild(o);
    });
    s.appendChild(g);
  });
  s.value = v;
}
function fillSelEstoque(){
  var s = document.getElementById('selEstoque'), v = s.value;
  s.innerHTML = '<option value="">— Selecionar —</option>';
  C.forEach(function(i){ var o=document.createElement('option'); o.value=i.id; o.textContent=i.nome+' ('+i.estoque+' un.)'; s.appendChild(o); });
  s.value = v;
}
function fillSelAcr(){
  var s = document.getElementById('selAcr'), v = s.value;
  s.innerHTML = '<option value="">— Selecionar acréscimo —</option>';
  var cats = {};
  ACR.forEach(function(a){ if(!cats[a.categoria]) cats[a.categoria]=[]; cats[a.categoria].push(a); });
  Object.keys(cats).forEach(function(cat){
    var g = document.createElement('optgroup');
    g.label = '✨ '+cat.toUpperCase();
    cats[cat].forEach(function(a){
      var o = document.createElement('option');
      o.value = a.id+'|'+a.nome+'|'+a.preco;
      o.textContent = a.nome+' — '+(a.preco>0 ? 'R$ '+a.preco.toFixed(2).replace('.',',') : 'Grátis');
      g.appendChild(o);
    });
    s.appendChild(g);
  });
  s.value = v;
}

// LISTENERS
db.collection('cardapio').orderBy('codigo').onSnapshot(function(s){
  C = s.docs.map(function(d){ return Object.assign({id:d.id},d.data()); });
  fillSelItem(); fillSelEstoque(); rCardapio(); rEstoque(); alertas(); dbOk(true);
},function(){ dbOk(false); });

db.collection('vendas').orderBy('timestamp','desc').onSnapshot(function(s){
  V = s.docs.map(function(d){ return Object.assign({id:d.id},d.data()); });
  rUltimos(); rVendas(); rDash(); dbOk(true);
},function(){ dbOk(false); });

db.collection('movimentacoes').orderBy('timestamp','desc').onSnapshot(function(s){
  M = s.docs.map(function(d){ return Object.assign({id:d.id},d.data()); });
  rMovs(); dbOk(true);
},function(){ dbOk(false); });

db.collection('acrescimos').orderBy('categoria').onSnapshot(function(s){
  ACR = s.docs.map(function(d){ return Object.assign({id:d.id},d.data()); });
  fillSelAcr(); rTabAcr(); dbOk(true);
},function(){ dbOk(false); });

// ALERTAS
function alertas(){
  var criticos = C.filter(function(p){ return p.estoque<=0; });
  var baixos   = C.filter(function(p){ return p.estoque>0 && p.estoque<=p.minEstoque; });
  var el = document.getElementById('alertasEstoque');
  if(!criticos.length && !baixos.length){ el.innerHTML=''; el.style.display='none'; return; }
  el.style.display='block';
  var html='';
  if(criticos.length){
    html+='<div class="alerta alerta-critico"><div class="alerta-icon">🚨</div><div>';
    html+='<div class="alerta-titulo">Produtos ESGOTADOS — Pedidos bloqueados!</div>';
    html+='<div class="alerta-itens">'+criticos.map(function(p){ return '<span class="alerta-tag alerta-tag-red">'+p.nome+' (0)</span>'; }).join('')+'</div></div></div>';
  }
  if(baixos.length){
    html+='<div class="alerta alerta-baixo"><div class="alerta-icon">⚠️</div><div>';
    html+='<div class="alerta-titulo">Estoque Baixo — Reabasteça em breve</div>';
    html+='<div class="alerta-itens">'+baixos.map(function(p){ return '<span class="alerta-tag alerta-tag-yellow">'+p.nome+' ('+p.estoque+')</span>'; }).join('')+'</div></div></div>';
  }
  el.innerHTML=html;
}

// ---- PEDIDOS ----
window.adicionarItem = function(){
  var id = document.getElementById('selItem').value; if(!id) return;
  var p = C.find(function(c){ return c.id===id; });
  var qtd = parseInt(document.getElementById('qtdItem').value)||1;
  if(p.estoque<=0){ toast('"'+p.nome+'" está ESGOTADO!','error'); document.getElementById('selItem').value=''; return; }
  var ex = IP.find(function(i){ return i.id===id; });
  var jaNo = ex ? ex.qtd : 0;
  if(jaNo+qtd > p.estoque){ toast('Estoque insuficiente! Disponível: '+(p.estoque-jaNo)+' un.','error'); document.getElementById('selItem').value=''; return; }
  if(p.estoque<=p.minEstoque) toast('⚠️ "'+p.nome+'" com estoque baixo! ('+p.estoque+' restantes)','error');
  if(ex) ex.qtd+=qtd; else IP.push({id:id,nome:p.nome,preco:p.preco,qtd:qtd});
  document.getElementById('selItem').value=''; document.getElementById('qtdItem').value='1';
  rIP();
};

window.addAcr = function(){
  var sel = document.getElementById('selAcr'), val = sel.value; if(!val) return;
  var pts = val.split('|'), nome=pts[1], preco=parseFloat(pts[2])||0;
  if(ACRS.find(function(a){ return a.nome===nome; })){ toast('"'+nome+'" já adicionado!','error'); sel.value=''; return; }
  ACRS.push({nome:nome,preco:preco}); sel.value='';
  rAcrsUI(); rIP();
};
function rAcrsUI(){
  var el = document.getElementById('acrsAdicionados');
  if(!ACRS.length){ el.innerHTML=''; return; }
  el.innerHTML = ACRS.map(function(a,i){
    return '<span class="acr-tag" onclick="remAcr('+i+')" title="Clique para remover">'+a.nome+(a.preco>0?' +R$'+a.preco.toFixed(2).replace('.',','):' ✓')+' ×</span>';
  }).join('');
}
window.remAcr = function(i){ ACRS.splice(i,1); rAcrsUI(); rIP(); };

function rIP(){
  var el = document.getElementById('itensPedido');
  if(!IP.length){ el.innerHTML='<div class="empty"><span class="empty-icon">🛒</span>Nenhum item adicionado</div>'; document.getElementById('totalPedido').textContent='R$ 0,00'; return; }
  var t=0, html='';
  IP.forEach(function(it,i){
    t+=it.preco*it.qtd;
    html+='<div class="item-row"><span class="item-name">'+it.nome+'</span>';
    html+='<div class="qty-ctrl"><button class="qty-btn" onclick="chgQ('+i+',-1)">−</button><span class="qty-val">'+it.qtd+'</span><button class="qty-btn" onclick="chgQ('+i+',1)">+</button></div>';
    html+='<span class="item-price">'+fmt(it.preco*it.qtd)+'</span>';
    html+='<button class="btn btn-danger btn-sm" onclick="remI('+i+')">✕</button></div>';
  });
  if(ACRS.length){
    var ta=ACRS.reduce(function(s,a){return s+a.preco;},0); t+=ta;
    html+='<div style="padding:8px 10px 4px;border-top:1px solid var(--br);margin-top:4px"><div style="font-size:10px;color:var(--t3);font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px">Acréscimos</div>';
    ACRS.forEach(function(a,i){
      html+='<div class="item-row" style="padding:5px 10px"><span class="item-name" style="color:var(--t2)">+ '+a.nome+'</span>';
      html+='<span class="item-price">'+(a.preco>0?fmt(a.preco):'Grátis')+'</span>';
      html+='<button class="btn btn-danger btn-sm" onclick="remAcr('+i+')">✕</button></div>';
    });
    html+='</div>';
  }
  el.innerHTML=html;
  document.getElementById('totalPedido').textContent=fmt(t);
}
window.chgQ=function(i,d){ IP[i].qtd+=d; if(IP[i].qtd<=0) IP.splice(i,1); rIP(); };
window.remI=function(i){ IP.splice(i,1); rIP(); };
window.limparPedido=function(){ if(IP.length&&!confirm('Limpar todos os itens?')) return; IP=[]; ACRS=[]; rAcrsUI(); rIP(); };

window.finalizarPedido = async function(){
  var nome=document.getElementById('nomeCliente').value.trim();
  var obs=document.getElementById('mesaObs').value.trim();
  if(!nome){ toast('Informe o nome do cliente!','error'); return; }
  if(!IP.length){ toast('Adicione pelo menos um item!','error'); return; }
  var btn=document.getElementById('btnFinalizar');
  btn.disabled=true; btn.innerHTML='<span class="spinner"></span> Salvando...';
  try{
    var total=IP.reduce(function(s,i){return s+i.preco*i.qtd;},0)+ACRS.reduce(function(s,a){return s+a.preco;},0);
    await db.collection('vendas').add({
      cliente:nome, obs:obs||'',
      itens:IP.map(function(i){return {nome:i.nome,preco:i.preco,qtd:i.qtd};}),
      acrescimos:ACRS.map(function(a){return {nome:a.nome,preco:a.preco};}),
      total:total, hora:hora(), data:new Date().toLocaleDateString('pt-BR'), timestamp:ST()
    });
    for(var k=0;k<IP.length;k++){
      var it=IP[k], p=C.find(function(c){return c.id===it.id;});
      if(p){ var nv=Math.max(0,p.estoque-it.qtd); await db.collection('cardapio').doc(it.id).update({estoque:nv}); await db.collection('movimentacoes').add({tipo:'saida',produto:p.nome,qtd:it.qtd,antes:p.estoque,depois:nv,motivo:'Pedido de '+nome,hora:hora(),timestamp:ST()}); }
    }
    IP=[]; ACRS=[];
    document.getElementById('nomeCliente').value=''; document.getElementById('mesaObs').value='';
    rAcrsUI(); rIP(); toast('✓ Pedido de '+nome+' finalizado! Total: '+fmt(total));
  }catch(e){ toast('Erro ao salvar.','error'); }
  btn.disabled=false; btn.innerHTML='✓ Finalizar Pedido';
};

function rUltimos(){
  var el=document.getElementById('ultimosPedidos');
  if(!V.length){ el.innerHTML='<div class="empty" style="padding:24px"><span class="empty-icon">🧾</span>Sem pedidos ainda</div>'; return; }
  var html='';
  V.slice(0,8).forEach(function(v,i){
    if(i>0) html+='<div class="mini-sep"></div>';
    html+='<div class="mini-pedido"><div style="display:flex;justify-content:space-between"><span class="mini-nome">'+v.cliente+'</span><span class="mini-hora">'+v.hora+'</span></div>';
    if(v.obs) html+='<div class="mini-obs">'+v.obs+'</div>';
    html+='<div class="mini-itens">'+v.itens.map(function(i){return i.qtd+'× '+i.nome;}).join(' · ')+'</div>';
    html+='<div class="mini-total">'+fmt(v.total)+'</div></div>';
  });
  el.innerHTML=html;
}

// ---- VENDAS ----
function rVendas(){
  var fat=V.reduce(function(s,v){return s+v.total;},0);
  var itens=V.reduce(function(s,v){return s+v.itens.reduce(function(a,i){return a+i.qtd;},0);},0);
  document.getElementById('v-ped').textContent=V.length;
  document.getElementById('v-fat').textContent=fmt(fat);
  document.getElementById('v-ticket').textContent=V.length?fmt(fat/V.length):'R$ 0,00';
  document.getElementById('v-itens').textContent=itens;
  var el=document.getElementById('listaVendas');
  if(!V.length){ el.innerHTML='<div class="empty"><span class="empty-icon">📊</span>Nenhum pedido ainda</div>'; return; }
  var html='<table><thead><tr><th>Cliente</th><th>Obs</th><th>Itens</th><th>Acréscimos</th><th>Data</th><th>Hora</th><th>Total</th><th>Ações</th></tr></thead><tbody>';
  V.forEach(function(v){
    var acrs=v.acrescimos&&v.acrescimos.length ? v.acrescimos.map(function(a){return a.nome;}).join(', ') : '—';
    html+='<tr><td style="font-weight:700;color:var(--t1)">'+v.cliente+'</td><td style="color:var(--t3);font-size:12px">'+(v.obs||'—')+'</td>';
    html+='<td><div class="tag-wrap">'+v.itens.map(function(i){return '<span class="badge-tag">'+i.qtd+'× '+i.nome+'</span>';}).join('')+'</div></td>';
    html+='<td style="color:var(--t3);font-size:12px">'+acrs+'</td>';
    html+='<td style="color:var(--t3)">'+(v.data||'')+'</td><td style="color:var(--t3)">'+v.hora+'</td>';
    html+='<td style="font-weight:900;color:var(--g1);font-size:14px">'+fmt(v.total)+'</td>';
    html+='<td><div style="display:flex;gap:6px"><button class="btn btn-edit btn-sm" onclick="abrirEdicao(\''+v.id+'\')">✏️</button><button class="btn btn-danger btn-sm" onclick="excluirPedido(\''+v.id+'\',\''+v.cliente+'\')">🗑</button></div></td></tr>';
  });
  el.innerHTML=html+'</tbody></table>';
}

window.abrirEdicao=function(id){
  var v=V.find(function(x){return x.id===id;}); if(!v) return;
  editId=id; editIL=v.itens.map(function(i){return Object.assign({},i);});
  document.getElementById('editNome').value=v.cliente;
  document.getElementById('editObs').value=v.obs||'';
  rEditI(); document.getElementById('modalPedido').classList.add('open');
};
function rEditI(){
  var el=document.getElementById('editItens');
  if(!editIL.length){ el.innerHTML='<div style="color:var(--t3);padding:10px;text-align:center">Nenhum item</div>'; document.getElementById('editTotal').textContent='R$ 0,00'; return; }
  var t=0,html='';
  editIL.forEach(function(it,i){
    t+=it.preco*it.qtd;
    html+='<div class="item-row"><span class="item-name">'+it.nome+'</span>';
    html+='<div class="qty-ctrl"><button class="qty-btn" onclick="chgEQ('+i+',-1)">−</button><span class="qty-val">'+it.qtd+'</span><button class="qty-btn" onclick="chgEQ('+i+',1)">+</button></div>';
    html+='<span class="item-price">'+fmt(it.preco*it.qtd)+'</span>';
    html+='<button class="btn btn-danger btn-sm" onclick="remEI('+i+')">✕</button></div>';
  });
  el.innerHTML=html; document.getElementById('editTotal').textContent=fmt(t);
}
window.chgEQ=function(i,d){editIL[i].qtd+=d;if(editIL[i].qtd<=0)editIL.splice(i,1);rEditI();};
window.remEI=function(i){editIL.splice(i,1);rEditI();};
window.salvarEdicao=async function(){
  if(!editId) return;
  var nome=document.getElementById('editNome').value.trim();
  var obs=document.getElementById('editObs').value.trim();
  if(!nome){toast('Nome obrigatório!','error');return;}
  var total=editIL.reduce(function(s,i){return s+i.preco*i.qtd;},0);
  try{ await db.collection('vendas').doc(editId).update({cliente:nome,obs:obs||'',itens:editIL,total:total}); fecharModal('modalPedido'); toast('✓ Pedido atualizado!'); }
  catch(e){toast('Erro ao salvar.','error');}
};
window.excluirPedido=async function(id,nome){
  if(!confirm('Excluir pedido de "'+nome+'"?')) return;
  try{await db.collection('vendas').doc(id).delete();toast('Pedido excluído.');}
  catch(e){toast('Erro ao excluir.','error');}
};
window.limparHistorico=async function(){
  if(!V.length){toast('Nenhum pedido!','error');return;}
  if(!confirm('⚠️ Apagar TODO o histórico de '+V.length+' pedido(s)?\n\nEsta ação não pode ser desfeita!')) return;
  try{
    for(var i=0;i<V.length;i++) await db.collection('vendas').doc(V[i].id).delete();
    toast('✓ Histórico apagado!');
  }catch(e){toast('Erro ao apagar.','error');}
};

// ---- DASHBOARD ----
function buildPie(data,total,size){
  size=size||190;
  if(!data.length||total===0) return '<div style="width:'+size+'px;height:'+size+'px;display:flex;align-items:center;justify-content:center;color:var(--t3);font-size:12px">Sem dados</div>';
  if(data.length===1){
    var col=PIE[0],cx=size/2,cy=size/2,r=size/2-10,ri=r*0.52;
    return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'"><circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+col+'" opacity="0.9"/><circle cx="'+cx+'" cy="'+cy+'" r="'+ri+'" fill="#16161a"/><text x="'+cx+'" y="'+cy+'" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="12" font-weight="800" font-family="Inter,sans-serif">100%</text></svg>';
  }
  var cx=size/2,cy=size/2,r=size/2-10,ri=r*0.5,angle=-Math.PI/2,paths='';
  data.forEach(function(item,idx){
    var frac=item[1]/total,sweep=frac*2*Math.PI,end=angle+sweep;
    var col=PIE[idx%PIE.length],lg=sweep>Math.PI?1:0;
    var x1=cx+r*Math.cos(angle),y1=cy+r*Math.sin(angle);
    var x2=cx+r*Math.cos(end),y2=cy+r*Math.sin(end);
    var ix1=cx+ri*Math.cos(angle),iy1=cy+ri*Math.sin(angle);
    var ix2=cx+ri*Math.cos(end),iy2=cy+ri*Math.sin(end);
    paths+='<path d="M '+ix1+' '+iy1+' L '+x1+' '+y1+' A '+r+' '+r+' 0 '+lg+' 1 '+x2+' '+y2+' L '+ix2+' '+iy2+' A '+ri+' '+ri+' 0 '+lg+' 0 '+ix1+' '+iy1+' Z" fill="'+col+'" stroke="#16161a" stroke-width="1.5"><title>'+item[0]+': '+item[1]+' ('+Math.round(frac*100)+'%)</title></path>';
    var pct=Math.round(frac*100);
    if(pct>=5){ var ma=angle+sweep/2,lx=cx+r*0.7*Math.cos(ma),ly=cy+r*0.7*Math.sin(ma); paths+='<text x="'+lx+'" y="'+ly+'" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="11" font-weight="800" font-family="Inter,sans-serif">'+pct+'%</text>'; }
    angle=end;
  });
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'" xmlns="http://www.w3.org/2000/svg">'+paths+'</svg>';
}

function rDash(){
  var fat=V.reduce(function(s,v){return s+v.total;},0);
  var itens=V.reduce(function(s,v){return s+v.itens.reduce(function(a,i){return a+i.qtd;},0);},0);
  document.getElementById('d-ped').textContent=V.length;
  document.getElementById('d-fat').textContent=fmt(fat);
  document.getElementById('d-itens').textContent=itens;
  document.getElementById('d-ticket').textContent=V.length?fmt(fat/V.length):'R$ 0,00';
  var cont={};
  V.forEach(function(v){v.itens.forEach(function(it){cont[it.nome]=(cont[it.nome]||0)+it.qtd;});});
  var sorted=Object.entries(cont).sort(function(a,b){return b[1]-a[1];});
  if(!sorted.length){
    ['d-top','d-low','d-chart'].forEach(function(id){document.getElementById(id).innerHTML='<div class="empty"><span class="empty-icon">📊</span>Sem dados ainda</div>';});
    return;
  }
  var totalI=sorted.reduce(function(s,x){return s+x[1];},0),maxQ=sorted[0][1];
  var medals=['🥇','🥈','🥉','4°','5°','6°'];
  var gC=['rgba(76,175,114,.2)','rgba(76,175,114,.14)','rgba(76,175,114,.1)','rgba(76,175,114,.07)','rgba(76,175,114,.05)','rgba(76,175,114,.04)'];
  var rC=['rgba(208,96,96,.18)','rgba(208,96,96,.13)','rgba(208,96,96,.09)','rgba(208,96,96,.06)','rgba(208,96,96,.04)','rgba(208,96,96,.03)'];
  var html='';
  sorted.slice(0,6).forEach(function(x,i){
    var pct=Math.round(x[1]/maxQ*100),sh=Math.round(x[1]/totalI*100);
    html+='<div style="background:'+gC[i]+';border-radius:10px;margin:3px 0;padding:10px 12px;display:flex;align-items:center;gap:10px">';
    html+='<div style="width:26px;height:26px;border-radius:7px;background:rgba(76,175,114,.2);border:1px solid rgba(76,175,114,.3);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0">'+medals[i]+'</div>';
    html+='<span style="flex:1;font-size:13px;color:var(--t1);font-weight:600">'+x[0]+'</span>';
    html+='<div style="flex:2;background:rgba(0,0,0,.2);border-radius:4px;height:5px;overflow:hidden;margin:0 10px"><div style="width:'+pct+'%;height:100%;background:linear-gradient(90deg,#4caf72,#6dc87d);border-radius:4px"></div></div>';
    html+='<div style="text-align:right;flex-shrink:0"><div style="font-size:13px;font-weight:800;color:#6dc87d">'+x[1]+'</div><div style="font-size:10px;color:var(--t3)">'+sh+'%</div></div></div>';
  });
  document.getElementById('d-top').innerHTML=html;
  html='';
  var low=[...sorted].reverse();
  low.slice(0,6).forEach(function(x,i){
    var pct=Math.max(2,Math.round(x[1]/maxQ*100));
    html+='<div style="background:'+rC[i]+';border-radius:10px;margin:3px 0;padding:10px 12px;display:flex;align-items:center;gap:10px">';
    html+='<span style="flex:1;font-size:13px;color:var(--t2);font-weight:500">'+x[0]+'</span>';
    html+='<div style="flex:2;background:rgba(0,0,0,.2);border-radius:4px;height:5px;overflow:hidden;margin:0 10px"><div style="width:'+pct+'%;height:100%;background:linear-gradient(90deg,#a03030,#d06060);border-radius:4px"></div></div>';
    html+='<span style="font-size:13px;font-weight:800;color:#e08080;flex-shrink:0">'+x[1]+' un.</span></div>';
  });
  document.getElementById('d-low').innerHTML=html;
  var pieD=sorted.slice(0,10);
  var fatP={};
  V.forEach(function(v){v.itens.forEach(function(it){fatP[it.nome]=(fatP[it.nome]||0)+it.preco*it.qtd;});});
  var sF=Object.entries(fatP).sort(function(a,b){return b[1]-a[1];}).slice(0,10);
  var tF=sF.reduce(function(s,x){return s+x[1];},0);
  var leg1='',leg2='';
  pieD.forEach(function(x,i){ var col=PIE[i%PIE.length],pct=Math.round(x[1]/totalI*100); leg1+='<div style="display:flex;align-items:center;gap:7px;padding:4px 6px"><span style="width:8px;height:8px;border-radius:50%;background:'+col+';flex-shrink:0"></span><span style="flex:1;font-size:12px;color:var(--t1)">'+x[0]+'</span><span style="font-size:12px;font-weight:800;color:'+col+'">'+x[1]+'</span><span style="font-size:11px;color:var(--t3);min-width:28px;text-align:right">'+pct+'%</span></div>'; });
  sF.forEach(function(x,i){ var col=PIE[i%PIE.length],pct=Math.round(x[1]/tF*100); leg2+='<div style="display:flex;align-items:center;gap:7px;padding:4px 6px"><span style="width:8px;height:8px;border-radius:50%;background:'+col+';flex-shrink:0"></span><span style="flex:1;font-size:12px;color:var(--t1)">'+x[0]+'</span><span style="font-size:12px;font-weight:800;color:'+col+'">'+fmt(x[1])+'</span><span style="font-size:11px;color:var(--t3);min-width:28px;text-align:right">'+pct+'%</span></div>'; });
  document.getElementById('d-chart').innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:28px"><div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--t3);margin-bottom:14px">🥧 Quantidade Vendida</div><div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div style="flex-shrink:0">'+buildPie(pieD,totalI,180)+'</div><div style="flex:1;min-width:140px">'+leg1+'</div></div></div><div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--t3);margin-bottom:14px">💰 Faturamento</div><div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div style="flex-shrink:0">'+buildPie(sF,tF,180)+'</div><div style="flex:1;min-width:140px">'+leg2+'</div></div></div></div>';
}

// ---- ESTOQUE ----
window.entradaEstoque=async function(){
  var id=document.getElementById('selEstoque').value; if(!id){toast('Selecione um produto!','error');return;}
  var qtd=parseInt(document.getElementById('qtdEstoque').value)||0; if(qtd<=0){toast('Quantidade inválida!','error');return;}
  var obs=document.getElementById('obsEstoque').value.trim()||'Entrada manual';
  var p=C.find(function(c){return c.id===id;});
  try{
    var nv=p.estoque+qtd;
    await db.collection('cardapio').doc(id).update({estoque:nv});
    await db.collection('movimentacoes').add({tipo:'entrada',produto:p.nome,qtd:qtd,antes:p.estoque,depois:nv,motivo:obs,hora:hora(),timestamp:ST()});
    document.getElementById('selEstoque').value=''; document.getElementById('qtdEstoque').value='10'; document.getElementById('obsEstoque').value='';
    toast('✓ '+qtd+'× "'+p.nome+'" adicionado!');
  }catch(e){toast('Erro ao registrar.','error');}
};
function rEstoque(){
  var el=document.getElementById('tabEstoque');
  if(!C.length){el.innerHTML='<div class="empty"><span class="empty-icon">📦</span>Cadastre produtos</div>';return;}
  var html='<table><thead><tr><th>Produto</th><th>Qtd</th><th>Nível</th><th>Status</th></tr></thead><tbody>';
  C.forEach(function(p){
    var pct=Math.min(100,Math.round(p.estoque/(p.minEstoque*4)*100));
    var cor=p.estoque<=0?'var(--red)':p.estoque<=p.minEstoque?'var(--g1)':'#6dc87d';
    var cls=p.estoque<=0?'badge-out':p.estoque<=p.minEstoque?'badge-low':'badge-ok';
    var txt=p.estoque<=0?'Esgotado':p.estoque<=p.minEstoque?'Baixo':'OK';
    html+='<tr><td style="font-weight:600;color:var(--t1)">'+p.nome+'</td><td><b style="color:var(--t1);font-size:15px">'+p.estoque+'</b><span style="color:var(--t3);font-size:11px;margin-left:4px">/ mín '+p.minEstoque+'</span></td><td><div class="estoque-bar"><div class="estoque-fill" style="width:'+pct+'%;background:'+cor+'"></div></div></td><td><span class="badge '+cls+'">'+txt+'</span></td></tr>';
  });
  el.innerHTML=html+'</tbody></table>';
}
function rMovs(){
  var h=document.getElementById('histEstoque');
  if(!M.length){h.innerHTML='<div class="empty"><span class="empty-icon">🕓</span>Sem movimentações</div>';return;}
  var html='<table><thead><tr><th>Tipo</th><th>Produto</th><th>Qtd</th><th>Antes→Depois</th><th>Motivo</th><th>Hora</th></tr></thead><tbody>';
  M.slice(0,25).forEach(function(m){
    html+='<tr><td><span class="badge '+(m.tipo==='entrada'?'badge-in':'badge-saida')+'">'+(m.tipo==='entrada'?'↑ Entrada':'↓ Saída')+'</span></td><td style="color:var(--t2)">'+m.produto+'</td><td style="font-weight:700;color:var(--t1)">'+m.qtd+'</td><td style="color:var(--t3);font-size:12px">'+m.antes+' → '+m.depois+'</td><td style="color:var(--t3)">'+m.motivo+'</td><td style="color:var(--t3)">'+m.hora+'</td></tr>';
  });
  h.innerHTML=html+'</tbody></table>';
}

// ---- CARDÁPIO ----
window.salvarItem=async function(){
  var nm=document.getElementById('nomeItem').value.trim();
  var ct=document.getElementById('catItem').value;
  var pr=parseFloat(document.getElementById('precoItem').value);
  var es=parseInt(document.getElementById('estoqueItem').value)||0;
  var mn=parseInt(document.getElementById('minEstoque').value)||5;
  if(!nm||isNaN(pr)){toast('Preencha nome e preço!','error');return;}
  var maxCod=C.length?Math.max.apply(null,C.map(function(c){return parseInt(c.codigo)||0;})):0;
  var cd=String(maxCod+1).padStart(2,'0');
  try{
    await db.collection('cardapio').add({codigo:cd,nome:nm,categoria:ct,preco:pr,estoque:es,minEstoque:mn,timestamp:ST()});
    document.getElementById('nomeItem').value=''; document.getElementById('precoItem').value='';
    toast('✓ "'+nm+'" adicionado!');
  }catch(e){toast('Erro ao salvar.','error');}
};
window.excluirItem=async function(id){
  var p=C.find(function(c){return c.id===id;});
  if(!confirm('Excluir "'+p.nome+'"?')) return;
  try{await db.collection('cardapio').doc(id).delete();toast('"'+p.nome+'" removido.');}
  catch(e){toast('Erro ao excluir.','error');}
};
window.abrirEditItem=function(id){
  var p=C.find(function(c){return c.id===id;}); if(!p) return;
  document.getElementById('editItemId').value=id;
  document.getElementById('editItemNome').value=p.nome;
  document.getElementById('editItemPreco').value=p.preco;
  document.getElementById('editItemEst').value=p.estoque;
  document.getElementById('editItemMin').value=p.minEstoque;
  document.getElementById('editItemCat').value=p.categoria;
  document.getElementById('modalItem').classList.add('open');
};
window.salvarEditItem=async function(){
  var id=document.getElementById('editItemId').value;
  var nm=document.getElementById('editItemNome').value.trim();
  var pr=parseFloat(document.getElementById('editItemPreco').value);
  var es=parseInt(document.getElementById('editItemEst').value)||0;
  var mn=parseInt(document.getElementById('editItemMin').value)||0;
  var ct=document.getElementById('editItemCat').value;
  if(!nm||isNaN(pr)){toast('Preencha nome e preço!','error');return;}
  try{
    await db.collection('cardapio').doc(id).update({nome:nm,preco:pr,estoque:es,minEstoque:mn,categoria:ct});
    fecharModal('modalItem'); toast('✓ Item atualizado!');
  }catch(e){toast('Erro ao salvar.','error');}
};
function rCardapio(){
  var el=document.getElementById('tabCardapio');
  if(!C.length){el.innerHTML='<div class="empty"><span class="empty-icon">📖</span>Nenhum item</div>';return;}
  var cats=[...new Set(C.map(function(i){return i.categoria;}))];
  var html='';
  cats.forEach(function(cat){
    html+='<div style="margin-bottom:20px"><div class="cat-label">'+cat+'</div>';
    html+='<table><thead><tr><th>Nome</th><th>Preço</th><th>Estoque</th><th>Mín</th><th>Ações</th></tr></thead><tbody>';
    C.filter(function(i){return i.categoria===cat;}).forEach(function(i){
      var ec=i.estoque<=0?'var(--red)':i.estoque<=i.minEstoque?'var(--g1)':'#6dc87d';
      html+='<tr><td style="font-weight:600;color:var(--t1)">'+i.nome+'</td><td style="font-weight:800;color:var(--g1);font-size:14px">'+fmt(i.preco)+'</td><td><b style="color:'+ec+'">'+i.estoque+'</b></td><td style="color:var(--t3)">'+i.minEstoque+'</td><td><div style="display:flex;gap:5px"><button class="btn btn-edit btn-sm" onclick="abrirEditItem(\''+i.id+'\')">✏️</button><button class="btn btn-danger btn-sm" onclick="excluirItem(\''+i.id+'\')">🗑</button></div></td></tr>';
    });
    html+='</tbody></table></div>';
  });
  el.innerHTML=html;
}

// ---- ACRÉSCIMOS ----
window.salvarAcr=async function(){
  var nm=document.getElementById('nomeAcr').value.trim();
  var pr=parseFloat(document.getElementById('precoAcr').value)||0;
  var ct=document.getElementById('catAcr').value;
  if(!nm){toast('Informe o nome!','error');return;}
  try{
    await db.collection('acrescimos').add({nome:nm,preco:pr,categoria:ct,timestamp:ST()});
    document.getElementById('nomeAcr').value=''; document.getElementById('precoAcr').value='0';
    toast('✓ "'+nm+'" adicionado!');
  }catch(e){toast('Erro ao salvar.','error');}
};
window.excluirAcr=async function(id){
  var a=ACR.find(function(x){return x.id===id;});
  if(!confirm('Excluir "'+a.nome+'"?')) return;
  try{await db.collection('acrescimos').doc(id).delete();toast('"'+a.nome+'" removido.');}
  catch(e){toast('Erro.','error');}
};
window.editarAcr=async function(id){
  var a=ACR.find(function(x){return x.id===id;});
  var novoNome=prompt('Nome:',a.nome); if(!novoNome) return;
  var novoPreco=parseFloat(prompt('Preço (0 = Grátis):',a.preco))||0;
  try{await db.collection('acrescimos').doc(id).update({nome:novoNome,preco:novoPreco});toast('✓ Atualizado!');}
  catch(e){toast('Erro.','error');}
};
function rTabAcr(){
  var el=document.getElementById('tabAcr');
  if(!el) return;
  if(!ACR.length){el.innerHTML='<div class="empty"><span class="empty-icon">✨</span>Nenhum acréscimo<br><span style="font-size:12px;display:block;margin-top:5px">Adicione ao lado</span></div>';return;}
  var cats={};
  ACR.forEach(function(a){if(!cats[a.categoria])cats[a.categoria]=[];cats[a.categoria].push(a);});
  var html='';
  Object.keys(cats).forEach(function(cat){
    html+='<div style="margin-bottom:18px"><div class="cat-label">✨ '+cat+'</div>';
    html+='<table><thead><tr><th>Nome</th><th>Preço</th><th>Ações</th></tr></thead><tbody>';
    cats[cat].forEach(function(a){
      html+='<tr><td style="font-weight:600;color:var(--t1)">'+a.nome+'</td>';
      html+='<td style="font-weight:700;color:'+(a.preco>0?'var(--g1)':'#6dc87d')+'">'+(a.preco>0?fmt(a.preco):'Grátis')+'</td>';
      html+='<td><div style="display:flex;gap:5px"><button class="btn btn-edit btn-sm" onclick="editarAcr(\''+a.id+'\')">✏️</button><button class="btn btn-danger btn-sm" onclick="excluirAcr(\''+a.id+'\')">🗑</button></div></td></tr>';
    });
    html+='</tbody></table></div>';
  });
  el.innerHTML=html;
}

// ---- EXPORTAR ----
window.exportarVendas=function(){
  if(!V.length){toast('Nenhuma venda!','error');return;}
  var fat=V.reduce(function(s,v){return s+v.total;},0);
  var itens=V.reduce(function(s,v){return s+v.itens.reduce(function(a,i){return a+i.qtd;},0);},0);
  var linhas=[
    ['PASTELARIA TANDINHA — RELATÓRIO DE VENDAS'],
    ['Gerado em: '+new Date().toLocaleDateString('pt-BR')+' às '+hora()],
    [],['RESUMO'],
    ['Total de Pedidos',V.length],
    ['Faturamento Total','R$ '+fat.toFixed(2).replace('.',',')],
    ['Ticket Médio','R$ '+(fat/V.length).toFixed(2).replace('.',',')],
    ['Itens Vendidos',itens],
    [],['PEDIDOS'],
    ['Data','Hora','Cliente','Obs','Itens','Acréscimos','Total']
  ];
  V.forEach(function(v){
    var its=v.itens.map(function(i){return i.qtd+'x '+i.nome;}).join(' | ');
    var acrs=v.acrescimos&&v.acrescimos.length?v.acrescimos.map(function(a){return a.nome;}).join(', '):'';
    linhas.push([v.data||'',v.hora,v.cliente,v.obs||'',its,acrs,'R$ '+v.total.toFixed(2).replace('.',',')]);
  });
  var cont={},fatP={};
  V.forEach(function(v){v.itens.forEach(function(i){cont[i.nome]=(cont[i.nome]||0)+i.qtd;fatP[i.nome]=(fatP[i.nome]||0)+i.preco*i.qtd;});});
  linhas.push([],['RANKING DE PRODUTOS'],['Produto','Qtd Vendida','Faturamento','Participação']);
  Object.entries(cont).sort(function(a,b){return b[1]-a[1];}).forEach(function(x){
    linhas.push([x[0],x[1],'R$ '+fatP[x[0]].toFixed(2).replace('.',','),Math.round(x[1]/itens*100)+'%']);
  });
  var bom='\uFEFF';
  var csv=bom+linhas.map(function(r){return r.map(function(c){var s=String(c===null||c===undefined?'':c);if(s.includes(';')||s.includes('"'))s='"'+s.replace(/"/g,'""')+'"';return s;}).join(';');}).join('\r\n');
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  a.download='vendas-tandinha-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  toast('✓ Planilha exportada!');
};
window.exportarEstoque=function(){
  if(!C.length){toast('Sem produtos!','error');return;}
  var linhas=[['PASTELARIA TANDINHA — ESTOQUE'],['Gerado em: '+new Date().toLocaleDateString('pt-BR')],[],['Produto','Categoria','Estoque','Mínimo','Status','Preço']];
  C.forEach(function(p){var s=p.estoque<=0?'ESGOTADO':p.estoque<=p.minEstoque?'BAIXO':'OK';linhas.push([p.nome,p.categoria,p.estoque,p.minEstoque,s,'R$ '+p.preco.toFixed(2).replace('.',',')]);});
  var bom='\uFEFF';
  var csv=bom+linhas.map(function(r){return r.map(function(c){return String(c===null||c===undefined?'':c);}).join(';');}).join('\r\n');
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  a.download='estoque-tandinha-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  toast('✓ Estoque exportado!');
};
