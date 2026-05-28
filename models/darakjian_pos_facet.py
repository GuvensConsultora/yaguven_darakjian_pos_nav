# -*- coding: utf-8 -*-
from odoo import api, fields, models


class DarakjianPosFacet(models.Model):
    """Configuración de qué atributos de producto se exponen como facetas en el POS.

    Vive enteramente en este módulo (C.2): un many2one al nativo product.attribute,
    sin agregar campos a modelos nativos. Se carga al POS vía pos.load.mixin.
    """

    _name = "darakjian.pos.facet"
    _description = "Darakjian POS Facet"
    _inherit = ["pos.load.mixin"]
    _order = "sequence, id"

    attribute_id = fields.Many2one(
        "product.attribute",
        string="Attribute",
        required=True,
        ondelete="cascade",
        help="Atributo nativo que se ofrece como faceta de filtrado en el POS.",
    )
    label = fields.Char(
        string="Label",
        help="Etiqueta a mostrar en el POS. Si se deja vacío, se usa el nombre del atributo.",
    )
    sequence = fields.Integer(default=10)
    active = fields.Boolean(default=True)
    display_type = fields.Selection(
        [("chips", "Chips"), ("list", "List")],
        string="Display",
        default="chips",
        required=True,
        help="Cómo se muestran los valores de la faceta: como chips o como lista.",
    )

    _sql_constraints = [
        ("attribute_uniq", "unique(attribute_id)",
         "Ese atributo ya está configurado como faceta."),
    ]

    @api.depends("attribute_id", "label")
    def _compute_display_name(self):
        for rec in self:
            rec.display_name = rec.label or (rec.attribute_id.name or "")

    # ---- carga al POS (pos.load.mixin) ----
    @api.model
    def _load_pos_data_domain(self, data):
        return [("active", "=", True)]

    @api.model
    def _load_pos_data_fields(self, config_id):
        return ["id", "attribute_id", "label", "sequence", "display_type"]
