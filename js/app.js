// URL do projeto criado no Supabase.
const SUPABASE_URL = "https://xeircfbedexoytdqknjp.supabase.co";

// Chave publica do projeto, usada pelo front-end para acessar autenticacao e banco.
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlaXJjZmJlZGV4b3l0ZHFrbmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTk0NTUsImV4cCI6MjA5MDAzNTQ1NX0.oV5qjHNNIkZNLDiLoB3VUFPlNjKOjcko8UroWNt328c";

// Detecta qual pagina esta aberta para decidir se mostra login ou carrinho.
const paginaAtual = window.location.pathname.split("/").pop() || "index.html";

// Marca se estamos na tela de login.
const estaNaPaginaLogin = paginaAtual === "index.html";

// Marca se estamos na tela do carrinho.
const estaNaPaginaCarrinho = paginaAtual === "carrinho.html";

// Busca os elementos do HTML que podem existir em uma pagina ou outra.
const listaProdutos = document.getElementById("lista-produtos");
const campoProduto = document.getElementById("produto");
const campoQuantidade = document.getElementById("quantidade");
const campoValorTotal = document.getElementById("valor-total");
const mensagemLogin = document.getElementById("mensagem-login");
const painelErro = document.getElementById("painel-erro");
const mensagemErroDetalhe = document.getElementById("mensagem-erro-detalhe");

// Guarda o total atual do carrinho enquanto a pagina estiver aberta.
let valorTotal = 0;

// Guarda o cliente de conexao com o Supabase.
// Usamos o nome "supabaseClient" para nao entrar em conflito com o objeto global "supabase" da biblioteca.
let supabaseClient = null;

function mostrarErroInterface(mensagem) {
  // Mostra uma caixa de erro visual na tela, se ela existir na pagina atual.
  if (painelErro && mensagemErroDetalhe) {
    mensagemErroDetalhe.textContent = mensagem;
    painelErro.classList.remove("oculto");
  }

  // Na tela de login, tambem reaproveita a mensagem abaixo do botao.
  if (mensagemLogin) {
    mensagemLogin.textContent = mensagem;
  }
}

function limparErroInterface() {
  // Esconde a caixa de erro visual.
  if (painelErro) {
    painelErro.classList.add("oculto");
  }

  // Limpa o texto interno da caixa de erro.
  if (mensagemErroDetalhe) {
    mensagemErroDetalhe.textContent = "";
  }

  // Limpa a mensagem simples da tela de login.
  if (mensagemLogin) {
    mensagemLogin.textContent = "";
  }
}

function inicializarSupabase() {
  // Se o script externo do Supabase nao carregou, mostramos um erro amigavel em vez de quebrar o app.
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    mostrarErroInterface("Nao foi possivel carregar a conexao com o Supabase. Verifique sua internet ou o script da biblioteca.");
    return null;
  }

  try {
    // Cria o cliente de conexao com o Supabase.
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (error) {
    // Se algo falhar na criacao do cliente, mostramos o motivo na interface.
    console.error("Erro ao criar cliente do Supabase:", error);
    mostrarErroInterface(`Erro ao iniciar o sistema: ${error.message}`);
    return null;
  }
}

function extrairDadosProduto(produtoSelecionado) {
  // Divide o texto do select em nome e valor.
  const [nome, valor] = produtoSelecionado.split(" - R$");

  // Retorna os dados formatados em objeto.
  return {
    nome,
    valor: Number(valor),
  };
}

function atualizarTotal() {
  // So atualiza a tela se o elemento do total existir nessa pagina.
  if (!campoValorTotal) {
    return;
  }

  campoValorTotal.textContent = `R$${valorTotal}`;
}

function renderizarItem(nome, valor, quantidade) {
  // Evita erro se esta funcao for chamada fora da pagina do carrinho.
  if (!listaProdutos) {
    return;
  }

  // Cria um bloco visual para representar o item.
  const itemCarrinho = document.createElement("section");
  itemCarrinho.className = "carrinho__produtos__produto";
  itemCarrinho.innerHTML = `<span class="texto-azul">${quantidade}x</span> ${nome} <span class="texto-azul">R$${valor}</span>`;

  // Adiciona o item criado na lista visivel.
  listaProdutos.appendChild(itemCarrinho);
}

function resetarCarrinhoNaTela() {
  // Remove os itens mostrados na tela.
  if (listaProdutos) {
    listaProdutos.innerHTML = "";
  }

  // Zera o total em memoria e atualiza a exibicao.
  valorTotal = 0;
  atualizarTotal();

  // Limpa o campo de quantidade para facilitar o proximo uso.
  if (campoQuantidade) {
    campoQuantidade.value = "";
  }
}

async function getUsuarioLogado() {
  // Se nao houver conexao com o Supabase, nao temos como verificar sessao.
  if (!supabaseClient) {
    return null;
  }

  // Busca o usuario autenticado no Supabase.
  const { data, error } = await supabaseClient.auth.getUser();

  // Em caso de erro, informa o problema e encerra.
  if (error || !data.user) {
    return null;
  }

  return data.user;
}

async function fazerLogin() {
  // Sempre limpamos mensagens antigas antes de tentar novamente.
  limparErroInterface();

  // Se o Supabase nao foi iniciado, mostramos um erro claro para o usuario.
  if (!supabaseClient) {
    mostrarErroInterface("O login nao pode ser realizado porque a conexao com o servidor nao foi iniciada.");
    return;
  }

  // Captura os valores digitados.
  const email = document.getElementById("email")?.value.trim();
  const senha = document.getElementById("senha")?.value.trim();

  // Valida se os dois campos foram preenchidos.
  if (!email || !senha) {
    mostrarErroInterface("Preencha email e senha.");
    return;
  }

  try {
    // Envia email e senha para o Supabase autenticar.
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password: senha,
    });

    // Se o Supabase retornar erro, mostramos a mensagem na interface.
    if (error) {
      mostrarErroInterface(`Erro no login: ${error.message}`);
      return;
    }

    // Se der certo, o usuario vai para a tela do carrinho.
    window.location.href = "carrinho.html";
  } catch (error) {
    // Captura falhas inesperadas e exibe para o usuario.
    console.error("Erro inesperado no login:", error);
    mostrarErroInterface(`Erro inesperado no login: ${error.message}`);
  }
}

async function adicionar() {
  // Limpamos mensagens antigas para nao confundir o usuario.
  limparErroInterface();

  // Confere se a conexao com o Supabase esta pronta.
  if (!supabaseClient) {
    mostrarErroInterface("Nao foi possivel adicionar o item porque a conexao com o servidor falhou.");
    return;
  }

  // Busca o usuario logado antes de salvar o item.
  const usuario = await getUsuarioLogado();

  // Sem usuario logado, voltamos para a pagina inicial.
  if (!usuario) {
    mostrarErroInterface("Sua sessao expirou. Faca login novamente.");
    window.location.href = "index.html";
    return;
  }

  // Le o valor digitado e converte para numero.
  const quantidade = Number(campoQuantidade?.value);

  // Impede que o usuario envie uma quantidade invalida.
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    mostrarErroInterface("Informe uma quantidade valida maior que zero.");
    campoQuantidade?.focus();
    return;
  }

  // Quebra o texto do select em nome e valor.
  const { nome, valor } = extrairDadosProduto(campoProduto.value);

  try {
    // Insere o item na tabela do carrinho no Supabase.
    const { error } = await supabaseClient.from("carrinho_itens").insert([
      {
        user_id: usuario.id,
        produto_nome: nome,
        produto_valor: valor,
        quantidade,
      },
    ]);

    // Se o banco acusar erro, mostramos na interface.
    if (error) {
      mostrarErroInterface(`Erro ao salvar item: ${error.message}`);
      return;
    }

    // Atualiza a parte visual do carrinho.
    renderizarItem(nome, valor, quantidade);
    valorTotal += quantidade * valor;
    atualizarTotal();
    campoQuantidade.value = "";
  } catch (error) {
    // Trata falhas inesperadas sem quebrar a pagina.
    console.error("Erro inesperado ao adicionar item:", error);
    mostrarErroInterface(`Erro inesperado ao adicionar item: ${error.message}`);
  }
}

async function carregarCarrinho() {
  // Se a conexao nao existe, nao tentamos buscar dados.
  if (!supabaseClient) {
    mostrarErroInterface("Nao foi possivel carregar o carrinho porque a conexao com o servidor falhou.");
    return;
  }

  // Descobre qual usuario esta logado.
  const usuario = await getUsuarioLogado();

  if (!usuario) {
    return;
  }

  // Limpa a tela antes de redesenhar os itens vindos do banco.
  resetarCarrinhoNaTela();

  try {
    // Busca todos os itens do usuario atual.
    const { data, error } = await supabaseClient
      .from("carrinho_itens")
      .select("*")
      .eq("user_id", usuario.id)
      .order("created_at", { ascending: true });

    // Se a busca falhar, mostramos o erro.
    if (error) {
      mostrarErroInterface(`Erro ao carregar carrinho: ${error.message}`);
      return;
    }

    // Renderiza cada item recebido e recalcula o total.
    data.forEach((item) => {
      renderizarItem(item.produto_nome, item.produto_valor, item.quantidade);
      valorTotal += Number(item.produto_valor) * item.quantidade;
    });

    atualizarTotal();
  } catch (error) {
    // Trata falhas inesperadas.
    console.error("Erro inesperado ao carregar carrinho:", error);
    mostrarErroInterface(`Erro inesperado ao carregar carrinho: ${error.message}`);
  }
}

async function limpar() {
  // Limpamos mensagens antigas antes da acao.
  limparErroInterface();

  // Se o Supabase falhou, avisamos e nao seguimos.
  if (!supabaseClient) {
    mostrarErroInterface("Nao foi possivel limpar o carrinho porque a conexao com o servidor falhou.");
    return;
  }

  // Busca o usuario autenticado.
  const usuario = await getUsuarioLogado();

  // Se nao houver usuario, limpamos apenas a tela.
  if (!usuario) {
    resetarCarrinhoNaTela();
    return;
  }

  try {
    // Remove todos os itens do carrinho desse usuario no banco.
    const { error } = await supabaseClient
      .from("carrinho_itens")
      .delete()
      .eq("user_id", usuario.id);

    // Se houver erro, mostramos o motivo.
    if (error) {
      mostrarErroInterface(`Erro ao limpar carrinho: ${error.message}`);
      return;
    }

    // Atualiza a tela apos a limpeza.
    resetarCarrinhoNaTela();
  } catch (error) {
    // Captura falhas inesperadas.
    console.error("Erro inesperado ao limpar carrinho:", error);
    mostrarErroInterface(`Erro inesperado ao limpar carrinho: ${error.message}`);
  }
}

async function sair() {
  // Se nao houver cliente Supabase, apenas redirecionamos para o login.
  if (!supabaseClient) {
    window.location.href = "index.html";
    return;
  }

  try {
    // Encerra a sessao atual.
    await supabaseClient.auth.signOut();
  } catch (error) {
    // Mesmo com erro, mostramos a mensagem e voltamos para o login.
    console.error("Erro ao sair:", error);
    mostrarErroInterface(`Erro ao sair: ${error.message}`);
  }

  window.location.href = "index.html";
}

async function inicializarPagina() {
  // Limpa mensagens antigas ao iniciar.
  limparErroInterface();

  // Tenta criar a conexao com o Supabase sem deixar o script quebrar.
  supabaseClient = inicializarSupabase();

  // Se o Supabase nao estiver disponivel, paramos aqui, mas as funcoes continuam existindo.
  if (!supabaseClient) {
    return;
  }

  try {
    // Verifica se o navegador ja possui uma sessao salva.
    const { data, error } = await supabaseClient.auth.getSession();

    // Mostra qualquer erro de sessao diretamente na interface.
    if (error) {
      mostrarErroInterface(`Erro ao verificar sessao: ${error.message}`);
      return;
    }

    const usuarioTemSessao = Boolean(data.session);

    // Se estiver no login e ja existir sessao, pula direto para o carrinho.
    if (estaNaPaginaLogin) {
      if (usuarioTemSessao) {
        window.location.href = "carrinho.html";
      }
      return;
    }

    // Se estiver no carrinho sem sessao, volta para o login.
    if (estaNaPaginaCarrinho) {
      if (!usuarioTemSessao) {
        window.location.href = "index.html";
        return;
      }

      // Se estiver tudo certo, carrega os itens do carrinho.
      await carregarCarrinho();
    }
  } catch (error) {
    // Captura erros inesperados na inicializacao inteira.
    console.error("Erro ao iniciar a pagina:", error);
    mostrarErroInterface(`Erro ao iniciar a pagina: ${error.message}`);
  }
}

// Expomos as funcoes no objeto window para que o onclick do HTML consiga encontra-las.
window.fazerLogin = fazerLogin;
window.adicionar = adicionar;
window.limpar = limpar;
window.sair = sair;

// Inicia a configuracao geral da pagina.
inicializarPagina();
