import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

async function getGroq() {
  const { default: Groq } = await import('groq-sdk');
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}
async function getOpenAI() {
  const { default: OpenAI } = await import('openai');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SYSTEM = `Sen Metrix — unified analytics dashboard uchun AI tahlilchisan.
Foydalanuvchi solopreneur, indie hacker yoki kichik startap egasi.
Har doim o'zbek tilida javo ber.
Javobni markdown formatida yoz: ## sarlavhalar, **qalin**, - ro'yxat.
Faqat real ma'lumotga asoslan — ma'lumot yo'q bo'lsa aytib o't.
Amaliy, aniq va qisqa bo'l. Suv quymasin.`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // ─── Core ─────────────────────────────────────────────────────────────────

  private async complete(
    prompt: string,
    maxTokens = 1500,
  ): Promise<{ text: string; provider: 'GROQ' | 'OPENAI'; tokensUsed: number }> {
    // Groq — 3 ta urinish (tarmoq xatolari uchun)
    if (process.env.GROQ_API_KEY) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const groq = await getGroq();
          const res = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: SYSTEM },
              { role: 'user', content: prompt },
            ],
            max_tokens: maxTokens,
            temperature: 0.6,
          });
          const text = res.choices[0]?.message?.content ?? '';
          const tokensUsed = res.usage?.total_tokens ?? 0;
          if (text) return { text, provider: 'GROQ', tokensUsed };
        } catch (err: any) {
          const isConnErr = err.message?.toLowerCase().includes('connect') || err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND';
          if (isConnErr && attempt < 3) {
            this.logger.warn(`Groq ulanish xatosi (${attempt}/3), qayta urinilmoqda...`);
            await new Promise((r) => setTimeout(r, 1500 * attempt));
            continue;
          }
          this.logger.warn(`Groq error: ${err.message}`);
          break;
        }
      }
    }

    // OpenAI fallback
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = await getOpenAI();
        const res = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.6,
        });
        const text = res.choices[0]?.message?.content ?? '';
        const tokensUsed = res.usage?.total_tokens ?? 0;
        if (text) return { text, provider: 'OPENAI', tokensUsed };
      } catch (err: any) {
        this.logger.error(`OpenAI error: ${err.message}`);
      }
    }

    throw new Error('AI bilan bog\'lanib bo\'lmadi. Tarmoqni tekshiring yoki keyinroq urinib ko\'ring.');
  }

  // ─── Weekly report ─────────────────────────────────────────────────────────

  @Cron('0 8 * * 1') // Dushanba 08:00
  async generateWeeklyInsightsForAll() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null, subscription: { plan: { hasWeeklyReport: true } } } as any,
      select: { id: true, email: true, name: true },
    });
    for (const user of users) {
      try { await this.generateWeeklyInsight(user.id); }
      catch (err: any) { this.logger.error(`Weekly insight xatosi (${user.id}): ${err.message}`); }
    }
  }

  async generateWeeklyInsight(userId: string): Promise<string> {
    const data = await this.collectWeeklyData(userId);
    const prompt = this.buildWeeklyPrompt(data);
    const { text, provider, tokensUsed } = await this.complete(prompt, 1800);

    await (this.prisma as any).aiInsight.create({
      data: { userId, type: 'WEEKLY', title: 'Haftalik tahlil', content: text, provider, tokensUsed },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (user) await this.email.sendWeeklyInsight(user.email, user.name ?? '', text);

    return text;
  }

  // ─── Website insight ───────────────────────────────────────────────────────

  async generateWebsiteInsight(userId: string, websiteId: string): Promise<string> {
    const website = await this.prisma.website.findFirst({
      where: { id: websiteId, userId },
      select: { name: true, domain: true },
    });
    if (!website) throw new Error('Sayt topilmadi');

    const from = new Date(); from.setDate(from.getDate() - 30);
    const prevFrom = new Date(from); prevFrom.setDate(prevFrom.getDate() - 30);

    const [sessions, prevSessions, topPages, sources, events] = await Promise.all([
      this.prisma.session.findMany({
        where: { websiteId, startedAt: { gte: from } },
        select: { duration: true, bounced: true, pageCount: true, device: true, country: true, referrer: true },
        take: 2000,
      }),
      this.prisma.session.count({ where: { websiteId, startedAt: { gte: prevFrom, lt: from } } }),
      this.prisma.pageView.groupBy({
        by: ['path'],
        where: { websiteId, createdAt: { gte: from } },
        _count: { path: true },
        _avg: { duration: true, scrollDepth: true },
        orderBy: { _count: { path: 'desc' } },
        take: 7,
      }),
      this.prisma.session.groupBy({
        by: ['referrer'],
        where: { websiteId, startedAt: { gte: from }, referrer: { not: null } },
        _count: { referrer: true },
        orderBy: { _count: { referrer: 'desc' } },
        take: 5,
      }),
      (this.prisma as any).customEvent.groupBy({
        by: ['name'],
        where: { websiteId, createdAt: { gte: from } },
        _count: { name: true },
        orderBy: { _count: { name: 'desc' } },
        take: 5,
      }),
    ]);

    const total = sessions.length;
    const bounceRate = total ? (sessions.filter((s) => s.bounced).length / total * 100).toFixed(1) : '0';
    const avgDur = total ? Math.round(sessions.reduce((a, s) => a + s.duration, 0) / total) : 0;
    const avgPages = total ? (sessions.reduce((a, s) => a + s.pageCount, 0) / total).toFixed(1) : '0';
    const growth = prevSessions ? (((total - prevSessions) / prevSessions) * 100).toFixed(1) : null;

    const deviceMap: Record<string, number> = {};
    const countryMap: Record<string, number> = {};
    for (const s of sessions) {
      const d = s.device ?? 'boshqa'; deviceMap[d] = (deviceMap[d] ?? 0) + 1;
      const c = s.country ?? 'noma\'lum'; countryMap[c] = (countryMap[c] ?? 0) + 1;
    }
    const topDevice = Object.entries(deviceMap).sort((a, b) => b[1] - a[1])[0];
    const topCountries = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

    const prompt = `Sayt tahlili qil va aniq maslahatlar ber.

## Sayt
**Nomi:** ${website.name}${website.domain ? ` (${website.domain})` : ''}
**Davr:** Oxirgi 30 kun

## Asosiy ko'rsatkichlar
- Sessiyalar: **${total}**${growth !== null ? ` (oldingi 30 kunga nisbatan **${Number(growth) >= 0 ? '+' : ''}${growth}%**)` : ''}
- Bounce rate: **${bounceRate}%** — ${Number(bounceRate) < 40 ? 'a\'lo' : Number(bounceRate) < 60 ? 'o\'rtacha' : 'yuqori, e\'tibor talab'}
- O'rtacha sessiya vaqti: **${avgDur}s** (${avgDur < 30 ? 'juda qisqa' : avgDur < 90 ? 'qisqa' : avgDur < 180 ? 'normal' : 'yaxshi'})
- O'rtacha sahifalar/sessiya: **${avgPages}**
- Asosiy qurilma: **${topDevice?.[0] ?? 'ma\'lumot yo\'q'}** (${topDevice ? Math.round(topDevice[1] / total * 100) : 0}%)

## Top sahifalar (ko'rishlar, scroll%, vaqt)
${topPages.map((p) =>
  `- \`${p.path}\`: ${p._count.path} ko'rish | scroll: ${Math.round(p._avg.scrollDepth ?? 0)}% | vaqt: ${Math.round(p._avg.duration ?? 0)}s`
).join('\n') || '- Ma\'lumot yo\'q'}

## Traffic manbalari
${sources.length ? sources.map((s) => `- ${s.referrer}: ${s._count.referrer} sessiya`).join('\n') : '- Asosan to\'g\'ridan-to\'g\'ri kirish'}

## Geografiya (top 3)
${topCountries.map(([c, n]) => `- ${c}: ${n} sessiya (${Math.round(n / total * 100)}%)`).join('\n') || '- Ma\'lumot yo\'q'}

${events.length ? `## Custom eventlar\n${events.map((e: any) => `- ${e.name}: ${e._count.name} marta`).join('\n')}` : ''}

## Tahlil qil (markdown formatida):

### 1. Umumiy holat (2-3 jumla)
### 2. Kuchli tomonlar
### 3. Muammolar va zaif joylar
### 4. Aniq tavsiyalar (4-5 ta, raqamlangan ro'yxat)
### 5. Keyingi qadam (eng muhim bitta narsa)`;

    const { text, provider, tokensUsed } = await this.complete(prompt, 1500);

    await (this.prisma as any).aiInsight.create({
      data: { userId, type: 'WEBSITE', title: `${website.name} tahlili`, content: text, provider, tokensUsed },
    });

    return text;
  }

  // ─── Platform insight ──────────────────────────────────────────────────────

  async generatePlatformInsight(userId: string, platform: string): Promise<string> {
    const conn = await this.prisma.connection.findFirst({
      where: { userId, platform: platform as any, isActive: true },
      select: { id: true, platformUsername: true },
    });
    if (!conn) throw new Error('Platforma ulanmagan');

    const from = new Date(); from.setDate(from.getDate() - 30);

    const [stats, posts] = await Promise.all([
      this.prisma.platformStat.findMany({
        where: { connectionId: conn.id, date: { gte: from } },
        orderBy: { date: 'asc' },
        select: { date: true, followers: true, views: true, likes: true, comments: true, engagement: true, growth: true },
      }),
      this.prisma.postStat.findMany({
        where: { connectionId: conn.id, publishedAt: { gte: from } },
        orderBy: { views: 'desc' },
        take: 5,
        select: { title: true, caption: true, views: true, likes: true, comments: true, shares: true, engagementRate: true, publishedAt: true },
      }),
    ]);

    if (!stats.length) throw new Error('Statistika topilmadi. Avval sync qiling.');

    const latest = stats[stats.length - 1];
    const oldest = stats[0];
    const followerGrowth = oldest?.followers && latest?.followers
      ? (((latest.followers - oldest.followers) / oldest.followers) * 100).toFixed(1)
      : null;

    const avgEngagement = stats.filter((s) => s.engagement).length
      ? (stats.reduce((a, s) => a + (s.engagement ?? 0), 0) / stats.filter((s) => s.engagement).length).toFixed(2)
      : null;

    const prompt = `${platform} kanalini tahlil qil va o'sish strategiyasi tavsiya qil.

## Kanal: @${conn.platformUsername ?? 'noma\'lum'}
**Davr:** Oxirgi 30 kun

## Ko'rsatkichlar
- Hozirgi followers: **${latest?.followers?.toLocaleString() ?? 'ma\'lumot yo\'q'}**
- Followers o'sishi: **${followerGrowth !== null ? `${Number(followerGrowth) >= 0 ? '+' : ''}${followerGrowth}%` : 'ma\'lumot yo\'q'}**
- O'rtacha views: **${latest?.views?.toLocaleString() ?? 'ma\'lumot yo\'q'}**
- O'rtacha engagement rate: **${avgEngagement !== null ? `${avgEngagement}%` : 'ma\'lumot yo\'q'}**
- Jami likes (avg): **${latest?.likes?.toLocaleString() ?? 'ma\'lumot yo\'q'}**
- Jami comments (avg): **${latest?.comments?.toLocaleString() ?? 'ma\'lumot yo\'q'}**

${posts.length ? `## Top 5 post (views bo'yicha)
${posts.map((p, i) => {
  const title = p.title ?? p.caption?.slice(0, 60) ?? 'Nomsiz';
  return `${i + 1}. "${title}" — ${p.views?.toLocaleString() ?? 0} view | ${p.likes ?? 0} like | ${p.comments ?? 0} izoh | ${p.engagementRate?.toFixed(1) ?? '?'}% eng`;
}).join('\n')}` : ''}

## Tahlil qil (markdown formatida):

### 1. Kanal holati
### 2. Nima yaxshi ishlayapti?
### 3. O'sishni to'xtatgan omillar
### 4. Kontent strategiyasi (4-5 ta tavsiya)
### 5. Bu haftaning bitta eng muhim vazifasi`;

    const { text, provider, tokensUsed } = await this.complete(prompt, 1500);

    await (this.prisma as any).aiInsight.create({
      data: { userId, type: 'CUSTOM', title: `${platform} tahlili`, content: text, provider, tokensUsed },
    });

    return text;
  }

  // ─── Monthly insight ───────────────────────────────────────────────────────

  async generateMonthlyInsight(userId: string): Promise<string> {
    const data = await this.collectPeriodData(userId, 30);
    const prompt = this.buildPeriodPrompt(data, 'oylik');
    const { text, provider, tokensUsed } = await this.complete(prompt, 2000);

    await (this.prisma as any).aiInsight.create({
      data: { userId, type: 'MONTHLY', title: 'Oylik tahlil', content: text, provider, tokensUsed },
    });
    return text;
  }

  // ─── Yearly insight ────────────────────────────────────────────────────────

  async generateYearlyInsight(userId: string): Promise<string> {
    const data = await this.collectPeriodData(userId, 365);
    const prompt = this.buildPeriodPrompt(data, 'yillik');
    const { text, provider, tokensUsed } = await this.complete(prompt, 2500);

    await (this.prisma as any).aiInsight.create({
      data: { userId, type: 'YEARLY', title: 'Yillik tahlil', content: text, provider, tokensUsed },
    });
    return text;
  }

  // ─── Get insights ──────────────────────────────────────────────────────────

  async getInsights(userId: string, type?: string, limit = 30) {
    const where: any = { userId };
    if (type) where.type = type;
    return (this.prisma as any).aiInsight.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      take: limit,
      select: { id: true, type: true, title: true, content: true, provider: true, tokensUsed: true, generatedAt: true },
    });
  }

  // ─── Delete insight ────────────────────────────────────────────────────────

  async deleteInsight(userId: string, id: string) {
    const insight = await (this.prisma as any).aiInsight.findUnique({ where: { id } });
    if (!insight || insight.userId !== userId) throw new Error('Topilmadi');
    await (this.prisma as any).aiInsight.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Data helpers ──────────────────────────────────────────────────────────

  private async collectPeriodData(userId: string, days: number) {
    const from = new Date(); from.setDate(from.getDate() - days);
    const prevFrom = new Date(from); prevFrom.setDate(prevFrom.getDate() - days);

    const [connections, websites, prevPageViews] = await Promise.all([
      this.prisma.connection.findMany({
        where: { userId, isActive: true },
        select: {
          platform: true, platformUsername: true,
          stats: {
            where: { date: { gte: from } },
            orderBy: { date: 'asc' },
            select: { date: true, followers: true, views: true, likes: true, comments: true, engagement: true },
          },
        },
      }),
      this.prisma.website.findMany({
        where: { userId },
        select: {
          name: true, domain: true,
          _count: { select: { pageViews: { where: { createdAt: { gte: from } } } } },
          sessions: {
            where: { startedAt: { gte: from } },
            select: { duration: true, bounced: true, pageCount: true },
            take: 2000,
          },
        },
      }),
      this.prisma.pageView.count({
        where: { website: { userId }, createdAt: { gte: prevFrom, lt: from } },
      }),
    ]);

    return { connections, websites, prevPageViews, days };
  }

  private buildPeriodPrompt(data: any, period: 'oylik' | 'yillik'): string {
    const isYearly = period === 'yillik';

    const platforms = data.connections.map((c: any) => {
      const stats = c.stats;
      if (!stats.length) return `- **${c.platform}**: statistika yo'q`;
      const first = stats[0]; const last = stats[stats.length - 1];
      const growth = first?.followers && last?.followers
        ? (((last.followers - first.followers) / first.followers) * 100).toFixed(1) : null;
      const avgEng = stats.filter((s: any) => s.engagement).length
        ? (stats.reduce((a: number, s: any) => a + (s.engagement ?? 0), 0) / stats.filter((s: any) => s.engagement).length).toFixed(1) : null;
      return [
        `- **${c.platform}** (@${c.platformUsername ?? '?'})`,
        `followers: ${last?.followers?.toLocaleString() ?? '?'}${growth ? ` (davr bo'yicha ${Number(growth) >= 0 ? '+' : ''}${growth}%)` : ''}`,
        avgEng ? `avg engagement: ${avgEng}%` : '',
        last?.views ? `views: ${last.views.toLocaleString()}` : '',
      ].filter(Boolean).join(' | ');
    }).join('\n') || '- Platformalar ulanmagan';

    const totalViews = data.websites.reduce((a: number, w: any) => a + w._count.pageViews, 0);
    const totalPrev = data.prevPageViews;
    const viewGrowth = totalPrev ? (((totalViews - totalPrev) / totalPrev) * 100).toFixed(1) : null;

    const websites = data.websites.map((w: any) => {
      const sessions = w.sessions.length;
      const bounce = sessions ? (w.sessions.filter((s: any) => s.bounced).length / sessions * 100).toFixed(0) : 0;
      const avgDur = sessions ? Math.round(w.sessions.reduce((a: number, s: any) => a + s.duration, 0) / sessions) : 0;
      return `- **${w.name}**: ${w._count.pageViews} ko'rish | ${sessions} sessiya | bounce: ${bounce}% | avg vaqt: ${avgDur}s`;
    }).join('\n') || '- Saytlar yo\'q';

    const scope = isYearly
      ? 'Bu yil davomida nima o\'zgardi, qaysi tendentsiyalar bor va keyingi yil strategiyasi qanday bo\'lsin?'
      : 'Bu oy qanday o\'tdi, o\'sish bormi, qanday yaxshilash mumkin?';

    return `${isYearly ? 'Yillik' : 'Oylik'} analytics hisobotini chuqur tahlil qil.

## Ma'lumotlar (oxirgi ${data.days} kun)

### Platformalar
${platforms}

### Web saytlar (jami: ${totalViews.toLocaleString()} ko'rish${viewGrowth ? `, oldingi davrga nisbatan ${Number(viewGrowth) >= 0 ? '+' : ''}${viewGrowth}%` : ''})
${websites}

## ${scope}

Tahlil qil (markdown formatida):

### 📊 ${isYearly ? 'Yil' : 'Oy'} xulosasi
Eng muhim 3-4 raqam va ularning ma'nosi.

### 🏆 Eng yaxshi natijalar
Nima zo'r bo'ldi va nima uchun.

### 📉 Muammolar va kamchiliklar
Nima bo'lmadi yoki yaxshilanishi kerak.

${isYearly ? `### 📈 Tendentsiyalar
Yil davomida qanday o'zgarishlar bo'ldi.

### 🗺️ Keyingi yil strategiyasi
3-5 ta muhim yo'nalish.` : `### 🎯 Keyingi oy uchun 4 ta vazifa
Aniq, o'lchovli, real.`}

### 💡 Asosiy xulosa
Bir jumlada eng muhim narsa.`;
  }

  private async collectWeeklyData(userId: string) {
    const from = new Date(); from.setDate(from.getDate() - 7);
    const prevFrom = new Date(); prevFrom.setDate(prevFrom.getDate() - 14);

    const [connections, websites] = await Promise.all([
      this.prisma.connection.findMany({
        where: { userId, isActive: true },
        select: {
          platform: true,
          platformUsername: true,
          stats: {
            orderBy: { date: 'desc' },
            take: 3,
            select: { date: true, followers: true, views: true, likes: true, comments: true, engagement: true },
          },
        },
      }),
      this.prisma.website.findMany({
        where: { userId },
        select: {
          name: true,
          domain: true,
          _count: { select: { pageViews: { where: { createdAt: { gte: from } } } } },
          sessions: {
            where: { startedAt: { gte: from } },
            select: { duration: true, bounced: true, pageCount: true },
            take: 1000,
          },
          pageViews: {
            where: { createdAt: { gte: from } },
            select: { path: true },
            take: 5000,
          },
        },
      }),
    ]);

    // Top pages per website
    const prevViews = await Promise.all(
      websites.map(() =>
        this.prisma.pageView.count({ where: { website: { userId }, createdAt: { gte: prevFrom, lt: from } } })
      )
    );

    return { connections, websites, prevViews, days: 7 };
  }

  private buildWeeklyPrompt(data: any): string {
    const platforms = data.connections.map((c: any) => {
      const [latest, prev] = c.stats;
      const followerGrowth = latest?.followers && prev?.followers
        ? `${(((latest.followers - prev.followers) / prev.followers) * 100).toFixed(1)}%`
        : null;
      const parts = [
        `**${c.platform}** (@${c.platformUsername ?? 'N/A'})`,
        `followers: ${latest?.followers?.toLocaleString() ?? '?'}${followerGrowth ? ` (${followerGrowth} o'zgarish)` : ''}`,
        latest?.views ? `views: ${latest.views.toLocaleString()}` : '',
        latest?.engagement ? `engagement: ${latest.engagement.toFixed(1)}%` : '',
        latest?.likes ? `likes: ${latest.likes.toLocaleString()}` : '',
      ].filter(Boolean);
      return `- ${parts.join(' | ')}`;
    }).join('\n') || '- Hech qanday platforma ulanmagan';

    const websites = data.websites.map((w: any, i: number) => {
      const views = w._count.pageViews;
      const sessions = w.sessions.length;
      const bounced = sessions ? (w.sessions.filter((s: any) => s.bounced).length / sessions * 100).toFixed(0) : 0;
      const avgDur = sessions ? Math.round(w.sessions.reduce((a: number, s: any) => a + s.duration, 0) / sessions) : 0;
      const prevView = data.prevViews[i] ?? 0;
      const growth = prevView ? `${(((views - prevView) / prevView) * 100).toFixed(0)}%` : null;

      // Top 3 pages
      const pathCount: Record<string, number> = {};
      for (const pv of w.pageViews) pathCount[pv.path] = (pathCount[pv.path] ?? 0) + 1;
      const topPages = Object.entries(pathCount).sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([path, count]) => `\`${path}\` (${count})`).join(', ');

      return [
        `- **${w.name}**${w.domain ? ` (${w.domain})` : ''}`,
        `  views: ${views}${growth ? ` (${growth} oldingi haftaga nisbatan)` : ''} | sessiyalar: ${sessions} | bounce: ${bounced}% | avg vaqt: ${avgDur}s`,
        topPages ? `  Top sahifalar: ${topPages}` : '',
      ].filter(Boolean).join('\n');
    }).join('\n') || '- Hech qanday sayt qo\'shilmagan';

    return `Haftalik analytics hisobotini tahlil qil va qisqa, amaliy xulosa ber.

## Platforma statistikasi (oxirgi 7 kun)
${platforms}

## Web saytlar
${websites}

## Yoz (markdown formatida):

### 📊 Hafta xulosasi (2-3 jumla)
Eng muhim natijalarni ayt.

### ✅ Bu hafta nima yaxshi bo'ldi?
2-3 ta aniq natija.

### ⚠️ Diqqat talab qiladigan narsalar
1-2 ta muammo yoki kamchilik.

### 🎯 Keyingi hafta uchun 3 ta vazifa
Aniq, o'lchovli, real vazifalar.

### 💡 Bir fikr
Kontent yoki o'sish haqida bitta qimmatli maslahat.`;
  }
}
