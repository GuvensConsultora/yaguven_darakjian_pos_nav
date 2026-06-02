/** @odoo-module **/
// Migas de pan de la categoría seleccionada: muestra la ruta desde la raíz
// hasta la categoría actual (ej. Jewelry › Rings › Wedding Bands).  Cada nivel
// es clickeable para saltar a esa categoría.  Lee pos.selectedCategory (getter
// reactivo del PosStore), así que se actualiza solo al navegar.

import { Component } from "@odoo/owl";
import { usePos } from "@point_of_sale/app/hooks/pos_hook";

export class DarakjianBreadcrumb extends Component {
    static template = "yaguven_darakjian_pos_nav.Breadcrumb";
    static props = {};

    setup() {
        this.pos = usePos();
    }

    /** Resuelve un parent_id que puede venir como record (m2o cargado) o como
     *  id crudo, devolviendo siempre el record de pos.category o null. */
    _resolve(rel) {
        if (!rel) {
            return null;
        }
        if (rel.id !== undefined) {
            return rel;
        }
        return this.pos.models["pos.category"].get(rel) || null;
    }

    /** Cadena raíz → actual.  El Set guard evita loops si hubiera un ciclo de
     *  parent_id corrupto en los datos. */
    get trail() {
        let node = this.pos.selectedCategory;
        if (!node || !node.id) {
            return [];
        }
        const chain = [];
        const seen = new Set();
        while (node && node.id && !seen.has(node.id)) {
            seen.add(node.id);
            chain.unshift({ id: node.id, name: node.name });
            node = this._resolve(node.parent_id);
        }
        return chain;
    }

    selectCrumb(catId) {
        this.pos.setSelectedCategory(catId);
    }
}
