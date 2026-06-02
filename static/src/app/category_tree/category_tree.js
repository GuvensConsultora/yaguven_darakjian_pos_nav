/** @odoo-module **/
import { Component, useState, onMounted } from "@odoo/owl";
import { usePos } from "@point_of_sale/app/hooks/pos_hook";

export class DarakjianCategoryTree extends Component {
    static template = "yaguven_darakjian_pos_nav.CategoryTree";
    static props = {};

    setup() {
        this.pos = usePos();
        this.state = useState({ expandedByDepth: {} });
        // CategorySelector nativo fue reemplazado por este árbol.
        // Al montar, inicializar la categoría seleccionada con la primera
        // disponible en la config (evita que el POS muestre todos los productos
        // a la vez, lo que traba el browser con miles de cards + image requests).
        onMounted(() => {
            // Seleccionar la primera categoría disponible si O19 no lo hizo.
            // IMPORTANTE: hacer esto ANTES de marcar darakjianInitialized=true,
            // para que el grid pase de [] a los productos de la categoría en un
            // solo tick reactivo (sin pasar por el estado "todos los productos").
            if (!this.pos.selectedCategory) {
                const configCatIds = this.pos.config.iface_available_categ_ids || [];
                const firstId = configCatIds.length
                    ? (configCatIds[0]?.id ?? configCatIds[0])
                    : null;
                if (firstId) {
                    this.pos.setSelectedCategory(firstId);
                }
            }
            // Habilitar el grid (hasta aquí devolvía [] para evitar el flood
            // inicial de 146 image requests que saturaban Odoo.sh workers).
            this.pos.darakjianInitialized = true;
        });
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
