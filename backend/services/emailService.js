const nodemailer = require('nodemailer');

// Konfigurasi transporter Mailtrap SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'sandbox.smtp.mailtrap.io',
    port: parseInt(process.env.MAIL_PORT) || 2525,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
};

/**
 * Kirim email reset password ke user
 * @param {string} toEmail - Email tujuan
 * @param {string} userName - Nama user
 * @param {string} resetLink - Link reset password
 */
const sendPasswordResetEmail = async (toEmail, userName, resetLink) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Eggspira System" <${process.env.MAIL_FROM || 'noreply@eggspira.com'}>`,
    to: toEmail,
    subject: '🔐 Reset Password Akun Eggspira Anda',
    html: `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f0e8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0e8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header / Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <div style="background:linear-gradient(135deg,#92400e,#b45309);border-radius:16px;padding:20px 32px;display:inline-block;">
                <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">🥚 EGGSPIRA</span>
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;">

              <!-- Top accent -->
              <div style="background:linear-gradient(135deg,#92400e,#d97706);height:6px;"></div>

              <!-- Body -->
              <div style="padding:40px 48px;">

                <!-- Icon -->
                <div style="text-align:center;margin-bottom:24px;">
                  <div style="background:#fef3c7;width:72px;height:72px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:36px;line-height:72px;">
                    🔐
                  </div>
                </div>

                <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1f2937;text-align:center;">
                  Reset Password
                </h1>
                <p style="margin:0 0 24px;font-size:15px;color:#6b7280;text-align:center;">
                  Halo, <strong style="color:#92400e;">${userName || 'Pengguna'}</strong>!
                </p>

                <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                  Kami menerima permintaan untuk mereset password akun Eggspira Anda. 
                  Klik tombol di bawah ini untuk membuat password baru.
                </p>

                <!-- CTA Button -->
                <div style="text-align:center;margin:32px 0;">
                  <a href="${resetLink}" 
                     style="display:inline-block;background:linear-gradient(135deg,#92400e,#b45309);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 40px;border-radius:10px;box-shadow:0 4px 12px rgba(146,64,14,0.35);">
                    Reset Password Sekarang
                  </a>
                </div>

                <!-- Warning box -->
                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin:24px 0;">
                  <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                    ⏱️ <strong>Link ini berlaku selama 1 jam</strong> dan hanya bisa digunakan sekali.<br/>
                    Jika Anda tidak meminta reset password, abaikan email ini — akun Anda tetap aman.
                  </p>
                </div>

                <!-- Fallback link -->
                <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
                  Jika tombol tidak berfungsi, salin dan tempel URL ini ke browser Anda:<br/>
                  <span style="color:#b45309;word-break:break-all;">${resetLink}</span>
                </p>
              </div>

              <!-- Footer -->
              <div style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:24px 48px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">
                  © 2024 Eggspira — Sistem Monitoring Kualitas Telur<br/>
                  Email ini dikirim secara otomatis, mohon jangan dibalas.
                </p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[EmailService] Email terkirim ke ${toEmail} — MessageId: ${info.messageId}`);
  return info;
};

module.exports = { sendPasswordResetEmail };
