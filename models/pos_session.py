# -*- coding: utf-8 -*-
from odoo import api, fields, models


class PosSession(models.Model):
    _inherit = "pos.session"

    def _load_pos_data_models(self, config_id):
        """Sumar nuestros modelos a los que el POS carga al abrir sesión.

        - darakjian.pos.facet: la configuración de facetas.
        - product.attribute.value: los valores posibles (solo de los atributos
          elegidos como faceta) para poder pintar los chips/listas.
        """
        models_list = super()._load_pos_data_models(config_id)
        models_list += ["darakjian.pos.facet", "product.attribute.value"]
        return models_list


class ProductAttributeValue(models.Model):
    """Cargamos al POS solo los valores de los atributos configurados como faceta.

    Limitar el dominio a los atributos-faceta mantiene el payload chico: no se bajan
    los valores de los 91 atributos, solo los de los ~8-12 elegidos.
    """

    _name = "product.attribute.value"
    _inherit = ["product.attribute.value", "pos.load.mixin"]

    @api.model
    def _load_pos_data_domain(self, data):
        facet_attr_ids = self.env["darakjian.pos.facet"].search([]).attribute_id.ids
        return [("attribute_id", "in", facet_attr_ids)] if facet_attr_ids else [("id", "=", False)]

    @api.model
    def _load_pos_data_fields(self, config_id):
        return ["id", "name", "attribute_id", "sequence", "html_color"]


class ProductProduct(models.Model):
    """Índice de facetas por producto, expuesto al POS como campo calculado NO
    almacenado (sin columna en DB -> sin huérfanos al desinstalar, C.2).

    Estructura: {str(attribute_id): [value_id, ...]} con los valores que el
    producto ofrece para cada atributo-faceta. El filtrado en el POS se hace
    client-side intersectando estos value_ids con los chips activos.
    """

    _inherit = "product.product"

    darakjian_facet_values = fields.Json(
        string="Darakjian POS facet values",
        compute="_compute_darakjian_facet_values",
        store=False,
    )

    def _compute_darakjian_facet_values(self):
        facet_attr_ids = self.env["darakjian.pos.facet"].search([]).attribute_id.ids
        if not facet_attr_ids:
            for p in self:
                p.darakjian_facet_values = {}
            return
        tmpl_ids = self.product_tmpl_id.ids
        lines = self.env["product.template.attribute.line"].search([
            ("product_tmpl_id", "in", tmpl_ids),
            ("attribute_id", "in", facet_attr_ids),
        ])
        by_tmpl = {}
        for line in lines:
            slot = by_tmpl.setdefault(line.product_tmpl_id.id, {})
            slot[str(line.attribute_id.id)] = line.value_ids.ids
        for p in self:
            p.darakjian_facet_values = by_tmpl.get(p.product_tmpl_id.id, {})

    @api.model
    def _load_pos_data_fields(self, config_id):
        fields_list = super()._load_pos_data_fields(config_id)
        if "darakjian_facet_values" not in fields_list:
            fields_list.append("darakjian_facet_values")
        return fields_list
