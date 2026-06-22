import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly from = process.env.RESEND_FROM_EMAIL || 'noreply@metrix.io';

  private get resend() {
    const key = process.env.RESEND_API_KEY;
    if (!key) return null;
    return new Resend(key);
  }

  async sendPasswordReset(to: string, resetUrl: string) {
    const client = this.resend;
    if (!client) { this.logger.warn('RESEND_API_KEY yo\'q — email yuborilmadi'); return; }
    try {
      await client.emails.send({
        from: this.from,
        to,
        subject: 'Metrix — Reset Your Password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#08060d">Reset your password</h2>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}"
               style="display:inline-block;padding:12px 24px;background:#aa3bff;
                      color:#fff;border-radius:6px;text-decoration:none;margin:16px 0">
              Reset your password
            </a>
            <p style="color:#6b6375;font-size:13px">
              This link expires in 1 hour. If you didn't request this,
              you can safely ignore this email.
            </p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error(`Email send error: ${err.message}`);
    }
  }

  async sendWelcome(to: string, name: string) {
    const client = this.resend;
    if (!client) return;
    try {
      await client.emails.send({
        from: this.from,
        to,
        subject: 'Welcome to Metrix!',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#08060d">Hello, ${name || 'user'}!</h2>
            <p>Thank you for signing up for Metrix.</p>
            <p>Open your dashboard and connect your first platform.</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error(`Welcome email error: ${err.message}`);
    }
  }

  async sendAccountDeleted(to: string, name: string, restoreUrl: string) {
    const client = this.resend;
    if (!client) return;
    try {
      await client.emails.send({
        from: this.from,
        to,
        subject: 'Metrix — Hisobingiz o\'chirildi',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#08060d">Hello, ${name || 'user'}</h2>
            <p>Your account has been successfully deleted.</p>
            <p>If you change your mind, <strong>6 months</strong> you can restore your account within 6 months:</p>
            <a href="${restoreUrl}"
               style="display:inline-block;padding:12px 24px;background:#aa3bff;
                      color:#fff;border-radius:6px;text-decoration:none;margin:16px 0">
              Restore account
            </a>
            <p style="color:#6b6375;font-size:13px">
              After 6 months, all your data will be permanently deleted.
            </p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error(`Account deleted email error: ${err.message}`);
    }
  }

  async sendWeeklyInsight(to: string, name: string, insight: string) {
    const client = this.resend;
    if (!client) return;
    try {
      const html = insight
        .split('\n')
        .map((line) => `<p style="margin:0 0 8px">${line}</p>`)
        .join('');
      await client.emails.send({
        from: this.from,
        to,
        subject: `Metrix — Weekly analysis`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#08060d">Hello, ${name || 'user'}! 👋</h2>
            <p style="color:#6b6375">Here's your weekly AI analysis:</p>
            <div style="background:#f4f3ec;border-radius:8px;padding:20px;margin:16px 0">
              ${html}
            </div>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard"
               style="display:inline-block;padding:12px 24px;background:#aa3bff;
                      color:#fff;border-radius:6px;text-decoration:none">
              Go to dashboard
            </a>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error(`Weekly insight email error: ${err.message}`);
    }
  }

  async sendAlert(to: string, name: string, alertName: string, message: string) {
    const client = this.resend;
    if (!client) return;
    try {
      await client.emails.send({
        from: this.from,
        to,
        subject: `Metrix Alert: ${alertName}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#08060d">⚠️ Alert: ${alertName}</h2>
            <p>Hello, ${name || 'there'}!</p>
            <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:16px;margin:16px 0">
              <p style="margin:0">${message}</p>
            </div>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard"
               style="display:inline-block;padding:12px 24px;background:#aa3bff;
                      color:#fff;border-radius:6px;text-decoration:none">
              View Dashboard
            </a>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error(`Alert email error: ${err.message}`);
    }
  }

  async sendWorkspaceInvite(to: string, workspaceName: string, inviteUrl: string) {
    const client = this.resend;
    if (!client) return;
    try {
      await client.emails.send({
        from: this.from,
        to,
        subject: `You've been invited to ${workspaceName} on Metrix`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#08060d">You've been invited!</h2>
            <p>You have been invited to join the <strong>${workspaceName}</strong> workspace on Metrix.</p>
            <a href="${inviteUrl}"
               style="display:inline-block;padding:12px 24px;background:#aa3bff;
                      color:#fff;border-radius:6px;text-decoration:none;margin:16px 0">
              Accept Invitation
            </a>
            <p style="color:#6b6375;font-size:13px">
              This invitation expires in 7 days. If you don't have a Metrix account,
              you'll be able to create one after clicking the link.
            </p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error(`Workspace invite email error: ${err.message}`);
    }
  }
}
