/** @odoo-module **/
// Overlay del árbol VERTICAL de categorías (accordion). Muestra la jerarquía
// completa pos.category (parent_id/child_ids) que el POS nativo no expone en
// vertical. Accordion estricto: solo una rama abierta por nivel -> altura acotada
// aunque un nodo tenga 14 hijos (ej. Loose Diamonds).

import { Component, useState } from "@odoo/owl";
import { usePos } from "@point_of_sale/app/hooks/pos_hook";

export class DarakjianCategoryTree extends Component {
    static template = "yaguven_darakjian_pos_nav.CategoryTree";
    static props = {};

    setup() {
        this.pos = usePos();
        // expandedByDepth[depth] = id del nodo abierto en ese nivel (accordion).
        this.state = useState({ expandedByDepth: {} });
    }

    _rel(val) {
        return val && val.id !== undefined ? val.id : val;
    }

    get roots() {
        const cats = this.pos.models["pos.category"].getAll();
        const childrenOf = {};
        for (const c of cats) {
            const pid = c.parent_id ? this._rel(c.parent_id) : null;
            (childrenOf[pid] = childrenOf[pid] || []).push(c);
        }
        const sortFn = (a, b) => (a.sequence - b.sequence) || (a.id - b.id);
        const build = (cat, depth) => ({
            id: cat.id,
            name: cat.name,
            depth,
            children: (childrenOf[cat.id] || []).sort(sortFn).map((c) => build(c, depth + 1)),
        });
        return (childrenOf[null] || []).sort(sortFn).map((c) => build(c, 0));
    }

    isExpanded(node) {
        return this.state.expandedByDepth[node.depth] === node.id;
    }

    toggleExpand(node) {
        const cur = { ...this.state.expandedByDepth };
        if (cur[node.depth] === node.id) {
            // colapsar este nivel y los más profundos
            for (const d of Object.keys(cur)) {
                if (Number(d) >= node.depth) {
                    delete cur[d];
                }
            }
        } else {
            // abrir este (reemplaza al hermano), limpiar niveles más profundos
            for (const d of Object.keys(cur)) {
                if (Number(d) > node.depth) {
                    delete cur[d];
                }
            }
            cur[node.depth] = node.id;
        }
        this.state.expandedByDepth = cur;
    }

    selectCategory(node) {
        // Reusar la selección de categoría nativa del POS (filtra la grilla).
        this.pos.selectedCategoryId = node.id;
        this.close();
    }

    close() {
        this.pos.darakjianTreeOpen = false;
    }
}
