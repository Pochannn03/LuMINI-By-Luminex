import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create the transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends an OTP email to the specified address.
 * @param {string} toEmail - The recipient's email address
 * @param {string} otpCode - The 6-digit OTP code
 * @param {string} parentName - The parent's name (for personalization)
 */
export const sendOTPEmail = async (toEmail, otpCode, parentName = "Parent") => {
  try {
    const mailOptions = {
      from: `"LuMINI System" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'LuMINI - Your Account Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #1e293b; text-align: center;">Welcome to LuMINI!</h2>
          <p style="color: #475569; font-size: 16px;">Hello ${parentName},</p>
          <p style="color: #475569; font-size: 16px;">You are attempting to link your account to your child's profile. Please use the verification code below to complete the process.</p>
          
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; margin: 25px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb;">${otpCode}</span>
          </div>
          
          <p style="color: #64748b; font-size: 14px; text-align: center;">This code will expire in <strong>5 minutes</strong>.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">If you did not request this code, please ignore this email.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${toEmail} (Message ID: ${info.messageId})`);
    return true;

  } catch (error) {
    console.error("❌ Error sending email:", error);
    return false;
  }
};

/**
 * --- NEW FUNCTION ---
 * Sends the permanent System Invitation Code to the parent's email.
 */
export const sendInvitationEmail = async (toEmail, invitationCode, parentName, studentName) => {
  try {
    const mailOptions = {
      from: `"LuMINI System" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `LuMINI - Account Invitation for ${studentName}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          
          <div style="background-color: #eff6ff; padding: 30px 20px; text-align: center; border-bottom: 1px solid #bfdbfe;">
            <h1 style="color: #1e3a8a; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Welcome to LuMINI</h1>
            <p style="color: #3b82f6; font-size: 14px; margin: 8px 0 0 0; font-weight: 500;">Student Dismissal & Safety System</p>
          </div>
          
          <div style="padding: 30px;">
            <p style="color: #334155; font-size: 16px; margin-top: 0;">Dear <strong>${parentName}</strong>,</p>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
              Your child, <strong>${studentName}</strong>, has been successfully registered in the LuMINI safety system by the school administration.
            </p>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
              To monitor your child's status, receive real-time updates, and manage pickup authorizations, please link your parent account using the unique invitation code below.
            </p>
            
            <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; padding: 20px; border-radius: 12px; text-align: center; margin: 30px 0;">
              <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px;">Your Invitation Code</span><br/>
              <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #2563eb; display: block; margin-top: 10px; font-family: monospace;">${invitationCode}</span>
            </div>
            
            <h3 style="color: #1e293b; font-size: 16px; margin-bottom: 12px;">Next Steps:</h3>
            <ol style="color: #475569; font-size: 14px; padding-left: 20px; margin-top: 0; line-height: 1.7;">
              <li>Visit the LuMINI Portal through this link: </li>
              <li>Click "Create Account" and register as a parent.</li>
              <li>Use the code above to process your registration.</li>
            </ol>
          </div>

          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5;">
              If you did not expect this invitation, please contact the school administration.<br/>
              Thank you for helping us keep our students safe!
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Invitation Email sent to ${toEmail} (Message ID: ${info.messageId})`);
    return true;

  } catch (error) {
    console.error("❌ Error sending invitation email:", error);
    return false;
  }
};