# -*- coding: utf-8 -*-
{
    "name": "Darakjian — POS Navigation (facets + vertical tree)",
    "summary": "Faceted attribute filter bar and on-demand vertical category "
               "tree overlay for the Point of Sale product screen.",
    "description": """
Mejora la navegación de categorías del POS para Darakjian Jewelers:

* Barra de **facetas** por atributos de producto (metal, piedra, tipo, precio…),
  configurable desde ajustes — sin tocar modelos nativos.
* **Árbol vertical** de categorías en overlay, invocable bajo demanda, que muestra
  la jerarquía completa (la "diferencia de jerarquía en vertical" pedida por el
  cliente) sin sacrificar el ancho de la grilla de productos.

Diseño responsive: targets táctiles ampliados en tablet (pointer: coarse) y vista
densa en escritorio. Toda la lógica vive dentro del módulo (herencia/patch sobre
el POS nativo OWL, sin campos en modelos nativos).
""",
    "version": "19.0.1.0.0",
    "category": "Point of Sale",
    "author": "Yagüven C.G.",
    "website": "https://github.com/GuvensConsultora/yaguven_darakjian_pos_nav",
    "license": "LGPL-3",
    # Solo nativo de Odoo (C.2): el POS y su framework. Nada de OCA/terceros.
    "depends": ["point_of_sale"],
    "data": [
        "security/ir.model.access.csv",
        "views/darakjian_pos_facet_views.xml",
    ],
    # Componentes OWL inyectados en el bundle del POS.
    "assets": {
        "point_of_sale._assets_pos": [
            "yaguven_darakjian_pos_nav/static/src/scss/pos_nav.scss",
            "yaguven_darakjian_pos_nav/static/src/app/store.js",
            "yaguven_darakjian_pos_nav/static/src/app/breadcrumb/breadcrumb.js",
            "yaguven_darakjian_pos_nav/static/src/app/breadcrumb/breadcrumb.xml",
            "yaguven_darakjian_pos_nav/static/src/app/facet_bar/facet_bar.js",
            "yaguven_darakjian_pos_nav/static/src/app/facet_bar/facet_bar.xml",
            "yaguven_darakjian_pos_nav/static/src/app/category_tree/category_tree.js",
            "yaguven_darakjian_pos_nav/static/src/app/category_tree/category_tree.xml",
            "yaguven_darakjian_pos_nav/static/src/overrides/product_screen.js",
            "yaguven_darakjian_pos_nav/static/src/overrides/product_screen.xml",
            "yaguven_darakjian_pos_nav/static/src/overrides/product_card.xml",
        ],
    },
    "installable": True,
    "application": False,
    "auto_install": False,
}
