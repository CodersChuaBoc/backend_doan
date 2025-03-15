/**
 * A set of functions called "actions" for `auth`
 */

import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const resetPasswordEmailTemplate = `
  <html>
    <body>
      <p>Dear User,</p>
      <p>You requested a password reset. Please click the link below to reset your password:</p>
      <a href="{{resetLink}}">Reset Password</a>
      <p>If you did not request this, please ignore this email.</p>
    </body>
  </html>
`;

export default {
  forgotPassword: async (ctx) => {
    const { email } = ctx.request.body;

    if (!email) {
      return ctx.badRequest('Email is required');
    }

    const user = await strapi.query('plugin::users-permissions.user').findOne({ where: { email } });
    if (!user) {
      return ctx.badRequest('Người dùng không tồn tại');
    }
    // Generate a JWT token
    const jwtToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    
    // Create an email to send the guide to the user
    try {
      const resetLink = `${process.env.FRONTEND_URL}/reset-pw?token=${jwtToken}`;
      const emailContent = resetPasswordEmailTemplate.replace('{{resetLink}}', resetLink);

      
      const mailgun = new Mailgun(FormData);

      const mg = mailgun.client({
        username: 'api',
        key: process.env.MAILGUN_API_KEY,
      });

      await mg.messages.create(process.env.MAILGUN_DOMAIN, {
        from: 'noreply@yourdomain.com',
        to: user.email,
        subject: 'Reset Your Password',
        html: emailContent,
      });

    } catch (error) {
      console.log("Lỗi gửi email", error);

      return ctx.badRequest('Lỗi gửi email');
    }

    return ctx.send({ message: 'Email sent' });
  },
  resetPassword: async (ctx) => {
    const { token, password } = ctx.request.body;

    if(!token || !password) {
      return ctx.badRequest('Token và mật khẩu là bắt buộc');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
      const user = await strapi.query('plugin::users-permissions.user').findOne({ where: { id: decoded.id } });

      const hashedPassword = await bcrypt.hash(password, 10);

      // update password
      await strapi.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });
    } catch (error) {
      console.log('Lỗi xác thực token', error);
      return ctx.badRequest('Lỗi xác thực token');
    }
    
    return ctx.send({ message: 'Password updated' });
  },
};
