/**
 * A set of functions called "actions" for `buy-ticket`
 */
import moment from "moment";
import crypto from "crypto";
import axios from "axios";
import { assign, get } from "lodash";
import QRCode from "qrcode";
import path from "path";
import Mailgun from "mailgun.js";
import fs from "fs";

const emailTemplate = `
  <!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>🎟 Xác nhận đặt vé thành công</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0px 0px 10px #ccc; }
        .header { text-align: center; font-size: 24px; color: #333; }
        .content { font-size: 16px; color: #555; line-height: 1.6; }
        .footer { margin-top: 20px; font-size: 14px; text-align: center; color: #777; }
        .qr-code { text-align: center; margin: 20px 0; }
        .button {
            display: inline-block; background: #007bff; color: white; padding: 10px 20px;
            text-decoration: none; border-radius: 5px; font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">🎉 Xác nhận đặt vé thành công</div>
        <p class="content">Xin chào <strong>{{fullName}}</strong>,</p>
        <p class="content">Chúng tôi xin xác nhận rằng bạn đã mua vé thành công. Dưới đây là thông tin chi tiết:</p>

        <ul class="content">
            <li><strong>Mã giao dịch:</strong> {{transId}}</li>
            <li><strong>Số lượng:</strong> {{quantity}}</li>
            <li><strong>Ngày sử dụng:</strong> {{validDate}}</li>
            <li><strong>Tổng số tiền:</strong> {{totalPrice}} VNĐ</li>
        </ul>

        <p class="content">Vui lòng sử dụng mã QR bên dưới để vào cửa:</p>
        
        <div class="qr-code">
            <img src="{{qrCodeUrl}}" alt="Mã QR của bạn" width="200">
        </div>

        <p class="content">Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ chúng tôi qua <a href="mailto:support@yourdomain.com">support@yourdomain.com</a>.</p>

        <p class="content">Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi! Chúc bạn có một trải nghiệm tuyệt vời! 🎉</p>

        <div class="footer">
            <p>© 2025 YourCompany. All Rights Reserved.</p>
            <p><a href="https://yourwebsite.com" class="button">Xem chi tiết đơn hàng</a></p>
        </div>
    </div>
</body>
</html>
`;

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
      
      try {
        // generate qr code
        const { filePath } = await generateTicket(data_invoice.transId);
        console.log('Generated QR code at:', filePath);

        // Cập nhật ticketUrl trong invoice
        await strapi.entityService.update('api::invoice.invoice', invoiceRes.id, {
          data: {
            ticketUrl: `${process.env.BACKEND_URL}/uploads/qr-code/${data_invoice.transId}.png`
          }
        });

        const emailContent = emailTemplate
          .replace('{{fullName}}', data_invoice.fullName)
          .replace('{{transId}}', data_invoice.transId)
          .replace('{{quantity}}', String(Number(data_invoice.adultTickets) + Number(data_invoice.childTickets) + Number(data_invoice.groupTickets)))
          .replace('{{validDate}}', moment(get(data_invoice, 'visitDate', '')).format('YYYY-MM-DD'))
          .replace('{{totalPrice}}', totalPrice.toLocaleString('vi-VN'))
          .replace('{{qrCodeUrl}}', `${process.env.BACKEND_URL}/uploads/qr-code/${data_invoice.transId}.png`);

        // send email
        const mailgun = new Mailgun(FormData);

        const mg = mailgun.client({
          username: 'api',
          key: process.env.MAILGUN_API_KEY,
        });

        await mg.messages.create(process.env.MAILGUN_DOMAIN, {
          from: 'noreply@luongtuan.xyz',
          to: data_invoice.email,
          subject: 'Xác nhận đặt vé thành công',
          html: emailContent,
        });
      } catch (error) {
        console.log('Lỗi gửi email', error);
      }
    }
  },

  pointToTicket: async (ctx) => {
    const dataBody = ctx.request.body;

    const user = ctx.state.user;

    if(get(user, 'point', 0) <= 0) {
      return ctx.badRequest('Bạn không có điểm để đổi vé');
    }

    // update point for user
    await strapi.entityService.update("plugin::users-permissions.user", user.id, {
      data: {
        point: get(user, 'point', 0) - 2000,
      },
    });

    // create invoice
    const invoiceRes =  await strapi.entityService.create('api::invoice.invoice', {
      data: {
        users_permissions_user: user.id,
        fullName: get(dataBody, 'fullName', ''),
        email: get(dataBody, 'email', ''),
        phoneNumber: get(dataBody, 'phoneNumber', ''),
        totalPrice: 0,
        transId: moment().format('YYMMDD') + '_' + Math.floor(Math.random() * 1000000),
      },
    });

    // create invoice detail
    await strapi.entityService.create('api::invoice-detail.invoice-detail', {
      data: {
        invoice: invoiceRes.id,
        ticket: 1,
        quantity: 1,
        price: 0,
        validDate: moment().format('YYYY-MM-DD'),
      },
    });
    
    // send email
    const emailContent = emailTemplate
      .replace('{{fullName}}', get(dataBody, 'fullName', ''))
      .replace('{{transId}}', invoiceRes.transId)
      .replace('{{quantity}}', '1')
      .replace('{{validDate}}', moment().format('YYYY-MM-DD'))
      .replace('{{totalPrice}}', '0')
      .replace('{{qrCodeUrl}}', `${process.env.BACKEND_URL}/uploads/qr-code/${invoiceRes.transId}.png`);

    const mailgun = new Mailgun(FormData);

    const mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
    });
    
    await mg.messages.create(process.env.MAILGUN_DOMAIN, {
      from: 'noreply@luongtuan.xyz',
      to: get(dataBody, 'email', ''),
      subject: 'Xác nhận đặt vé thành công',
      html: emailContent,
    });

    return ctx.send({
      message: 'Đổi điểm thành công',
    });
  }
};

const generateTicket = async (transId: string) => {
  try {
    const ticketUrl = `${process.env.FRONTEND_URL}/mua-ve/mua-ve-thanh-cong?apptransid=${transId}`;
    const dirname = path.join('public', 'uploads', 'qr-code');

    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, { recursive: true });
    }

    const filePath = path.join(dirname, `${transId}.png`);
    
    // QRCode.toFile() chỉ tạo file, không trả về dữ liệu QR code
    await QRCode.toFile(filePath, ticketUrl);

    // Nên chỉ trả về filePath
    return { filePath };
  } catch (error) {
    console.error("Error generating ticket:", error);
    throw new Error("Failed to generate ticket");
  }
};
