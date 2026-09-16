/* ==========================================================================
   FUNÇÕES COMPARTILHADAS (usadas pelo painel e pelo site)
   ========================================================================== */

// Tempos das etapas do pedido (em minutos) — pode ajustar aqui
const TEMPO_EM_ANDAMENTO_MIN = 3;   // fica "em andamento" por 3 min
const TEMPO_EM_PREPARO_MIN = 10;    // depois fica "em preparo" por 10 min

// Converte um arquivo de imagem escolhido pelo usuário em base64,
// para ser salvo direto no Firestore (sem precisar de servidor de upload)
function arquivoParaBase64(file, callback) {
  if (!file) return callback(null);
  const leitor = new FileReader();
  leitor.onload = () => callback(leitor.result);
  leitor.readAsDataURL(file);
}

// Formata número para reais
function formatarValor(v) {
  const n = parseFloat(v || 0);
  return "R$ " + n.toFixed(2).replace(".", ",");
}

// Gera um id simples
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// A partir do horário de criação do pedido, calcula automaticamente em que
// etapa ele está: 'andamento' -> 'preparo' -> 'pronto'
function calcularEtapaPedido(criadoEmMillis) {
  const minutosPassados = (Date.now() - criadoEmMillis) / 60000;
  if (minutosPassados < TEMPO_EM_ANDAMENTO_MIN) return "andamento";
  if (minutosPassados < TEMPO_EM_ANDAMENTO_MIN + TEMPO_EM_PREPARO_MIN) return "preparo";
  return "pronto";
}

// Pega o storeId ativo (funciona tanto no painel quanto no site)
function getStoreId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("loja") || localStorage.getItem("loja_id") || (window.STORE_ID || null);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}
