<!--
# ____________________________________________________________________________________________
#  ____   ___ _______ _   ___  _____  __
# |  _ \ / _ \__   __/\ | |_ _|_   _/_ |
# | | | | | | | | | / _ \ | | | | || |
# | |_| | |_| | | |/ ___ \| | | | || |
# |____/ \___/  |_/_/   \_\___| |_|_|___|
#
#                 CONFIABILIDADE EM CADA LINHA DE CÓDIGO
#
# File: README.md
#
# This file serves as the main documentation for the DataBox library.
# It provides an overview of the project, its features, installation
# instructions, usage examples and contribution guidelines.
#
# @package      data-box
# @category     Documentation (General Overview)
# @version      2.0.0
# @since        2026-09-24
# @license      MIT
# @link         https://www.syntaxserenity.co.ao
# @link         https://github.com/SyntaxSerenity-dev/data-box
# @author       syntax serenity <fs.developerfullstack@gmail.com>
-->

# DataBox

**Biblioteca de visualização de dados flexível e multi-vista para jQuery** — semelhante ao DataTables, mas com suporte nativo a múltiplos layouts (tabela, cards, lista, kanban e árvore hierárquica) e personalização completa do cabeçalho, filtros e pesquisa.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](./CHANGELOG.md)

## ✨ Principais Funcionalidades

- **Múltiplas vistas** — tabela, cards, lista, kanban e árvore hierárquica (via plugin), alternáveis pelo utilizador.
- **Pesquisa global e por coluna**, com suporte a `searchFields` configuráveis.
- **Paginação** paginada ou virtual (recomendada para grandes árvores/hierarquias).
- **Filtros rápidos (quickFilters) e ordenação** aplicados client-side.
- **Sistema de plugins** — vistas customizadas via `views: { <nome>: { renderer: fn } }`, sem necessidade de alterar o core.
- **Internacionalização** — mensagens configuráveis (pt-PT incluído por padrão).
- **Zero build step** — funciona diretamente com `<script>`, sem necessidade de bundlers.

## 📦 Plugins Incluídos

| Plugin | Descrição |
|---|---|
| `dataBox.tree.js` | Adiciona uma vista em árvore hierárquica (profundidade ilimitada, expandir/colapsar, pesquisa que preserva a cadeia de antepassados) — suporta dados planos (`idField`/`parentField`) ou já aninhados (`childrenField`). |

## 🚀 Instalação

### Via jsDelivr (CDN — recomendado)

```html
<!-- jQuery (dependência) -->
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>

<!-- DataBox core -->
<script src="https://cdn.jsdelivr.net/gh/SyntaxSerenity-dev/data-box@main/dist/dataBox.min.js"></script>

<!-- Plugin de árvore (opcional) -->
<script src="https://cdn.jsdelivr.net/gh/SyntaxSerenity-dev/data-box@main/dist/plugins/dataBox.tree.min.js"></script>
```

> Para produção, prefira fixar uma versão em vez de `@main`:
> `https://cdn.jsdelivr.net/gh/SyntaxSerenity-dev/data-box@v2.0.0/dist/dataBox.min.js`

### Download manual

Descarregue `dist/dataBox.min.js` (e os plugins que precisar de `dist/plugins/`) e inclua localmente no seu projeto.

## 🔧 Uso Rápido

```javascript
DataBox.init('#meu-container', {
    columns: [
        { field: 'nome', title: 'Nome' },
        { field: 'estado', title: 'Estado' }
    ],
    data: minhaListaDeItens,
    search: { fields: ['nome'] },
    views: {
        tree: {
            active: true,
            icon: 'fa-sitemap',
            title: 'Árvore',
            renderer: DataBox.Tree.createRenderer({
                mode: 'flat',
                idField: 'id',
                parentField: 'parentId',
                labelField: 'nome'
            })
        }
    }
});
```

Para exemplos completos e interativos, veja a [página de documentação](https://syntaxserenity-dev.github.io/data-box/) (pasta `docs/`).

## 📁 Estrutura do Projeto

Ver [STRUCTURE.md](./STRUCTURE.md) para a explicação completa da arquitetura de pastas.

## 🤝 Contribuição

Contribuições são bem-vindas. Abra uma *issue* para reportar bugs ou sugerir funcionalidades, ou submeta um *pull request*.

## 📄 Licença

Distribuído sob a licença MIT. Ver [LICENSE](./LICENSE) para mais informação.

## 👤 Autor

**Syntax Serenity**
- GitHub: [@SyntaxSerenity-dev](https://github.com/SyntaxSerenity-dev)
- E-mail: fs.developerfullstack@gmail.com
- Website: [syntaxserenity.co.ao](https://www.syntaxserenity.co.ao)
