# -*- coding: utf-8 -*-
from odoo import api, fields, models


class ProductTemplate(models.Model):
    """Marca de prioridad para carga inicial del POS.

    Los templates con pos_load_priority=True se descargan al browser al abrir
    sesión (payload chico, POS arranca rápido).  El resto se carga en background
    por categoría una vez que el POS ya está operativo.

    El flag lo setea el script pos_set_priority.py: top-20 por ventas (v16)
    por pos.category.  Sin campo almacenado → sin huérfanos al desinstalar (C.2)
    no aplica acá porque necesitamos filtrar en dominio; se documenta el impacto.
    """

    _inherit = "product.template"

    pos_load_priority = fields.Boolean(
        string="POS Priority Load",
        store=True,
        default=False,
        help="Si True, el producto se incluye en la carga inicial del POS. "
             "Los demás se cargan en background por categoría.",
    )


class PosSession(models.Model):
    _inherit = "pos.session"

    def _load_pos_data_models(self, config_id):
        """Añadir nuestros modelos al payload de sesión."""
        models_list = super()._load_pos_data_models(config_id)
        models_list += ["darakjian.pos.facet", "product.attribute.value"]
        return models_list

    def darakjian_get_products_for_categ(self, categ_id):
        """Devuelve las variantes NO prioritarias de una pos.category.

        Llamado por el background loader JS después de que el POS ya arrancó.
        Retorna los mismos campos que _load_pos_data_fields para que el store
        pueda mergearlos sin transformación adicional.
        """
        config = self.config_id
        domain = [
            ("available_in_pos", "=", True),
            ("active", "=", True),
            ("pos_categ_ids", "=", categ_id),
            ("product_tmpl_id.pos_load_priority", "=", False),
        ]
        if config.limit_categories and config.iface_available_categ_ids:
            domain.append(
                ("pos_categ_ids", "in", config.iface_available_categ_ids.ids)
            )
        flds = self.env["product.product"]._load_pos_data_fields(config)
        # Incluir image_128 para el background load (el inicial no la lleva)
        if "image_128" not in flds:
            flds = list(flds) + ["image_128"]
        return self.env["product.product"].search_read(domain, fields=flds)


class ProductAttributeValue(models.Model):
    """Solo los valores de los atributos configurados como faceta."""

    _name = "product.attribute.value"
    _inherit = ["product.attribute.value", "pos.load.mixin"]

    @api.model
    def _load_pos_data_domain(self, data, config):
        facet_attr_ids = (
            self.env["darakjian.pos.facet"].search([]).attribute_id.ids
        )
        return (
            [("attribute_id", "in", facet_attr_ids)]
            if facet_attr_ids
            else [("id", "=", False)]
        )

    @api.model
    def _load_pos_data_fields(self, config):
        return ["id", "name", "attribute_id", "sequence", "html_color"]


class ProductProduct(models.Model):
    """Variantes en el POS: solo prioritarias al arranque; resto en background."""

    _inherit = "product.product"

    darakjian_facet_values = fields.Json(
        string="Darakjian POS facet values",
        compute="_compute_darakjian_facet_values",
        store=False,
    )

    def _compute_darakjian_facet_values(self):
        facet_attr_ids = (
            self.env["darakjian.pos.facet"].search([]).attribute_id.ids
        )
        if not facet_attr_ids:
            for p in self:
                p.darakjian_facet_values = {}
            return
        tmpl_ids = self.product_tmpl_id.ids
        lines = self.env["product.template.attribute.line"].search(
            [
                ("product_tmpl_id", "in", tmpl_ids),
                ("attribute_id", "in", facet_attr_ids),
            ]
        )
        by_tmpl = {}
        for line in lines:
            slot = by_tmpl.setdefault(line.product_tmpl_id.id, {})
            slot[str(line.attribute_id.id)] = line.value_ids.ids
        for p in self:
            p.darakjian_facet_values = by_tmpl.get(p.product_tmpl_id.id, {})

    @api.model
    def _load_pos_data_domain(self, data, config):
        """Restricción al arranque: solo variantes con pos_load_priority=True.

        Si no hay ninguna prioritaria (campo aún no seteado), cae al dominio
        nativo para no dejar el POS vacío.
        """
        base_domain = super()._load_pos_data_domain(data, config)
        priority_count = self.env["product.template"].search_count(
            [("pos_load_priority", "=", True), ("available_in_pos", "=", True)]
        )
        if priority_count == 0:
            return base_domain
        return base_domain + [("product_tmpl_id.pos_load_priority", "=", True)]

    @api.model
    def _load_pos_data_fields(self, config):
        flds = super()._load_pos_data_fields(config)
        if "darakjian_facet_values" not in flds:
            flds = list(flds) + ["darakjian_facet_values"]
        return flds
