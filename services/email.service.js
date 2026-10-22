import nodemailer from "nodemailer";
import fs from 'fs/promises'

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

  let signUpEmailTemplate = await fs.readFile('./services/emails/templates/VerifyOTPForSignup.html', 'utf-8')

  signUpEmailTemplate = signUpEmailTemplate.replace('OTP_INDEX[0]', otp.toString()[0])
  signUpEmailTemplate = signUpEmailTemplate.replace('OTP_INDEX[1]', otp.toString()[1])
  signUpEmailTemplate = signUpEmailTemplate.replace('OTP_INDEX[2]', otp.toString()[2])
  signUpEmailTemplate = signUpEmailTemplate.replace('OTP_INDEX[3]', otp.toString()[3])
  signUpEmailTemplate = signUpEmailTemplate.replace('OTP_INDEX[4]', otp.toString()[4])
  signUpEmailTemplate = signUpEmailTemplate.replace('OTP_INDEX[5]', otp.toString()[5])


  try {
    const info = await transporter.sendMail({
      from: '"Team iPrepare" <krishnasaha1111111@gmail.com>', // sender address
      to: email, // list of recipients
      subject: "Sign-Up OTP verification", // subject line
      // text: "Hello world?", // plain text body
      html: signUpEmailTemplate, // HTML body
    });

    console.log("Message sent: ", info.messageId);
    return info
  } catch (err) {
    console.error("Error while sending mail:", err);
    return false
  }
}