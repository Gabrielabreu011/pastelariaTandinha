/* ===========================
   PASTELARIA — SCRIPT.JS
   =========================== */

// ---- ESTADO ----
let cardapio = [
  { id:1, codigo:'01', nome:'Pastel de Carne',     categoria:'Pastel Salgado', preco:8.00, estoque:30, minEstoque:5  },
  { id:2, codigo:'02', nome:'Pastel de Queijo',    categoria:'Pastel Salgado', preco:7.00, estoque:30, minEstoque:5  },
  { id:3, codigo:'03', nome:'Pastel de Frango',    categoria:'Pastel Salgado', preco:8.50, estoque:25, minEstoque:5  },
  { id:4, codigo:'04', nome:'Pastel de Pizza',     categoria:'Pastel Salgado', preco:9.00, estoque:20, minEstoque:5  },
  { id:5, codigo:'05', nome:'Pastel de Chocolate', categoria:'Pastel Doce',    preco:7.50, estoque:15, minEstoque:3  },
  { id:6, codigo:'06', nome:'Caldo de Cana',       categoria:'Bebida',         preco:5.00, estoque:50, minEstoque:10 },
];

let vendas        = [];
let movimentacoes = [];
let itensPedido   = [];
let pedidoNum     = 1;
let idCounter     = 7;


// ---- UTILITÁRIOS ----
const fmt  = v => v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
const hora = () => new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });


// ---- RELÓGIO ----
function atualizarRelogio() {
  const el = document.getElementById('clock');
  if (el) el.textContent = hora();
}
atualizarRelogio();
setInterval(atualizarRelogio, 1000);


// ---- NAVEGAÇÃO ----
function setTab(t) {
  ['pedido','vendas','estoque','cardapio'].forEach((n, i) => {
    document.querySelectorAll('.ntab')[i].classList.toggle('active', n === t);
    document.getElementById('page-' + n).classList.toggle('active', n === t);
  });
  if (t === 'vendas')   renderVendas();
  if (t === 'estoque')  renderEstoque();
  if (t === 'cardapio') renderCardapio();
}


// ---- SELECTS ----
function preencherSelects() {
  const s1 = document.getElementById('selItem');
  s1.innerHTML = '<option value="">— Selecionar —</option>';
  cardapio.forEach(i => {
    const o = document.createElement('option');
    o.value = i.id;
    o.textContent = `[${i.codigo}] ${i.nome}  —  ${fmt(i.preco)}`;
    s1.appendChild(o);
  });

  const s2 = document.getElementById('selEstoque');
  s2.innerHTML = '<option value="">— Selecionar —</option>';
  cardapio.forEach(i => {
    const o = document.createElement('option');
    o.value = i.id;
    o.textContent = `[${i.codigo}] ${i.nome}`;
    s2.appendChild(o);
  });
}


// ---- PEDIDOS ----
function initPedido() {
  document.getElementById('numPedido').value = '#' + String(pedidoNum).padStart(4, '0');
  preencherSelects();
}

function adicionarItem() {
  const id   = parseInt(document.getElementById('selItem').value);
  if (!id) return;
  const prod = cardapio.find(c => c.id === id);
  const qtd  = parseInt(document.getElementById('qtdItem').value) || 1;
  const ex   = itensPedido.find(i => i.id === id);

  if (ex) ex.qtd += qtd;
  else itensPedido.push({ id, codigo:prod.codigo, nome:prod.nome, preco:prod.preco, qtd });

  document.getElementById('selItem').value = '';
  document.getElementById('qtdItem').value = '1';
  renderItensPedido();
}

function renderItensPedido() {
  const el = document.getElementById('itensPedido');
  if (!itensPedido.length) {
    el.innerHTML = '<div class="empty"><span class="empty-icon">🛒</span>Nenhum item adicionado</div>';
    document.getElementById('totalPedido').textContent = 'R$ 0,00';
    return;
  }

  let total = 0;
  el.innerHTML = itensPedido.map((it, i) => {
    total += it.preco * it.qtd;
    return `
      <div class="item-row">
        <span class="code">${it.codigo}</span>
        <span class="item-name">${it.nome}</span>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="chgQtd(${i}, -1)">−</button>
          <span class="qty-val">${it.qtd}</span>
          <button class="qty-btn" onclick="chgQtd(${i}, 1)">+</button>
        </div>
        <span class="item-price">${fmt(it.preco * it.qtd)}</span>
        <button class="btn btn-danger btn-sm" onclick="remItem(${i})">✕</button>
      </div>`;
  }).join('');

  document.getElementById('totalPedido').textContent = fmt(total);
}

function chgQtd(i, d) {
  itensPedido[i].qtd += d;
  if (itensPedido[i].qtd <= 0) itensPedido.splice(i, 1);
  renderItensPedido();
}

function remItem(i) {
  itensPedido.splice(i, 1);
  renderItensPedido();
}

function limparPedido() {
  if (itensPedido.length && !confirm('Limpar todos os itens?')) return;
  itensPedido = [];
  renderItensPedido();
}

function finalizarPedido() {
  const nome = document.getElementById('nomeCliente').value.trim();
  if (!nome)               { alert('Informe o nome do cliente!'); return; }
  if (!itensPedido.length) { alert('Adicione pelo menos um item!'); return; }

  const total = itensPedido.reduce((s, i) => s + i.preco * i.qtd, 0);
  const pedido = {
    num:    '#' + String(pedidoNum).padStart(4, '0'),
    cliente: nome,
    itens:  [...itensPedido],
    total,
    hora:   hora(),
    data:   new Date().toLocaleDateString('pt-BR'),
  };

  // Baixa estoque automaticamente
  itensPedido.forEach(it => {
    const prod = cardapio.find(c => c.id === it.id);
    if (prod) {
      const antes  = prod.estoque;
      prod.estoque = Math.max(0, prod.estoque - it.qtd);
      movimentacoes.unshift({
        tipo: 'saida', produto: prod.nome,
        qtd: it.qtd, antes, depois: prod.estoque,
        motivo: `Pedido ${pedido.num}`, hora: pedido.hora,
      });
    }
  });

  vendas.unshift(pedido);
  pedidoNum++;
  itensPedido = [];
  document.getElementById('nomeCliente').value = '';
  initPedido();
  renderItensPedido();
  renderUltimos();
  alert(`✓ Pedido ${pedido.num} finalizado!\n${nome} — ${fmt(total)}`);
}

function renderUltimos() {
  const el = document.getElementById('ultimosPedidos');
  if (!vendas.length) {
    el.innerHTML = '<div class="empty" style="padding:20px"><span class="empty-icon">🧾</span>Sem pedidos</div>';
    return;
  }
  el.innerHTML = vendas.slice(0, 7).map(v => `
    <div class="mini-pedido">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:700;font-size:12px;color:#c8752a">${v.num}</span>
        <span style="font-size:11px;color:#333">${v.hora}</span>
      </div>
      <div style="font-size:13px;color:#bbb;margin-top:2px">${v.cliente}</div>
      <div style="font-size:12px;font-weight:700;color:#3d9e6e;margin-top:2px">${fmt(v.total)}</div>
    </div>`).join('');
}


// ---- VENDAS ----
function renderVendas() {
  const fat   = vendas.reduce((s, v) => s + v.total, 0);
  const itens = vendas.reduce((s, v) => s + v.itens.reduce((a, i) => a + i.qtd, 0), 0);

  document.getElementById('metPedidos').textContent = vendas.length;
  document.getElementById('metFat').textContent     = fmt(fat);
  document.getElementById('metTicket').textContent  = vendas.length ? fmt(fat / vendas.length) : 'R$ 0,00';
  document.getElementById('metItens').textContent   = itens;

  const el = document.getElementById('listaVendas');
  if (!vendas.length) {
    el.innerHTML = '<div class="empty"><span class="empty-icon">📊</span>Nenhum pedido ainda</div>';
    return;
  }

  el.innerHTML = `
    <table>
      <thead>
        <tr><th>Pedido</th><th>Cliente</th><th>Itens</th><th>Hora</th><th>Total</th></tr>
      </thead>
      <tbody>
        ${vendas.map(v => `
          <tr>
            <td><span class="code">${v.num}</span></td>
            <td style="font-weight:600;color:#f0ede8">${v.cliente}</td>
            <td>
              <div class="tag-wrap">
                ${v.itens.map(i => `<span class="badge badge-tag">${i.qtd}× ${i.nome}</span>`).join('')}
              </div>
            </td>
            <td style="color:#333">${v.hora}</td>
            <td style="font-weight:700;color:#c8752a">${fmt(v.total)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}


// ---- ESTOQUE ----
function entradaEstoque() {
  const id  = parseInt(document.getElementById('selEstoque').value);
  if (!id) { alert('Selecione um produto!'); return; }
  const qtd = parseInt(document.getElementById('qtdEstoque').value) || 0;
  if (qtd <= 0) { alert('Quantidade inválida!'); return; }
  const obs  = document.getElementById('obsEstoque').value.trim() || 'Entrada manual';
  const prod = cardapio.find(c => c.id === id);
  const antes = prod.estoque;
  prod.estoque += qtd;

  movimentacoes.unshift({
    tipo: 'entrada', produto: prod.nome,
    qtd, antes, depois: prod.estoque,
    motivo: obs, hora: hora(),
  });

  document.getElementById('selEstoque').value = '';
  document.getElementById('qtdEstoque').value = '10';
  document.getElementById('obsEstoque').value = '';
  renderEstoque();
  alert(`✓ ${qtd}× "${prod.nome}" adicionado ao estoque!`);
}

function renderEstoque() {
  const el = document.getElementById('tabelaEstoque');
  if (!cardapio.length) {
    el.innerHTML = '<div class="empty"><span class="empty-icon">📦</span>Cadastre produtos no cardápio</div>';
  } else {
    el.innerHTML = `
      <table>
        <thead><tr><th>Cód</th><th>Produto</th><th>Qtd / Mín</th><th>Nível</th><th>Status</th></tr></thead>
        <tbody>
          ${cardapio.map(p => {
            const pct = Math.min(100, Math.round(p.estoque / (p.minEstoque * 4) * 100));
            const cor = p.estoque <= 0 ? '#e24b4a' : p.estoque <= p.minEstoque ? '#d49020' : '#3d9e6e';
            const cls = p.estoque <= 0 ? 'badge-out' : p.estoque <= p.minEstoque ? 'badge-low' : 'badge-ok';
            const txt = p.estoque <= 0 ? 'Esgotado' : p.estoque <= p.minEstoque ? 'Baixo' : 'OK';
            return `
              <tr>
                <td><span class="code">${p.codigo}</span></td>
                <td style="font-weight:600;color:#ccc">${p.nome}</td>
                <td>
                  <span style="font-weight:700;color:#f0ede8">${p.estoque}</span>
                  <span style="color:#333;font-size:11px"> / mín ${p.minEstoque}</span>
                  <div class="estoque-bar">
                    <div class="estoque-fill" style="width:${pct}%;background:${cor}"></div>
                  </div>
                </td>
                <td style="width:80px">
                  <div class="estoque-bar" style="width:80px">
                    <div class="estoque-fill" style="width:${pct}%;background:${cor}"></div>
                  </div>
                </td>
                <td><span class="badge ${cls}">${txt}</span></td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  const h = document.getElementById('historicoEstoque');
  if (!movimentacoes.length) {
    h.innerHTML = '<div class="empty"><span class="empty-icon">🕓</span>Sem movimentações</div>';
    return;
  }
  h.innerHTML = `
    <table>
      <thead><tr><th>Tipo</th><th>Produto</th><th>Qtd</th><th>Antes → Depois</th><th>Motivo</th><th>Hora</th></tr></thead>
      <tbody>
        ${movimentacoes.slice(0, 20).map(m => `
          <tr>
            <td><span class="badge ${m.tipo === 'entrada' ? 'badge-in' : 'badge-saida'}">${m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}</span></td>
            <td style="color:#bbb">${m.produto}</td>
            <td style="font-weight:700;color:#f0ede8">${m.qtd}</td>
            <td style="color:#333;font-size:12px">${m.antes} → ${m.depois}</td>
            <td style="color:#444">${m.motivo}</td>
            <td style="color:#333">${m.hora}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}


// ---- CARDÁPIO ----
function salvarItem() {
  const codigo  = document.getElementById('novoCodigo').value.trim();
  const nome    = document.getElementById('nomeItem').value.trim();
  const cat     = document.getElementById('catItem').value;
  const preco   = parseFloat(document.getElementById('precoItem').value);
  const estoque = parseInt(document.getElementById('estoqueItem').value) || 0;
  const min     = parseInt(document.getElementById('minEstoque').value) || 5;

  if (!codigo || !nome || isNaN(preco)) { alert('Preencha código, nome e preço!'); return; }
  if (cardapio.find(c => c.codigo === codigo)) { alert(`Código "${codigo}" já existe!`); return; }

  cardapio.push({ id: idCounter++, codigo, nome, categoria: cat, preco, estoque, minEstoque: min });

  document.getElementById('novoCodigo').value  = '';
  document.getElementById('nomeItem').value    = '';
  document.getElementById('precoItem').value   = '';
  document.getElementById('estoqueItem').value = '20';
  document.getElementById('minEstoque').value  = '5';

  preencherSelects();
  renderCardapio();
  alert(`✓ "${nome}" adicionado ao cardápio!`);
}

function excluirItem(id) {
  const prod = cardapio.find(c => c.id === id);
  if (!confirm(`Excluir "${prod.nome}"?`)) return;
  cardapio = cardapio.filter(c => c.id !== id);
  preencherSelects();
  renderCardapio();
}

function renderCardapio() {
  const el = document.getElementById('tabelaCardapio');
  if (!cardapio.length) {
    el.innerHTML = '<div class="empty"><span class="empty-icon">📖</span>Nenhum item cadastrado</div>';
    return;
  }

  const cats = [...new Set(cardapio.map(i => i.categoria))];
  el.innerHTML = cats.map(cat => `
    <div style="margin-bottom:20px">
      <div class="cat-label">${cat}</div>
      <table>
        <thead><tr><th>Cód</th><th>Nome</th><th>Preço</th><th>Estoque</th><th></th></tr></thead>
        <tbody>
          ${cardapio.filter(i => i.categoria === cat).map(i => `
            <tr>
              <td><span class="code">${i.codigo}</span></td>
              <td style="font-weight:600;color:#ccc">${i.nome}</td>
              <td style="font-weight:700;color:#c8752a">${fmt(i.preco)}</td>
              <td style="color:#bbb">${i.estoque}</td>
              <td><button class="btn btn-danger btn-sm" onclick="excluirItem(${i.id})">Excluir</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`).join('');
}


// ---- INIT ----
initPedido();
