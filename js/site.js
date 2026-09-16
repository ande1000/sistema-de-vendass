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
lojaRef.collection("produtos").orderBy("criadoEm", "desc").onSnapshot(snap => {
  const lista = document.getElementById("siteLista");
  lista.innerHTML = "";
  if (snap.empty) {
    lista.innerHTML = '<p class="vazio-msg">nenhum lanche disponível no momento.</p>';
    return;
  }
  snap.forEach(doc => {
    const p = doc.data();
    const card = document.createElement("div");
    card.className = "produto-card";
    card.innerHTML = `
      <div class="bolinha-foto" style="background-image:url('${p.foto || ""}')"></div>
      <div class="produto-info">
        <div class="nome">${escapeHtml(p.nome)}</div>
        <div class="desc">${escapeHtml(p.descricao || "")}</div>
        <div class="valor">${formatarValor(p.valor)}</div>
      </div>
      <button class="btn-comprar" data-id="${doc.id}">comprar</button>
    `;
    card.querySelector(".btn-comprar").addEventListener("click", () => comprarProduto(doc.id, p));
    lista.appendChild(card);
  });
});

/* ---------------- COMPRAR (cria pedido + abre chat) ---------------- */
async function comprarProduto(produtoId, produto) {
  const clienteSnap = await clienteRef.get();
  const cliente = clienteSnap.data() || {};

  await lojaRef.collection("pedidos").add({
    clienteId,
    clienteNome: cliente.nome || "cliente",
    endereco: cliente.endereco || "",
    itens: [{ nome: produto.nome, valor: produto.valor }],
    saiu: false,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  });

  await clienteRef.update({ ultimaMensagemEm: firebase.firestore.FieldValue.serverTimestamp() });

  abrirChat();
  await enviarMensagemAutomatica(
    `Quero comprar: ${produto.nome} (${formatarValor(produto.valor)})`
  );
}

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
