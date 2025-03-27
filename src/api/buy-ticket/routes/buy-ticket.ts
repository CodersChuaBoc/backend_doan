export default {
  routes: [
    {
     method: 'POST',
     path: '/buy-ticket',
     handler: 'buy-ticket.buyTicket',
     config: {
       policies: [],
       middlewares: [],
     },
    },
    {
      method: 'POST',
      path: '/buy-ticket/create-payment-url',
      handler: 'buy-ticket.createPaymentUrl',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/callback-zalo-pay',
      handler: 'buy-ticket.callbackZaloPay',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
