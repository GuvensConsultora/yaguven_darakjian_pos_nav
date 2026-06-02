/** @odoo-module **/
/**
 * Darakjian POS — Disparador del background loader (Odoo 19)
 *
 * La lógica de carga vive en el PosStore (store.js): así un solo enganche en
 * setSelectedCategory cubre la carga inmediata al click venga del path que
 * venga, y el árbol custom no necesita conocer al loader.
 *
 * Este archivo solo arranca el loop de background cuando el ProductScreen se
 * monta (el POS ya está operativo).
 */

import { patch } from "@web/core/utils/patch";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { onMounted } from "@odoo/owl";

patch(ProductScreen.prototype, {
    setup() {
        super.setup();
        onMounted(() => {
            // Delay para que el UI quede renderizado antes de empezar.
            setTimeout(() => this.pos.darakjianStartBackgroundLoad?.(), 800);
        });
    },
});
