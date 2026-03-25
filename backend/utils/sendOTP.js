const nodemailer = require('nodemailer');

const sendOTP = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Healify" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Healify - Email Verification OTP',
    html: `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 480px; margin: auto; background: #E1F1FF; padding: 32px; border-radius: 16px;">
        <h2 style="color: #00509D; text-align: center; margin-bottom: 8px;">🏥 Healify</h2>
        <p style="color: #333; text-align: center;">Your verification code is:</p>
        <div style="background: #00509D; color: white; font-size: 36px; font-weight: bold; letter-spacing: 12px; text-align: center; padding: 20px; border-radius: 12px; margin: 20px 0;">${otp}</div>
        <p style="color: #666; text-align: center; font-size: 13px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
      </div>
    `,
  };

  if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes('your_gmail')) {
    console.log('Skipping email send: EMAIL_USER is not configured correctly.');
    return;
  }
  await transporter.sendMail(mailOptions);
};

module.exports = sendOTP;
