/** @odoo-module **/
// Fix refund multi-línea: el nativo solo auto-asigna qty para órdenes de un
// único ítem (_prepareAutoRefundOnOrder). Para órdenes con múltiples líneas,
// si el usuario no tipea qty en el numpad, todas quedan en 0 y onDoRefund
// sale sin hacer nada (getHasItemsToRefund() = false). Este patch detecta ese
// caso y auto-asigna la qty máxima refundable a todas las líneas antes de
// delegar al nativo.

import { patch } from "@web/core/utils/patch";
import { TicketScreen } from "@point_of_sale/app/screens/ticket_screen/ticket_screen";

patch(TicketScreen.prototype, {
    async onDoRefund() {
        const order = this.getSelectedOrder();
        if (order && !this._doesOrderHaveSoleItem(order)) {
            const hasAnyQtySet = order.lines.some((line) => {
                const detail = this.getToRefundDetail(line);
                return detail.qty > 0;
            });
            if (!hasAnyQtySet) {
                for (const line of order.lines) {
                    const detail = this.getToRefundDetail(line);
                    if (!detail.destinationOrder) {
                        const refundableQty = line.qty - (line.refundedQty || 0);
                        if (refundableQty > 0) {
                            detail.qty = refundableQty;
                        }
                    }
                }
            }
        }
        return await super.onDoRefund();
    },
});
