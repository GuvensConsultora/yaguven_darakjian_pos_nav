/** @odoo-module **/
// Estado reactivo de la navegación custom del POS Darakjian: facetas activas,
// overlay del árbol, y la lógica de matcheo client-side. Se engancha al PosStore
// nativo por patch (C.2: extendemos, no reescribimos).

import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/services/pos_store";

patch(PosStore.prototype, {
    setup() {
        super.setup(...arguments);
        // Facetas activas: { [String(attributeId)]: [valueId, ...] }
        this.darakjianFacets = {};
        // Overlay del árbol vertical de categorías.
        this.darakjianTreeOpen = false;
    },

    /** Activa/desactiva un valor de faceta. Reasigna el objeto para disparar
     *  la reactividad de OWL (mutar in-place no siempre la dispara). */
    darakjianToggleFacetValue(attributeId, valueId) {
        const key = String(attributeId);
        const cur = this.darakjianFacets[key] || [];
        const next = cur.includes(valueId)
            ? cur.filter((v) => v !== valueId)
            : [...cur, valueId];
        const all = { ...this.darakjianFacets };
        if (next.length) {
            all[key] = next;
        } else {
            delete all[key];
        }
        this.darakjianFacets = all;
    },

    darakjianIsFacetActive(attributeId, valueId) {
        return (this.darakjianFacets[String(attributeId)] || []).includes(valueId);
    },

    darakjianClearFacets() {
        this.darakjianFacets = {};
    },

    get darakjianActiveFacetCount() {
        return Object.values(this.darakjianFacets).reduce((n, arr) => n + arr.length, 0);
    },

    /** ¿El producto pasa el filtro de facetas activas?
     *  AND entre atributos distintos, OR entre valores del mismo atributo. */
    darakjianProductMatches(product) {
        const keys = Object.keys(this.darakjianFacets);
        if (!keys.length) {
            return true;
        }
        const productValues = product.darakjian_facet_values || {};
        return keys.every((attrId) => {
            const wanted = this.darakjianFacets[attrId];
            const have = productValues[attrId] || [];
            return have.some((vid) => wanted.includes(vid));
        });
    },
});
