/* ==========================================================================
   FUNÇÕES COMPARTILHADAS (usadas pelo painel e pelo site)
   ========================================================================== */

// Tempos das etapas do pedido (em minutos) — pode ajustar aqui
const TEMPO_EM_ANDAMENTO_MIN = 1;   // depois de aceito, fica "em andamento" por 1 min
const TEMPO_EM_PREPARO_MIN = 10;    // depois fica "em preparo" por 10 min
const TEMPO_ATRASO_MIN = 5;         // depois de "pronto", se passar disso sem sair, fica "em atraso"

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

// A partir do pedido (aceito ou não, e de quando foi aceito), calcula
// automaticamente em que etapa ele está:
// 'aguardando' (esperando alguém aceitar) -> 'andamento' -> 'preparo' -> 'pronto'
// e se estiver 'pronto' passa a marcar 'atraso' depois de alguns minutos.
function calcularEtapaPedidoV2(pedido, aceitoEmMillis) {
  if (!pedido.aceito) return { etapa: "aguardando", atraso: false };

  const minutosPassados = (Date.now() - aceitoEmMillis) / 60000;
  let etapa;
  if (minutosPassados < TEMPO_EM_ANDAMENTO_MIN) etapa = "andamento";
  else if (minutosPassados < TEMPO_EM_ANDAMENTO_MIN + TEMPO_EM_PREPARO_MIN) etapa = "preparo";
  else etapa = "pronto";

  let atraso = false;
  if (etapa === "pronto") {
    const minutosProntoDesde = minutosPassados - (TEMPO_EM_ANDAMENTO_MIN + TEMPO_EM_PREPARO_MIN);
    atraso = minutosProntoDesde >= TEMPO_ATRASO_MIN;
  }
  return { etapa, atraso };
}

// Pega o storeId ativo (funciona tanto no painel quanto no site)
function getStoreId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("loja") || localStorage.getItem("loja_id") || (window.STORE_ID || null);
}

// Toca um beep curto de notificação usando o próprio navegador (sem precisar
// de nenhum arquivo de som externo)
function tocarBeepNotificacao() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    // um segundo "bip" logo em seguida
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sine";
      osc2.frequency.value = 1100;
      gain2.gain.setValueAtTime(0.001, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.35);
    }, 220);
  } catch (e) {
    console.warn("Não foi possível tocar o som de notificação:", e);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}
