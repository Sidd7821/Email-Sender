const express = require('express');
const { getSentEmails, getSendersList } = require('../services/gmailReader');

const router = express.Router();

// POST /api/emails/sent - Get sent emails from Gmail with pagination
router.post('/sent', async (req, res) => {
  try {
    const { smtpEmail, smtpPassword, page, limit } = req.body;

    // Validate input
    if (!smtpEmail || !smtpPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'SMTP email and password are required' 
      });
    }

    // Pagination parameters
    const currentPage = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;

    // Get sent emails with pagination
    const result = await getSentEmails(smtpEmail, smtpPassword, currentPage, pageSize);

    res.status(200).json({ 
      success: true,
      page: currentPage,
      limit: pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize),
      count: result.emails.length,
      uniqueSenders: result.senders.length,
      senders: result.senders,
      emails: result.emails
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch emails',
      error: error.message 
    });
  }
});

// POST /api/emails/senders - Get unique list of recipient email addresses with pagination
router.post('/senders', async (req, res) => {
  try {
    const { smtpEmail, smtpPassword, page, limit } = req.body;

    console.log('=== SENDERS API CALLED ===');
    console.log('Request received at:', new Date().toISOString());

    // Validate input
    if (!smtpEmail || !smtpPassword) {
      console.log('Validation failed: Missing credentials');
      return res.status(400).json({ 
        success: false,
        message: 'SMTP email and password are required' 
      });
    }

    // Pagination parameters
    const currentPage = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 50;

    console.log(`Starting getSendersList with page=${currentPage}, limit=${pageSize}...`);
    const startTime = Date.now();

    // Get unique senders list with pagination
    const result = await getSendersList(smtpEmail, smtpPassword, currentPage, pageSize);

    const duration = Date.now() - startTime;
    console.log(`=== SENDERS API COMPLETED in ${duration}ms (${(duration/1000).toFixed(2)}s) ===`);

    res.status(200).json({ 
      success: true,
      page: currentPage,
      limit: pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize),
      uniqueSenders: result.senders.length,
      senders: result.senders,
      executionTime: `${(duration/1000).toFixed(2)}s`
    });
  } catch (error) {
    console.error('=== SENDERS API ERROR ===');
    console.error('Error fetching senders:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch senders list',
      error: error.message 
    });
  }
});

module.exports = router;
