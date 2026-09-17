/* ==========================================================================
   LÓGICA DO PAINEL DE CONTROLE (o águia)
   ========================================================================== */

const lojaId = localStorage.getItem("loja_id");
if (!lojaId) {
  window.location.href = "cadastro.html";
}

const lojaRef = db.collection("lojas").doc(lojaId);
let lojaAtual = null;
let clienteChatSelecionado = null;
let unsubChatMsgs = null;

/* ---------------- NAVEGAÇÃO ENTRE SEÇÕES ---------------- */
function mostrarSecao(nome) {
  document.querySelectorAll("main.conteudo > section").forEach(s => s.style.display = "none");
  const alvo = document.getElementById("sec-" + nome);
  if (alvo) alvo.style.display = "block";
  document.querySelectorAll(".menu-lateral li").forEach(li => li.classList.remove("ativo"));
  const li = document.querySelector(`.menu-lateral li[data-secao="${nome}"]`);
  if (li) li.classList.add("ativo");
}
document.querySelectorAll(".menu-lateral li").forEach(li => {
  li.addEventListener("click", () => mostrarSecao(li.dataset.secao));
});

/* ---------------- CARREGAR DADOS DA LOJA ---------------- */
lojaRef.onSnapshot(doc => {
  if (!doc.exists) return;
  lojaAtual = doc.data();

  document.getElementById("nomeLojaSidebar").textContent = lojaAtual.nomeLoja;
  document.getElementById("infoNomeLoja").textContent = lojaAtual.nomeLoja;
  document.getElementById("infoUsuario").textContent = lojaAtual.usuario;
  document.getElementById("infoLojaId").textContent = lojaId;
  document.getElementById("configNomeLoja").value = lojaAtual.nomeLoja;

  const avatar = document.getElementById("avatarLoja");
  avatar.innerHTML = lojaAtual.foto ? `<img src="${lojaAtual.foto}">` : "perfil";

  document.body.style.setProperty("--bg", lojaAtual.corFundo || "#5a5a5a");
  document.documentElement.style.setProperty("--bg", lojaAtual.corFundo || "#5a5a5a");

  const badge = document.getElementById("badgeLoja");
  const btnAbrir = document.getElementById("btnAbrirLoja");
  const btnFechar = document.getElementById("btnFecharLoja");
  if (lojaAtual.aberta) {
    badge.textContent = "loja aberta";
    badge.className = "badge aberta";
    btnAbrir.classList.add("ativo");
    btnFechar.classList.remove("ativo");
  } else {
    badge.textContent = "loja fechada";
    badge.className = "badge fechada";
    btnFechar.classList.add("ativo");
    btnAbrir.classList.remove("ativo");
  }
});

document.getElementById("btnAbrirLoja").addEventListener("click", () => {
  lojaRef.update({ aberta: true });
});
document.getElementById("btnFecharLoja").addEventListener("click", () => {
  lojaRef.update({ aberta: false });
});

/* ---------------- SININHO (ativar/desativar som de notificação) ---------------- */
function somAtivado() {
  return localStorage.getItem("som_notificacao") !== "desligado";
}
function atualizarBotaoSino() {
  const btn = document.getElementById("btnSino");
  if (somAtivado()) {
    btn.textContent = "som: ligado";
    btn.classList.remove("desativado");
  } else {
    btn.textContent = "som: desligado";
    btn.classList.add("desativado");
  }
}
document.getElementById("btnSino").addEventListener("click", (e) => {
  e.stopPropagation();
  localStorage.setItem("som_notificacao", somAtivado() ? "desligado" : "ligado");
  atualizarBotaoSino();
});
atualizarBotaoSino();

/* ---------------- PEDIDOS (KANBAN) ---------------- */
let ultimoSnapPedidos = null;
let idsPedidosConhecidos = null; // null = ainda não carregou pela 1ª vez

function renderizarPedidos(snap) {
  const colAndamento = document.getElementById("col-andamento");
  const colPreparo = document.getElementById("col-preparo");
  const colPronto = document.getElementById("col-pronto");
  const listaNotif = document.getElementById("listaNotificacoes");
  colAndamento.innerHTML = "";
  colPreparo.innerHTML = "";
  colPronto.innerHTML = "";
  listaNotif.innerHTML = "";

  let contadorPedido = 0;

  snap.forEach(doc => {
    const p = doc.data();
    if (p.saiu) return; // pedido já foi entregue, some da tela
    contadorPedido++;
    const criadoEmMs = p.criadoEm && p.criadoEm.toDate ? p.criadoEm.toDate().getTime() : Date.now();
    const aceitoEmMs = p.aceitoEm && p.aceitoEm.toDate ? p.aceitoEm.toDate().getTime() : criadoEmMs;
    const { etapa, atraso } = calcularEtapaPedidoV2(p, aceitoEmMs);

    const itensTexto = (p.itens || []).map(i => i.nome).join(", ");
    const nomeCliente = p.clienteNome || ("cliente " + doc.id.slice(0, 4));

    // notificação lateral
    const notifDiv = document.createElement("div");
    notifDiv.className = "item";
    notifDiv.textContent = `pedido ${String(contadorPedido).padStart(2, "0")} — ${nomeCliente}`;
    listaNotif.appendChild(notifDiv);

    const card = document.createElement("div");
    card.className = "pedido-card" + (etapa === "aguardando" ? " aguardando" : "");
    card.innerHTML = `
      <div class="linha1">pedido ${String(contadorPedido).padStart(2, "0")}</div>
      <div class="itens">${escapeHtml(nomeCliente)} — ${escapeHtml(itensTexto)}</div>
      ${p.formaPagamento ? `<div class="itens">pagamento: ${escapeHtml(p.formaPagamento)}</div>` : ""}
      <div class="tempo">${new Date(criadoEmMs).toLocaleTimeString()}</div>
    `;

    if (etapa === "aguardando") {
      const btnAceitar = document.createElement("button");
      btnAceitar.className = "btn-aceitar";
      btnAceitar.textContent = "aceitar";
      btnAceitar.addEventListener("click", () => {
        lojaRef.collection("pedidos").doc(doc.id).update({
          aceito: true,
          aceitoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      card.appendChild(btnAceitar);
    }

    if (etapa === "pronto") {
      const btnSair = document.createElement("button");
      btnSair.className = "btn-sair";
      btnSair.textContent = "sair";
      btnSair.addEventListener("click", () => {
        lojaRef.collection("pedidos").doc(doc.id).update({ saiu: true });
      });
      card.appendChild(btnSair);

      if (atraso) {
        const tagAtraso = document.createElement("div");
        tagAtraso.className = "tag-atraso";
        tagAtraso.textContent = "pedido em atraso";
        card.appendChild(tagAtraso);
      }
    }

    if (etapa === "aguardando" || etapa === "andamento") colAndamento.appendChild(card);
    else if (etapa === "preparo") colPreparo.appendChild(card);
    else colPronto.appendChild(card);
  });
}

lojaRef.collection("pedidos").orderBy("criadoEm", "desc").onSnapshot(snap => {
  // detecta pedidos novos (que chegaram agora) para tocar o som e ignora
  // a primeira carga da página (senão tocaria pra todos os pedidos antigos)
  if (idsPedidosConhecidos === null) {
    idsPedidosConhecidos = new Set(snap.docs.map(d => d.id));
  } else {
    let temPedidoNovo = false;
    snap.docChanges().forEach(change => {
      if (change.type === "added" && !idsPedidosConhecidos.has(change.doc.id)) {
        temPedidoNovo = true;
        idsPedidosConhecidos.add(change.doc.id);
      }
    });
    if (temPedidoNovo && somAtivado()) tocarBeepNotificacao();
  }

  ultimoSnapPedidos = snap;
  renderizarPedidos(snap);
});

// recalcula as etapas dos pedidos a cada 20s, sem precisar reabrir a página
// (o pedido avança de etapa sozinho conforme o tempo passa)
setInterval(() => {
  if (ultimoSnapPedidos) renderizarPedidos(ultimoSnapPedidos);
}, 20000);

/* ---------------- RELATÓRIO DE VENDAS ---------------- */
function baixarArquivo(nomeArquivo, conteudoBlob) {
  const url = URL.createObjectURL(conteudoBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

document.getElementById("btnRelatorio").addEventListener("click", async () => {
  const btn = document.getElementById("btnRelatorio");
  btn.textContent = "gerando...";

  const snap = await lojaRef.collection("pedidos").get();
  const linhas = [];
  const totalPorPagamento = {};
  let totalGeral = 0;

  snap.forEach(doc => {
    const p = doc.data();
    const itensTexto = (p.itens || []).map(i => `${i.nome} (${formatarValor(i.valor)})`).join(", ");
    const valorPedido = (p.itens || []).reduce((soma, i) => soma + (parseFloat(i.valor) || 0), 0);
    const pagamento = p.formaPagamento || "não informado";
    totalPorPagamento[pagamento] = (totalPorPagamento[pagamento] || 0) + valorPedido;
    totalGeral += valorPedido;

    const dataPedido = p.criadoEm && p.criadoEm.toDate ? p.criadoEm.toDate().toLocaleString() : "";
    linhas.push(`${dataPedido} — ${p.clienteNome || "cliente"} — ${itensTexto} — ${formatarValor(valorPedido)} (${pagamento})`);
  });

  const dataRelatorio = new Date().toLocaleString();
  const nomeLoja = lojaAtual ? lojaAtual.nomeLoja : "loja";

  // ---- monta o texto do relatório ----
  let texto = `RELATÓRIO DE VENDAS — ${nomeLoja}\n`;
  texto += `gerado em: ${dataRelatorio}\n`;
  texto += `${"=".repeat(50)}\n\n`;
  if (linhas.length === 0) {
    texto += "nenhum pedido registrado ainda.\n";
  } else {
    linhas.forEach((l, i) => { texto += `${i + 1}. ${l}\n`; });
  }
  texto += `\n${"=".repeat(50)}\n`;
  texto += `TOTAL POR FORMA DE PAGAMENTO:\n`;
  Object.keys(totalPorPagamento).forEach(forma => {
    texto += `  ${forma}: ${formatarValor(totalPorPagamento[forma])}\n`;
  });
  texto += `\nTOTAL GERAL: ${formatarValor(totalGeral)}\n`;
  texto += `quantidade de pedidos: ${linhas.length}\n`;

  // baixa como .txt
  baixarArquivo(`relatorio-${nomeLoja}.txt`, new Blob([texto], { type: "text/plain;charset=utf-8" }));

  // ---- monta a imagem (canvas) ----
  const linhaAltura = 24;
  const alturaBase = 170;
  const alturaExtra = Math.max(linhas.length, 1) * linhaAltura;
  const alturaTotal = alturaBase + alturaExtra + Object.keys(totalPorPagamento).length * linhaAltura + 60;

  const canvas = document.createElement("canvas");
  canvas.width = 700;
  canvas.height = alturaTotal;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#5e2266";
  ctx.fillRect(0, 0, canvas.width, 70);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText(`RELATÓRIO — ${nomeLoja}`, 20, 44);

  ctx.fillStyle = "#333333";
  ctx.font = "13px sans-serif";
  ctx.fillText(`gerado em: ${dataRelatorio}`, 20, 92);

  let y = 130;
  ctx.font = "13px sans-serif";
  ctx.fillStyle = "#222222";
  if (linhas.length === 0) {
    ctx.fillText("nenhum pedido registrado ainda.", 20, y);
    y += linhaAltura;
  } else {
    linhas.forEach((l, i) => {
      const linhaTexto = `${i + 1}. ${l}`;
      ctx.fillText(linhaTexto.length > 90 ? linhaTexto.slice(0, 87) + "..." : linhaTexto, 20, y);
      y += linhaAltura;
    });
  }

  y += 10;
  ctx.strokeStyle = "#ccc";
  ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(680, y); ctx.stroke();
  y += 30;

  ctx.font = "bold 15px sans-serif";
  ctx.fillText("total por forma de pagamento:", 20, y);
  y += linhaAltura;
  ctx.font = "14px sans-serif";
  Object.keys(totalPorPagamento).forEach(forma => {
    ctx.fillText(`${forma}: ${formatarValor(totalPorPagamento[forma])}`, 30, y);
    y += linhaAltura;
  });

  y += 10;
  ctx.font = "bold 18px sans-serif";
  ctx.fillStyle = "#1f7a1f";
  ctx.fillText(`TOTAL GERAL: ${formatarValor(totalGeral)}`, 20, y);

  canvas.toBlob(blob => {
    baixarArquivo(`relatorio-${nomeLoja}.png`, blob);
  });

  btn.textContent = "relatório";
});

/* ---------------- CARDÁPIO ---------------- */
function renderizarCardapio(containerId) {
  return function (snap) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    if (snap.empty) {
      container.innerHTML = '<p class="vazio-msg">nenhum lanche cadastrado ainda. Vá em "vender" para adicionar.</p>';
      return;
    }
    snap.forEach(doc => {
      const p = doc.data();
      const item = document.createElement("div");
      item.className = "cardapio-item";
      item.innerHTML = `
        <div class="foto" style="background-image:url('${p.foto || ""}')"></div>
        <div class="info">
          <div class="nome">${escapeHtml(p.nome)}</div>
          <div class="desc">${escapeHtml(p.descricao || "")}</div>
        </div>
        <div class="valor">${formatarValor(p.valor)}</div>
        <button class="excluir" data-id="${doc.id}">excluir</button>
      `;
      item.querySelector(".excluir").addEventListener("click", () => {
        if (confirm("remover este item do cardápio?")) {
          lojaRef.collection("produtos").doc(doc.id).delete();
        }
      });
      container.appendChild(item);
    });
  };
}
lojaRef.collection("produtos").orderBy("criadoEm", "desc").onSnapshot(renderizarCardapio("cardapioLista"));
lojaRef.collection("produtos").orderBy("criadoEm", "desc").onSnapshot(renderizarCardapio("catalogoLista"));

/* ---------------- VENDER (criar novo produto) ---------------- */
document.getElementById("btnAddProduto").addEventListener("click", () => {
  document.getElementById("formProduto").style.display = "block";
  document.getElementById("venderInicial").style.display = "none";
});

let fotoProdutoBase64 = null;
document.getElementById("inputFotoProduto").addEventListener("change", (e) => {
  arquivoParaBase64(e.target.files[0], (base64) => {
    fotoProdutoBase64 = base64;
    document.getElementById("labelFotoProduto").style.backgroundImage = `url('${base64}')`;
    document.getElementById("labelFotoProduto").textContent = "";
  });
});

document.getElementById("formProduto").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = document.getElementById("nomeProduto").value.trim();
  const descricao = document.getElementById("descProduto").value.trim();
  const valor = parseFloat(document.getElementById("valorProduto").value || 0);
  if (!nome || !valor) return;

  await lojaRef.collection("produtos").add({
    nome, descricao, valor,
    foto: fotoProdutoBase64 || "",
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  });

  e.target.reset();
  fotoProdutoBase64 = null;
  document.getElementById("labelFotoProduto").style.backgroundImage = "";
  document.getElementById("labelFotoProduto").textContent = "escolher foto";
  document.getElementById("formProduto").style.display = "none";
  document.getElementById("venderInicial").style.display = "block";
  mostrarSecao("cardapio");
});

/* ---------------- CLIENTES E HISTÓRICO ---------------- */
lojaRef.collection("pedidos").onSnapshot(snap => {
  const contagem = {}; // nome -> quantidade
  snap.forEach(doc => {
    const p = doc.data();
    const nome = p.clienteNome || "cliente";
    contagem[nome] = (contagem[nome] || 0) + 1;
  });

  const listaClientes = document.getElementById("listaClientes");
  const listaHistorico = document.getElementById("listaHistorico");
  const listaEstat = document.getElementById("listaEstatistica");
  listaClientes.innerHTML = "";
  listaHistorico.innerHTML = "";
  listaEstat.innerHTML = "";

  const nomes = Object.keys(contagem);
  if (nomes.length === 0) {
    listaClientes.innerHTML = '<p class="vazio-msg">nenhum cliente ainda.</p>';
    listaHistorico.innerHTML = '<p class="vazio-msg">nenhum pedido no histórico ainda.</p>';
  }

  nomes.forEach(nome => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(nome)}</span><span class="qtd">${contagem[nome]} pedido(s)</span>`;
    listaClientes.appendChild(li.cloneNode(true));
    listaHistorico.appendChild(li);
  });

  const totalPedidos = snap.size;
  const li1 = document.createElement("li"); li1.innerHTML = `<span>total de pedidos</span><span class="qtd">${totalPedidos}</span>`;
  const li2 = document.createElement("li"); li2.innerHTML = `<span>total de clientes</span><span class="qtd">${nomes.length}</span>`;
  listaEstat.appendChild(li1);
  listaEstat.appendChild(li2);
});

/* ---------------- CONFIGURAÇÃO ---------------- */
document.getElementById("btnSalvarNomeLoja").addEventListener("click", () => {
  const novo = document.getElementById("configNomeLoja").value.trim();
  if (novo) lojaRef.update({ nomeLoja: novo });
});

document.getElementById("inputFotoConfig").addEventListener("change", (e) => {
  arquivoParaBase64(e.target.files[0], (base64) => {
    if (base64) lojaRef.update({ foto: base64 });
  });
});

document.querySelectorAll(".swatch").forEach(sw => {
  sw.addEventListener("click", () => {
    lojaRef.update({ corFundo: sw.dataset.cor });
  });
});

/* ==========================================================================
   CHAT
   ========================================================================== */
const chatToggleBtn = document.getElementById("chatToggleBtn");
const chatJanela = document.getElementById("chatJanela");
const chatListaView = document.getElementById("chatListaView");
const chatConversaView = document.getElementById("chatConversaView");
const chatHeaderTitulo = document.getElementById("chatHeaderTitulo");

chatToggleBtn.addEventListener("click", () => {
  chatJanela.classList.toggle("aberto");
});
document.getElementById("chatFechar").addEventListener("click", () => {
  chatJanela.classList.remove("aberto");
});

// lista de clientes que já mandaram mensagem (conversas)
lojaRef.collection("clientes").orderBy("ultimaMensagemEm", "desc").onSnapshot(snap => {
  const container = document.getElementById("chatListaConversas");
  container.innerHTML = "";
  if (snap.empty) {
    container.innerHTML = '<p class="vazio-msg">nenhuma conversa ainda.</p>';
    return;
  }
  snap.forEach(doc => {
    const c = doc.data();
    const item = document.createElement("div");
    item.className = "chat-conversa-item";
    item.textContent = c.nome || ("cliente " + doc.id.slice(0, 4));
    item.addEventListener("click", () => abrirConversa(doc.id, c.nome));
    container.appendChild(item);
  });
});

function abrirConversa(clienteId, nomeCliente) {
  clienteChatSelecionado = clienteId;
  chatHeaderTitulo.textContent = nomeCliente || "conversa";
  chatListaView.style.display = "none";
  chatConversaView.style.display = "flex";

  if (unsubChatMsgs) unsubChatMsgs();
  unsubChatMsgs = lojaRef.collection("clientes").doc(clienteId).collection("chat")
    .orderBy("criadoEm", "asc")
    .onSnapshot(snap => {
      const box = document.getElementById("chatMensagens");
      box.innerHTML = "";
      snap.forEach(doc => {
        const m = doc.data();
        const div = document.createElement("div");
        div.className = "msg " + (m.autor === "loja" ? "loja" : "cliente");
        div.textContent = m.texto;
        box.appendChild(div);
      });
      box.scrollTop = box.scrollHeight;
    });
}

// botão pra voltar pra lista de conversas (clicando no título)
chatHeaderTitulo.addEventListener("click", () => {
  chatConversaView.style.display = "none";
  chatListaView.style.display = "block";
  chatHeaderTitulo.textContent = "conversas";
  if (unsubChatMsgs) unsubChatMsgs();
});

function enviarMensagemLoja() {
  const input = document.getElementById("chatInput");
  const texto = input.value.trim();
  if (!texto || !clienteChatSelecionado) return;
  lojaRef.collection("clientes").doc(clienteChatSelecionado).collection("chat").add({
    autor: "loja",
    texto,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  });
  lojaRef.collection("clientes").doc(clienteChatSelecionado).update({
    ultimaMensagemEm: firebase.firestore.FieldValue.serverTimestamp()
  });
  input.value = "";
}
document.getElementById("chatEnviar").addEventListener("click", enviarMensagemLoja);
document.getElementById("chatInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") enviarMensagemLoja();
});
