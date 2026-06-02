/** @odoo-module **/
/**
 * Darakjian POS — Background Product Loader
 *
 * Después de que el POS arranca con los productos prioritarios (top-20 por
 * categoría), este loader itera las categorías disponibles en background y
 * pide al servidor las variantes no-prioritarias de cada una.
 *
 * Flujo:
 *   1. ProductScreen montado → arranca el loop de background.
 *   2. Por cada categoría: espera 200ms (no bloquear UI), llama RPC, mergea.
 *   3. Si el usuario hace click en una categoría aún no cargada → carga
 *      inmediata de esa categoría (sin esperar el loop).
 *   4. Imágenes: se sirven vía URL (no base64) → el browser las cachea.
 */

import { patch } from "@web/core/utils/patch";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { useService } from "@web/core/utils/hooks";
import { onMounted } from "@odoo/owl";

// Conjunto de categ_ids ya cargados en esta sesión (evita doble-carga).
const _loadedCategIds = new Set();
// Categ_ids en vuelo (evita llamadas duplicadas simultáneas).
const _loadingCategIds = new Set();

patch(ProductScreen.prototype, {

    setup() {
        super.setup();
        this._orm = useService("orm");

        onMounted(() => {
            // Pequeño delay para que el UI quede completamente renderizado
            // antes de empezar el background load.
            setTimeout(() => this._darakjianStartBackgroundLoad(), 800);
        });
    },

    // ─── Background loop ──────────────────────────────────────────────────────

    async _darakjianStartBackgroundLoad() {
        const catIds = this._darakjianGetCategIds();
        if (!catIds.length) return;

        for (const catId of catIds) {
            if (_loadedCategIds.has(catId) || _loadingCategIds.has(catId)) {
                continue;
            }
            // Yield al event loop para no bloquear la UI entre categorías.
            await new Promise((r) => setTimeout(r, 200));
            this._darakjianLoadCateg(catId).catch((e) =>
                console.warn(`[Darakjian BG] categ ${catId} falló:`, e)
            );
        }
    },

    _darakjianGetCategIds() {
        // Usa las categorías disponibles en la config del POS.
        try {
            const cfg = this.pos.config;
            if (cfg.iface_available_categ_ids && cfg.iface_available_categ_ids.length) {
                return [...cfg.iface_available_categ_ids];
            }
            // Fallback: todas las pos.category cargadas en el store.
            return Object.keys(this.pos.db.category_by_id || {}).map(Number);
        } catch {
            return [];
        }
    },

    // ─── Carga de una categoría ───────────────────────────────────────────────

    async _darakjianLoadCateg(catId) {
        if (_loadedCategIds.has(catId) || _loadingCategIds.has(catId)) return;
        _loadingCategIds.add(catId);
        try {
            const sessionId = this.pos.pos_session.id;
            const rawProducts = await this._orm.call(
                "pos.session",
                "darakjian_get_products_for_categ",
                [[sessionId], catId]
            );
            if (rawProducts && rawProducts.length > 0) {
                this._darakjianMergeProducts(rawProducts);
            }
            _loadedCategIds.add(catId);
        } finally {
            _loadingCategIds.delete(catId);
        }
    },

    // ─── Merge al store ───────────────────────────────────────────────────────

    _darakjianMergeProducts(rawProducts) {
        try {
            // Odoo 19 POS: productos viven en pos.db indexados por id.
            const db = this.pos.db;
            if (db && typeof db.add_products === "function") {
                // Convertir a instancias del modelo Product si es posible.
                const ProductModel = this.pos.models && this.pos.models["product.product"];
                const instances = ProductModel
                    ? rawProducts.map((p) => new ProductModel(p, {}, this.pos))
                    : rawProducts;
                db.add_products(instances);
                return;
            }
        } catch (e) {
            console.warn("[Darakjian BG] db.add_products falló, intentando merge directo:", e);
        }

        // Fallback: agregar al array reactivo de productos si existe.
        try {
            const store = this.pos;
            const existing = store.models && store.models["product.product"];
            if (Array.isArray(existing)) {
                const existingIds = new Set(existing.map((p) => p.id));
                for (const p of rawProducts) {
                    if (!existingIds.has(p.id)) existing.push(p);
                }
                return;
            }
        } catch (e) {
            console.warn("[Darakjian BG] fallback merge falló:", e);
        }
    },

    // ─── Click en categoría: carga inmediata si no está lista ────────────────

    async _darakjianEnsureCategLoaded(catId) {
        if (!catId || _loadedCategIds.has(catId)) return;
        // Carga inmediata (no esperar el loop de background).
        await this._darakjianLoadCateg(catId);
    },

});
