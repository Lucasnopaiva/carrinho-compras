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
const telaCarregamento = document.getElementById("tela-carregamento");
const botaoEntrar = document.getElementById("botao-entrar");

// Guarda o total atual do carrinho enquanto a pagina estiver aberta.
let valorTotal = 0;

// Guarda o cliente de conexao com o Supabase.
// Usamos o nome "supabaseClient" para nao entrar em conflito com o objeto global "supabase" da biblioteca.
let supabaseClient = null;

function traduzirMensagemErro(error, contexto = "geral") {
  // Converte mensagens tecnicas do Supabase em textos mais claros para o usuario.
  const mensagemOriginal = error?.message?.toLowerCase() || "";
  const codigoErro = error?.code || "";

  if (mensagemOriginal.includes("invalid login credentials")) {
    return "Email ou senha incorretos.";
  }

  if (mensagemOriginal.includes("email not confirmed")) {
    return "Confirme seu email antes de entrar.";
  }

  if (mensagemOriginal.includes("invalid email")) {
    return "Email invalido. Verifique o endereco digitado.";
  }

  if (mensagemOriginal.includes("password should be at least")) {
    return "A senha informada nao atende aos requisitos minimos.";
  }

  if (mensagemOriginal.includes("network") || mensagemOriginal.includes("fetch")) {
    return "Nao foi possivel conectar ao servidor. Verifique sua internet.";
  }

  if (codigoErro === "over_email_send_rate_limit" || mensagemOriginal.includes("rate limit")) {
    return "Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.";
  }

  if (contexto === "login") {
    return "Nao foi possivel entrar. Verifique seus dados e tente novamente.";
  }

  return "Ocorreu um erro inesperado. Tente novamente.";
}

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

function alternarCarregamentoLogin(estaCarregando) {
  // Controla uma tela de transicao curta enquanto o login esta em andamento.
  if (telaCarregamento) {
    telaCarregamento.classList.toggle("oculto", !estaCarregando);
  }

  // Evita multiplos cliques no botao enquanto a autenticacao acontece.
  if (botaoEntrar) {
    botaoEntrar.disabled = estaCarregando;
    botaoEntrar.textContent = estaCarregando ? "Entrando..." : "Entrar";
    botaoEntrar.style.opacity = estaCarregando ? "0.8" : "1";
    botaoEntrar.style.cursor = estaCarregando ? "wait" : "pointer";
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

function criarChaveProduto(nome, valor) {
  // Monta uma chave unica para identificar produtos repetidos no carrinho.
  return `${nome}::${valor}`;
}

function renderizarItem(item) {
  // Evita erro se esta funcao for chamada fora da pagina do carrinho.
  if (!listaProdutos) {
    return;
  }

  // Cria um bloco visual para representar o item.
  const itemCarrinho = document.createElement("section");
  itemCarrinho.className = "carrinho__produtos__produto";
  itemCarrinho.innerHTML = `
    <div class="carrinho__produto__info">
      <span>
        <span class="texto-azul">${item.quantidade}x</span> ${item.produto_nome}
        <span class="texto-azul">R$${item.produto_valor}</span>
      </span>
    </div>
    <div class="carrinho__produto__acoes">
      <button type="button" class="carrinho__acao carrinho__acao--adicionar" data-acao="adicionar-um" data-id="${item.id}">
        +1
      </button>
      <button type="button" class="carrinho__acao carrinho__acao--remover" data-acao="remover-um" data-id="${item.id}" data-nome="${item.produto_nome}">
        -1
      </button>
    </div>
  `;

  // Adiciona o item criado na lista visivel.
  listaProdutos.appendChild(itemCarrinho);
}

function consolidarItensCarrinho(itens) {
  // Junta produtos iguais para evitar linhas duplicadas na interface e no banco.
  const itensAgrupados = new Map();

  itens.forEach((item) => {
    const chaveProduto = criarChaveProduto(item.produto_nome, item.produto_valor);
    const itemExistente = itensAgrupados.get(chaveProduto);

    if (!itemExistente) {
      itensAgrupados.set(chaveProduto, { ...item, quantidade: Number(item.quantidade) });
      return;
    }

    itemExistente.quantidade += Number(item.quantidade);
    itemExistente.idsExtras.push(item.id);
  });

  return Array.from(itensAgrupados.values()).map((item) => ({
    ...item,
    idsExtras: item.idsExtras || [],
  }));
}

async function normalizarItensDuplicados(usuarioId) {
  // Busca os itens do usuario e consolida produtos iguais em uma unica linha no banco.
  const { data, error } = await supabaseClient
    .from("carrinho_itens")
    .select("*")
    .eq("user_id", usuarioId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar itens do carrinho: ${error.message}`);
  }

  const itensAgrupados = consolidarItensCarrinho(
    data.map((item) => ({
      ...item,
      idsExtras: [],
    }))
  );

  for (const item of itensAgrupados) {
    if (item.idsExtras.length > 0) {
      // Atualiza o primeiro registro com a quantidade final e apaga os duplicados antigos.
      const { error: erroAtualizacao } = await supabaseClient
        .from("carrinho_itens")
        .update({ quantidade: item.quantidade })
        .eq("id", item.id);

      if (erroAtualizacao) {
        throw new Error(`Erro ao consolidar item "${item.produto_nome}": ${erroAtualizacao.message}`);
      }

      const { error: erroRemocao } = await supabaseClient
        .from("carrinho_itens")
        .delete()
        .in("id", item.idsExtras);

      if (erroRemocao) {
        throw new Error(`Erro ao remover duplicatas de "${item.produto_nome}": ${erroRemocao.message}`);
      }
    }
  }

  return itensAgrupados.map(({ idsExtras, ...item }) => item);
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
    // Exibe uma transicao visual curta para suavizar a entrada no sistema.
    alternarCarregamentoLogin(true);

    // Envia email e senha para o Supabase autenticar.
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password: senha,
    });

    // Se o Supabase retornar erro, mostramos a mensagem na interface.
    if (error) {
      alternarCarregamentoLogin(false);
      mostrarErroInterface(traduzirMensagemErro(error, "login"));
      return;
    }

    // Mantem a tela por um instante para a transicao parecer mais natural.
    await new Promise((resolve) => setTimeout(resolve, 450));

    // Se der certo, o usuario vai para a tela do carrinho.
    window.location.href = "carrinho.html";
  } catch (error) {
    // Captura falhas inesperadas e exibe para o usuario.
    console.error("Erro inesperado no login:", error);
    alternarCarregamentoLogin(false);
    mostrarErroInterface(traduzirMensagemErro(error, "login"));
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
    // Verifica se esse produto ja existe para somar a quantidade em vez de criar outra linha.
    const { data: itensExistentes, error: erroBusca } = await supabaseClient
      .from("carrinho_itens")
      .select("*")
      .eq("user_id", usuario.id)
      .eq("produto_nome", nome)
      .eq("produto_valor", valor)
      .order("created_at", { ascending: true });

    if (erroBusca) {
      mostrarErroInterface(`Erro ao buscar item existente: ${erroBusca.message}`);
      return;
    }

    if (itensExistentes.length > 0) {
      // Se o item ja existir, atualizamos a linha principal e limpamos duplicatas antigas.
      const itemPrincipal = itensExistentes[0];
      const quantidadeAtualizada = itensExistentes.reduce(
        (total, item) => total + Number(item.quantidade),
        quantidade
      );

      const { error: erroAtualizacao } = await supabaseClient
        .from("carrinho_itens")
        .update({ quantidade: quantidadeAtualizada })
        .eq("id", itemPrincipal.id);

      if (erroAtualizacao) {
        mostrarErroInterface(`Erro ao atualizar item: ${erroAtualizacao.message}`);
        return;
      }

      const idsDuplicados = itensExistentes.slice(1).map((item) => item.id);

      if (idsDuplicados.length > 0) {
        const { error: erroRemocao } = await supabaseClient
          .from("carrinho_itens")
          .delete()
          .in("id", idsDuplicados);

        if (erroRemocao) {
          mostrarErroInterface(`Erro ao limpar itens duplicados: ${erroRemocao.message}`);
          return;
        }
      }
    } else {
      // Se for um produto novo, inserimos normalmente no banco.
      const { error: erroInsercao } = await supabaseClient.from("carrinho_itens").insert([
        {
          user_id: usuario.id,
          produto_nome: nome,
          produto_valor: valor,
          quantidade,
        },
      ]);

      if (erroInsercao) {
        mostrarErroInterface(`Erro ao salvar item: ${erroInsercao.message}`);
        return;
      }
    }

    // Recarrega o carrinho para refletir o valor total e as acoes de cada item.
    await carregarCarrinho();
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
    // Normaliza itens repetidos antes de desenhar a lista para manter o carrinho consistente.
    const itensCarrinho = await normalizarItensDuplicados(usuario.id);

    // Renderiza cada item recebido e recalcula o total.
    itensCarrinho.forEach((item) => {
      renderizarItem(item);
      valorTotal += Number(item.produto_valor) * item.quantidade;
    });

    atualizarTotal();
  } catch (error) {
    // Trata falhas inesperadas.
    console.error("Erro inesperado ao carregar carrinho:", error);
    mostrarErroInterface(`Erro inesperado ao carregar carrinho: ${error.message}`);
  }
}

async function adicionarUmaUnidade(itemId) {
  // Adiciona apenas uma unidade a um item ja existente no carrinho.
  limparErroInterface();

  const { data: item, error } = await supabaseClient
    .from("carrinho_itens")
    .select("*")
    .eq("id", itemId)
    .single();

  if (error) {
    mostrarErroInterface(`Erro ao localizar item: ${error.message}`);
    return;
  }

  const { error: erroAtualizacao } = await supabaseClient
    .from("carrinho_itens")
    .update({ quantidade: Number(item.quantidade) + 1 })
    .eq("id", itemId);

  if (erroAtualizacao) {
    mostrarErroInterface(`Erro ao adicionar quantidade: ${erroAtualizacao.message}`);
    return;
  }

  await carregarCarrinho();
}

async function removerUmaUnidade(itemId, nomeProduto) {
  // Remove apenas uma unidade do produto e so confirma quando ele vai sumir do carrinho.
  limparErroInterface();

  const { data: item, error } = await supabaseClient
    .from("carrinho_itens")
    .select("*")
    .eq("id", itemId)
    .single();

  if (error) {
    mostrarErroInterface(`Erro ao localizar item: ${error.message}`);
    return;
  }

  const quantidadeAtual = Number(item.quantidade);

  if (quantidadeAtual <= 1) {
    const confirmouRemocao = window.confirm(`Deseja realmente remover "${nomeProduto}" do carrinho?`);

    if (!confirmouRemocao) {
      return;
    }

    const { error: erroRemocao } = await supabaseClient
      .from("carrinho_itens")
      .delete()
      .eq("id", itemId);

    if (erroRemocao) {
      mostrarErroInterface(`Erro ao remover item: ${erroRemocao.message}`);
      return;
    }
  } else {
    const { error: erroAtualizacao } = await supabaseClient
      .from("carrinho_itens")
      .update({ quantidade: quantidadeAtual - 1 })
      .eq("id", itemId);

    if (erroAtualizacao) {
      mostrarErroInterface(`Erro ao atualizar item: ${erroAtualizacao.message}`);
      return;
    }
  }

  await carregarCarrinho();
}

function configurarAcoesCarrinho() {
  // Usa delegacao de eventos para tratar os botoes criados dinamicamente na lista.
  if (!listaProdutos) {
    return;
  }

  listaProdutos.addEventListener("click", async (evento) => {
    const botaoAcao = evento.target.closest("[data-acao]");

    if (!botaoAcao) {
      return;
    }

    const itemId = Number(botaoAcao.dataset.id);

    if (botaoAcao.dataset.acao === "adicionar-um") {
      await adicionarUmaUnidade(itemId);
      return;
    }

    if (botaoAcao.dataset.acao === "remover-um") {
      await removerUmaUnidade(itemId, botaoAcao.dataset.nome);
    }
  });
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

      // Prepara os botoes de acao do carrinho antes de carregar os itens.
      configurarAcoesCarrinho();

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
