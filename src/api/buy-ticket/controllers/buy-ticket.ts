/**
 * A set of functions called "actions" for `buy-ticket`
 */

type DataBody = {
  ticket: 
    {
      ticketId: number,
      quantity: number,
    }[],
  validDate: string,
  fullName: string,
  email: string,
  phone: string,
}


export default {
  buyTicket: async (ctx) => {
    try {
      const user = ctx.state.user;

      const dataBody: DataBody = ctx.request.body;


      // validate data
      if (!dataBody.ticket || !dataBody.validDate || !dataBody.fullName || !dataBody.email || !dataBody.phone) {
        return ctx.badRequest('Vui lòng nhập đầy đủ thông tin');
      }

      // check ticket
      const tickets = await strapi.entityService.findMany('api::ticket.ticket', {
        filters: {
          id: {
            $in: dataBody.ticket.map((item) => item.ticketId),
          },
        },
      });

      // check ticket is exist
      if (tickets.length !== dataBody.ticket.length) {
        return ctx.badRequest('Ticket không tồn tại');
      }
      
      // create invoice and invoice detail
      const invoice = await strapi.entityService.create('api::invoice.invoice', {
        data: {
          user: user.id,
          fullName: dataBody.fullName,
          email: dataBody.email,
          phone: dataBody.phone,
          totalPrice: tickets.reduce((acc, item) => acc + Number(item.price) * Number(dataBody.ticket.find((ticket) => ticket.ticketId === item.id)?.quantity), 0),
        },
      });

      // create invoice detail
      tickets.forEach(async (ticket) => {
        await strapi.entityService.create('api::invoice-detail.invoice-detail', {
          data: {
            invoice: invoice.id,
            ticket: ticket.id,
            quantity: dataBody.ticket.find((item) => item.ticketId === ticket.id)?.quantity,
            price: ticket.price,
            validDate: dataBody.validDate,
          },
        });
      });

      // send email
    } catch (error) {
      ctx.badRequest('Failed to buy ticket');
    }
  },
};
