/**
 * DataBox Tree Plugin
 * Versão: 1.0.0
 *
 * Adiciona uma vista "tree" (árvore hierárquica, profundidade ilimitada,
 * expandir/colapsar, pesquisa que preserva a cadeia de antepassados) ao
 * DataBox — SEM alterar dataBox.js. Usa o mecanismo de vista customizada
 * que o próprio core já suporta:
 *
 *   views: { <nomeQualquer>: { active: true, renderer: fn(items, $container, instance) } }
 *
 * (ver DataBoxInstance.prototype.renderItems, ramo `default`).
 *
 * PORQUÊ UM PLUGIN À PARTE E NÃO UM "case 'tree'" DENTRO DO CORE:
 *   dataBox.js é uma biblioteca partilhada por vários projetos/páginas.
 *   Mantê-la sem fork evita ter de reaplicar patches sempre que ela for
 *   atualizada — este ficheiro só precisa de ser copiado para o lado de
 *   dataBox.js (carregado a seguir, no HTML) em qualquer sistema futuro.
 *
 * USO RÁPIDO (dados já aninhados, ex.: endpoint que devolve `filhos`):
 *
 *   views: {
 *       tree: {
 *           active: true,
 *           icon: 'fa-diagram-project',   // ícone do botão no alternador de vista
 *           title: 'Árvore',              // rótulo do botão
 *           renderer: DataBox.Tree.createRenderer({
 *               mode: 'nested',           // os itens JÁ vêm com `childrenField`
 *               idField: 'id',
 *               childrenField: 'filhos',
 *               labelField: 'nome',
 *               iconField: 'icon',
 *               searchFields: ['nome', 'codigo'],
 *               badge: node => `<span class="badge-status">${node.estadoLabel}</span>`,
 *               meta: node => `${node.livros} livro(s)`,
 *               onSelect: (node, instance) => console.log('selecionado', node)
 *           })
 *       }
 *   }
 *
 * USO COM DADOS PLANOS (uma linha por item, com id + parentField — o caso
 * mais comum vindo de uma tabela `category`/`department`/`comment` etc.):
 *
 *   views: {
 *       tree: {
 *           active: true,
 *           icon: 'fa-sitemap',
 *           title: 'Árvore',
 *           renderer: DataBox.Tree.createRenderer({
 *               mode: 'flat',              // default — não precisa de o escrever
 *               idField: 'id',
 *               parentField: 'parentId',
 *               labelField: 'nome',
 *               searchFields: ['nome', 'codigo']
 *           })
 *       }
 *   }
 *
 * RECOMENDADO SEMPRE QUE USAR A VISTA TREE:
 *   pagination: { type: 'virtual', limit: 100000 }
 *
 *   Motivo: tal como a vista Kanban já embutida no core (que também
 *   agrupa `this.items`, não `this.allItems`), a Tree recebe só a fatia
 *   já paginada. Uma paginação normal ('paginated', limit: 10) pode
 *   cortar itens a meio de um ramo. O modo 'flat' desta plugin já
 *   recupera os ANTEPASSADOS em falta a partir de `instance.allItems`
 *   (para a árvore nunca aparecer "partida"), mas os IRMÃOS que ficaram
 *   na página seguinte continuam por mostrar — por isso, com árvores,
 *   usa sempre paginação virtual com um limite alto (ou desativa a
 *   paginação visualmente, escondendo o paginador via CSS).
 *
 * PESQUISA: o campo de pesquisa global do DataBox já filtra `allItems`
 * por `search.fields` antes de paginar — funciona tal e qual com esta
 * plugin, tanto em modo 'flat' (mostra só os ramos com correspondência,
 * com os antepassados sempre visíveis para dar contexto) como em modo
 * 'nested' (filtra sub-árvores recursivamente por searchFields).
 *
 * FILTROS RÁPIDOS (quickFilters) e ORDENAÇÃO: funcionam tal e qual em
 * modo 'flat' (aplicados por processClientSide() antes de a plugin
 * receber os itens). Em modo 'nested' não se aplicam — a estrutura já
 * vem pronta do servidor, não há um array plano para filtrar/ordenar.
 *
 * @author        syntax serenity
 * @license       MIT
 * @package       templates/private/assets/shared/dataBox
 * @since         2026-08-13
 * @link          https://www.syntaxserenity.co.ao
*/
(function ($) {
    'use strict';

    if (!window.DataBox) {
        console.error('DataBox Tree Plugin: carregar dataBox.js antes deste ficheiro.');
        return;
    }

    const DEFAULTS = {
        mode: 'flat',                 // 'flat' (id + parentField) | 'nested' (childrenField já preenchido)
        idField: 'id',
        parentField: 'parentId',
        childrenField: 'children',
        labelField: 'name',
        iconField: null,              // ex.: 'icon' → classes fontawesome por nó
        defaultIcon: 'fas fa-circle-dot',
        searchFields: null,           // null = usa labelField; ou array de campos, ex.: ['nome','codigo']
        indentRem: 1.25,
        expandedByDefault: 'roots',   // 'all' | 'roots' | 'none' | número (profundidade)
        badge: null,                  // fn(node) => html, ex.: um badge de estado
        meta: null,                   // fn(node) => html, ex.: contagem de filhos
        actions: null,                // fn(node) => html, ex.: botões de ação por linha
        onSelect: null,               // fn(node, instance) — chamado ao clicar num nó
        rowClass: null,               // fn(node) => string de classes extra na linha
        emptyMessage: 'Nenhum item encontrado.'
    };

    /* ============================================
    ESTADO POR INSTÂNCIA — cada DataBoxInstance que usa
    esta plugin ganha o seu próprio conjunto de nós
    abertos/selecionado, para sobreviver a re-renders
    (pesquisa, filtros, mudança de página).
    ============================================ */
    function treeState(instance) {
        if (!instance._treeState) {
            instance._treeState = {
                openIds: new Set(),    // nós que o utilizador abriu explicitamente (toggle)
                closedIds: new Set(),  // nós que o utilizador fechou explicitamente (toggle)
                baseline: null,        // 'all' | 'none' | null — definido por expandAll()/collapseAll()
                selectedId: null
            };
        }
        return instance._treeState;
    }

    function escapeHtml(instance, text) {
        return typeof instance.escapeHtml === 'function' ? instance.escapeHtml(text) : String(text == null ? '' : text);
    }

    /* ============================================
    MODO 'flat' — reconstrói a árvore a partir de uma
    lista plana (idField/parentField), recuperando
    antepassados em falta a partir de instance.allItems
    quando a paginação cortou algum (ver nota no
    cabeçalho do ficheiro).
    ============================================ */
    function buildFromFlat(items, instance, opts) {
        const byId = new Map();
        (instance.allItems || items).forEach(item => byId.set(item[opts.idField], item));

        // IDs a desenhar = os itens recebidos + todos os seus antepassados
        const idsToRender = new Set();
        items.forEach(item => {
            let current = item;
            while (current) {
                const id = current[opts.idField];
                if (idsToRender.has(id)) break;
                idsToRender.add(id);
                const parentId = current[opts.parentField];
                current = (parentId !== null && parentId !== undefined) ? byId.get(parentId) : null;
            }
        });

        const childrenOf = new Map();
        idsToRender.forEach(id => {
            const item = byId.get(id);
            if (!item) return;
            const parentId = item[opts.parentField];
            const key = (parentId !== null && parentId !== undefined && idsToRender.has(parentId)) ? parentId : '__root__';
            if (!childrenOf.has(key)) childrenOf.set(key, []);
            childrenOf.get(key).push(item);
        });

        const collator = new Intl.Collator('pt-PT');
        const build = (key) => {
            const kids = (childrenOf.get(key) || []).slice()
                .sort((a, b) => collator.compare(String(a[opts.labelField] || ''), String(b[opts.labelField] || '')));
            return kids.map(item => {
                const node = Object.assign({}, item);
                node[opts.childrenField] = build(item[opts.idField]);
                return node;
            });
        };

        return build('__root__');
    }

    /* ============================================
    MODO 'nested' — os itens já vêm em árvore (ex.:
    endpoint que devolve `filhos` já aninhados, como
    CategoryController::arvore()). Só filtra por
    pesquisa, recursivamente, se houver termo.
    ============================================ */
    function filterNested(nodes, term, opts) {
        if (!term) return nodes;
        const fields = opts.searchFields || [opts.labelField];
        const matches = (node) => fields.some(f => String(node[f] ?? '').toLowerCase().includes(term));
        const walk = (list) => list.reduce((acc, node) => {
            const kids = walk(node[opts.childrenField] || []);
            if (matches(node) || kids.length) {
                acc.push(Object.assign({}, node, { [opts.childrenField]: kids }));
            }
            return acc;
        }, []);
        return walk(nodes);
    }

    /* ============================================
    RENDERIZAÇÃO
    ============================================ */
    function shouldBeOpen(node, depth, state, opts, hasSearchTerm) {
        const id = node[opts.idField];
        if (hasSearchTerm) return true;        // pesquisa: mostra tudo aberto para dar contexto
        if (state.closedIds.has(id)) return false; // o utilizador fechou este nó explicitamente
        if (state.openIds.has(id)) return true;    // o utilizador abriu este nó explicitamente
        if (state.baseline === 'all') return true;   // expandAll() foi chamado
        if (state.baseline === 'none') return false; // collapseAll() foi chamado
        if (opts.expandedByDefault === 'all') return true;
        if (opts.expandedByDefault === 'roots') return depth === 0;
        if (typeof opts.expandedByDefault === 'number') return depth < opts.expandedByDefault;
        return false;
    }

    function renderNode(node, depth, instance, opts, state, hasSearchTerm) {
        const id = node[opts.idField];
        const children = node[opts.childrenField] || [];
        const isOpen = shouldBeOpen(node, depth, state, opts, hasSearchTerm);
        const isSelected = state.selectedId === id;

        const $li = $('<li class="databox-tree-node"></li>').attr('data-tree-id', id);
        const extraClass = typeof opts.rowClass === 'function' ? (opts.rowClass(node) || '') : '';

        const $row = $(`
            <div class="databox-tree-row d-flex align-items-center gap-2 ${isSelected ? 'selected' : ''} ${extraClass}"
                 style="padding-left:${depth * opts.indentRem}rem" data-tree-id="${id}">
                <button type="button" class="databox-tree-toggle ${children.length ? '' : 'is-leaf'}" aria-label="Expandir/colapsar">
                    <i class="fas ${children.length ? (isOpen ? 'fa-chevron-down' : 'fa-chevron-right') : 'fa-circle'}"></i>
                </button>
                ${opts.iconField ? `<span class="databox-tree-icon"><i class="${node[opts.iconField] || opts.defaultIcon}"></i></span>` : ''}
                <span class="databox-tree-label flex-fill">${escapeHtml(instance, node[opts.labelField])}</span>
                ${typeof opts.badge === 'function' ? (opts.badge(node) || '') : ''}
                ${typeof opts.meta === 'function' ? `<span class="databox-tree-meta text-muted small">${opts.meta(node) || ''}</span>` : ''}
                ${typeof opts.actions === 'function' ? `<span class="databox-tree-actions">${opts.actions(node) || ''}</span>` : ''}
            </div>
        `);

        $row.find('.databox-tree-toggle').on('click', function (e) {
            e.stopPropagation();
            if (!children.length) return;
            if (isOpen) {
                state.closedIds.add(id);
                state.openIds.delete(id);
            } else {
                state.openIds.add(id);
                state.closedIds.delete(id);
            }
            instance.renderItems();
        });

        $row.on('click', function () {
            state.selectedId = id;
            if (typeof opts.onSelect === 'function') opts.onSelect(node, instance);
            instance.renderItems();
        });

        $li.append($row);

        if (children.length && isOpen) {
            const $ul = $('<ul class="databox-tree-children list-unstyled"></ul>');
            children.forEach(child => $ul.append(renderNode(child, depth + 1, instance, opts, state, hasSearchTerm)));
            $li.append($ul);
        }

        return $li;
    }

    /* ============================================
    API PÚBLICA DA PLUGIN
    ============================================ */
    window.DataBox.Tree = {
        version: '1.0.0',

        /**
         * @param {Object} options ver DEFAULTS acima
         * @returns {(items: Array, $container: jQuery, instance: Object) => void}
         *          pronto para atribuir a `views.<nome>.renderer`
         */
        createRenderer(options) {
            const opts = Object.assign({}, DEFAULTS, options || {});

            return function (items, $container, instance) {
                const state = treeState(instance);
                const term = (instance.searchTerm || '').trim().toLowerCase();

                let roots;
                if (opts.mode === 'nested') {
                    roots = filterNested(items, term, opts);
                } else {
                    roots = buildFromFlat(items, instance, opts);
                }

                $container.empty();

                if (!roots.length) {
                    $container.html(`
                        <div class="text-center py-5">
                            <i class="fas fa-search fa-3x text-muted mb-3"></i>
                            <p class="text-muted">${opts.emptyMessage}</p>
                        </div>
                    `);
                    return;
                }

                const $root = $('<ul class="databox-tree-root list-unstyled mb-0"></ul>');
                roots.forEach(node => $root.append(renderNode(node, 0, instance, opts, state, !!term)));
                $container.append($root);
            };
        },

        /**
         * Expande/colapsa TODOS os nós — para ligar aos botões "Expandir
         * tudo"/"Colapsar tudo" do toolbar da página (fora do DataBox).
         *
         * @param {Object} instance a instância devolvida por DataBox.init()
         */
        expandAll(instance) {
            const state = treeState(instance);
            state.baseline = 'all';
            state.openIds.clear();
            state.closedIds.clear();
            instance.renderItems();
        },

        collapseAll(instance) {
            const state = treeState(instance);
            state.baseline = 'none';
            state.openIds.clear();
            state.closedIds.clear();
            instance.renderItems();
        },

        /**
         * @param {Object} instance
         * @returns {*} o id do nó atualmente selecionado, ou null
         */
        getSelected(instance) {
            return treeState(instance).selectedId;
        }
    };
})(jQuery);
