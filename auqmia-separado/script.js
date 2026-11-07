/* ══════════════ BANCO DE DADOS ══════════════ */
    const PALAVRAS_BANIDAS = ["palavrao1", "palavrao2"];

    let db = {
        estoque: [
            { id: 1, nome: "Ração Golden",        qtd: 20, min: 8,  preco: 150.00, icon: "🦴", max: 40, categoria: "alimento" },
            { id: 2, nome: "Ração Premium Gatos",  qtd: 3,  min: 5,  preco: 85.00,  icon: "🐟", max: 20, categoria: "alimento" },
            { id: 3, nome: "Petisco Ossinho",       qtd: 35, min: 10, preco: 12.00,  icon: "🥩", max: 50, categoria: "alimento" },
            { id: 4, nome: "Shampoo Pet Neutro",    qtd: 5,  min: 6,  preco: 28.00,  icon: "🧴", max: 20, categoria: "higiene"  },
            { id: 5, nome: "Perfume Dog Colônia",   qtd: 12, min: 4,  preco: 35.00,  icon: "🌸", max: 25, categoria: "higiene"  },
            { id: 6, nome: "Condicionador Brilho",  qtd: 8,  min: 4,  preco: 22.00,  icon: "✨", max: 20, categoria: "higiene"  },
            { id: 7, nome: "Coleira Ajustável",     qtd: 10, min: 3,  preco: 45.00,  icon: "🏷️", max: 20, categoria: "acessorio"},
            { id: 8, nome: "Brinquedo Mordedor",    qtd: 2,  min: 4,  preco: 18.00,  icon: "🦷", max: 15, categoria: "acessorio"},
            { id: 9, nome: "Roupinha Inverno",      qtd: 7,  min: 3,  preco: 75.00,  icon: "🧥", max: 15, categoria: "acessorio"},
        ],
        agenda: [],
        clientes: [],
        vendasTotais: 0,
        vendasHoje: 0,
        historicoVendas: [],
        logs: []
    };

    let carrinho = [];
    let catAtiva = 'todas';

    /* ══════════════ UTILIDADES ══════════════ */
    function limparTexto(t) {
        let s = t.trim();
        PALAVRAS_BANIDAS.forEach(p => s = s.toLowerCase().replace(p, "****"));
        return s;
    }

    function fmt(v) { return `R$ ${parseFloat(v).toFixed(2).replace('.', ',')}` }

    function getStatusEstoque(p) {
        const pct = (p.qtd / Math.max(p.max, 1)) * 100;
        if (p.qtd <= p.min) return 'baixo';
        if (pct > 60)        return 'cheio';
        return 'medio';
    }

    function getCatLabel(c) {
        const map = { alimento:'🦴 Alimentação', higiene:'🧼 Higiene & Saúde', acessorio:'🎀 Acessórios' };
        return map[c] || c;
    }

    /* ══════════════ NAVEGAÇÃO ══════════════ */
    function switchPage(id, navId) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        if(navId) {
            const el = document.getElementById(navId);
            if(el) el.classList.add('active');
        }
        if(id === 'vendas')       { carrinho = []; renderCarrinho(); renderGallery(); }
        if(id === 'estoque')      renderEstoque();
        if(id === 'clientes-base') renderClientesBase();
        if(id === 'agenda')        renderAgenda();
        if(id === 'relatorios')    renderRelatorios();
        if(id === 'login-cliente') sairAreaCliente();
    }

    /* ══════════════ PERFIL ══════════════ */
    function changeProfile() {
        const perfil = document.getElementById('user-profile').value;
        const labels = { dono:'👑 Dono', estoquista:'📦 Estoquista', recepcionista:'📞 Recepcionista' };
        document.getElementById('perfil-badge').textContent = labels[perfil];

        const map = {
            dono:         ['nav-dash','nav-vendas','nav-estoque','nav-agenda','nav-clientes','nav-relatorios'],
            estoquista:   ['nav-dash','nav-estoque'],
            recepcionista:['nav-dash','nav-vendas','nav-agenda','nav-clientes']
        };

        document.querySelectorAll('.nav-item[id]').forEach(nav => {
            nav.style.display = map[perfil].includes(nav.id) ? 'flex' : 'none';
        });
        switchPage('dashboard', 'nav-dash');
    }

    /* ══════════════ DASHBOARD ══════════════ */
    function updateDash() {
        document.getElementById('kpi-faturamento').textContent = fmt(db.vendasTotais);
        document.getElementById('kpi-vendas-hoje').textContent = db.vendasHoje;
        document.getElementById('kpi-agendamentos').textContent = db.agenda.length;

        const alertas = db.estoque.filter(p => p.qtd <= p.min);
        document.getElementById('kpi-alertas').textContent = alertas.length;

        // Logs
        const logEl = document.getElementById('log-movimentacao');
        if(!db.logs.length) {
            logEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem;">Nenhuma movimentação ainda.</p>';
        } else {
            logEl.innerHTML = db.logs.slice(0,6).map(l => {
                let tipo = l.includes('VENDA') ? 'venda' : l.includes('AGENDADO') ? 'agenda' : 'estoque';
                return `<div class="log-item"><div class="log-dot ${tipo}"></div><span>${l}</span></div>`;
            }).join('');
        }

        // Alertas estoque
        const alertEl = document.getElementById('alerta-estoque-painel');
        if(!alertas.length) {
            alertEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem;">Tudo em ordem. ✅</p>';
        } else {
            alertEl.innerHTML = alertas.map(p => `
                <div class="alert-item ${p.qtd === 0 ? 'danger' : 'warning'}">
                    <span>${p.icon} ${p.nome}</span>
                    <span style="font-weight:800;">${p.qtd} un.</span>
                </div>`).join('');
        }

        // Próximos agendamentos
        const proxEl = document.getElementById('proximos-agendamentos');
        const prox = db.agenda.filter(a => a.status === 'Ocorrendo').slice(0,4);
        if(!prox.length) {
            proxEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem;">Nenhum agendamento pendente.</p>';
        } else {
            proxEl.innerHTML = prox.map(a => `
                <div class="log-item">
                    <div class="log-dot agenda"></div>
                    <span>${a.pet} — ${a.servico} <span style="color:var(--text-muted)">${a.profissional.split(' ')[0]}</span></span>
                </div>`).join('');
        }
    }

    function addLog(t) {
        db.logs.unshift(`${new Date().toLocaleTimeString('pt-br')} — ${t}`);
        updateDash();
    }

    /* ══════════════ GALERIA DE PRODUTOS (VENDAS) ══════════════ */
    function setCategoria(cat, el) {
        catAtiva = cat;
        document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        renderGallery();
    }

    function renderGallery() {
        const busca = (document.getElementById('busca-produto')?.value || '').toLowerCase();
        const container = document.getElementById('vitrine-container');

        const cats = catAtiva === 'todas' ? ['alimento','higiene','acessorio'] : [catAtiva];
        const catMeta = {
            alimento:  { label: '🦴 Alimentação',    cls: 'alimento' },
            higiene:   { label: '🧼 Higiene & Saúde', cls: 'higiene' },
            acessorio: { label: '🎀 Acessórios',      cls: 'acessorio' },
        };

        let html = '';
        cats.forEach(cat => {
            const prods = db.estoque.filter(p => p.categoria === cat && (!busca || p.nome.toLowerCase().includes(busca)));
            if(!prods.length) return;

            const m = catMeta[cat];
            html += `<div class="cat-section"><div class="panel">`;
            html += `<div class="cat-section-title ${m.cls}">${m.label}</div>`;
            html += `<div class="product-grid">`;
            prods.forEach(p => {
                const noCarrinho = carrinho.filter(i => i.id === p.id).length;
                const disponivel = p.qtd - noCarrinho;
                const semEst = disponivel <= 0;
                html += `
                <div class="product-card ${cat} ${semEst ? 'sem-estoque' : ''}" onclick="${semEst ? '' : `addToCarrinho(${p.id})`}">
                    <div class="badge-cat ${cat}"></div>
                    <div class="prod-icon">${p.icon}</div>
                    <div class="prod-name">${p.nome}</div>
                    <div class="prod-preco">${fmt(p.preco)}</div>
                    <div class="prod-estoque">${semEst ? '⚠️ Sem estoque' : `${disponivel} disponíveis`}</div>
                </div>`;
            });
            html += `</div></div></div>`;
        });

        if(!html) html = `<div class="panel" style="text-align:center; color:var(--text-muted); padding:40px;">Nenhum produto encontrado.</div>`;
        container.innerHTML = html;
    }

    function addToCarrinho(id) {
        const p = db.estoque.find(i => i.id === id);
        const noCarrinho = carrinho.filter(i => i.id === id).length;
        if(noCarrinho >= p.qtd) {
            alert(`Atenção: Estoque esgotado para "${p.nome}"!`);
            return;
        }
        carrinho.push({ ...p });
        renderCarrinho();
        renderGallery();
    }

    function removerDoCarrinho(idx) {
        carrinho.splice(idx, 1);
        renderCarrinho();
        renderGallery();
    }

    function limparCarrinho() {
        carrinho = [];
        renderCarrinho();
        renderGallery();
    }

    function renderCarrinho() {
        const itemsEl = document.getElementById('carrinho-itens');
        const vazioEl = document.getElementById('carrinho-vazio');
        const total = carrinho.reduce((a,b) => a + b.preco, 0);
        document.getElementById('total-venda').textContent = fmt(total);

        if(!carrinho.length) {
            itemsEl.innerHTML = '';
            if(vazioEl) vazioEl.style.display = 'block';
            return;
        }
        if(vazioEl) vazioEl.style.display = 'none';

        // Agrupa por produto para exibir quantidade
        const agrupado = {};
        carrinho.forEach((item, idx) => {
            if(!agrupado[item.id]) agrupado[item.id] = { ...item, indices: [] };
            agrupado[item.id].indices.push(idx);
        });

        itemsEl.innerHTML = Object.values(agrupado).map(g => {
            const sub = g.preco * g.indices.length;
            return `<div class="carrinho-item">
                <span>${g.icon} ${g.nome} <span style="color:var(--text-muted);">×${g.indices.length}</span></span>
                <span style="display:flex;align-items:center;gap:8px;">
                    <span style="font-weight:800;">${fmt(sub)}</span>
                    <button onclick="removerDoCarrinho(${g.indices[g.indices.length-1]})">✕</button>
                </span>
            </div>`;
        }).join('');
    }

    /* ══════════════ PAGAMENTO ══════════════ */
    function abrirPagamento() {
        if(!carrinho.length) { alert('Adicione produtos ao carrinho antes!'); return; }
        const total = carrinho.reduce((a,b) => a + b.preco, 0);
        document.getElementById('pag-valor-txt').textContent = fmt(total);
        ['pix','cartao','dinheiro'].forEach(m => document.getElementById('metodo-'+m).style.display = 'none');
        document.getElementById('pag-opcoes').style.display = 'block';
        openModal('modal-pagamento');
    }

    function telaMetodo(m) {
        document.getElementById('pag-opcoes').style.display = 'none';
        ['pix','cartao','dinheiro'].forEach(x => document.getElementById('metodo-'+x).style.display = 'none');
        if(m === 'PIX')     document.getElementById('metodo-pix').style.display = 'block';
        if(m === 'Dinheiro') document.getElementById('metodo-dinheiro').style.display = 'block';
        if(m === 'Cartão') {
            const total = carrinho.reduce((a,b) => a + b.preco, 0);
            const sel = document.getElementById('cartao-parcelas');
            sel.innerHTML = '';
            for(let i = 1; i <= 12; i++) {
                const v = total / i;
                sel.innerHTML += `<option value="${i}">${i}× de ${fmt(v)}${i===1 ? ' (à vista)' : ''}</option>`;
            }
            document.getElementById('metodo-cartao').style.display = 'block';
        }
    }

    function calcularTroco() {
        const total = carrinho.reduce((a,b) => a + b.preco, 0);
        const pago  = parseFloat(document.getElementById('dinheiro-pago').value) || 0;
        const troco = pago - total;
        document.getElementById('troco-txt').textContent = troco > 0 ? fmt(troco) : 'R$ 0,00';
    }

    function concluirVenda(metodo) {
        const total = carrinho.reduce((a,b) => a + b.preco, 0);

        // Validação final de estoque
        const contagem = {};
        carrinho.forEach(i => contagem[i.id] = (contagem[i.id]||0)+1);
        for(let id in contagem) {
            const p = db.estoque.find(x => x.id == id);
            if(!p || p.qtd < contagem[id]) { alert('Erro de estoque! Verifique os itens.'); return; }
        }

        carrinho.forEach(item => {
            const p = db.estoque.find(i => i.id === item.id);
            if(p) p.qtd--;
        });

        let label = metodo;
        if(metodo === 'Cartão') {
            const parc = document.getElementById('cartao-parcelas').value;
            const band = document.getElementById('cartao-bandeira').value;
            label = `${band} ${parc}×`;
        }

        db.vendasTotais += total;
        db.vendasHoje++;
        db.historicoVendas.push({ data: new Date(), total, metodo: label });
        addLog(`VENDA (${label}): ${fmt(total)}`);
        carrinho = [];

        closeModals();
        renderCarrinho();
        renderEstoque();
        renderGallery();

        // Modal sucesso
        document.getElementById('sucesso-detalhe').textContent = `${fmt(total)} via ${label} — ${new Date().toLocaleTimeString('pt-br')}`;
        openModal('modal-sucesso');
    }

    /* ══════════════ ESTOQUE ══════════════ */
    function salvarEstoque() {
        const nome = limparTexto(document.getElementById('est-nome').value);
        const qtd  = parseInt(document.getElementById('est-qtd').value) || 0;
        const min  = parseInt(document.getElementById('est-min').value) || 5;
        const preco = parseFloat(document.getElementById('est-preco').value) || 0;
        const icon = document.getElementById('est-icon').value || '📦';
        const cat  = document.getElementById('est-categoria').value;

        if(!nome) { alert('Informe o nome do produto!'); return; }

        db.estoque.push({ id: Date.now(), nome, qtd, min, preco, icon, max: qtd*2||20, categoria: cat });
        addLog(`ESTOQUE: Produto "${nome}" cadastrado`);
        renderEstoque();
        renderGallery();
        closeModals();

        // Limpa campos
        ['est-nome','est-qtd','est-min','est-preco','est-icon'].forEach(id => document.getElementById(id).value='');
    }

    function abrirEdicao(id) {
        const p = db.estoque.find(i => i.id === id);
        if(!p) return;
        document.getElementById('edit-id').value    = id;
        document.getElementById('edit-nome').value  = p.nome;
        document.getElementById('edit-qtd').value   = p.qtd;
        document.getElementById('edit-preco').value = p.preco;
        openModal('modal-editar-item');
    }

    function salvarEdicaoEstoque() {
        const id   = parseInt(document.getElementById('edit-id').value);
        const qtd  = parseInt(document.getElementById('edit-qtd').value);
        const preco = parseFloat(document.getElementById('edit-preco').value);
        const p = db.estoque.find(i => i.id === id);
        if(p) { p.qtd = qtd; p.preco = preco; p.max = Math.max(p.max, qtd); }
        addLog(`ESTOQUE: "${p.nome}" atualizado → ${qtd} un.`);
        renderEstoque();
        renderGallery();
        closeModals();
    }

    function renderEstoque() {
        const busca  = (document.getElementById('busca-estoque')?.value||'').toLowerCase();
        const catF   = document.getElementById('filtro-cat-estoque')?.value  || '';
        const statF  = document.getElementById('filtro-status-estoque')?.value || '';

        const body = document.getElementById('estoque-body');
        const prods = db.estoque.filter(p => {
            if(busca && !p.nome.toLowerCase().includes(busca)) return false;
            if(catF  && p.categoria !== catF)                  return false;
            if(statF && getStatusEstoque(p) !== statF)         return false;
            return true;
        });

        body.innerHTML = prods.map(p => {
            const st  = getStatusEstoque(p);
            const stLabel = { cheio:'✅ OK', medio:'⚠️ Médio', baixo:'🔴 Baixo' }[st];
            return `<tr>
                <td>${p.icon} <strong>${p.nome}</strong></td>
                <td><span style="font-size:0.75rem;">${getCatLabel(p.categoria)}</span></td>
                <td><strong>${p.qtd}</strong></td>
                <td style="color:var(--text-muted);">${p.min}</td>
                <td><span class="status-pill status-${st}">${stLabel}</span></td>
                <td>${fmt(p.preco)}</td>
                <td>
                    <button onclick="abrirEdicao(${p.id})" style="border:none; background:var(--primary-light); color:var(--primary-dark); padding:5px 10px; border-radius:6px; cursor:pointer; font-weight:700; font-size:0.75rem;">✏️ Editar</button>
                </td>
            </tr>`;
        }).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:20px;">Nenhum produto encontrado.</td></tr>`;
    }

    /* ══════════════ AGENDA ══════════════ */
    function salvarAgendamento() {
        const tutor = limparTexto(document.getElementById('ag-tutor').value);
        const cpf   = document.getElementById('ag-cpf').value.trim();
        const pet   = limparTexto(document.getElementById('ag-pet').value);
        const prof  = document.getElementById('ag-profissional').value;

        if(cpf.length !== 11)  { alert('CPF deve ter exatamente 11 dígitos!'); return; }
        if(!tutor)             { alert('Informe o nome do tutor!'); return; }
        if(!pet)               { alert('Informe o nome do pet!'); return; }
        if(!prof)              { alert('Selecione um profissional!'); return; }

        const novo = {
            id: Date.now(), tutor, cpf, pet,
            raca:        document.getElementById('ag-raca').value,
            servico:     document.getElementById('ag-servico').value,
            profissional:prof,
            data:        document.getElementById('ag-data').value,
            obs:         document.getElementById('ag-obs').value,
            status:      'Ocorrendo'
        };
        db.agenda.push(novo);

        let cli = db.clientes.find(c => c.cpf === cpf);
        if(!cli) { db.clientes.push({ nome: tutor, cpf, pets: [pet] }); }
        else if(!cli.pets.includes(pet)) { cli.pets.push(pet); }

        addLog(`AGENDADO: ${pet} (${novo.servico}) com ${prof.split(' ')[0]}`);
        renderAgenda();
        renderClientesBase();
        closeModals();
        ['ag-tutor','ag-cpf','ag-pet','ag-raca','ag-obs'].forEach(id => document.getElementById(id).value='');
    }

    function alterarStatusAgenda(id, status) {
        const ag = db.agenda.find(a => a.id === id);
        if(ag) { ag.status = status; addLog(`STATUS: ${ag.pet} → ${status}`); renderAgenda(); }
    }

    function excluirAgendamento(id) {
        if(!confirm('Deseja excluir este agendamento?')) return;
        db.agenda = db.agenda.filter(a => a.id !== id);
        renderAgenda();
        updateDash();
    }

    function renderAgenda() {
        const statF = document.getElementById('filtro-status-agenda')?.value || '';
        const profF = document.getElementById('filtro-prof-agenda')?.value   || '';

        const itens = db.agenda.filter(a => {
            if(statF && a.status !== statF)        return false;
            if(profF && a.profissional !== profF)  return false;
            return true;
        });

        const stCls = { 'Ocorrendo':'st-ocorrendo', 'Deu Certo':'st-certo', 'Errado':'st-errado' };

        document.getElementById('agenda-body').innerHTML = itens.map(a => `
            <tr>
                <td>${a.data ? new Date(a.data).toLocaleString('pt-br') : '—'}</td>
                <td>${a.tutor}</td>
                <td><strong>${a.pet}</strong> <span style="color:var(--text-muted);font-size:0.75rem;">${a.raca||''}</span></td>
                <td>${a.servico}</td>
                <td><strong>${a.profissional}</strong></td>
                <td><span class="agenda-status ${stCls[a.status]||''}">${a.status}</span></td>
                <td class="agenda-actions">
                    <button class="btn-ok"  onclick="alterarStatusAgenda(${a.id},'Deu Certo')">✅</button>
                    <button class="btn-err" onclick="alterarStatusAgenda(${a.id},'Errado')">❌</button>
                    <button class="btn-del" onclick="excluirAgendamento(${a.id})">🗑️</button>
                </td>
            </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:20px;">Nenhum agendamento encontrado.</td></tr>`;
    }

    /* ══════════════ CLIENTES ══════════════ */
    function renderClientesBase() {
        const busca = (document.getElementById('busca-cliente')?.value||'').toLowerCase();
        const lista = db.clientes.filter(c =>
            !busca || c.nome.toLowerCase().includes(busca) || c.cpf.includes(busca)
        );
        const el = document.getElementById('lista-clientes-geral');

        if(!lista.length) { el.innerHTML = '<p style="color:var(--text-muted);">Nenhum cliente cadastrado.</p>'; return; }

        el.innerHTML = lista.map(c => {
            const ags = db.agenda.filter(a => a.cpf === c.cpf).length;
            return `<div class="cliente-card">
                <div>
                    <div class="c-name">👤 ${c.nome}</div>
                    <div class="c-info">CPF: ${c.cpf} · Pets: ${c.pets.join(', ')}</div>
                </div>
                <span class="c-badge">${ags} serviço${ags!==1?'s':''}</span>
            </div>`;
        }).join('');
    }

    /* ══════════════ RELATÓRIOS ══════════════ */
    function renderRelatorios() {
        // Financeiro
        const vendPix    = db.historicoVendas.filter(v => v.metodo === 'PIX').reduce((a,v)=>a+v.total,0);
        const vendDin    = db.historicoVendas.filter(v => v.metodo === 'Dinheiro').reduce((a,v)=>a+v.total,0);
        const vendCard   = db.historicoVendas.filter(v => v.metodo.includes('×')).reduce((a,v)=>a+v.total,0);
        document.getElementById('rel-financeiro').innerHTML = [
            ['Faturamento Total',    fmt(db.vendasTotais)],
            ['Transações Hoje',      db.vendasHoje + ' vendas'],
            ['Receita via PIX',      fmt(vendPix)],
            ['Receita via Cartão',   fmt(vendCard)],
            ['Receita via Dinheiro', fmt(vendDin)],
        ].map(([l,v]) => `<div class="relatorio-row"><span class="r-label">${l}</span><span class="r-val">${v}</span></div>`).join('');

        // Estoque
        const baixos  = db.estoque.filter(p => getStatusEstoque(p) === 'baixo').length;
        const valTotal = db.estoque.reduce((a,p)=>a+p.qtd*p.preco,0);
        document.getElementById('rel-estoque').innerHTML = [
            ['Total de SKUs',          db.estoque.length + ' produtos'],
            ['Valor em Estoque',        fmt(valTotal)],
            ['Itens com Estoque Baixo', baixos + ' produto(s)'],
            ['Itens sem Estoque',       db.estoque.filter(p=>p.qtd===0).length + ' produto(s)'],
        ].map(([l,v]) => `<div class="relatorio-row"><span class="r-label">${l}</span><span class="r-val">${v}</span></div>`).join('');

        // Por profissional
        const profCont = {};
        db.agenda.forEach(a => profCont[a.profissional] = (profCont[a.profissional]||0)+1);
        const profHtml = Object.entries(profCont).sort((a,b)=>b[1]-a[1]).map(([n,c]) =>
            `<div class="relatorio-row"><span class="r-label">${n.split('(')[0].trim()}</span><span class="r-val">${c} atend.</span></div>`
        ).join('') || '<p style="color:var(--text-muted);font-size:0.82rem;">Sem dados.</p>';
        document.getElementById('rel-profissional').innerHTML = profHtml;

        // Por serviço
        const servCont = {};
        db.agenda.forEach(a => servCont[a.servico] = (servCont[a.servico]||0)+1);
        const servHtml = Object.entries(servCont).sort((a,b)=>b[1]-a[1]).map(([s,c]) =>
            `<div class="relatorio-row"><span class="r-label">${s}</span><span class="r-val">${c} vez(es)</span></div>`
        ).join('') || '<p style="color:var(--text-muted);font-size:0.82rem;">Sem dados.</p>';
        document.getElementById('rel-servicos').innerHTML = servHtml;
    }

    /* ══════════════ ÁREA DO CLIENTE ══════════════ */
    function loginCliente() {
        const cpf = document.getElementById('login-cpf').value.trim();
        if(cpf.length !== 11) { alert('CPF deve ter 11 dígitos!'); return; }
        const cli = db.clientes.find(c => c.cpf === cpf);
        const view = document.getElementById('perfil-cliente-view');

        if(!cli) { alert('Tutor não encontrado! O cadastro é feito automaticamente no primeiro agendamento.'); return; }

        const ags = db.agenda.filter(a => a.cpf === cpf);
        const stCls = { 'Ocorrendo':'color:#c07000', 'Deu Certo':'color:#1a7a45', 'Errado':'color:#a00' };

        const histHtml = ags.length ? ags.map(a => `
            <div class="historico-item">
                <strong>${a.data ? new Date(a.data).toLocaleDateString('pt-br') : '—'}</strong> · ${a.pet} (${a.raca||'—'})<br>
                ${a.servico} com <em>${a.profissional}</em>
                · <span style="${stCls[a.status]||''}; font-weight:800;">${a.status}</span>
                ${a.obs ? `<br><span style="color:var(--text-muted);font-size:0.77rem;">Obs: ${a.obs}</span>` : ''}
            </div>`) .join('') : '<p style="color:var(--text-muted);font-size:0.82rem;">Nenhum serviço registrado.</p>';

        document.getElementById('tutor-login-box').style.display = 'none';
        view.style.display = 'block';
        view.innerHTML = `
            <div class="panel">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:16px;">
                    <div>
                        <h2 style="font-family:'DM Serif Display',serif; color:var(--primary-dark);">Olá, ${cli.nome}! 🐾</h2>
                        <p style="color:var(--text-muted); font-size:0.82rem;">CPF: ${cli.cpf} · Pets: ${cli.pets.join(', ')}</p>
                    </div>
                    <button onclick="sairAreaCliente()" class="btn btn-gray" style="padding:8px 14px; font-size:0.78rem;">Sair 🚪</button>
                </div>
                <hr style="border:none; border-top:1px solid var(--border); margin-bottom:16px;">
                <h3 style="font-size:0.95rem; margin-bottom:12px;">📅 Seus Agendamentos</h3>
                ${histHtml}
            </div>`;
    }

    function sairAreaCliente() {
        document.getElementById('perfil-cliente-view').style.display = 'none';
        document.getElementById('tutor-login-box').style.display = 'block';
        document.getElementById('login-cpf').value = '';
    }

    /* ══════════════ MODAL UTILS ══════════════ */
    function openModal(id) {
        document.getElementById('overlay').style.display = 'block';
        document.getElementById(id).style.display = 'block';
    }
    function closeModals() {
        document.getElementById('overlay').style.display = 'none';
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    }

    /* ══════════════ INICIALIZAÇÃO ══════════════ */
    document.getElementById('data-hoje').textContent = new Date().toLocaleDateString('pt-br', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
    renderGallery();
    renderEstoque();
    updateDash();
