/**
 * A set of functions called "actions" for `buy-ticket`
 */
import moment from "moment";
import crypto from "crypto";
import axios from "axios";
import { assign, get } from "lodash";
import QRCode from "qrcode";

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


const config = {
  app_id: '2553',
  key1: 'PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL',
  key2: 'kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz',
  endpoint: 'https://sb-openapi.zalopay.vn/v2/create',
};

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

  createPaymentUrl: async (ctx) => {
    const dataBody = ctx.request.body;


    assign(dataBody, {
      user: ctx.state.user,
    });

    let totalPrice = 0;

    const adultTickets = get(dataBody, 'adultTickets', 0);
    const childTickets = get(dataBody, 'childTickets', 0);
    const groupTickets = get(dataBody, 'groupTickets', 0);

    if(adultTickets > 0) {
      totalPrice += adultTickets * 40000;
    }

    if(childTickets > 0) {
      totalPrice += childTickets * 20000;
    }

    if(groupTickets > 0) {
      totalPrice += groupTickets * 40000;
    }

    try {
    
      const embed_data = {
        redirecturl: process.env.ZALO_PAY_RETURN_URL,
      };
    
      const transID = `${moment().format('YYMMDD')}_${Math.floor(Math.random() * 1000000)}`;
      
      assign(dataBody, {
        transId: transID,
      });
      
      const items = [dataBody];
      const order = {
        app_id: config.app_id,
        app_trans_id: transID,
        app_user: 'user123',
        app_time: Date.now(),
        item: JSON.stringify(items),
        embed_data: JSON.stringify(embed_data),
        amount: totalPrice,
        //khi thanh toán xong, zalopay server sẽ POST đến url này để thông báo cho server của mình
        //Chú ý: cần dùng ngrok để public url thì Zalopay Server mới call đến được
        callback_url: process.env.ZALO_PAY_CALLBACK_URL,
        description: `Lazada - Payment for the order #${transID}`,
        bank_code: '',
      };
    
      // appid|app_trans_id|appuser|amount|apptime|embeddata|item
      const data =
        config.app_id +
        '|' +
        order.app_trans_id +
        '|' +
        order.app_user +
        '|' +
        order.amount +
        '|' +
        order.app_time +
        '|' +
        order.embed_data +
        '|' +
        order.item;
      const mac = crypto.createHmac('sha256', config.key1).update(data).digest('hex');

      const result = await axios.post(config.endpoint, null, { 
        params: { ...order, mac },
        // Only return the data from the response
        transformResponse: [(data) => {
          return JSON.parse(data);
        }]
      });

      return ctx.send(result.data);

    } catch (error) {
      console.log(error.message);
      ctx.badRequest('Failed to create payment url');
    }
  },

  callbackZaloPay: async (ctx) => {
    let result = {};
    try {
      let dataStr = ctx.request.body.data;
      let reqMac = ctx.request.body.mac;

    let mac = crypto.createHmac('sha256', config.key2).update(dataStr).digest('hex');
    console.log('mac =', mac);

    // kiểm tra callback hợp lệ (đến từ ZaloPay server)
    if (reqMac !== mac) {
      // callback không hợp lệ
      result = { return_code: -1, return_message: 'mac not equal' };
    } else {
      // thanh toán thành công
      // merchant cập nhật trạng thái cho đơn hàng ở đây
      let dataJson = JSON.parse(dataStr);
      console.log(
        "update order's status = success where app_trans_id =",
        dataJson['app_trans_id'],
      );

      result['return_code'] = 1;
      result['return_message'] = 'success';
      }
    } catch (ex) {
      console.log('lỗi:::' + ex.message);
      result['return_code'] = 0;
      result['return_message'] = ex.message;
    }

    if(result['return_code'] === 1) {
      // update order status

      const data = JSON.parse(ctx.request.body.data);

      const data_invoice = JSON.parse(data.item)[0];
      
      console.log('data_invoice', data_invoice)

      let totalPrice = 0;

      const adultTickets = get(data_invoice, 'adultTickets', 0);
      const childTickets = get(data_invoice, 'childTickets', 0);
      const groupTickets = get(data_invoice, 'groupTickets', 0);

      if(adultTickets > 0) {
        totalPrice += adultTickets * 40000;
      }

      if(childTickets > 0) {
        totalPrice += childTickets * 20000;
      }

      if(groupTickets > 0) {
        totalPrice += groupTickets * 40000;
      }

      // create invoice
      const invoiceRes =  await strapi.entityService.create('api::invoice.invoice', {
        data: {
          users_permissions_user: data_invoice.user,
          fullName: data_invoice.fullName,
          email: data_invoice.email,
          phoneNumber: data_invoice.phoneNumber,
          totalPrice: totalPrice,
          transId: data_invoice.transId,
        },
      });

      let totalPoint = 0;

      // create invoice detail
      if(adultTickets > 0) {
        await strapi.entityService.create('api::invoice-detail.invoice-detail', {
          data: {
            invoice: invoiceRes.id,
            ticket: 1,
            quantity: adultTickets,
            price: 40000,
            validDate: moment(get(data_invoice, 'visitDate', '')).format('YYYY-MM-DD'),
          },
        });
        //save log increment point for user
        await strapi.entityService.create('api::action.action', {
          data: {
            user: data_invoice.user,
            name: 'Mua vé',
            point: 100,
            ticket: 1,
          },
        });
        totalPoint += 100 * adultTickets;
      }

      if(childTickets > 0) {
        await strapi.entityService.create('api::invoice-detail.invoice-detail', {
          data: {
            invoice: invoiceRes.id,
            ticket: 2,
            quantity: childTickets,
            price: 20000,
            validDate: moment(get(data_invoice, 'visitDate', '')).format('YYYY-MM-DD'),
          },
        });
        //save log increment point for user
        await strapi.entityService.create('api::action.action', {
          data: {
            user: data_invoice.user,
            name: 'Mua vé trẻ em',
            point: 100 * childTickets,
            ticket: 2,
          },
        });
        totalPoint += 100 * childTickets;
      }

      if(groupTickets > 0) {
        await strapi.entityService.create('api::invoice-detail.invoice-detail', {
          data: {
            invoice: invoiceRes.id,
            ticket: 3,
            quantity: groupTickets,
            price: 40000,
            validDate: moment(get(data_invoice, 'visitDate', '')).format('YYYY-MM-DD'),
          },
        });
        //save log increment point for user
        await strapi.entityService.create('api::action.action', {
          data: {
            user: data_invoice.user,
            name: 'Mua vé đoàn',
            point: 100,
            ticket: 3,
          },
        });
        totalPoint += 100 * groupTickets;
      }

      // update point for user
      await strapi.entityService.update("plugin::users-permissions.user", data_invoice.user.id, {
        data: {
          point: get(data_invoice, 'user.point', 0) + totalPoint,
        },
      });
    }
  },
  
};
const generateTicket = async (name: string, quantity: number) => {
  // 🔒 Generate a unique ticket ID (secure hash)
const ticketId = crypto.randomBytes(16).toString("hex");

// 🔹 Create ticket object
const ticketData = { ticketId, status: "valid" };

  // 🔹 Convert ticket to JSON and generate QR Code
  const qrCode = await QRCode.toDataURL(JSON.stringify(ticketData));

  return { ticketId, qrCode };
}
