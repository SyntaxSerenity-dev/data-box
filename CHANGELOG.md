# Changelog

Todas as alterações relevantes deste projeto serão documentadas neste ficheiro.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-PT/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-PT/).

## [2.0.0] - 2026-09-24

### Adicionado
- Publicação inicial do repositório público `data-box`.
- Plugin `dataBox.tree.js` — vista em árvore hierárquica, com suporte a dados
  planos (`idField`/`parentField`) e já aninhados (`childrenField`), pesquisa
  com preservação da cadeia de antepassados, e estado persistente por instância
  (nós abertos/fechados sobrevivem a re-renders).
- Ficheiros `dist/` (versões minificadas) gerados via `terser`.
- Documentação inicial (`README.md`, `STRUCTURE.md`).

### Notas
- Versão core `dataBox.js` corresponde à v2.0.0 já usada internamente nos
  projetos da Syntax Serenity antes da publicação pública deste repositório.

<!--
## [Não lançado]

### Adicionado
### Alterado
### Corrigido
### Removido
-->
