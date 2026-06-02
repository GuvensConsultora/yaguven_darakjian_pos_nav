/** @odoo-module **/
// Estado reactivo de la navegación custom del POS Darakjian: facetas activas,
// overlay del árbol, y la lógica de matcheo client-side. Se engancha al PosStore
// nativo por patch (C.2: extendemos, no reescribimos).

import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/services/pos_store";

// Categorías ya cargadas / en vuelo en esta sesión (evitan doble-carga).
const _dkLoadedCateg = new Set();
const _dkLoadingCateg = new Set();
// Tope de templates no-prioritarios a traer al entrar a una categoría.  Acota
// el volumen para que una categoría enorme no cuelgue; el resto queda accesible
// por la búsqueda nativa del POS.
const DK_CATEG_LIMIT = 50;

patch(PosStore.prototype, {
    // Odoo 19 pos_hr bug: getCashier() devuelve undefined antes de que el
    // empleado esté cargado y crashea con "_role" de undefined. Aplicamos
    // optional chaining para que retorne false en lugar de tirar.
    get employeeIsAdmin() {
        const cashier = this.getCashier?.();
        return cashier?._role === "manager";
    },

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

    // ─── Carga on-demand de no-prioritarios por categoría ─────────────────────
    // NO se precarga el catálogo en background: precargar las ~144 categorías
    // (varias con miles de productos) saturaba la cola de sync del POS y trababa
    // el cierre de sesión.  En su lugar, cada categoría se carga SOLO cuando el
    // cajero la selecciona (ver setSelectedCategory), y acotada por DK_CATEG_LIMIT
    // para que una categoría enorme (p.ej. Watches: 2.2k) no cuelgue la UI.
    //
    // Apoyado 100% en APIs nativas O19: load_product_from_pos (server) devuelve
    // templates + variantes + taxes + atributos en el shape del payload inicial
    // (image_128 como bool → imágenes por URL lazy); callRelated los mergea con
    // el connectNewData nativo.  Sin formato ni merge custom → robusto en upgrades.

    async darakjianLoadCateg(catId) {
        if (_dkLoadedCateg.has(catId) || _dkLoadingCateg.has(catId)) return;
        _dkLoadingCateg.add(catId);
        try {
            // Templates no-prioritarios de la categoría (los prioritarios ya
            // entraron en la carga inicial).  Los que excedan el límite quedan
            // accesibles por la búsqueda nativa del POS.
            const domain = [
                ["pos_categ_ids", "=", catId],
                ["pos_load_priority", "=", false],
            ];
            await this.data.callRelated(
                "product.template",
                "load_product_from_pos",
                [this.config.id, domain, 0, DK_CATEG_LIMIT],
                {},
                true,   // queue=true: sincroniza con el batch nativo evitando race conditions
                true,   // loadMissingRecords (trae relacionados faltantes)
            );
            _dkLoadedCateg.add(catId);
        } finally {
            _dkLoadingCateg.delete(catId);
        }
    },

    async darakjianEnsureCategLoaded(catId) {
        if (!catId || _dkLoadedCateg.has(catId)) return;
        // No await: la carga corre en segundo plano y la UI se actualiza sola al
        // mergear (reactividad de connectNewData).  No bloquea la navegación.
        this.darakjianLoadCateg(catId).catch((e) =>
            console.warn(`[Darakjian] carga categ ${catId} falló:`, e)
        );
    },

    /** Al elegir una categoría, cargar sus no-prioritarios ya si el loop de
     *  background todavía no llegó (carga inmediata, mejor UX). */
    setSelectedCategory(categoryId) {
        super.setSelectedCategory(categoryId);
        this.darakjianEnsureCategLoaded(categoryId);
    },
});
