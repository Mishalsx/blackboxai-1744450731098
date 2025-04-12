const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PayPal = require('@paypal/checkout-server-sdk');
const ErrorResponse = require('./errorResponse');
const emailService = require('./emailService');

class PaymentService {
  constructor() {
    // Initialize PayPal
    const environment = process.env.NODE_ENV === 'production'
      ? new PayPal.core.LiveEnvironment(
          process.env.PAYPAL_CLIENT_ID,
          process.env.PAYPAL_CLIENT_SECRET
        )
      : new PayPal.core.SandboxEnvironment(
          process.env.PAYPAL_CLIENT_ID,
          process.env.PAYPAL_CLIENT_SECRET
        );

    this.paypalClient = new PayPal.core.PayPalHttpClient(environment);
  }

  /**
   * Process subscription payment with Stripe
   */
  async createSubscription(user, plan) {
    try {
      // Create or get customer
      let customer = await this.getOrCreateCustomer(user);

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: plan.stripePriceId }],
        metadata: {
          userId: user._id.toString(),
          plan: plan.name
        }
      });

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      };
    } catch (error) {
      console.error('Subscription creation error:', error);
      throw new ErrorResponse('Failed to create subscription', 500);
    }
  }

  /**
   * Process payout via PayPal
   */
  async processPayout(user, amount, currency = 'USD') {
    try {
      const request = new PayPal.payouts.PayoutsPostRequest();
      request.requestBody({
        sender_batch_header: {
          sender_batch_id: `PAYOUT_${Date.now()}`,
          email_subject: 'You have a payout!',
          email_message: 'Your earnings have been processed and sent to your PayPal account.'
        },
        items: [{
          recipient_type: 'EMAIL',
          amount: {
            value: amount,
            currency
          },
          receiver: user.paypalEmail,
          note: 'Earnings payout',
          sender_item_id: `PAYOUT_ITEM_${Date.now()}`
        }]
      });

      const response = await this.paypalClient.execute(request);
      
      // Send confirmation email
      await emailService.sendPayoutConfirmationEmail(user, {
        amount,
        method: 'paypal',
        transactionId: response.result.batch_header.payout_batch_id,
        processedAt: new Date()
      });

      return {
        batchId: response.result.batch_header.payout_batch_id,
        status: response.result.batch_header.batch_status
      };
    } catch (error) {
      console.error('PayPal payout error:', error);
      throw new ErrorResponse('Failed to process payout', 500);
    }
  }

  /**
   * Process bank transfer payout
   */
  async processBankTransfer(user, amount, bankDetails) {
    try {
      // Create Stripe transfer
      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        destination: bankDetails.accountId,
        metadata: {
          userId: user._id.toString(),
          type: 'earnings_payout'
        }
      });

      // Send confirmation email
      await emailService.sendPayoutConfirmationEmail(user, {
        amount,
        method: 'bank_transfer',
        transactionId: transfer.id,
        processedAt: new Date()
      });

      return {
        transferId: transfer.id,
        status: transfer.status
      };
    } catch (error) {
      console.error('Bank transfer error:', error);
      throw new ErrorResponse('Failed to process bank transfer', 500);
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleStripeWebhook(event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;
        
        case 'payment_intent.failed':
          await this.handlePaymentFailure(event.data.object);
          break;
        
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancellation(event.data.object);
          break;
        
        case 'invoice.payment_failed':
          await this.handleInvoiceFailure(event.data.object);
          break;
      }
    } catch (error) {
      console.error('Webhook handling error:', error);
      throw new ErrorResponse('Failed to process webhook', 500);
    }
  }

  /**
   * Handle PayPal webhook events
   */
  async handlePayPalWebhook(event) {
    try {
      switch (event.event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.handlePayPalPaymentSuccess(event.resource);
          break;
        
        case 'PAYMENT.CAPTURE.DENIED':
          await this.handlePayPalPaymentFailure(event.resource);
          break;
        
        case 'PAYMENT.CAPTURE.REFUNDED':
          await this.handlePayPalRefund(event.resource);
          break;
      }
    } catch (error) {
      console.error('PayPal webhook handling error:', error);
      throw new ErrorResponse('Failed to process PayPal webhook', 500);
    }
  }

  /**
   * Get or create Stripe customer
   */
  async getOrCreateCustomer(user) {
    try {
      if (user.stripeCustomerId) {
        return await stripe.customers.retrieve(user.stripeCustomerId);
      }

      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user._id.toString()
        }
      });

      // Update user with Stripe customer ID
      user.stripeCustomerId = customer.id;
      await user.save();

      return customer;
    } catch (error) {
      console.error('Customer creation error:', error);
      throw new ErrorResponse('Failed to create customer', 500);
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSuccess(paymentIntent) {
    // Implementation for handling successful payments
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailure(paymentIntent) {
    // Implementation for handling failed payments
  }

  /**
   * Handle subscription update
   */
  async handleSubscriptionUpdate(subscription) {
    // Implementation for handling subscription updates
  }

  /**
   * Handle subscription cancellation
   */
  async handleSubscriptionCancellation(subscription) {
    // Implementation for handling subscription cancellations
  }

  /**
   * Handle invoice failure
   */
  async handleInvoiceFailure(invoice) {
    // Implementation for handling failed invoices
  }

  /**
   * Handle PayPal payment success
   */
  async handlePayPalPaymentSuccess(resource) {
    // Implementation for handling successful PayPal payments
  }

  /**
   * Handle PayPal payment failure
   */
  async handlePayPalPaymentFailure(resource) {
    // Implementation for handling failed PayPal payments
  }

  /**
   * Handle PayPal refund
   */
  async handlePayPalRefund(resource) {
    // Implementation for handling PayPal refunds
  }
}

module.exports = new PaymentService();
