/* ===========================
   SISTEMA PASTELARIA - JS
   =========================== */

// ---- ESTADO INICIAL ----

let cardapio = [
  { id: 1, codigo: '01', nome: 'Pastel de Carne',      categoria: 'Pastel Salgado', preco: 8.00,  estoque: 30, minEstoque: 5 },
  { id: 2, codigo: '02', nome: 'Pastel de Queijo',     categoria: 'Pastel Salgado', preco: 7.00,  estoque: 30, minEstoque: 5 },
  { id: 3, codigo: '03', nome: 'Pastel de Frango',     categoria: 'Pastel Salgado', preco: 8.50,  estoque: 25, minEstoque: 5 },
  { id: 4, codigo: '04', nome: 'Pastel de Pizza',      categoria: 'Pastel Salgado', preco: 9.00,  estoque: 20, minEstoque: 5 },
  { id: 5, codigo: '05', nome: 'Pastel de Chocolate',  categoria: 'Pastel Doce',    preco: 7.50,  estoque: 15, minEstoque: 3 },
  { id: 6, codigo: '06', nome: 'Caldo de Cana',        categoria: 'Bebida',         preco: 5.00,  estoque: 50, minEstoque: 10 },
];

let vendas          = [];
let movimentacoes   = [];
let itensPedido     = [];
let pedidoNum       = 1;
let idCounter       = 7;


// ---- UTILITÁRIOS ----

function fmt(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function horaAgora() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function dataHoje() {
  return new Date().toLocaleDateString('pt-BR');
}


// ---- NAVEGAÇÃO ----

function setTab(t) {
  const nomes = ['pedido', 'vendas', 'estoque', 'cardapio'];
  document.querySelectorAll('.tab').forEach((el, i) => {
    el.classList.toggle('active', nomes[i] === t);
  });
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.getElementById('page-' + t).classList.add('active');

  if (t === 'vendas')   renderVendas();
  if (t === 'estoque')  renderEstoque();
  if (t === 'cardapio') renderCardapio();
}


// ---- SELECTS (cardápio → selects de pedido e estoque) ----

function preencherSelects() {
  // Select de pedido
  const selItem = document.getElementById('selItem');
  selItem.innerHTML = '<option value="">— Selecionar item —</option>';
  cardapio.forEach(i => {
    const op = document.createElement('option');
    op.value = i.id;
    op.textContent = `[${i.codigo}] ${i.nome} — ${fmt(i.preco)}`;
    selItem.appendChild(op);
  });

  // Select de estoque
  const selEst = document.getElementById('selEstoque');
  selEst.innerHTML = '<option value="">— Selecionar —</option>';
  cardapio.forEach(i => {
    const op = document.createElement('option');
    op.value = i.id;
    op.textContent = `[${i.codigo}] ${i.nome}`;
    selEst.appendChild(op);
  });
}


// ---- ABA PEDIDOS ----

function initPedido() {
  document.getElementById('numPedido').value = '#' + String(pedidoNum).padStart(4, '0');
  preencherSelects();
}

function adicionarItem() {
  const id  = parseInt(document.getElementById('selItem').value);
  if (!id) return;
  const prod = cardapio.find(c => c.id === id);
  if (!prod) return;
  const qtd  = parseInt(document.getElementById('qtdItem').value) || 1;

  const exist = itensPedido.find(i => i.id === id);
  if (exist) {
    exist.qtd += qtd;
  } else {
    itensPedido.push({ id, codigo: prod.codigo, nome: prod.nome, preco: prod.preco, qtd });
  }

  document.getElementById('selItem').value = '';
  document.getElementById('qtdItem').value = '1';
  renderItensPedido();
}

function renderItensPedido() {
  const el = document.getElementById('itensPedido');
  if (!itensPedido.length) {
    el.innerHTML = '<div class="empty">Nenhum item adicionado</div>';
    document.getElementById('totalPedido').textContent = 'R$ 0,00';
    return;
  }

  let total = 0;
  el.innerHTML = itensPedido.map((it, idx) => {
    total += it.preco * it.qtd;
    return `
      <div class="item-row">
        <span class="code-badge">${it.codigo}</span>
        <span style="flex:1;font-size:13px">${it.nome}</span>
        <div style="display:flex;align-items:center;gap:6px">
          <button class="btn btn-sm" onclick="chgQtd(${idx}, -1)">−</button>
          <span style="min-width:22px;text-align:center;font-weight:600">${it.qtd}</span>
          <button class="btn btn-sm" onclick="chgQtd(${idx}, 1)">+</button>
        </div>
        <span style="min-width:75px;text-align:right;font-weight:600">${fmt(it.preco * it.qtd)}</span>
        <button class="btn btn-sm btn-danger" onclick="remItem(${idx})">✕</button>
      </div>`;
  }).join('');

  document.getElementById('totalPedido').textContent = fmt(total);
}

function chgQtd(idx, d) {
  itensPedido[idx].qtd += d;
  if (itensPedido[idx].qtd <= 0) itensPedido.splice(idx, 1);
  renderItensPedido();
}

function remItem(idx) {
  itensPedido.splice(idx, 1);
  renderItensPedido();
}

function limparPedido() {
  if (itensPedido.length && !confirm('Limpar todos os itens do pedido?')) return;
  itensPedido = [];
  renderItensPedido();
}

function finalizarPedido() {
  const nome = document.getElementById('nomeCliente').value.trim();
  if (!nome)              { alert('Informe o nome do cliente!'); return; }
  if (!itensPedido.length){ alert('Adicione pelo menos um item!'); return; }

  const total = itensPedido.reduce((s, i) => s + i.preco * i.qtd, 0);
  const pedido = {
    num:    '#' + String(pedidoNum).padStart(4, '0'),
    cliente: nome,
    itens:  [...itensPedido],
    total,
    hora:   horaAgora(),
    data:   dataHoje(),
  };

  // Baixa estoque
  itensPedido.forEach(it => {
    const prod = cardapio.find(c => c.id === it.id);
    if (prod) {
      const antes     = prod.estoque;
      prod.estoque    = Math.max(0, prod.estoque - it.qtd);
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
  alert(`✓ Pedido ${pedido.num} finalizado!\nCliente: ${nome}\nTotal: ${fmt(total)}`);
}


// ---- ABA CONTROLE DE VENDAS ----

function renderVendas() {
  const fat   = vendas.reduce((s, v) => s + v.total, 0);
  const itens = vendas.reduce((s, v) => s + v.itens.reduce((a, i) => a + i.qtd, 0), 0);

  document.getElementById('metPedidos').textContent    = vendas.length;
  document.getElementById('metFaturamento').textContent = fmt(fat);
  document.getElementById('metTicket').textContent      = vendas.length ? fmt(fat / vendas.length) : 'R$ 0,00';
  document.getElementById('metItens').textContent       = itens;

  const el = document.getElementById('listaVendas');
  if (!vendas.length) {
    el.innerHTML = '<div class="empty">Nenhum pedido realizado ainda</div>';
    return;
  }

  el.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Pedido</th><th>Cliente</th><th>Itens</th><th>Hora</th><th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${vendas.map(v => `
          <tr>
            <td><span class="code-badge">${v.num}</span></td>
            <td style="font-weight:600">${v.cliente}</td>
            <td>
              <div class="tag-wrap">
                ${v.itens.map(i =>
                  `<span class="badge badge-info">${i.qtd}x [${i.codigo}] ${i.nome}</span>`
                ).join('')}
              </div>
            </td>
            <td style="color:#6b6b67">${v.hora}</td>
            <td style="font-weight:700;color:#1D9E75">${fmt(v.total)}</td>
          </tr>`
        ).join('')}
      </tbody>
    </table>`;
}


// ---- ABA ESTOQUE ----

function entradaEstoque() {
  const id  = parseInt(document.getElementById('selEstoque').value);
  if (!id) { alert('Selecione um produto!'); return; }
  const qtd = parseInt(document.getElementById('qtdEstoque').value) || 0;
  if (qtd <= 0) { alert('Informe uma quantidade válida!'); return; }
  const obs  = document.getElementById('obsEstoque').value.trim() || 'Entrada manual';
  const prod = cardapio.find(c => c.id === id);
  const antes = prod.estoque;
  prod.estoque += qtd;

  movimentacoes.unshift({
    tipo: 'entrada', produto: prod.nome,
    qtd, antes, depois: prod.estoque,
    motivo: obs, hora: horaAgora(),
  });

  document.getElementById('selEstoque').value = '';
  document.getElementById('qtdEstoque').value = '10';
  document.getElementById('obsEstoque').value = '';
  renderEstoque();
  alert(`✓ Entrada de ${qtd} unidade(s) de "${prod.nome}" registrada!`);
}

function renderEstoque() {
  const el = document.getElementById('tabelaEstoque');
  if (!cardapio.length) {
    el.innerHTML = '<div class="empty">Cadastre produtos no cardápio para gerenciar o estoque</div>';
  } else {
    el.innerHTML = `
      <table>
        <thead>
          <tr><th>Cód</th><th>Produto</th><th>Qtd / Mínimo</th><th>Nível</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${cardapio.map(p => {
            const pct   = Math.min(100, Math.round(p.estoque / (p.minEstoque * 4) * 100));
            const cor   = p.estoque <= 0 ? '#E24B4A' : p.estoque <= p.minEstoque ? '#EF9F27' : '#1D9E75';
            const badge = p.estoque <= 0 ? 'badge-danger' : p.estoque <= p.minEstoque ? 'badge-warning' : 'badge-success';
            const txt   = p.estoque <= 0 ? 'Esgotado' : p.estoque <= p.minEstoque ? 'Baixo' : 'OK';
            return `
              <tr>
                <td><span class="code-badge">${p.codigo}</span></td>
                <td style="font-weight:600">${p.nome}</td>
                <td>${p.estoque} <span style="color:#6b6b67;font-size:11px">/ mín ${p.minEstoque}</span></td>
                <td>
                  <div class="estoque-bar">
                    <div class="estoque-fill" style="width:${pct}%;background:${cor}"></div>
                  </div>
                </td>
                <td><span class="badge ${badge}">${txt}</span></td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  const hist = document.getElementById('historicoEstoque');
  if (!movimentacoes.length) {
    hist.innerHTML = '<div class="empty">Sem movimentações registradas</div>';
    return;
  }
  hist.innerHTML = `
    <table>
      <thead>
        <tr><th>Tipo</th><th>Produto</th><th>Qtd</th><th>Antes → Depois</th><th>Motivo</th><th>Hora</th></tr>
      </thead>
      <tbody>
        ${movimentacoes.slice(0, 30).map(m => `
          <tr>
            <td><span class="badge ${m.tipo === 'entrada' ? 'badge-success' : 'badge-warning'}">
              ${m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
            </span></td>
            <td>${m.produto}</td>
            <td style="font-weight:600">${m.qtd}</td>
            <td style="color:#6b6b67;font-size:12px">${m.antes} → ${m.depois}</td>
            <td style="color:#6b6b67">${m.motivo}</td>
            <td style="color:#6b6b67">${m.hora}</td>
          </tr>`
        ).join('')}
      </tbody>
    </table>`;
}


// ---- ABA CARDÁPIO ----

function salvarItem() {
  const codigo   = document.getElementById('novoCodigo').value.trim();
  const nome     = document.getElementById('nomeItem').value.trim();
  const cat      = document.getElementById('catItem').value;
  const preco    = parseFloat(document.getElementById('precoItem').value);
  const estoque  = parseInt(document.getElementById('estoqueItem').value) || 0;
  const minEst   = parseInt(document.getElementById('minEstoque').value) || 5;

  if (!codigo || !nome || isNaN(preco)) {
    alert('Preencha código, nome e preço!');
    return;
  }
  if (cardapio.find(c => c.codigo === codigo)) {
    alert(`O código "${codigo}" já está em uso!`);
    return;
  }

  cardapio.push({ id: idCounter++, codigo, nome, categoria: cat, preco, estoque, minEstoque: minEst });

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
  if (!confirm(`Excluir "${prod.nome}" do cardápio?`)) return;
  cardapio = cardapio.filter(c => c.id !== id);
  preencherSelects();
  renderCardapio();
}

function renderCardapio() {
  const el = document.getElementById('tabelaCardapio');
  if (!cardapio.length) {
    el.innerHTML = '<div class="empty">Nenhum item cadastrado</div>';
    return;
  }

  const cats = [...new Set(cardapio.map(i => i.categoria))];
  el.innerHTML = cats.map(cat => `
    <div style="margin-bottom:20px">
      <div class="cat-label">${cat}</div>
      <table>
        <thead>
          <tr><th>Cód</th><th>Nome</th><th>Preço</th><th>Estoque</th><th>Mín.</th><th></th></tr>
        </thead>
        <tbody>
          ${cardapio.filter(i => i.categoria === cat).map(i => `
            <tr>
              <td><span class="code-badge">${i.codigo}</span></td>
              <td style="font-weight:600">${i.nome}</td>
              <td style="color:#1D9E75;font-weight:600">${fmt(i.preco)}</td>
              <td>${i.estoque}</td>
              <td>${i.minEstoque}</td>
              <td>
                <button class="btn btn-sm btn-danger" onclick="excluirItem(${i.id})">Excluir</button>
              </td>
            </tr>`
          ).join('')}
        </tbody>
      </table>
    </div>`
  ).join('');
}


// ---- INICIALIZAÇÃO ----

initPedido();
