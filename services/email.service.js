import nodemailer from "nodemailer";

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use STARTTLS (upgrade connection to TLS after connecting)
  auth: {
    user: process.env.GMAIL_SMTP_EMAIL_ADDRESS,
    pass: process.env.GMAIL_SMTP_EMAIL_PASSWORD
  }
});



try {
  await transporter.verify();
  // console.log("Server is ready to take our messages");
} catch (err) {
  console.error("SMTP Server Verification Failed:", err);
}



export const sendEmailOTPForSignUp = async ({ email, otp }) => {
  try {
    const info = await transporter.sendMail({
      from: '"Team iPrepare" <krishnasaha1111111@gmail.com>', // sender address
      to: email, // list of recipients
      subject: "OTP verification", // subject line
      // text: "Hello world?", // plain text body
      html: `Your OTP for iPrepare is: ${otp}`, // HTML body
    });

    console.log("Message sent: ", info.messageId);
    return info
  } catch (err) {
    console.error("Error while sending mail:", err);
    return false
  }
}