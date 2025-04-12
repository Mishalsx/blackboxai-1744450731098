const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    // Cache for compiled templates
    this.templateCache = new Map();
  }

  /**
   * Load and compile email template
   */
  async getTemplate(templateName) {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.hbs`);
    const template = await fs.readFile(templatePath, 'utf-8');
    const compiled = handlebars.compile(template);
    this.templateCache.set(templateName, compiled);
    return compiled;
  }

  /**
   * Send email using template
   */
  async sendTemplateEmail({
    to,
    subject,
    template,
    data,
    from = process.env.EMAIL_FROM,
    attachments = [],
    whiteLabelDomain = null
  }) {
    try {
      // Get white label email settings if domain provided
      if (whiteLabelDomain) {
        const WhiteLabel = require('../models/WhiteLabel');
        const whiteLabel = await WhiteLabel.findOne({ domain: whiteLabelDomain });
        if (whiteLabel) {
          from = whiteLabel.settings.emailFrom || from;
        }
      }

      // Get compiled template
      const compiledTemplate = await this.getTemplate(template);
      const html = compiledTemplate(data);

      // Send email
      const result = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
        attachments
      });

      return result;
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(user, verificationUrl, whiteLabelDomain = null) {
    return this.sendTemplateEmail({
      to: user.email,
      subject: 'Verify Your Email Address',
      template: 'verification',
      data: {
        name: user.name,
        verificationUrl,
        supportEmail: process.env.SUPPORT_EMAIL
      },
      whiteLabelDomain
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetUrl, whiteLabelDomain = null) {
    return this.sendTemplateEmail({
      to: user.email,
      subject: 'Password Reset Request',
      template: 'password-reset',
      data: {
        name: user.name,
        resetUrl,
        supportEmail: process.env.SUPPORT_EMAIL
      },
      whiteLabelDomain
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user, whiteLabelDomain = null) {
    return this.sendTemplateEmail({
      to: user.email,
      subject: 'Welcome to Our Platform',
      template: 'welcome',
      data: {
        name: user.name,
        loginUrl: process.env.FRONTEND_URL + '/login',
        supportEmail: process.env.SUPPORT_EMAIL
      },
      whiteLabelDomain
    });
  }

  /**
   * Send song approval notification
   */
  async sendSongApprovalEmail(user, song, whiteLabelDomain = null) {
    return this.sendTemplateEmail({
      to: user.email,
      subject: 'Your Song Has Been Approved',
      template: 'song-approval',
      data: {
        name: user.name,
        songTitle: song.title,
        dashboardUrl: process.env.FRONTEND_URL + '/dashboard',
        supportEmail: process.env.SUPPORT_EMAIL
      },
      whiteLabelDomain
    });
  }

  /**
   * Send earnings update notification
   */
  async sendEarningsUpdateEmail(user, earnings, whiteLabelDomain = null) {
    return this.sendTemplateEmail({
      to: user.email,
      subject: 'New Earnings Update',
      template: 'earnings-update',
      data: {
        name: user.name,
        amount: earnings.amount,
        period: earnings.period,
        earningsUrl: process.env.FRONTEND_URL + '/earnings',
        supportEmail: process.env.SUPPORT_EMAIL
      },
      whiteLabelDomain
    });
  }

  /**
   * Send payout confirmation
   */
  async sendPayoutConfirmationEmail(user, payout, whiteLabelDomain = null) {
    return this.sendTemplateEmail({
      to: user.email,
      subject: 'Payout Processed Successfully',
      template: 'payout-confirmation',
      data: {
        name: user.name,
        amount: payout.amount,
        method: payout.method,
        transactionId: payout.transactionId,
        date: payout.processedAt,
        earningsUrl: process.env.FRONTEND_URL + '/earnings',
        supportEmail: process.env.SUPPORT_EMAIL
      },
      whiteLabelDomain
    });
  }

  /**
   * Send contract signature notification
   */
  async sendContractSignedEmail(user, contract, whiteLabelDomain = null) {
    return this.sendTemplateEmail({
      to: user.email,
      subject: 'Contract Signed Successfully',
      template: 'contract-signed',
      data: {
        name: user.name,
        contractId: contract.contractId,
        contractUrl: process.env.FRONTEND_URL + `/contracts/${contract._id}`,
        supportEmail: process.env.SUPPORT_EMAIL
      },
      attachments: [{
        filename: `contract-${contract.contractId}.pdf`,
        path: contract.documents[0].url
      }],
      whiteLabelDomain
    });
  }

  /**
   * Send AI completion notification
   */
  async sendAICompletionEmail(user, aiService, whiteLabelDomain = null) {
    return this.sendTemplateEmail({
      to: user.email,
      subject: 'AI Task Completed',
      template: 'ai-completion',
      data: {
        name: user.name,
        taskType: aiService.type,
        result: aiService.result,
        dashboardUrl: process.env.FRONTEND_URL + '/dashboard',
        supportEmail: process.env.SUPPORT_EMAIL
      },
      whiteLabelDomain
    });
  }

  /**
   * Send support ticket response
   */
  async sendSupportResponseEmail(user, ticket, whiteLabelDomain = null) {
    return this.sendTemplateEmail({
      to: user.email,
      subject: `Re: Support Ticket #${ticket.id}`,
      template: 'support-response',
      data: {
        name: user.name,
        ticketId: ticket.id,
        response: ticket.latestResponse,
        supportUrl: process.env.FRONTEND_URL + `/support/tickets/${ticket.id}`,
        supportEmail: process.env.SUPPORT_EMAIL
      },
      whiteLabelDomain
    });
  }
}

module.exports = new EmailService();
