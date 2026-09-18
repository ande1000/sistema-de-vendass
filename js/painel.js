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

  const labelFotoConfig = document.getElementById("labelFotoConfig");
  if (lojaAtual.foto) {
    labelFotoConfig.style.backgroundImage = `url('${lojaAtual.foto}')`;
    labelFotoConfig.querySelector("span").style.display = "none";
  }

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
document.getElementById("btnFecharLoja").addEventListener("click",
