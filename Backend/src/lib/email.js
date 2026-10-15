import nodemailer from "nodemailer";

export const sendResetOtpEmail = async (toEmail, otp) => {
  const emailUser = process.env.EMAIL_USER?.trim();
  const emailPass = process.env.EMAIL_PASS?.trim().replace(/\s+/g, "");

  // If email credentials are provided in .env
  if (emailUser && emailPass) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const mailOptions = {
      from: `"Fantasy Buzz" <${emailUser}>`,
      to: toEmail,
      subject: "Password Reset Code - Fantasy Buzz",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #010B28; text-align: center;">Fantasy Buzz</h2>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 16px; color: #333;">Hello,</p>
          <p style="font-size: 14px; color: #555;">You requested to reset your password. Use the verification code below to proceed:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #12BAB0; background: #f0fdfa; padding: 12px 24px; border-radius: 8px; border: 1px dashed #12BAB0;">
              ${otp}
            </span>
          </div>
          <p style="font-size: 13px; color: #777;">This code is valid for <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Email Sent Successfully] Verification code delivered to ${toEmail}`);
  } else {
    // Development fallback if .env does not have EMAIL_USER yet
    console.log(`\n==================================================`);
    console.log(`[DEV EMAIL MOCK] Password Reset OTP for: ${toEmail}`);
    console.log(`[DEV OTP CODE]:  >>> ${otp} <<<`);
    console.log(`(To send real emails, add EMAIL_USER and EMAIL_PASS to Backend/.env)`);
    console.log(`==================================================\n`);
  }
};
