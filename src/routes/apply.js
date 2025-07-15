const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Applicant = require('../models/Applicant');
const { sendApplicationEmail } = require('../services/email');

const router = express.Router();

// Configure multer for file uploads (optional, kept for compatibility)
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 100 * 1024 * 1024 }, // 10MB limit
});

// POST /api/apply
router.post('/', upload.single('resume'), async (req, res) => {
  try {
    const { name, email, coverLetter, emailSubject, resumeBase64, resumeFileName, smtpEmail, smtpPassword, companyEmails } = req.body;

    console.log(req.body);

    // Validate input
    if (!name || !email || !coverLetter) {
      return res.status(400).json({ message: 'Name, email, and cover letter are required' });
    }
    if (!smtpEmail || !smtpPassword) {
      return res.status(400).json({ message: 'SMTP email and password are required' });
    }
    if (!companyEmails || !Array.isArray(companyEmails) || companyEmails.length === 0) {
      return res.status(400).json({ message: 'At least one company email is required' });
    }

    let resumePath;

    // Handle base64-encoded resume
    if (resumeBase64 && resumeFileName) {
      await fs.mkdir('./uploads', { recursive: true });
      const base64Data = resumeBase64.replace(/^data:application\/pdf;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Validate PDF magic bytes
      if (!buffer.toString('ascii', 0, 5).startsWith('%PDF-')) {
        return res.status(400).json({ message: 'Invalid PDF file' });
      }

      // Validate file size (5MB limit)
      if (buffer.length > 100 * 1024 * 1024) {
        return res.status(400).json({ message: 'Resume file size exceeds 10MB limit' });
      }

      // Generate unique file name
      const fileName = `${Date.now()}-${path.basename(resumeFileName)}`;
      resumePath = path.join(__dirname, '../../uploads', fileName);

      // Save the decoded file
      await fs.writeFile(resumePath, buffer);
    } else if (req.file) {
      resumePath = req.file.path;
    } else {
      return res.status(400).json({ message: 'Resume file is required' });
    }

    // Save to database
    const applicant = await Applicant.create({
      name,
      email,
      coverLetter,
      resumePath,
    });

    // Send email to multiple recipients
    const emailResults = await Promise.all(
      companyEmails.map(async (recipientEmail) => {
        const emailResult = await sendApplicationEmail(
          applicant,
          resumePath,
          smtpEmail,
          smtpPassword,
          emailSubject,
          recipientEmail,
          name
        );
        return emailResult;
      })
    );

    // Check if any email failed to send
    const failedEmails = emailResults.filter(result => !result.success);
    if (failedEmails.length > 0) {
      return res.status(500).json({ 
        message: 'Some emails failed to send', 
        errors: failedEmails.map(e => e.message) 
      });
    }

    res.status(200).json({ message: 'Application submitted successfully to all recipients' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;