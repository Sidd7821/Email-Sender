const nodemailer = require('nodemailer');
const fs = require('fs').promises;

const sendApplicationEmail = async (applicant, resumePath, smtpEmail, smtpPassword, emailSubject, companyEmail, name) => {
  // Check if using SendGrid API key (starts with 'SG.')
  if (smtpPassword && smtpPassword.startsWith('SG.')) {
    return await sendWithSendGrid(applicant, resumePath, smtpEmail, smtpPassword, emailSubject, companyEmail, name);
  }
  
  // Otherwise use SMTP with multiple port fallback
  return await sendWithSMTP(applicant, resumePath, smtpEmail, smtpPassword, emailSubject, companyEmail, name);
};

// SendGrid method (HTTP-based, works on all platforms)
const sendWithSendGrid = async (applicant, resumePath, smtpEmail, apiKey, emailSubject, companyEmail, name) => {
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(apiKey);
    
    // Read the PDF file and convert to base64
    const fileContent = await fs.readFile(resumePath);
    const base64File = fileContent.toString('base64');
    
    const msg = {
      to: companyEmail,
      from: smtpEmail, // Must be verified in SendGrid
      subject: `${emailSubject} - ${name}`,
      html: applicant.coverLetter,
      attachments: [
        {
          content: base64File,
          filename: `${applicant.name}_resume.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ],
    };
    
    await sgMail.send(msg);
    console.log('Email sent successfully via SendGrid');
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('SendGrid error:', error);
    return { success: false, message: `SendGrid error: ${error.message}` };
  }
};

// SMTP method with port fallback
const sendWithSMTP = async (applicant, resumePath, smtpEmail, smtpPassword, emailSubject, companyEmail, name) => {
  // Try multiple ports in order of preference
  const portConfigs = [
    { port: 465, secure: true, name: 'SSL' },
    { port: 587, secure: false, name: 'TLS' },
    { port: 2525, secure: false, name: 'Alternative' },
  ];
  
  for (const config of portConfigs) {
    try {
      console.log(`Attempting SMTP connection on port ${config.port} (${config.name})...`);
      
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: config.port,
        secure: config.secure,
        auth: {
          user: smtpEmail,
          pass: smtpPassword,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
      });
      
      const mailOptions = {
        from: smtpEmail,
        to: companyEmail,
        subject: `${emailSubject} - ${name}`,
        html: applicant.coverLetter,
        attachments: [
          {
            filename: `${applicant.name}_resume.pdf`,
            path: resumePath,
          },
        ],
      };
      
      // Try to send
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully via port ${config.port}:`, info.messageId);
      return { success: true, message: 'Email sent successfully' };
      
    } catch (error) {
      console.error(`Port ${config.port} failed:`, error.message);
      // Continue to next port
    }
  }
  
  // All ports failed
  return { 
    success: false, 
    message: 'All SMTP ports blocked. Please use SendGrid API key or contact your hosting provider.' 
  };
};

module.exports = { sendApplicationEmail };
