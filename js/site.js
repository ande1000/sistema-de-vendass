/* ==========================================================================
   LÓGICA DO SITE DO CLIENTE (o águia)
   ========================================================================== */

const storeId = getStoreId();
const clienteId = localStorage.getItem("cliente_id");

if (!storeId || storeId === "COLE_AQUI_O_ID_DA_LOJA") {
  document.getElementById("siteLista").innerHTML =
    '<p class="vazio-msg">Esta loja ainda não foi configurada. Peça o link correto ao vendedor.</p>';
  throw new Error("STORE_ID não configurado");
}
if (!clienteId) {
  window.location.href = "cadastro.html";
}

const lojaRef = db.collection("lojas").doc(storeId);
const clienteRef = lojaRef.collection("clientes").doc(clienteId);

/* ---------------- DADOS DA LOJA (nome, foto, aberta/fechada) ---------------- */
lojaRef.onSnapshot(doc => {
  if (!doc.exists) return;
  const loja = doc.data();
  document.getElementById("nomeLojaSite").textContent = loja.nomeLoja;
  document.title = loja.nomeLoja + " — o águia";

  const avatar = document.getElementById("avatarLojaSite");
  avatar.style.backgroundImage = loja.foto ? `url('${loja.foto}')` : "none";

  const tag = document.getElementById("statusLojaTag");
  if (loja.aberta) {
    tag.textContent = "loja aberta";
    tag.className = "status-loja-tag aberta";
  } else {
    tag.textContent = "loja fechada";
    tag.className = "status-loja-tag fechada";
  }
});

/* ---------------- CARDÁPIO ---------------- */
let produtosCache = {}; // id -> dados do produto (usado pelo modal e pelo carrinho)

lojaRef.collection("produtos").orderBy("criadoEm", "desc").onSnapshot(snap => {
  const lista = document.getElementById("siteLista");
  lista.innerHTML = "";
  produtosCache = {};
  if (snap.empty) {
    lista.innerHTML = '<p class="vazio-msg">nenhum lanche disponível no momento.</p>';
    return;
  }
  snap.forEach(doc => {
    const p = doc.data();
    produtosCache[doc.id] = p;
    const card = document.createElement("div");
    card.className = "produto-card";
    card.innerHTML = `
      <div class="bolinha-foto" style="background-image:url('${p.foto || ""}')"></div>
      <div class="produto-info">
        <div class="nome">${escapeHtml(p.nome)}</div>
        <div class="desc">${escapeHtml(p.descricao || "")}</div>
        <div class="valor">${formatarValor(p.valor)}</div>
      </div>
      <button class="btn-comprar" data-id="${doc.id}">adicionar</button>
    `;
    card.querySelector(".btn-comprar").addEventListener("click", () => abrirModalProduto(doc.id));
    lista.appendChild(card);
  });
});

/* ==========================================================================
   MODAL DE PRODUTO (escolher quantidade e adicionar ao carrinho)
   ========================================================================== */
let produtoModalId = null;
let produtoModalQtd = 1;

function abrirModalProduto(produtoId) {
  const p = produtosCache[produtoId];
  if (!p) return;
  produtoModalId = produtoId;
  produtoModalQtd = 1;

  document.getElementById("modalProdutoNome").textContent = p.nome;
  document.getElementById("modalProdutoFoto").style.backgroundImage = p.foto ? `url('${p.foto}')` : "none";
  document.getElementById("modalProdutoDesc").textContent = p.descricao || "";
  document.getElementById("modalProdutoValor").textContent = formatarValor(p.valor);
  document.getElementById("modalQtdValor").textContent = "1";

  document.getElementById("modalProdutoOverlay").classList.add("aberto");
}

document.getElementById("modalProdutoFechar").addEventListener("click", () => {
  document.getElementById("modalProdutoOverlay").classList.remove("aberto");
});
document.getElementById("modalQtdMenos").addEventListener("click", () => {
  produtoModalQtd = Math.max(1, produtoModalQtd - 1);
  document.getElementById("modalQtdValor").textContent = produtoModalQtd;
});
document.getElementById("modalQtdMais").addEventListener("click", () => {
  produtoModalQtd = Math.min(20, produtoModalQtd + 1);
  document.getElementById("modalQtdValor").textContent = produtoModalQtd;
});

document.getElementById("modalAdicionarBtn").addEventListener("click", () => {
  if (!produtoModalId) return;
  adicionarAoCarrinho(produtoModalId, produtoModalQtd);
  document.getElementById("modalProdutoOverlay").classList.remove("aberto");
});

/* ==========================================================================
   CARRINHO
   ========================================================================== */
let carrinho = []; // [{produtoId, nome, valor, qtd}]

function adicionarAoCarrinho(produtoId, qtd) {
  const p = produtosCache[produtoId];
  if (!p) return;
  const existente = carrinho.find(i => i.produtoId === produtoId);
  if (existente) existente.qtd += qtd;
  else carrinho.push({ produtoId, nome: p.nome, valor: p.valor, qtd });
  atualizarBadgeCarrinho();
}

function removerDoCarrinho(produtoId) {
  carrinho = carrinho.filter(i => i.produtoId !== produtoId);
  atualizarBadgeCarrinho();
  renderizarCarrinho();
}

function atualizarBadgeCarrinho() {
  const totalItens = carrinho.reduce((soma, i) => soma + i.qtd, 0);
  const badge = document.getElementById("carrinhoBadge");
  if (totalItens > 0) {
    badge.textContent = totalItens;
    badge.style.display = "block";
  } else {
    badge.style.display = "none";
  }
}

function renderizarCarrinho() {
  const container = document.getElementById("carrinhoListaItens");
  container.innerHTML = "";
  let total = 0;

  if (carrinho.length === 0) {
    container.innerHTML = '<p class="vazio-msg">seu carrinho está vazio.</p>';
  }

  carrinho.forEach(item => {
    total += item.valor * item.qtd;
    const div = document.createElement("div");
    div.className = "carrinho-item";
    div.innerHTML = `
      <span>${item.qtd}x ${escapeHtml(item.nome)} — ${formatarValor(item.valor * item.qtd)}</span>
      <button class="remover" data-id="${item.produtoId}">remover</button>
    `;
    div.querySelector(".remover").addEventListener("click", () => removerDoCarrinho(item.produtoId));
    container.appendChild(div);
  });

  document.getElementById("carrinhoTotal").textContent = "Total: " + formatarValor(total);
}

document.getElementById("carrinhoToggleBtn").addEventListener("click", () => {
  renderizarCarrinho();
  document.getElementById("modalCarrinhoOverlay").classList.add("aberto");
});
document.getElementById("modalCarrinhoFechar").addEventListener("click", () => {
  document.getElementById("modalCarrinhoOverlay").classList.remove("aberto");
});

document.getElementById("btnFinalizarCompra").addEventListener("click", async () => {
  if (carrinho.length === 0) {
    alert("seu carrinho está vazio. Adicione pelo menos um item.");
    return;
  }

  const observacao = document.getElementById("carrinhoObservacao").value.trim();
  const formaPagamento = document.getElementById("carrinhoPagamento").value;

  const clienteSnap = await clienteRef.get();
  const cliente = clienteSnap.data() || {};

  const itensPedido = carrinho.map(i => ({
    nome: `${i.qtd}x ${i.nome}`,
    valor: i.valor * i.qtd,
    foto: (produtosCache[i.produtoId] && produtosCache[i.produtoId].foto) || ""
  }));

  await lojaRef.collection("pedidos").add({
    clienteId,
    clienteNome: cliente.nome || "cliente",
    endereco: cliente.endereco || "",
    itens: itensPedido,
    observacao,
    formaPagamento,
    aceito: false,
    saiu: false,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  });

  await clienteRef.update({ ultimaMensagemEm: firebase.firestore.FieldValue.serverTimestamp() });

  const resumoItens = carrinho.map(i => `${i.qtd}x ${i.nome}`).join(", ");
  const totalPedido = carrinho.reduce((soma, i) => soma + i.valor * i.qtd, 0);

  carrinho = [];
  atualizarBadgeCarrinho();
  document.getElementById("carrinhoObservacao").value = "";
  document.getElementById("modalCarrinhoOverlay").classList.remove("aberto");

  abrirChat();
  let mensagem = `Pedido feito: ${resumoItens} — total ${formatarValor(totalPedido)} — pagamento: ${formaPagamento}`;
  if (observacao) mensagem += ` — obs: ${observacao}`;
  await enviarMensagemAutomatica(mensagem);
});

/* ==========================================================================
   VER PEDIDO (acompanhar o pedido feito, pedir previsão, cancelar)
   ========================================================================== */
let meuPedidoAtual = null;   // dados do pedido ativo mais recente
let meuPedidoAtualId = null;
let intervaloContadorModal = null;

lojaRef.collection("pedidos").where("clienteId", "==", clienteId)
  .orderBy("criadoEm", "desc")
  .onSnapshot(snap => {
    // pega o pedido mais recente que ainda não saiu nem foi cancelado
    let encontrado = null, encontradoId = null;
    snap.forEach(doc => {
      if (encontrado) return;
      const p = doc.data();
      if (!p.saiu && !p.cancelado) { encontrado = p; encontradoId = doc.id; }
    });

    meuPedidoAtual = encontrado;
    meuPedidoAtualId = encontradoId;

    document.getElementById("verPedidoWrap").style.display = encontrado ? "flex" : "none";

    // se o modal estiver aberto, atualiza o conteúdo dele em tempo real
    if (document.getElementById("modalPedidoOverlay").classList.contains("aberto")) {
      preencherModalPedido();
    }
  });

function preencherModalPedido() {
  if (!meuPedidoAtual) return;
  const p = meuPedidoAtual;
  const itensTexto = (p.itens || []).map(i => i.nome).join(", ");
  const total = (p.itens || []).reduce((soma, i) => soma + (parseFloat(i.valor) || 0), 0);
  const primeiraFoto = (p.itens || []).find(i => i.foto)?.foto || "";

  document.getElementById("pedidoModalCliente").textContent = p.clienteNome || "cliente";
  document.getElementById("pedidoModalNome").textContent = itensTexto || "pedido";
  document.getElementById("pedidoModalDesc").textContent = `${itensTexto} — pagamento: ${p.formaPagamento || "não informado"}`;
  document.getElementById("pedidoModalObs").textContent = p.observacao ? `observação: ${p.observacao}` : "";
  document.getElementById("pedidoModalFoto").style.backgroundImage = primeiraFoto ? `url('${primeiraFoto}')` : "none";
  document.getElementById("pedidoModalFoto").textContent = primeiraFoto ? "" : "foto do lanche";
  document.getElementById("pedidoModalValor").textContent = "valor " + formatarValor(total);

  const msgCancelado = document.getElementById("pedidoModalCanceladoMsg");
  const btnPrevisao = document.getElementById("btnEnviarPrevisao");
  const btnCancelar = document.getElementById("btnCancelarPedido");
  const previsaoBox = document.getElementById("pedidoModalPrevisao");

  if (p.cancelado) {
    msgCancelado.style.display = "block";
    btnPrevisao.style.display = "none";
    btnCancelar.style.display = "none";
    previsaoBox.style.display = "none";
    if (intervaloContadorModal) clearInterval(intervaloContadorModal);
    return;
  }
  msgCancelado.style.display = "none";
  btnPrevisao.style.display = "block";
  btnCancelar.style.display = "block";

  if (intervaloContadorModal) clearInterval(intervaloContadorModal);
  if (p.previsaoSolicitadaEm && p.previsaoSolicitadaEm.toDate) {
    const alvoMs = p.previsaoSolicitadaEm.toDate().getTime() + 5 * 60000;
    const atualizarContador = () => {
      const restanteMs = alvoMs - Date.now();
      if (restanteMs <= 0) {
        previsaoBox.textContent = "previsão: a loja já foi avisada";
        clearInterval(intervaloContadorModal);
        return;
      }
      const min = Math.floor(restanteMs / 60000);
      const seg = Math.floor((restanteMs % 60000) / 1000);
      previsaoBox.textContent = `previsão enviada — mais ${min}:${String(seg).padStart(2, "0")}`;
    };
    previsaoBox.style.display = "block";
    atualizarContador();
    intervaloContadorModal = setInterval(atualizarContador, 1000);
  } else {
    previsaoBox.style.display = "none";
  }
}

document.getElementById("verPedidoBtn").addEventListener("click", () => {
  preencherModalPedido();
  document.getElementById("modalPedidoOverlay").classList.add("aberto");
});
document.getElementById("pedidoModalFechar").addEventListener("click", () => {
  document.getElementById("modalPedidoOverlay").classList.remove("aberto");
  if (intervaloContadorModal) clearInterval(intervaloContadorModal);
});

document.getElementById("btnEnviarPrevisao").addEventListener("click", async () => {
  if (!meuPedidoAtualId) return;
  await lojaRef.collection("pedidos").doc(meuPedidoAtualId).update({
    previsaoSolicitadaEm: firebase.firestore.FieldValue.serverTimestamp()
  });
  alert("Previsão de +5 minutos enviada para a loja!");
});

document.getElementById("btnCancelarPedido").addEventListener("click", async () => {
  if (!meuPedidoAtualId) return;
  if (!confirm("Tem certeza que deseja cancelar este pedido?")) return;
  await lojaRef.collection("pedidos").doc(meuPedidoAtualId).update({
    cancelado: true,
    canceladoEm: firebase.firestore.FieldValue.serverTimestamp()
  });
});

/* ==========================================================================
   CHAT
   ========================================================================== */
const chatToggleBtn = document.getElementById("chatToggleBtn");
const chatJanela = document.getElementById("chatJanela");

function abrirChat() {
  chatJanela.classList.add("aberto");
}
chatToggleBtn.addEventListener("click", abrirChat);
document.getElementById("chatFechar").addEventListener("click", () => {
  chatJanela.classList.remove("aberto");
});

let primeiraMensagemEnviada = false;

clienteRef.collection("chat").orderBy("criadoEm", "asc").onSnapshot(snap => {
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
  if (!snap.empty) primeiraMensagemEnviada = true;
});

async function enviarMensagemAutomatica(texto) {
  // Se for a primeira mensagem da conversa, o "robô" já envia o endereço
  // do cliente junto, para o vendedor já saber para onde entregar.
  const jaTemMensagens = primeiraMensagemEnviada;

  await clienteRef.collection("chat").add({
    autor: "cliente",
    texto,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  });

  if (!jaTemMensagens) {
    const cliente = (await clienteRef.get()).data() || {};
    if (cliente.endereco) {
      await clienteRef.collection("chat").add({
        autor: "cliente",
        texto: `📍 endereço de entrega: ${cliente.endereco}`,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  }
  primeiraMensagemEnviada = true;
}

function enviarMensagemCliente() {
  const input = document.getElementById("chatInput");
  const texto = input.value.trim();
  if (!texto) return;
  enviarMensagemAutomatica(texto);
  clienteRef.update({ ultimaMensagemEm: firebase.firestore.FieldValue.serverTimestamp() });
  input.value = "";
}
document.getElementById("chatEnviar").addEventListener("click", enviarMensagemCliente);
document.getElementById("chatInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") enviarMensagemCliente();
});
