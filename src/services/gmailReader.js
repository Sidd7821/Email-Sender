const { simpleParser } = require('mailparser');

// Function to read emails using IMAP
const getEmailsViaIMAP = async (smtpEmail, smtpPassword, limit = 10) => {
    const Imap = require('imap');
    const { inspect } = require('util');

    return new Promise((resolve, reject) => {
        const imap = new Imap({
            user: smtpEmail,
            password: smtpPassword,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false }
        });

        const emails = [];

        imap.once('ready', () => {
            imap.openBox('INBOX', true, (err, box) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Search for sent emails (from your application)
                imap.search(['ALL'], (err, results) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (results.length === 0) {
                        imap.end();
                        resolve([]);
                        return;
                    }

                    // Get the last 'limit' emails
                    const fetchResults = results.slice(-limit);
                    const fetch = imap.fetch(fetchResults, { bodies: '' });

                    fetch.on('message', (msg, seqno) => {
                        let buffer = '';

                        msg.on('body', (stream, info) => {
                            stream.on('data', (chunk) => {
                                buffer += chunk.toString('utf8');
                            });
                        });

                        msg.once('end', () => {
                            simpleParser(buffer, (err, parsed) => {
                                if (!err) {
                                    emails.push({
                                        id: seqno,
                                        from: parsed.from?.text || '',
                                        to: parsed.to?.text || '',
                                        subject: parsed.subject || '',
                                        date: parsed.date || '',
                                        text: parsed.text || '',
                                        html: parsed.html || '',
                                        attachments: parsed.attachments?.map(att => ({
                                            filename: att.filename,
                                            size: att.size,
                                            contentType: att.contentType
                                        })) || []
                                    });
                                }
                            });
                        });
                    });

                    fetch.once('error', (err) => {
                        reject(err);
                    });

                    fetch.once('end', () => {
                        imap.end();
                    });
                });
            });
        });

        imap.once('error', (err) => {
            reject(err);
        });

        imap.once('end', () => {
            resolve(emails);
        });

        imap.connect();
    });
};

// Function to get sent emails with pagination
const getSentEmails = async (smtpEmail, smtpPassword, page = 1, limit = 10) => {
    const Imap = require('imap');

    return new Promise((resolve, reject) => {
        const imap = new Imap({
            user: smtpEmail,
            password: smtpPassword,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false }
        });

        const emails = [];
        const recipientEmails = new Set();
        let totalEmails = 0;

        imap.once('ready', () => {
            // Open the Sent Mail folder
            imap.openBox('[Gmail]/Sent Mail', true, (err, box) => {
                if (err) {
                    reject(err);
                    return;
                }

                imap.search(['ALL'], (err, results) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    totalEmails = results.length;

                    if (totalEmails === 0) {
                        imap.end();
                        resolve({ total: 0, emails: [], senders: [] });
                        return;
                    }

                    // Calculate pagination (newest first)
                    const startIndex = totalEmails - (page * limit);
                    const endIndex = totalEmails - ((page - 1) * limit);

                    // Adjust indices to stay within bounds
                    const start = Math.max(0, startIndex);
                    const end = Math.min(totalEmails, endIndex);

                    if (start >= end) {
                        imap.end();
                        resolve({ total: totalEmails, emails: [], senders: [] });
                        return;
                    }

                    const fetchResults = results.slice(start, end).reverse();
                    const fetch = imap.fetch(fetchResults, { bodies: '' });

                    fetch.on('message', (msg, seqno) => {
                        let buffer = '';

                        msg.on('body', (stream) => {
                            stream.on('data', (chunk) => {
                                buffer += chunk.toString('utf8');
                            });
                        });

                        msg.once('end', () => {
                            simpleParser(buffer, (err, parsed) => {
                                if (!err) {
                                    emails.push({
                                        id: seqno,
                                        from: parsed.from?.text || '',
                                        to: parsed.to?.text || '',
                                        subject: parsed.subject || '',
                                        date: parsed.date || '',
                                        text: parsed.text || '',
                                        html: parsed.html || '',
                                        attachments: parsed.attachments?.map(att => ({
                                            filename: att.filename,
                                            size: att.size,
                                            contentType: att.contentType
                                        })) || []
                                    });

                                    // Extract unique recipient emails
                                    if (parsed.to) {
                                        if (Array.isArray(parsed.to.value)) {
                                            parsed.to.value.forEach(recipient => {
                                                if (recipient.address) {
                                                    recipientEmails.add(recipient.address.toLowerCase());
                                                }
                                            });
                                        }

                                        // Also check CC if present
                                        if (parsed.cc && Array.isArray(parsed.cc.value)) {
                                            parsed.cc.value.forEach(recipient => {
                                                if (recipient.address) {
                                                    recipientEmails.add(recipient.address.toLowerCase());
                                                }
                                            });
                                        }
                                    }
                                }
                            });
                        });
                    });

                    fetch.once('error', (err) => {
                        reject(err);
                    });

                    fetch.once('end', () => {
                        imap.end();
                    });
                });
            });
        });

        imap.once('error', (err) => {
            reject(err);
        });

        imap.once('end', () => {
            // Sort emails by date (newest first)
            emails.sort((a, b) => new Date(b.date) - new Date(a.date));
            const sendersList = Array.from(recipientEmails).sort();
            resolve({ total: totalEmails, emails, senders: sendersList });
        });

        imap.connect();
    });
};

// Function to get unique list of recipient email addresses from sent emails with pagination
const getSendersList = async (smtpEmail, smtpPassword, page = 1, limit = 50) => {
    const Imap = require('imap');
    const startTime = Date.now();

    console.log('[SENDERS] Starting to fetch senders list...');
    console.log('[SENDERS] Email:', smtpEmail);
    console.log(`[SENDERS] Page: ${page}, Limit: ${limit}`);

    return new Promise((resolve, reject) => {
        const imap = new Imap({
            user: smtpEmail,
            password: smtpPassword,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false }
        });

        const recipientEmails = new Set();
        let processedCount = 0;
        let totalEmails = 0;

        imap.once('ready', () => {
            console.log('[SENDERS] IMAP connection ready');
            const readyTime = Date.now() - startTime;
            console.log(`[SENDERS] Connection took: ${readyTime}ms`);

            // Open the Sent Mail folder
            imap.openBox('[Gmail]/Sent Mail', true, (err, box) => {
                if (err) {
                    console.error('[SENDERS] Error opening mailbox:', err);
                    reject(err);
                    return;
                }

                console.log('[SENDERS] Mailbox opened successfully');
                console.log(`[SENDERS] Total messages in Sent Mail: ${box.messages.total}`);

                imap.search(['ALL'], (err, results) => {
                    if (err) {
                        console.error('[SENDERS] Error searching emails:', err);
                        reject(err);
                        return;
                    }

                    const searchTime = Date.now() - startTime;
                    console.log(`[SENDERS] Search completed: ${searchTime}ms`);
                    console.log(`[SENDERS] Found ${results.length} emails total`);

                    totalEmails = results.length;

                    if (totalEmails === 0) {
                        console.log('[SENDERS] No emails found');
                        imap.end();
                        resolve({ total: 0, senders: [] });
                        return;
                    }

                    // Calculate pagination (newest first)
                    const startIndex = totalEmails - (page * limit);
                    const endIndex = totalEmails - ((page - 1) * limit);

                    // Adjust indices to stay within bounds
                    const start = Math.max(0, startIndex);
                    const end = Math.min(totalEmails, endIndex);

                    if (start >= end) {
                        console.log('[SENDERS] No emails in this page range');
                        imap.end();
                        resolve({ total: totalEmails, senders: [] });
                        return;
                    }

                    const fetchResults = results.slice(start, end).reverse();
                    console.log(`[SENDERS] Processing emails ${start} to ${end} (${fetchResults.length} emails)`);

                    const fetchStartTime = Date.now();
                    const fetch = imap.fetch(fetchResults, { bodies: '' });

                    fetch.on('message', (msg, seqno) => {
                        let buffer = '';

                        msg.on('body', (stream) => {
                            stream.on('data', (chunk) => {
                                buffer += chunk.toString('utf8');
                            });
                        });

                        msg.once('end', () => {
                            simpleParser(buffer, (err, parsed) => {
                                processedCount++;

                                if (processedCount % 10 === 0) {
                                    console.log(`[SENDERS] Processed ${processedCount}/${fetchResults.length} emails`);
                                }

                                if (!err && parsed.to) {
                                    // Extract email addresses from 'to' field
                                    if (Array.isArray(parsed.to.value)) {
                                        parsed.to.value.forEach(recipient => {
                                            if (recipient.address) {
                                                recipientEmails.add(recipient.address.toLowerCase());
                                            }
                                        });
                                    }

                                    // Also check CC and BCC if present
                                    if (parsed.cc && Array.isArray(parsed.cc.value)) {
                                        parsed.cc.value.forEach(recipient => {
                                            if (recipient.address) {
                                                recipientEmails.add(recipient.address.toLowerCase());
                                            }
                                        });
                                    }
                                }
                            });
                        });
                    });

                    fetch.once('error', (err) => {
                        console.error('[SENDERS] Fetch error:', err);
                        reject(err);
                    });

                    fetch.once('end', () => {
                        const fetchTime = Date.now() - fetchStartTime;
                        console.log(`[SENDERS] Fetch completed: ${fetchTime}ms`);
                        console.log(`[SENDERS] Total processed: ${processedCount} emails`);
                        console.log(`[SENDERS] Unique recipients found: ${recipientEmails.size}`);
                        imap.end();
                    });
                });
            });
        });

        imap.once('error', (err) => {
            console.error('[SENDERS] IMAP error:', err);
            reject(err);
        });

        imap.once('end', () => {
            const totalTime = Date.now() - startTime;
            console.log('[SENDERS] IMAP connection closed');
            console.log(`[SENDERS] Total execution time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);

            const sendersList = Array.from(recipientEmails).sort();
            console.log(`[SENDERS] Returning ${sendersList.length} unique senders`);

            resolve({ total: totalEmails, senders: sendersList });
        });

        console.log('[SENDERS] Connecting to IMAP...');
        imap.connect();
    });
};

module.exports = { getEmailsViaIMAP, getSentEmails, getSendersList };
