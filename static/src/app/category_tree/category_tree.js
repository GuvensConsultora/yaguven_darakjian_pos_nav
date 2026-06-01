/** @odoo-module **/
import { Component, useState } from "@odoo/owl";
import { usePos } from "@point_of_sale/app/hooks/pos_hook";

export class DarakjianCategoryTree extends Component {
    static template = "yaguven_darakjian_pos_nav.CategoryTree";
    static props = {};

    setup() {
        this.pos = usePos();
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

        // Construye el nodo y poda ramas sin productos.
        const build = (cat, depth) => {
            const children = (childrenOf[cat.id] || [])
                .sort(sortFn)
                .map((c) => build(c, depth + 1))
                .filter(Boolean);
            if (!cat.hasProductsToShow && children.length === 0) {
                return null;
            }
            return { id: cat.id, name: cat.name, depth, children };
        };

        return (childrenOf[null] || []).sort(sortFn).map((c) => build(c, 0)).filter(Boolean);
    }

    get selectedCategoryId() {
        return this.pos.selectedCategory?.id ?? null;
    }

    isExpanded(node) {
        return this.state.expandedByDepth[node.depth] === node.id;
    }

    toggleExpand(node) {
        const cur = { ...this.state.expandedByDepth };
        if (cur[node.depth] === node.id) {
            for (const d of Object.keys(cur)) {
                if (Number(d) >= node.depth) delete cur[d];
            }
        } else {
            for (const d of Object.keys(cur)) {
                if (Number(d) > node.depth) delete cur[d];
            }
            cur[node.depth] = node.id;
        }
        this.state.expandedByDepth = cur;
    }

    selectCategory(node) {
        this.pos.setSelectedCategory(node.id);
        this.close();
    }

    clearCategory() {
        // Limpiar la selección muestra todos los productos.
        this.pos.selectedCategory = null;
        this.close();
    }

    close() {
        this.pos.darakjianTreeOpen = false;
    }
}
