/**
 * A set of functions called "actions" for `report`
 */

export default {
  /**
   * Get report overview
   * @param {Object} ctx - The context object containing request parameters
   * @return {Object} Contains total users, exhibits, posts, and revenue for the specified year
   */
  overview: async (ctx) => {
    let { year } = ctx.request.query;
    
    // Default to current year if year is not provided
    if (!year) {
      year = new Date().getFullYear().toString();
    } else if (isNaN(parseInt(year))) {
      return ctx.badRequest('Year parameter must be a valid number');
    }

    try {
      const { getTotalUsers, getTotalExhibits, getTotalPosts, getTotalRevenue } = strapi.service('api::report.report');

      const [totalUsers, totalExhibits, totalPosts, totalRevenue] = await Promise.all([
        getTotalUsers(),
        getTotalExhibits(),
        getTotalPosts(),
        getTotalRevenue(parseInt(year))
      ]);

      return {
        totalUsers,
        totalExhibits,
        totalPosts,
        totalRevenue
      };
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  /**
   * Get revenue chart data by month for a specific year
   * @param {Object} ctx - The context object containing request parameters
   * @return {Object} Contains monthly revenue data as an array
   */
  revenueChart: async (ctx) => {
    let { year } = ctx.request.query;
    
    // Default to current year if year is not provided
    if (!year) {
      year = new Date().getFullYear().toString();
    } else if (isNaN(parseInt(year))) {
      return ctx.badRequest('Year parameter must be a valid number');
    }

    try {
      const { getMonthlyRevenue } = strapi.service('api::report.report');
      const monthlyRevenue = await getMonthlyRevenue(parseInt(year));

      return { data: monthlyRevenue };
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  /**
   * Get invoice count chart data by month for a specific year
   * @param {Object} ctx - The context object containing request parameters
   * @return {Object} Contains monthly invoice count data as an array
   */
  invoiceChart: async (ctx) => {
    let { year } = ctx.request.query;
    
    // Default to current year if year is not provided
    if (!year) {
      year = new Date().getFullYear().toString();
    } else if (isNaN(parseInt(year))) {
      return ctx.badRequest('Year parameter must be a valid number');
    }

    try {
      const { getMonthlyInvoiceCount } = strapi.service('api::report.report');
      const monthlyInvoiceCount = await getMonthlyInvoiceCount(parseInt(year));

      return { data: monthlyInvoiceCount };
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  /**
   * Get recent invoices
   * @param {Object} ctx - The context object containing request parameters
   * @return {Object} Contains list of recent invoices
   */
  recentInvoices: async (ctx) => {
    const { limit = 10 } = ctx.request.query;
    
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum <= 0) {
      return ctx.badRequest('Limit parameter must be a positive number');
    }

    try {
      const { getRecentInvoices } = strapi.service('api::report.report');
      const recentInvoices = await getRecentInvoices(limitNum);

      return { data: recentInvoices };
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  /**
   * Get top selling tickets
   * @param {Object} ctx - The context object containing request parameters
   * @return {Object} Contains list of top selling tickets with count and revenue
   */
  topSellingTickets: async (ctx) => {
    const { limit = 5, year } = ctx.request.query;
    
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum <= 0) {
      return ctx.badRequest('Limit parameter must be a positive number');
    }

    // Default to current year if year is not provided
    let yearValue = year;
    if (!yearValue) {
      yearValue = new Date().getFullYear().toString();
    } else if (isNaN(parseInt(yearValue))) {
      return ctx.badRequest('Year parameter must be a valid number');
    }

    try {
      const { getTopSellingTickets } = strapi.service('api::report.report');
      const topTickets = await getTopSellingTickets(limitNum, parseInt(yearValue));

      return { data: topTickets };
    } catch (err) {
      ctx.throw(500, err);
    }
  }
};
