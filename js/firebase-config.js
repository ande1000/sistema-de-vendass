/*
  ==========================================================================
  CONFIGURAÇÃO DO FIREBASE (o "banco de dados" / API do sistema)
  ==========================================================================
  O GitHub Pages só hospeda arquivos estáticos (HTML/CSS/JS) — ele não
  consegue rodar um servidor. Por isso, para o painel e o site conversarem
  entre si (loja aberta/fechada, cardápio, pedidos, chat) em tempo real,
  usamos o Firebase (Firestore), que é gratuito e é acessado 100% via
  JavaScript, direto do navegador. Não precisa de Node, Render, nem servidor
  próprio — continua sendo um site 100% estático no GitHub Pages.

  COMO CONFIGURAR (gratuito, leva 3 minutos):
  1. Acesse https://console.firebase.google.com
  2. Crie um projeto novo (qualquer nome, ex: "o-aguia").
  3. No menu lateral, clique em "Compilação" > "Firestore Database" >
     "Criar banco de dados" > escolha "Iniciar no modo de teste".
  4. Ainda no console, clique no ícone de engrenagem > "Configurações do
     projeto" > role até "Seus apps" > clique no ícone "</>" (Web) >
     dê um nome e clique em "Registrar app".
  5. O Firebase vai te mostrar um objeto "firebaseConfig" parecido com o
     de baixo. Copie os valores dele e cole nas linhas abaixo.
  ==========================================================================
*/

const firebaseConfig = {
  apiKey: "COLE_AQUI_SUA_API_KEY",
  authDomain: "COLE_AQUI.firebaseapp.com",
  projectId: "COLE_AQUI_O_PROJECT_ID",
  storageBucket: "COLE_AQUI.appspot.com",
  messagingSenderId: "COLE_AQUI",
  appId: "COLE_AQUI"
};

// Inicializa o Firebase e deixa o banco (db) disponível para os outros arquivos
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
