import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@metrix/prisma-client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function seedPlatforms() {
  const platforms = [
    { slug: 'YOUTUBE',   displayName: 'YouTube',    description: 'Video va kanal statistikasi', enabled: true,  comingSoon: false, sortOrder: 1 },
    { slug: 'TELEGRAM',  displayName: 'Telegram',   description: 'Kanal obunachilari va o\'sish', enabled: true,  comingSoon: false, sortOrder: 2 },
    { slug: 'DISCORD',   displayName: 'Discord',    description: 'Server a\'zolari va faollik', enabled: true,  comingSoon: false, sortOrder: 3 },
    { slug: 'BLUESKY',   displayName: 'Bluesky',    description: 'Followers va post statistikasi', enabled: true,  comingSoon: false, sortOrder: 4 },
    { slug: 'INSTAGRAM', displayName: 'Instagram',  description: 'Followers, reach & engagement — pending Meta App Review', enabled: false, comingSoon: false, sortOrder: 5 },
    { slug: 'FACEBOOK',  displayName: 'Facebook',   description: 'Page likes & engagement — pending Meta App Review', enabled: false, comingSoon: false, sortOrder: 6 },
    { slug: 'THREADS',   displayName: 'Threads',    description: 'Followers & posts — connected via Instagram', enabled: false, comingSoon: false, sortOrder: 7 },
    { slug: 'PINTEREST', displayName: 'Pinterest',  description: 'Impressions va saves statistikasi', enabled: false, comingSoon: true,  sortOrder: 8 },
    { slug: 'REDDIT',    displayName: 'Reddit',     description: 'Subreddit a\'zolari va karma', enabled: false, comingSoon: true,  sortOrder: 9 },
    { slug: 'TWITTER',   displayName: 'Twitter / X', description: 'Followers va tweet statistikasi', enabled: false, comingSoon: true,  sortOrder: 10 },
    { slug: 'LINKEDIN',  displayName: 'LinkedIn',   description: 'Connections va post engagement', enabled: false, comingSoon: true,  sortOrder: 11 },
    { slug: 'TIKTOK',    displayName: 'TikTok',     description: 'Followers va video ko\'rishlar', enabled: false, comingSoon: true,  sortOrder: 12 },
  ] as const;

  for (const p of platforms) {
    await prisma.platformConfig.upsert({
      where: { slug: p.slug as any },
      create: p as any,
      update: { displayName: p.displayName, description: p.description, enabled: p.enabled, comingSoon: p.comingSoon, sortOrder: p.sortOrder },
    });
  }
  console.log(`✅ ${platforms.length} ta platform seeded`);
}

async function seedPlans() {
  const plans = [
    {
      name: 'Free',
      slug: 'free',
      price: 0,
      currency: 'USD',
      maxWebsites: 1,
      maxPlatforms: 2,
      maxMonthlyViews: 5000,
      hasAiInsights: false,
      hasWeeklyReport: false,
      hasCustomAlerts: false,
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'Starter',
      slug: 'starter',
      price: 9,
      currency: 'USD',
      maxWebsites: 3,
      maxPlatforms: 10,
      maxMonthlyViews: 50000,
      hasAiInsights: true,
      hasWeeklyReport: true,
      hasCustomAlerts: false,
      isActive: true,
      sortOrder: 2,
    },
    {
      name: 'Pro',
      slug: 'pro',
      price: 19,
      currency: 'USD',
      maxWebsites: -1,       // cheksiz = -1
      maxPlatforms: -1,
      maxMonthlyViews: -1,
      hasAiInsights: true,
      hasWeeklyReport: true,
      hasCustomAlerts: true,
      isActive: true,
      sortOrder: 3,
    },
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { slug: p.slug },
      create: p as any,
      update: { name: p.name, price: p.price, maxWebsites: p.maxWebsites, maxPlatforms: p.maxPlatforms, maxMonthlyViews: p.maxMonthlyViews, hasAiInsights: p.hasAiInsights, hasWeeklyReport: p.hasWeeklyReport, hasCustomAlerts: p.hasCustomAlerts },
    });
  }
  console.log(`✅ ${plans.length} ta plan seeded`);
}

async function main() {
  console.log('🌱 Seeding...');
  await seedPlatforms();
  await seedPlans();
  console.log('✅ Seed tugadi');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
