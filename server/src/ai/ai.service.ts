import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

// Lazy imports — only loaded when API key is present
async function getGroq() {
  const { default: Groq } = await import('groq-sdk');
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}
async function getOpenAI() {
  const { default: OpenAI } = await import('openai');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // ─── Core: Send request to AI provider ──────────────────────────────────────────

  private async complete(prompt: string): Promise<{ text: string; provider: 'GROQ' | 'OPENAI' }> {
    // 1. Try Groq first
    if (process.env.GROQ_API_KEY) {
      try {
        const groq = await getGroq();
        const res = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1024,
          temperature: 0.7,
        });
        const text = res.choices[0]?.message?.content || '';
        if (text) return { text, provider: 'GROQ' };
      } catch (err) {
        this.logger.warn(`Groq error: ${err.message} — OpenAI ga o'tilmoqda`);
      }
    }

    // 2. OpenAI fallback
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = await getOpenAI();
        const res = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1024,
          temperature: 0.7,
        });
        const text = res.choices[0]?.message?.content || '';
        if (text) return { text, provider: 'OPENAI' };
      } catch (err) {
        this.logger.error(`OpenAI error: ${err.message}`);
      }
    }

    throw new Error('No AI provider available (GROQ_API_KEY or OPENAI_API_KEY required)');
  }

  // ─── Weekly report ─────────────────────────────────────────────────────

  @Cron('0 8 * * 1') // Every Monday 8:00
  async generateWeeklyInsightsForAll() {
    this.logger.log('Generating weekly AI insights...');

    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        subscription: { plan: { hasWeeklyReport: true } },
      } as any,
      select: { id: true, email: true, name: true },
    });

    for (const user of users) {
      try {
        await this.generateWeeklyInsight(user.id);
      } catch (err) {
        this.logger.error(`User ${user.id} uchun insight xatosi: ${err.message}`);
      }
    }

    this.logger.log(`Weekly insights: ${users.length} users processed`);
  }

  async generateWeeklyInsight(userId: string): Promise<string> {
    const data = await this.collectUserData(userId, 7);
    const prompt = this.buildWeeklyPrompt(data);

    const { text, provider } = await this.complete(prompt);

    await (this.prisma as any).aiInsight.create({
      data: {
        userId,
        type: 'WEEKLY',
        title: 'Weekly analysis',
        content: text,
        provider,
      },
    });

    // Send email
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (user) {
      await this.email.sendWeeklyInsight(user.email, user.name || '', text);
    }

    return text;
  }

  // ─── Website analytics insight ────────────────────────────────────────────

  async generateWebsiteInsight(userId: string, websiteId: string): Promise<string> {
    const website = await this.prisma.website.findFirst({
      where: { id: websiteId, userId },
      select: { name: true, domain: true },
    });
    if (!website) throw new Error('Website not found');

    const from = new Date();
    from.setDate(from.getDate() - 30);

    const [sessions, topPages, sources] = await Promise.all([
      this.prisma.session.findMany({
        where: { websiteId, startedAt: { gte: from } },
        select: { duration: true, bounced: true, pageCount: true, device: true },
        take: 1000,
      }),
      this.prisma.pageView.groupBy({
        by: ['path'],
        where: { websiteId, createdAt: { gte: from } },
        _count: { path: true },
        _avg: { duration: true, scrollDepth: true },
        orderBy: { _count: { path: 'desc' } },
        take: 5,
      }),
      this.prisma.session.groupBy({
        by: ['referrer'],
        where: { websiteId, startedAt: { gte: from }, referrer: { not: null } },
        _count: { referrer: true },
        orderBy: { _count: { referrer: 'desc' } },
        take: 5,
      }),
    ]);

    const totalSessions = sessions.length;
    const bounceRate = totalSessions
      ? (sessions.filter((s) => s.bounced).length / totalSessions * 100).toFixed(1)
      : 0;
    const avgDuration = totalSessions
      ? Math.round(sessions.reduce((a, s) => a + s.duration, 0) / totalSessions)
      : 0;

    const prompt = `Sen web analytics mutaxassisisan. Quyidagi ma'lumotlarni o'zbek tilida tahlil qil va amaliy maslahatlar ber.

Sayt: ${website.name} (${website.domain || 'noma\'lum domain'})
Davr: Oxirgi 30 kun

ASOSIY KO'RSATKICHLAR:
- Jami sessiyalar: ${totalSessions}
- Bounce rate: ${bounceRate}% (user bitta sahifani ko'rib ketish foizi)
- O'rtacha sessiya vaqti: ${avgDuration} soniya

TOP 5 SAHIFALAR:
${topPages.map((p) => `- ${p.path}: ${p._count.path} ko'rish, o'rtacha ${Math.round(p._avg.duration || 0)}s, scroll ${Math.round(p._avg.scrollDepth || 0)}%`).join('\n')}

TRAFFIC MANBALARI:
${sources.slice(0, 5).map((s) => `- ${s.referrer}: ${s._count.referrer} sessiya`).join('\n') || '- To\'g\'ridan-to\'g\'ri kirish asosiy'}

Tahlil qil:
1. Eng muhim muammo yoki imkoniyat
2. Qaysi sahifalar yaxshi ishlayapti va nima uchun
3. Bounce rate haqida izoh (${bounceRate}% yaxshimi yoki yomonmi?)
4. 3 ta aniq tavsiya (nima qilish kerak)

Javobni qisqa va amaliy qilib ber (200-300 so'z).`;

    const { text, provider } = await this.complete(prompt);

    await (this.prisma as any).aiInsight.create({
      data: {
        userId,
        type: 'WEBSITE',
        title: `${website.name} analysis`,
        content: text,
        provider,
      },
    });

    return text;
  }

  // ─── Get saved insights ───────────────────────────────────────────────────

  async getInsights(userId: string, type?: string, limit = 10) {
    const where: any = { userId };
    if (type) where.type = type;

    return (this.prisma as any).aiInsight.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      take: limit,
      select: { id: true, type: true, title: true, content: true, provider: true, generatedAt: true },
    });
  }

  // ─── Data collection ──────────────────────────────────────────────────────

  private async collectUserData(userId: string, days: number) {
    const from = new Date();
    from.setDate(from.getDate() - days);

    const [connections, websites] = await Promise.all([
      this.prisma.connection.findMany({
        where: { userId, isActive: true },
        include: {
          stats: {
            where: { date: { gte: from } },
            orderBy: { date: 'desc' },
            take: 2,
          },
        },
      }),
      this.prisma.website.findMany({
        where: { userId },
        include: {
          sessions: {
            where: { startedAt: { gte: from } },
            select: { duration: true, bounced: true },
            take: 500,
          },
          _count: { select: { pageViews: { where: { createdAt: { gte: from } } } } },
        },
      }),
    ]);

    return { connections, websites, days };
  }

  private buildWeeklyPrompt(data: any): string {
    const platformLines = data.connections.map((c: any) => {
      const latest = c.stats[0];
      const prev = c.stats[1];
      const growth = latest && prev && prev.followers
        ? (((latest.followers - prev.followers) / prev.followers) * 100).toFixed(1)
        : null;
      return `- ${c.platform}: ${latest?.followers || 0} follower${growth ? `, o'zgarish: ${growth}%` : ''}`;
    }).join('\n') || '- Hech qanday platforma ulanmagan';

    const webLines = data.websites.map((w: any) => {
      const views = w._count.pageViews;
      const sessions = w.sessions.length;
      const bounce = sessions ? (w.sessions.filter((s: any) => s.bounced).length / sessions * 100).toFixed(0) : 0;
      return `- ${w.name}: ${views} ko'rish, ${sessions} sessiya, bounce rate ${bounce}%`;
    }).join('\n') || '- Hech qanday sayt qo\'shilmagan';

    return `Sen digital marketing va analytics bo'yicha mutaxassisisan. Quyidagi haftalik statistikani o'zbek tilida tahlil qil.

PLATFORMALAR (oxirgi ${data.days} kun):
${platformLines}

WEB SAYTLAR:
${webLines}

Quyidagilarni yoz:
1. Eng yaxshi natija (1-2 jumla)
2. E'tibor talab qiladigan narsa (1-2 jumla)
3. Kelgusi hafta uchun 2 ta aniq tavsiya

Javob qisqa (150-200 so'z), do'stona ohangda, amaliy bo'lsin.`;
  }
}
