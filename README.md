# Carrinho de Compras

## Sobre o projeto
Este projeto é uma aplicação web de carrinho de compras com autenticação de usuário.

O sistema permite:
- realizar login
- acessar uma tela de carrinho
- adicionar produtos com quantidade
- atualizar a quantidade de produtos já existentes
- remover unidades de um item
- limpar todo o carrinho
- manter os dados do carrinho vinculados ao usuário autenticado

## Objetivo
O projeto foi desenvolvido para praticar conceitos de front-end com integração a backend, incluindo:
- HTML, CSS e JavaScript
- autenticação com Supabase
- manipulação do DOM
- controle de estado da interface
- persistência de dados no banco

## Tecnologias utilizadas
- HTML5
- CSS3
- JavaScript
- Supabase

## Estrutura do projeto
```text
carrinho-compras/
├── assets/              # imagens e elementos visuais
├── js/
│   └── app.js           # regras de negócio e integração com Supabase
├── index.html           # tela de login
├── carrinho.html        # tela principal do carrinho
└── style.css            # estilos da aplicação
