/** @odoo-module **/
// Fix refund — signo negativo en pantalla de pago:
// El cajero tipea 127 (positivo, comportamiento natural) pero el sistema
// necesita -127. triggerAtInput llama updateSelectedPaymentline en cada
// tecla; si el buffer trae positivo en una orden de refund, lo negamos
// antes de delegarlo al nativo.

import { patch } from "@web/core/utils/patch";
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";

patch(PaymentScreen.prototype, {
    updateSelectedPaymentline(amount = false) {
        if (this.isRefundOrder && amount === false) {
            const v = this.numberBuffer.getFloat();
            if (v !== null && v > 0) {
                return super.updateSelectedPaymentline(-v);
            }
        }
        return super.updateSelectedPaymentline(amount);
    },
});
