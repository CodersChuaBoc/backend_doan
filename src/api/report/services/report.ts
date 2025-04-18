/**
 * report service
 */

import { factories } from '@strapi/strapi';

export default {
  /**
   * Get total number of users
   * @return {Promise<number>} Total users count
   */
  getTotalUsers: async () => {
    const userCount = await strapi.db.query('plugin::users-permissions.user').count();
    return userCount;
  },

  /**
   * Get total number of exhibits (artifacts)
   * @return {Promise<number>} Total exhibits count
   */
  getTotalExhibits: async () => {
    const exhibitCount = await strapi.db.query('api::exhibit.exhibit').count();
    return exhibitCount;
  },

  /**
   * Get total number of posts
   * @return {Promise<number>} Total posts count
   */
  getTotalPosts: async () => {
    const postCount = await strapi.db.query('api::post.post').count();
    return postCount;
  },

  /**
   * Get total revenue for a specific year
   * @param {number} year - The year to calculate total revenue for
   * @return {Promise<number>} Total revenue for the specified year
   */
  getTotalRevenue: async (year: number) => {
    // Create start and end date for the specified year
    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate = new Date(`${year}-12-31T23:59:59Z`);

    // Query invoices created within the specified year
    const invoices = await strapi.db.query('api::invoice.invoice').findMany({
      where: {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    });

    // Calculate total revenue
    const totalRevenue = invoices.reduce((sum, invoice) => {
      // Parse the biginteger totalPrice to number safely
      const price = invoice.totalPrice ? Number(invoice.totalPrice) : 0;
      return sum + price;
    }, 0);

    return totalRevenue;
  },

  /**
   * Get monthly revenue for a specific year
   * @param {number} year - The year to calculate monthly revenue for
   * @return {Promise<Array<{month: string, revenue: number}>>} Monthly revenue data
   */
  getMonthlyRevenue: async (year: number) => {
    // Get current year and month
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-11

    // Determine how many months to include based on whether it's current year or past year
    const monthsToInclude = year < currentYear ? 12 : currentMonth + 1;

    // Create start and end date for the specified year
    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate = year < currentYear 
      ? new Date(`${year}-12-31T23:59:59Z`) 
      : new Date(`${year}-${(currentMonth + 1).toString().padStart(2, '0')}-${new Date(year, currentMonth + 1, 0).getDate()}T23:59:59Z`);

    // Query invoices created within the specified year
    const invoices = await strapi.db.query('api::invoice.invoice').findMany({
      where: {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    });

    // Initialize monthly revenue array with zeros
    const monthlyRevenue = Array.from({ length: monthsToInclude }, (_, i) => ({
      month: `${(i + 1).toString().padStart(2, '0')}`,
      revenue: 0
    }));

    // Calculate revenue for each month
    invoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.createdAt);
      const month = invoiceDate.getMonth(); // 0-11
      
      if (month < monthsToInclude) {
        // Parse the biginteger totalPrice to number safely
        const price = invoice.totalPrice ? Number(invoice.totalPrice) : 0;
        monthlyRevenue[month].revenue += price;
      }
    });

    return monthlyRevenue;
  },

  /**
   * Get monthly invoice count for a specific year
   * @param {number} year - The year to calculate monthly invoice count for
   * @return {Promise<Array<{month: string, count: number}>>} Monthly invoice count data
   */
  getMonthlyInvoiceCount: async (year: number) => {
    // Get current year and month
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-11

    // Determine how many months to include based on whether it's current year or past year
    const monthsToInclude = year < currentYear ? 12 : currentMonth + 1;

    // Create start and end date for the specified year
    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate = year < currentYear 
      ? new Date(`${year}-12-31T23:59:59Z`) 
      : new Date(`${year}-${(currentMonth + 1).toString().padStart(2, '0')}-${new Date(year, currentMonth + 1, 0).getDate()}T23:59:59Z`);

    // Query invoices created within the specified year
    const invoices = await strapi.db.query('api::invoice.invoice').findMany({
      where: {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    });

    // Initialize monthly invoice count array with zeros
    const monthlyInvoiceCount = Array.from({ length: monthsToInclude }, (_, i) => ({
      month: `${(i + 1).toString().padStart(2, '0')}`,
      count: 0
    }));

    // Calculate invoice count for each month
    invoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.createdAt);
      const month = invoiceDate.getMonth(); // 0-11
      
      if (month < monthsToInclude) {
        monthlyInvoiceCount[month].count += 1;
      }
    });

    return monthlyInvoiceCount;
  },

  /**
   * Get recent invoices with user information
   * @param {number} limit - The number of recent invoices to retrieve
   * @return {Promise<Array>} Recent invoices data
   */
  getRecentInvoices: async (limit: number = 10) => {
    // Get recent invoices ordered by creation date (descending)
    const invoices = await strapi.entityService.findMany('api::invoice.invoice', {
      sort: { createdAt: 'desc' },
      limit: limit,
      populate: {
        users_permissions_user: {
          fields: ['id', 'username', 'email', 'fullName']
        },
        invoice_details: true
      }
    });

    return invoices;
  },

  /**
   * Get top selling tickets with count and revenue
   * @param {number} limit - The number of top tickets to retrieve
   * @param {number} year - The year to filter invoices by
   * @return {Promise<Array>} Top selling tickets data
   */
  getTopSellingTickets: async (limit: number = 5, year: number = new Date().getFullYear()) => {
    // Create start and end date for the specified year
    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate = new Date(`${year}-12-31T23:59:59Z`);

    // Get all invoice details with ticket information and filter by year
    const invoiceDetails = await strapi.entityService.findMany('api::invoice-detail.invoice-detail', {
      populate: {
        ticket: true,
        invoice: true
      }
    }) as any[];

    // Filter invoice details by year
    const filteredInvoiceDetails = invoiceDetails.filter(detail => {
      if (!detail.invoice || !detail.invoice.createdAt) return false;
      
      const invoiceDate = new Date(detail.invoice.createdAt);
      return invoiceDate >= startDate && invoiceDate <= endDate;
    });
    
    // Group by ticket id and calculate count and revenue
    const ticketStats: Record<string, any> = {};

    filteredInvoiceDetails.forEach(detail => {
      if (detail.ticket) {
        const ticketId = detail.ticket.id;
        
        if (!ticketStats[ticketId]) {
          ticketStats[ticketId] = {
            ticket: detail.ticket,
            count: 0,
            revenue: 0
          };
        }
        
        // Add quantity and revenue
        const quantity = detail.quantity || 1;
        const price = detail.price ? Number(detail.price) : 0;
        
        ticketStats[ticketId].count += quantity;
        ticketStats[ticketId].revenue += (price * quantity);
      }
    });

    // Convert to array and sort by count (descending)
    const sortedTickets = Object.values(ticketStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return sortedTickets;
  }
};
