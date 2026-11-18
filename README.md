# Pesquisa rápida de favoritos

Extensão para Microsoft Edge que substitui a página de nova tab por uma interface de pesquisa rápida.

Permite pesquisar, ao mesmo tempo, nos favoritos e no histórico recente do navegador, gerir atalhos e adicionar novos favoritos de forma organizada.

## Funcionalidades

- Pesquisa instantânea em favoritos e histórico.
- Pesquisa sem distinção entre maiúsculas e minúsculas e sem considerar acentos.
- Pesquisa por título, URL, pasta e descrição da página.
- Resultados agrupados por domínio.
- Até 60 resultados por categoria.
- Histórico limitado às 500 entradas mais recentes.
- Atalhos configuráveis na barra da nova tab.
- Adição, edição e remoção de favoritos e atalhos.
- Organização automática de favoritos em pasta por domínio.
- Pesquisa opcional no Google.
- Navegação direta para o primeiro resultado com a tecla `Enter`.
- Pesquisa no Google com `Alt + Enter`.

## Tecnologias

- JavaScript moderno, sem frameworks.
- HTML5 e CSS3.
- Manifest V3.
- APIs de extensão do Microsoft Edge/Chrome:
  - `chrome.bookmarks`
  - `chrome.history`
  - `chrome.storage`
  - `chrome.tabs`
  - `chrome.action`

Não é necessário instalar dependências, executar compilação ou utilizar um servidor externo.

## Especificações técnicas

- A página inicial da aplicação é `index.html`.
- `app.js` contém a interface e a lógica de pesquisa.
- `background.js` abre a aplicação quando o utilizador seleciona o ícone da extensão.
- `manifest.json` define as permissões e a substituição da página de nova tab.
- Os atalhos são guardados numa pasta chamada `favorites-search`, diretamente na barra de favoritos.
- Os favoritos adicionados são organizados numa pasta principal `Organizados` e em subpastas por domínio.
- As descrições das páginas são guardadas localmente através de `chrome.storage.local`.
- São obtidas descrições e ícones das páginas, sempre que possível, através de pedidos HTTP/HTTPS.
- A aplicação é específica do perfil Edge ativo e não envia os favoritos ou o histórico para um servidor próprio.
- Um máximo de 19 atalhos é apresentado na página inicial.

## Instalação para desenvolvimento

1. Abra o Microsoft Edge.
2. Aceda a `edge://extensions/`.
3. Ative o **Modo de programador**.
4. Selecione **Carregar descontraidamente** ou **Load unpacked**.
5. Escolha a pasta que contém este projeto.
6. Abra uma nova tab.

Também pode selecionar o ícone da extensão na barra de ferramentas para abrir a aplicação numa nova tab.

## Como usar

### Pesquisar

1. Escreva no campo de pesquisa.
2. Os favoritos e o histórico são filtrados automaticamente.
3. Selecione um resultado para abrir o respetivo endereço.
4. Utilize `Enter` para abrir o primeiro resultado encontrado.
5. Utilize `Alt + Enter` para pesquisar a expressão no Google.
6. Selecione **Pesquisar no Google** para executar manualmente uma pesquisa externa.

### Adicionar um favorito

1. Selecione o botão `+` junto ao campo de pesquisa.
2. Indique o nome e o endereço.
3. Selecione **Adicionar**.

A aplicação tenta localizar uma pasta adequada pelo nome ou pelo domínio. Caso não exista, cria uma estrutura em `Organizados / domínio`.

Também pode adicionar uma página diretamente a partir do histórico através do botão `+` apresentado ao lado do respetivo resultado.

### Gerir atalhos

1. Selecione **Adicionar atalho**.
2. Introduza o endereço do novo atalho.
3. Selecione o atalho para o abrir em nova tab.

Para editar ou remover:

1. Clique com o botão direito no atalho.
2. Selecione **Editar** para alterar o nome ou o endereço.
3. Selecione **Remover** para eliminar o atalho.

Os atalhos são armazenados na pasta `favorites-search` da barra de favoritos.

## Permissões

- `bookmarks`: consultar, criar, alterar e remover favoritos.
- `history`: consultar o histórico recente.
- `storage`: guardar localmente descrições de páginas.
- `http://*/*` e `https://*/*`: obter descrições e ícones das páginas.

## Compatibilidade

A aplicação foi criada para Microsoft Edge com arquitetura Manifest V3. Poderá também funcionar em navegadores compatíveis com APIs `chrome.*`, embora a configuração oficial indicada seja o Edge.