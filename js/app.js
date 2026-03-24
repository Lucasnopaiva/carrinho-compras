const listaProdutos = document.getElementById('lista-produtos');
const campoProduto = document.getElementById('produto');
const campoQuantidade = document.getElementById('quantidade');
const campoValorTotal = document.getElementById('valor-total');

let valorTotal = 0;

function extrairDadosProduto(produtoSelecionado) {
  const [nome, valor] = produtoSelecionado.split(' - R$');

  return {
    nome,
    valor: Number(valor)
  };
}

function atualizarTotal() {
  campoValorTotal.textContent = `R$${valorTotal}`;
}

function adicionar() {
  const quantidade = Number(campoQuantidade.value);

  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    alert('Informe uma quantidade valida maior que zero.');
    campoQuantidade.focus();
    return;
  }

  const { nome, valor } = extrairDadosProduto(campoProduto.value);
  const itemCarrinho = document.createElement('section');

  itemCarrinho.className = 'carrinho__produtos__produto';
  itemCarrinho.innerHTML = `<span class="texto-azul">${quantidade}x</span> ${nome} <span class="texto-azul">R$${valor}</span>`;

  listaProdutos.appendChild(itemCarrinho);

  valorTotal += quantidade * valor;
  atualizarTotal();
  campoQuantidade.value = '';
}

function limpar() {
  listaProdutos.innerHTML = '';
  valorTotal = 0;
  atualizarTotal();
  campoQuantidade.value = '';
}

limpar();
