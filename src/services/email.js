// const nodemailer = require('nodemailer');
// require('dotenv').config();

// const transporter = nodemailer.createTransport({
//   host: 'smtp.gmail.com',
//   port: 587,
//   secure: false, // Use TLS
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
//   tls: {
//     rejectUnauthorized: true,
//   },
// });

// const sendApplicationEmail = async (applicant, resumePath) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: process.env.COMPANY_EMAIL,
//     subject: `Job Application from ${applicant.name}`,
//     text: `
//     ${applicant.coverLetter}
//     `,
//     attachments: [
//       {
//         filename: `${applicant.name}_resume.pdf`,
//         path: resumePath,
//       },
//     ],
//   };

//   try {
//     await transporter.sendMail(mailOptions);
//     return { success: true, message: 'Email sent successfully' };
//   } catch (error) {
//     console.error('Email error:', error);
//     return { success: false, message: 'Failed to send email' };
//   }
// };

// module.exports = { sendApplicationEmail };

const nodemailer = require('nodemailer');

const sendApplicationEmail = async (applicant, resumePath, smtpEmail, smtpPassword, emailSubject, companyEmail, name) => {
  // Create a new transporter for each email with provided credentials
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL
    auth: {
      user: smtpEmail,
      pass: smtpPassword,
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  const mailOptions = {
    from: smtpEmail,
    to: companyEmail,
    subject: `${emailSubject} - ${name}`,
    html: applicant.coverLetter, // Use HTML for rich text from CKEditor
    attachments: [
      {
        filename: `${applicant.name}_resume.pdf`,
        path: resumePath,
      },
    ],
  };

  try {
    // Verify connection first
    await transporter.verify();
    console.log('SMTP connection verified successfully');
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Email error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to send email';
    if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout - Check if port 465 is allowed on your server';
    } else if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed - Check your email and app password';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Cannot connect to SMTP server';
    } else {
      errorMessage = `Failed to send email: ${error.message}`;
    }
    
    return { success: false, message: errorMessage };
  }
};

module.exports = { sendApplicationEmail };