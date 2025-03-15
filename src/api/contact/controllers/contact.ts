import { sendEmail } from "../../libs/mail";

/**
 * A set of functions called "actions" for `contract`
 */
const EmailTo = 'tuanlt203@gmail.com';


export default {
  async sendContact(ctx) {
    const { name, email, phone, subject, message } = ctx.request.body;
    // validate data
    if (!name || !email || !phone || !subject || !message) {
      return ctx.badRequest('Vui lòng nhập đầy đủ thông tin');
    }
    // send email
    const emailData = {
      from: email,
      to: EmailTo,
      subject: subject,
      text: `
        Name: ${name}
        Email: ${email}
        Phone: ${phone}
        Subject: ${subject}
        Message: ${message}
      `
    };
    // send email
    try {
      await sendEmail(EmailTo, subject, emailData.text);
      return ctx.send({ message: 'Email sent successfully' });
    } catch (error) {
      return ctx.badRequest('Lỗi gửi email');
    }
  }
};
