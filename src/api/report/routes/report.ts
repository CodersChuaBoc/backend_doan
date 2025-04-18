/**
 * report router
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/report/overview',
      handler: 'report.overview',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/report/revenue-chart',
      handler: 'report.revenueChart',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/report/invoice-chart',
      handler: 'report.invoiceChart',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/report/recent-invoices',
      handler: 'report.recentInvoices',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/report/top-tickets',
      handler: 'report.topSellingTickets',
      config: {
        policies: [],
      },
    },
  ],
};
