/** @odoo-module **/
// Patch de ProductScreen (C.2: extender, no reescribir):
//  1. Registra los componentes FacetBar y CategoryTree.
//  2. Expone el botón para abrir el árbol vertical.
//  3. Inyecta el filtrado por facetas sobre la lista de productos visible.

import { patch } from "@web/core/utils/patch";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { DarakjianFacetBar } from "../app/facet_bar/facet_bar";
import { DarakjianCategoryTree } from "../app/category_tree/category_tree";

patch(ProductScreen, {
    components: { ...ProductScreen.components, DarakjianFacetBar, DarakjianCategoryTree },
});

patch(ProductScreen.prototype, {
    openDarakjianTree() {
        this.pos.darakjianTreeOpen = true;
    },

    // VERIFICAR EN INSTANCIA: el nombre del getter que devuelve los productos a
    // pintar en la grilla de Odoo 19. Si no es `products`, reapuntar el override
    // al getter correcto (p.ej. getProductsToDisplay / productsToDisplay).
    get products() {
        const base = super.products;
        if (!this.pos.darakjianActiveFacetCount) {
            return base;
        }
        return base.filter((p) => this.pos.darakjianProductMatches(p));
    },
});
