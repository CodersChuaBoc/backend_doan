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
  ],
};
