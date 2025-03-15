import FormData from 'form-data';
import Mailgun from 'mailgun.js';

const mailgun = new Mailgun(FormData);

const mg = mailgun.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY,
});

export const sendEmail = async (to: string, subject: string, text: string) => {
    await mg.messages.create(process.env.MAILGUN_DOMAIN, {
        from: 'noreply@yourdomain.com',
        to,
        subject,
        text,
    });
};
