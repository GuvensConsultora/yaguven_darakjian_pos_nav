/** @odoo-module **/
// Barra de facetas del POS: por cada atributo configurado como faceta, muestra
// sus valores como chips activables. Lee la config (darakjian.pos.facet) y los
// valores (product.attribute.value) cargados al POS.

import { Component } from "@odoo/owl";
import { usePos } from "@point_of_sale/app/store/pos_hook";

export class DarakjianFacetBar extends Component {
    static template = "yaguven_darakjian_pos_nav.FacetBar";
    static props = {};

    setup() {
        this.pos = usePos();
    }

    _attrId(rec) {
        // m2o puede venir como record (si el modelo está cargado) o como id.
        return rec && rec.attribute_id && rec.attribute_id.id !== undefined
            ? rec.attribute_id.id
            : rec.attribute_id;
    }

    get facets() {
        const values = this.pos.models["product.attribute.value"].getAll();
        return this.pos.models["darakjian.pos.facet"].getAll()
            .slice()
            .sort((a, b) => (a.sequence - b.sequence) || (a.id - b.id))
            .map((f) => {
                const attrId = this._attrId(f);
                const vals = values
                    .filter((v) => this._attrId(v) === attrId)
                    .sort((a, b) => (a.sequence - b.sequence) || (a.id - b.id));
                return {
                    id: f.id,
                    attrId,
                    label: f.label || (f.attribute_id && f.attribute_id.name) || `#${attrId}`,
                    displayType: f.display_type,
                    values: vals,
                };
            })
            .filter((f) => f.values.length);
    }

    get activeCount() {
        return this.pos.darakjianActiveFacetCount;
    }

    isActive(attrId, valueId) {
        return this.pos.darakjianIsFacetActive(attrId, valueId);
    }

    toggle(attrId, valueId) {
        this.pos.darakjianToggleFacetValue(attrId, valueId);
    }

    clear() {
        this.pos.darakjianClearFacets();
    }
}
