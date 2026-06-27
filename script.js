/* ================================
   PASTELARIA TANDINHA — SCRIPT.JS
   ================================ */

// ---- FIREBASE ----
firebase.initializeApp({
  apiKey: "AIzaSyDFYXtlxVdmB_ISQyJdoHCid7W3wlq8vmk",
  authDomain: "tandinha-c5826.firebaseapp.com",
  projectId: "tandinha-c5826",
  storageBucket: "tandinha-c5826.firebasestorage.app",
  messagingSenderId: "467238347240",
  appId: "1:467238347240:web:4a3dd8774667ccf7ed045d"
});
var db = firebase.firestore();
var ST = function() { return firebase.firestore.FieldValue.serverTimestamp(); };

// ---- ESTADO ----
var C = [], V = [], M = [], IP = [], editId = null, editIL = [];
var PIE_COLORS = ['#5b8dee','#4caf72','#D4A843','#d06060','#a78bfa','#f97316','#22d3ee','#f472b6','#a3e635','#fbbf24'];

// ---- UTILITÁRIOS ----
var fmt = function(v) { return v.toLocaleString('pt-BR', {style:'currency', currency:'BRL'}); };
var hora = function() { return new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}); };

// ---- RELÓGIO ----
setInterval(function() { document.getElementById('clock').textContent = hora(); }, 1000);
document.getElementById('clock').textContent = hora();

// ---- TOAST ----
function toast(msg, tipo) {
  tipo = tipo || 'success';
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + tipo + ' show';
  clearTimeout(el._t);
  el._t = setTimeout(function() { el.classList.remove('show'); }, 3500);
}

// ---- STATUS DB / SPLASH ----
function dbOk(ok) {
  var el = document.getElementById('dbStatus');
  var tx = document.getElementById('dbTxt');
  tx.textContent = ok ? 'Conectado' : 'Offline';
  el.className = ok ? 'db-pill' : 'db-pill offline';
  if (ok) {
    var sp = document.getElementById('splash');
    if (sp && sp.style.display !== 'none') {
      sp.style.opacity = '0';
      setTimeout(function() { sp.style.display = 'none'; }, 400);
    }
  }
}

// ---- NAVEGAÇÃO ----
window.setTab = function(t) {
  ['pedido','dashboard','vendas','estoque','cardapio'].forEach(function(n, i) {
    document.querySelectorAll('.ntab')[i].classList.toggle('active', n === t);
    document.getElementById('page-' + n).classList.toggle('active', n === t);
  });
  if (t === 'dashboard') rDash();
};

// ---- PREENCHER SELECTS ----
function fillSels() {
  var s1 = document.getElementById('selItem'), v1 = s1.value;
  s1.innerHTML = '<option value="">— Selecionar item —</option>';
  C.forEach(function(i) {
    var o = document.createElement('option');
    o.value = i.id; o.textContent = i.nome + '  —  ' + fmt(i.preco);
    s1.appendChild(o);
  });
  s1.value = v1;

  var s2 = document.getElementById('selEstoque'), v2 = s2.value;
  s2.innerHTML = '<option value="">— Selecionar —</option>';
  C.forEach(function(i) {
    var o = document.createElement('option');
    o.value = i.id; o.textContent = i.nome;
    s2.appendChild(o);
  });
  s2.value = v2;
}

// ---- LISTENERS FIRESTORE ----
db.collection('cardapio').orderBy('codigo').onSnapshot(function(s) {
  C = s.docs.map(function(d) { return Object.assign({id: d.id}, d.data()); });
  fillSels(); rCard(); rEst(); dbOk(true);
}, function() { dbOk(false); });

db.collection('vendas').orderBy('timestamp','desc').onSnapshot(function(s) {
  V = s.docs.map(function(d) { return Object.assign({id: d.id}, d.data()); });
  rUlt(); rVen(); rDash(); dbOk(true);
}, function() { dbOk(false); });

db.collection('movimentacoes').orderBy('timestamp','desc').onSnapshot(function(s) {
  M = s.docs.map(function(d) { return Object.assign({id: d.id}, d.data()); });
  rMov(); dbOk(true);
}, function() { dbOk(false); });

// ==========================================
// PEDIDOS
// ==========================================
window.adicionarItem = function() {
  var id = document.getElementById('selItem').value;
  if (!id) return;
  var p = C.find(function(c) { return c.id === id; });
  var qtd = parseInt(document.getElementById('qtdItem').value) || 1;
  var ex = IP.find(function(i) { return i.id === id; });
  if (ex) ex.qtd += qtd;
  else IP.push({id: id, nome: p.nome, preco: p.preco, qtd: qtd});
  document.getElementById('selItem').value = '';
  document.getElementById('qtdItem').value = '1';
  rIP();
};

function rIP() {
  var el = document.getElementById('itensPedido');
  if (!IP.length) {
    el.innerHTML = '<div class="empty"><span class="empty-icon">🛒</span>Nenhum item adicionado</div>';
    document.getElementById('totalPedido').textContent = 'R$ 0,00';
    return;
  }
  var t = 0, html = '';
  IP.forEach(function(it, i) {
    t += it.preco * it.qtd;
    html += '<div class="item-row">';
    html += '<span class="item-name">' + it.nome + '</span>';
    html += '<div class="qty-ctrl">';
    html += '<button class="qty-btn" onclick="chgQ(' + i + ',-1)">−</button>';
    html += '<span class="qty-val">' + it.qtd + '</span>';
    html += '<button class="qty-btn" onclick="chgQ(' + i + ',1)">+</button>';
    html += '</div>';
    html += '<span class="item-price">' + fmt(it.preco * it.qtd) + '</span>';
    html += '<button class="btn btn-danger btn-sm" onclick="remI(' + i + ')">✕</button>';
    html += '</div>';
  });
  el.innerHTML = html;
  document.getElementById('totalPedido').textContent = fmt(t);
}

window.chgQ = function(i, d) { IP[i].qtd += d; if (IP[i].qtd <= 0) IP.splice(i, 1); rIP(); };
window.remI = function(i) { IP.splice(i, 1); rIP(); };
window.limparPedido = function() { if (IP.length && !confirm('Limpar todos os itens?')) return; IP = []; rIP(); };

window.finalizarPedido = async function() {
  var nome = document.getElementById('nomeCliente').value.trim();
  var obs  = document.getElementById('mesaObs').value.trim();
  if (!nome)    { toast('Informe o nome do cliente!', 'error'); return; }
  if (!IP.length) { toast('Adicione pelo menos um item!', 'error'); return; }
  var btn = document.getElementById('btnFinalizar');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Salvando...';
  try {
    var total = IP.reduce(function(s, i) { return s + i.preco * i.qtd; }, 0);
    var itens = IP.map(function(i) { return {nome: i.nome, preco: i.preco, qtd: i.qtd}; });
    await db.collection('vendas').add({
      cliente: nome, obs: obs || '', itens: itens,
      total: total, hora: hora(),
      data: new Date().toLocaleDateString('pt-BR'),
      timestamp: ST()
    });
    for (var k = 0; k < IP.length; k++) {
      var it = IP[k];
      var p = C.find(function(c) { return c.id === it.id; });
      if (p) {
        var nv = Math.max(0, p.estoque - it.qtd);
        await db.collection('cardapio').doc(it.id).update({estoque: nv});
        await db.collection('movimentacoes').add({
          tipo: 'saida', produto: p.nome, qtd: it.qtd,
          antes: p.estoque, depois: nv,
          motivo: 'Pedido de ' + nome, hora: hora(), timestamp: ST()
        });
      }
    }
    IP = [];
    document.getElementById('nomeCliente').value = '';
    document.getElementById('mesaObs').value = '';
    rIP();
    toast('✓ Pedido de ' + nome + ' finalizado! Total: ' + fmt(total));
  } catch(e) { toast('Erro ao salvar. Verifique a conexão.', 'error'); }
  btn.disabled = false; btn.innerHTML = '✓ Finalizar Pedido';
};

function rUlt() {
  var el = document.getElementById('ultimosPedidos');
  if (!V.length) { el.innerHTML = '<div class="empty" style="padding:28px"><span class="empty-icon">🧾</span>Sem pedidos ainda</div>'; return; }
  var html = '';
  V.slice(0, 8).forEach(function(v, i) {
    if (i > 0) html += '<div class="mini-sep"></div>';
    html += '<div class="mini-pedido">';
    html += '<div style="display:flex;justify-content:space-between;align-items:flex-start">';
    html += '<span class="mini-nome">' + v.cliente + '</span>';
    html += '<span class="mini-hora">' + v.hora + '</span></div>';
    if (v.obs) html += '<div class="mini-obs">' + v.obs + '</div>';
    html += '<div class="mini-itens">' + v.itens.map(function(i) { return i.qtd + '× ' + i.nome; }).join(' · ') + '</div>';
    html += '<div class="mini-total">' + fmt(v.total) + '</div>';
    html += '</div>';
  });
  el.innerHTML = html;
}

// ==========================================
// VENDAS
// ==========================================
function rVen() {
  var fat   = V.reduce(function(s,v) { return s + v.total; }, 0);
  var itens = V.reduce(function(s,v) { return s + v.itens.reduce(function(a,i) { return a + i.qtd; }, 0); }, 0);
  document.getElementById('metPedidos').textContent = V.length;
  document.getElementById('metFat').textContent     = fmt(fat);
  document.getElementById('metTicket').textContent  = V.length ? fmt(fat / V.length) : 'R$ 0,00';
  document.getElementById('metItens').textContent   = itens;

  var el = document.getElementById('listaVendas');
  if (!V.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">📊</span>Nenhum pedido ainda</div>'; return; }

  var html = '<table><thead><tr><th>Cliente</th><th>Obs</th><th>Itens</th><th>Data</th><th>Hora</th><th>Total</th><th>Ações</th></tr></thead><tbody>';
  V.forEach(function(v) {
    html += '<tr>';
    html += '<td style="font-weight:700;color:var(--t1)">' + v.cliente + '</td>';
    html += '<td style="color:var(--t3);font-size:12px">' + (v.obs || '—') + '</td>';
    html += '<td><div class="tag-wrap">' + v.itens.map(function(i) { return '<span class="badge-tag">' + i.qtd + '× ' + i.nome + '</span>'; }).join('') + '</div></td>';
    html += '<td style="color:var(--t3)">' + (v.data || '') + '</td>';
    html += '<td style="color:var(--t3)">' + v.hora + '</td>';
    html += '<td style="font-weight:900;color:var(--g1);font-size:14px">' + fmt(v.total) + '</td>';
    html += '<td><div style="display:flex;gap:6px">';
    html += '<button class="btn btn-edit btn-sm" onclick="abrirEdicao(\'' + v.id + '\')">✏️</button>';
    html += '<button class="btn btn-danger btn-sm" onclick="excluirPedido(\'' + v.id + '\',\'' + v.cliente + '\')">🗑</button>';
    html += '</div></td></tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

// ---- EDITAR / EXCLUIR PEDIDO ----
window.abrirEdicao = function(id) {
  var v = V.find(function(x) { return x.id === id; });
  if (!v) return;
  editId = id; editIL = v.itens.map(function(i) { return Object.assign({}, i); });
  document.getElementById('editNome').value = v.cliente;
  document.getElementById('editObs').value  = v.obs || '';
  rEditI();
  document.getElementById('modalBg').classList.add('open');
};
window.fecharModal = function() { document.getElementById('modalBg').classList.remove('open'); editId = null; editIL = []; };
document.getElementById('modalBg').addEventListener('click', function(e) { if (e.target === document.getElementById('modalBg')) fecharModal(); });

function rEditI() {
  var el = document.getElementById('editItens');
  if (!editIL.length) { el.innerHTML = '<div style="color:var(--t3);padding:12px;text-align:center;font-size:13px">Nenhum item</div>'; document.getElementById('editTotal').textContent = 'R$ 0,00'; return; }
  var t = 0, html = '';
  editIL.forEach(function(it, i) {
    t += it.preco * it.qtd;
    html += '<div class="item-row"><span class="item-name">' + it.nome + '</span>';
    html += '<div class="qty-ctrl"><button class="qty-btn" onclick="chgEQ(' + i + ',-1)">−</button><span class="qty-val">' + it.qtd + '</span><button class="qty-btn" onclick="chgEQ(' + i + ',1)">+</button></div>';
    html += '<span class="item-price">' + fmt(it.preco * it.qtd) + '</span>';
    html += '<button class="btn btn-danger btn-sm" onclick="remEI(' + i + ')">✕</button></div>';
  });
  el.innerHTML = html;
  document.getElementById('editTotal').textContent = fmt(t);
}
window.chgEQ = function(i, d) { editIL[i].qtd += d; if (editIL[i].qtd <= 0) editIL.splice(i, 1); rEditI(); };
window.remEI = function(i) { editIL.splice(i, 1); rEditI(); };

window.salvarEdicao = async function() {
  if (!editId) return;
  var nome  = document.getElementById('editNome').value.trim();
  var obs   = document.getElementById('editObs').value.trim();
  if (!nome)     { toast('Nome obrigatório!', 'error'); return; }
  if (!editIL.length) { toast('Adicione pelo menos um item!', 'error'); return; }
  var total = editIL.reduce(function(s, i) { return s + i.preco * i.qtd; }, 0);
  try {
    await db.collection('vendas').doc(editId).update({cliente: nome, obs: obs || '', itens: editIL, total: total});
    fecharModal(); toast('✓ Pedido atualizado!');
  } catch(e) { toast('Erro ao salvar.', 'error'); }
};

window.excluirPedido = async function(id, nome) {
  if (!confirm('Excluir o pedido de "' + nome + '"?')) return;
  try { await db.collection('vendas').doc(id).delete(); toast('Pedido excluído.'); }
  catch(e) { toast('Erro ao excluir.', 'error'); }
};

// ==========================================
// DASHBOARD
// ==========================================
function buildPie(data, total, size) {
  size = size || 200;
  if (!data.length || total === 0) return '<div style="width:'+size+'px;height:'+size+'px;display:flex;align-items:center;justify-content:center;color:var(--t3);font-size:12px">Sem dados</div>';

  // Se só tem 1 item, desenha círculo completo
  if (data.length === 1) {
    var col = PIE_COLORS[0];
    var cx = size/2, cy = size/2, r = size/2 - 10, ri = r * 0.52;
    var svg = '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">';
    svg += '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+col+'" opacity="0.9"/>';
    svg += '<circle cx="'+cx+'" cy="'+cy+'" r="'+ri+'" fill="#16161a"/>';
    svg += '<text x="'+cx+'" y="'+cy+'" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="12" font-weight="800" font-family="Inter,sans-serif">100%</text>';
    svg += '</svg>';
    return svg;
  }

  var cx = size/2, cy = size/2, r = size/2 - 10, ri = r * 0.5;
  var angle = -Math.PI / 2; // começa do topo
  var paths = '';

  data.forEach(function(item, idx) {
    var frac = item[1] / total;
    var sweep = frac * 2 * Math.PI;
    var endAngle = angle + sweep;
    var col = PIE_COLORS[idx % PIE_COLORS.length];
    var lg = sweep > Math.PI ? 1 : 0;

    // Fatia externa
    var x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    var x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
    // Furo interno
    var ix1 = cx + ri * Math.cos(angle), iy1 = cy + ri * Math.sin(angle);
    var ix2 = cx + ri * Math.cos(endAngle), iy2 = cy + ri * Math.sin(endAngle);

    var d = 'M '+ix1+' '+iy1+' L '+x1+' '+y1+' A '+r+' '+r+' 0 '+lg+' 1 '+x2+' '+y2+' L '+ix2+' '+iy2+' A '+ri+' '+ri+' 0 '+lg+' 0 '+ix1+' '+iy1+' Z';
    paths += '<path d="'+d+'" fill="'+col+'" stroke="#16161a" stroke-width="1.5">';
    paths += '<title>'+item[0]+': '+item[1]+' ('+Math.round(frac*100)+'%)</title></path>';

    // Label % no meio da fatia
    var pct = Math.round(frac * 100);
    if (pct >= 5) {
      var midA = angle + sweep/2;
      var lx = cx + (r*0.7) * Math.cos(midA);
      var ly = cy + (r*0.7) * Math.sin(midA);
      paths += '<text x="'+lx+'" y="'+ly+'" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="11" font-weight="800" font-family="Inter,sans-serif" style="pointer-events:none">'+pct+'%</text>';
    }
    angle = endAngle;
  });

  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'" xmlns="http://www.w3.org/2000/svg">'+paths+'</svg>';
}

function rDash() {
  var fat   = V.reduce(function(s,v) { return s + v.total; }, 0);
  var itens = V.reduce(function(s,v) { return s + v.itens.reduce(function(a,i) { return a + i.qtd; }, 0); }, 0);
  document.getElementById('d-pedidos').textContent = V.length;
  document.getElementById('d-fat').textContent     = fmt(fat);
  document.getElementById('d-itens').textContent   = itens;
  document.getElementById('d-ticket').textContent  = V.length ? fmt(fat / V.length) : 'R$ 0,00';

  var cont = {};
  V.forEach(function(v) { v.itens.forEach(function(it) { cont[it.nome] = (cont[it.nome] || 0) + it.qtd; }); });
  var sorted = Object.entries(cont).sort(function(a,b) { return b[1] - a[1]; });

  if (!sorted.length) {
    ['d-top','d-low','d-chart'].forEach(function(id) { document.getElementById(id).innerHTML = '<div class="empty"><span class="empty-icon">📊</span>Sem dados ainda</div>'; });
    return;
  }

  var totalI = sorted.reduce(function(s,x) { return s + x[1]; }, 0);
  var maxQ   = sorted[0][1];
  var medals = ['🥇','🥈','🥉','4°','5°','6°'];
  var gBg    = ['rgba(76,175,114,.2)','rgba(76,175,114,.14)','rgba(76,175,114,.1)','rgba(76,175,114,.07)','rgba(76,175,114,.05)','rgba(76,175,114,.04)'];
  var rBg    = ['rgba(208,96,96,.18)','rgba(208,96,96,.13)','rgba(208,96,96,.09)','rgba(208,96,96,.06)','rgba(208,96,96,.04)','rgba(208,96,96,.03)'];

  // Mais vendidos
  var html = '';
  sorted.slice(0, 6).forEach(function(x, i) {
    var pct = Math.round(x[1]/maxQ*100), share = Math.round(x[1]/totalI*100);
    html += '<div style="background:' + gBg[i] + ';border-radius:10px;margin:3px 0;padding:10px 12px;display:flex;align-items:center;gap:10px">';
    html += '<div style="width:28px;height:28px;border-radius:7px;background:rgba(76,175,114,.2);border:1px solid rgba(76,175,114,.3);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">' + medals[i] + '</div>';
    html += '<span style="flex:1;font-size:13px;color:var(--t1);font-weight:600">' + x[0] + '</span>';
    html += '<div style="flex:2;background:rgba(0,0,0,.2);border-radius:4px;height:5px;overflow:hidden;margin:0 10px"><div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,#4caf72,#6dc87d);border-radius:4px"></div></div>';
    html += '<div style="text-align:right;flex-shrink:0"><div style="font-size:13px;font-weight:800;color:#6dc87d">' + x[1] + '</div><div style="font-size:10px;color:var(--t3)">' + share + '%</div></div>';
    html += '</div>';
  });
  document.getElementById('d-top').innerHTML = html;

  // Menos vendidos
  html = '';
  var low = [...sorted].reverse();
  low.slice(0, 6).forEach(function(x, i) {
    var pct = Math.max(2, Math.round(x[1]/maxQ*100));
    html += '<div style="background:' + rBg[i] + ';border-radius:10px;margin:3px 0;padding:10px 12px;display:flex;align-items:center;gap:10px">';
    html += '<span style="flex:1;font-size:13px;color:var(--t2);font-weight:500">' + x[0] + '</span>';
    html += '<div style="flex:2;background:rgba(0,0,0,.2);border-radius:4px;height:5px;overflow:hidden;margin:0 10px"><div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,#a03030,#d06060);border-radius:4px"></div></div>';
    html += '<span style="font-size:13px;font-weight:800;color:#e08080;flex-shrink:0">' + x[1] + ' un.</span>';
    html += '</div>';
  });
  document.getElementById('d-low').innerHTML = html;

  // Pizza
  var pieData   = sorted.slice(0, 10);
  var fatPor = {};
  V.forEach(function(v) { v.itens.forEach(function(it) { fatPor[it.nome] = (fatPor[it.nome] || 0) + it.preco * it.qtd; }); });
  var sortedFat = Object.entries(fatPor).sort(function(a,b) { return b[1] - a[1]; }).slice(0, 10);
  var totalFat  = sortedFat.reduce(function(s,x) { return s + x[1]; }, 0);

  var leg1 = '', leg2 = '';
  pieData.forEach(function(x, i) {
    var col = PIE_COLORS[i % PIE_COLORS.length], pct = Math.round(x[1]/totalI*100);
    leg1 += '<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:7px">';
    leg1 += '<span style="width:9px;height:9px;border-radius:50%;background:' + col + ';flex-shrink:0"></span>';
    leg1 += '<span style="flex:1;font-size:12px;color:var(--t1)">' + x[0] + '</span>';
    leg1 += '<span style="font-size:12px;font-weight:800;color:' + col + '">' + x[1] + '</span>';
    leg1 += '<span style="font-size:11px;color:var(--t3);min-width:30px;text-align:right">' + pct + '%</span></div>';
  });
  sortedFat.forEach(function(x, i) {
    var col = PIE_COLORS[i % PIE_COLORS.length], pct = Math.round(x[1]/totalFat*100);
    leg2 += '<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:7px">';
    leg2 += '<span style="width:9px;height:9px;border-radius:50%;background:' + col + ';flex-shrink:0"></span>';
    leg2 += '<span style="flex:1;font-size:12px;color:var(--t1)">' + x[0] + '</span>';
    leg2 += '<span style="font-size:12px;font-weight:800;color:' + col + '">' + fmt(x[1]) + '</span>';
    leg2 += '<span style="font-size:11px;color:var(--t3);min-width:30px;text-align:right">' + pct + '%</span></div>';
  });

  document.getElementById('d-chart').innerHTML =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px">' +
    '<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--t3);margin-bottom:16px">🥧 Quantidade Vendida</div>' +
    '<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap"><div style="flex-shrink:0">' + buildPie(pieData, totalI, 190) + '</div>' +
    '<div style="flex:1;min-width:150px">' + leg1 + '</div></div></div>' +
    '<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--t3);margin-bottom:16px">💰 Faturamento</div>' +
    '<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap"><div style="flex-shrink:0">' + buildPie(sortedFat, totalFat, 190) + '</div>' +
    '<div style="flex:1;min-width:150px">' + leg2 + '</div></div></div></div>';
}

// ==========================================
// ESTOQUE
// ==========================================
window.entradaEstoque = async function() {
  var id  = document.getElementById('selEstoque').value;
  if (!id) { toast('Selecione um produto!', 'error'); return; }
  var qtd = parseInt(document.getElementById('qtdEstoque').value) || 0;
  if (qtd <= 0) { toast('Quantidade inválida!', 'error'); return; }
  var obs = document.getElementById('obsEstoque').value.trim() || 'Entrada manual';
  var p   = C.find(function(c) { return c.id === id; });
  try {
    var nv = p.estoque + qtd;
    await db.collection('cardapio').doc(id).update({estoque: nv});
    await db.collection('movimentacoes').add({tipo:'entrada', produto:p.nome, qtd:qtd, antes:p.estoque, depois:nv, motivo:obs, hora:hora(), timestamp:ST()});
    document.getElementById('selEstoque').value = '';
    document.getElementById('qtdEstoque').value = '10';
    document.getElementById('obsEstoque').value = '';
    toast('✓ ' + qtd + '× "' + p.nome + '" adicionado!');
  } catch(e) { toast('Erro ao registrar.', 'error'); }
};

function rEst() {
  var el = document.getElementById('tabelaEstoque');
  if (!C.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">📦</span>Cadastre produtos no cardápio</div>'; return; }
  var html = '<table><thead><tr><th>Produto</th><th>Quantidade</th><th>Nível</th><th>Status</th></tr></thead><tbody>';
  C.forEach(function(p) {
    var pct = Math.min(100, Math.round(p.estoque / (p.minEstoque * 4) * 100));
    var cor = p.estoque <= 0 ? 'var(--red)' : p.estoque <= p.minEstoque ? 'var(--g1)' : '#6dc87d';
    var cls = p.estoque <= 0 ? 'badge-out' : p.estoque <= p.minEstoque ? 'badge-low' : 'badge-ok';
    var txt = p.estoque <= 0 ? 'Esgotado' : p.estoque <= p.minEstoque ? 'Baixo' : 'OK';
    html += '<tr><td style="font-weight:600;color:var(--t1)">' + p.nome + '</td>';
    html += '<td><b style="color:var(--t1);font-size:15px">' + p.estoque + '</b><span style="color:var(--t3);font-size:11px;margin-left:5px">/ mín ' + p.minEstoque + '</span></td>';
    html += '<td><div class="estoque-bar"><div class="estoque-fill" style="width:' + pct + '%;background:' + cor + '"></div></div></td>';
    html += '<td><span class="badge ' + cls + '">' + txt + '</span></td></tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

function rMov() {
  var h = document.getElementById('historicoEstoque');
  if (!M.length) { h.innerHTML = '<div class="empty"><span class="empty-icon">🕓</span>Sem movimentações</div>'; return; }
  var html = '<table><thead><tr><th>Tipo</th><th>Produto</th><th>Qtd</th><th>Antes → Depois</th><th>Motivo</th><th>Hora</th></tr></thead><tbody>';
  M.slice(0, 25).forEach(function(m) {
    html += '<tr><td><span class="badge ' + (m.tipo==='entrada' ? 'badge-in' : 'badge-saida') + '">' + (m.tipo==='entrada' ? '↑ Entrada' : '↓ Saída') + '</span></td>';
    html += '<td style="color:var(--t2)">' + m.produto + '</td>';
    html += '<td style="font-weight:700;color:var(--t1)">' + m.qtd + '</td>';
    html += '<td style="color:var(--t3);font-size:12px">' + m.antes + ' → ' + m.depois + '</td>';
    html += '<td style="color:var(--t3)">' + m.motivo + '</td>';
    html += '<td style="color:var(--t3)">' + m.hora + '</td></tr>';
  });
  html += '</tbody></table>';
  h.innerHTML = html;
}

// ==========================================
// CARDÁPIO
// ==========================================
window.salvarItem = async function() {
  var nm = document.getElementById('nomeItem').value.trim();
  var ct = document.getElementById('catItem').value;
  var pr = parseFloat(document.getElementById('precoItem').value);
  var es = parseInt(document.getElementById('estoqueItem').value) || 0;
  var mn = parseInt(document.getElementById('minEstoque').value) || 5;
  if (!nm || isNaN(pr)) { toast('Preencha nome e preço!', 'error'); return; }
  var maxCod = C.length ? Math.max.apply(null, C.map(function(c) { return parseInt(c.codigo) || 0; })) : 0;
  var cd = String(maxCod + 1).padStart(2, '0');
  try {
    await db.collection('cardapio').add({codigo:cd, nome:nm, categoria:ct, preco:pr, estoque:es, minEstoque:mn, timestamp:ST()});
    document.getElementById('nomeItem').value   = '';
    document.getElementById('precoItem').value  = '';
    toast('✓ "' + nm + '" adicionado!');
  } catch(e) { toast('Erro ao salvar.', 'error'); }
};

window.excluirItem = async function(id) {
  var p = C.find(function(c) { return c.id === id; });
  if (!confirm('Excluir "' + p.nome + '"?')) return;
  try { await db.collection('cardapio').doc(id).delete(); toast('"' + p.nome + '" removido.'); }
  catch(e) { toast('Erro ao excluir.', 'error'); }
};

window.abrirEditItem = function(id) {
  var p = C.find(function(c) { return c.id === id; });
  if (!p) return;
  document.getElementById('editItemId').value       = id;
  document.getElementById('editItemNome').value     = p.nome;
  document.getElementById('editItemPreco').value    = p.preco;
  document.getElementById('editItemEstoque').value  = p.estoque;
  document.getElementById('editItemMin').value      = p.minEstoque;
  document.getElementById('editItemCat').value      = p.categoria;
  document.getElementById('modalItemBg').classList.add('open');
};
window.fecharModalItem = function() { document.getElementById('modalItemBg').classList.remove('open'); };
document.getElementById('modalItemBg').addEventListener('click', function(e) {
  if (e.target === document.getElementById('modalItemBg')) fecharModalItem();
});

window.salvarEditItem = async function() {
  var id = document.getElementById('editItemId').value;
  var nm = document.getElementById('editItemNome').value.trim();
  var pr = parseFloat(document.getElementById('editItemPreco').value);
  var es = parseInt(document.getElementById('editItemEstoque').value) || 0;
  var mn = parseInt(document.getElementById('editItemMin').value) || 0;
  var ct = document.getElementById('editItemCat').value;
  if (!nm || isNaN(pr)) { toast('Preencha nome e preço!', 'error'); return; }
  try {
    await db.collection('cardapio').doc(id).update({nome:nm, preco:pr, estoque:es, minEstoque:mn, categoria:ct});
    fecharModalItem(); toast('✓ Item atualizado!');
  } catch(e) { toast('Erro ao salvar.', 'error'); }
};

function rCard() {
  var el = document.getElementById('tabelaCardapio');
  if (!C.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">📖</span>Nenhum item cadastrado</div>'; return; }
  var cats = [...new Set(C.map(function(i) { return i.categoria; }))];
  var html = '';
  cats.forEach(function(cat) {
    html += '<div style="margin-bottom:24px"><div class="cat-label">' + cat + '</div>';
    html += '<table><thead><tr><th>Nome</th><th>Preço</th><th>Estoque</th><th>Mínimo</th><th>Ações</th></tr></thead><tbody>';
    C.filter(function(i) { return i.categoria === cat; }).forEach(function(i) {
      var ecor = i.estoque <= 0 ? 'var(--red)' : i.estoque <= i.minEstoque ? 'var(--g1)' : '#6dc87d';
      html += '<tr>';
      html += '<td style="font-weight:600;color:var(--t1)">' + i.nome + '</td>';
      html += '<td style="font-weight:800;color:var(--g1);font-size:14px">' + fmt(i.preco) + '</td>';
      html += '<td><b style="font-size:15px;color:' + ecor + '">' + i.estoque + '</b></td>';
      html += '<td style="color:var(--t3)">' + i.minEstoque + '</td>';
      html += '<td><div style="display:flex;gap:6px">';
      html += '<button class="btn btn-edit btn-sm" onclick="abrirEditItem(\'' + i.id + '\')">✏️ Editar</button>';
      html += '<button class="btn btn-danger btn-sm" onclick="excluirItem(\'' + i.id + '\')">🗑</button>';
      html += '</div></td></tr>';
    });
    html += '</tbody></table></div>';
  });
  el.innerHTML = html;
}
