import {
  Check,
  X,
  Globe,
  Zap,
  Bot,
  Bell,
  Download,
  Users,
  Key,
  Database,
  BarChart2,
  Link2,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/* ── Feature types ───────────────────────────────── */
type Feature = {
  icon: React.ElementType;
  text: string;
  included: boolean;
  highlight?: boolean;
};

type Group = {
  label: string;
  features: Feature[];
};

/* ── Plan data ───────────────────────────────────── */
const plans = [
  {
    id: 'free',
    name: 'Free',
    badge: null,
    desc: "Sinab ko'rish uchun",
    price: '$0',
    period: 'har doim bepul',
    href: '/register',
    cta: 'Bepul boshlash',
    featured: false,
    groups: [
      {
        label: 'Tracking',
        features: [
          { icon: Globe, text: '1 ta sayt', included: true },
          { icon: Zap, text: '5,000 tashrif / oy', included: true },
          { icon: BarChart2, text: 'Real vaqt monitoring', included: true },
        ],
      },
      {
        label: 'Analitika',
        features: [
          { icon: Database, text: 'Asosiy web analitika', included: true },
          { icon: Database, text: "30 kunlik ma'lumot", included: true },
        ],
      },
      {
        label: 'AI & Alertlar',
        features: [
          { icon: Bot, text: 'AI haftalik hisobot', included: false },
          { icon: Bell, text: 'Email alertlar', included: false },
        ],
      },
      {
        label: 'Jamoa & Eksport',
        features: [
          { icon: Users, text: 'Workspace', included: false },
          { icon: Download, text: 'CSV eksport', included: false },
          { icon: Key, text: 'API access', included: false },
        ],
      },
    ] as Group[],
  },
  {
    id: 'starter',
    name: 'Starter',
    badge: 'Eng mashhur',
    desc: 'Faol kreatorlar uchun',
    price: '$9',
    period: 'oyiga',
    href: '/register?plan=starter',
    cta: 'Boshlash',
    featured: true,
    groups: [
      {
        label: 'Tracking',
        features: [
          { icon: Globe, text: '3 ta sayt', included: true },
          { icon: Zap, text: '50,000 tashrif / oy', included: true },
          { icon: BarChart2, text: 'Real vaqt monitoring', included: true },
        ],
      },
      {
        label: 'Platformalar',
        features: [
          {
            icon: Link2,
            text: 'Barcha 8 ta platforma',
            included: true,
            highlight: true,
          },
          {
            icon: Database,
            text: "1 yillik ma'lumot tarixi",
            included: true,
            highlight: true,
          },
        ],
      },
      {
        label: 'AI & Alertlar',
        features: [
          {
            icon: Bot,
            text: 'AI haftalik hisobot (email)',
            included: true,
            highlight: true,
          },
          { icon: Bell, text: 'Email alertlar', included: true },
        ],
      },
      {
        label: 'Jamoa & Eksport',
        features: [
          { icon: Users, text: 'Workspace', included: false },
          { icon: Download, text: 'CSV eksport', included: true },
          { icon: Key, text: 'API access', included: false },
        ],
      },
    ] as Group[],
  },
  {
    id: 'pro',
    name: 'Pro',
    badge: "To'liq imkoniyat",
    desc: 'Jamoa va agentliklar uchun',
    price: '$19',
    period: 'oyiga',
    href: '/register?plan=pro',
    cta: 'Boshlash',
    featured: false,
    groups: [
      {
        label: 'Tracking',
        features: [
          {
            icon: Globe,
            text: 'Cheksiz sayt',
            included: true,
            highlight: true,
          },
          {
            icon: Zap,
            text: 'Cheksiz tashrif',
            included: true,
            highlight: true,
          },
          { icon: BarChart2, text: 'Real vaqt monitoring', included: true },
        ],
      },
      {
        label: 'Platformalar',
        features: [
          { icon: Link2, text: 'Barcha 8 ta platforma', included: true },
          {
            icon: Database,
            text: "Cheksiz ma'lumot tarixi",
            included: true,
            highlight: true,
          },
        ],
      },
      {
        label: 'AI & Alertlar',
        features: [
          {
            icon: Bot,
            text: 'AI haftalik + custom hisobot',
            included: true,
            highlight: true,
          },
          {
            icon: Bell,
            text: 'Custom alertlar',
            included: true,
            highlight: true,
          },
        ],
      },
      {
        label: 'Jamoa & Eksport',
        features: [
          {
            icon: Users,
            text: 'Workspace + ruxsatlar',
            included: true,
            highlight: true,
          },
          { icon: Download, text: 'CSV eksport', included: true },
          { icon: Key, text: 'API access', included: true, highlight: true },
        ],
      },
    ] as Group[],
  },
];

/* ── Feature row ─────────────────────────────────── */
function FeatureRow({
  feature,
  featured,
}: {
  feature: Feature;
  featured: boolean;
}) {
  if (!feature.included) {
    return (
      <li className="flex items-center gap-2.5 py-1">
        <X className="w-3.5 h-3.5 text-ink-3 shrink-0" />
        <span className="text-xs text-ink-3 line-through">
          {feature.text}
        </span>
      </li>
    );
  }
  return (
    <li className="flex items-center gap-2.5 py-1">
      <div
        className={cn(
          'w-4 h-4 rounded flex items-center justify-center shrink-0',
          featured && feature.highlight
            ? 'bg-accent-quiet border border-accent-line'
            : 'bg-surface-sunken border border-line',
        )}
      >
        <Check
          className={cn(
            'w-2.5 h-2.5',
            featured && feature.highlight ? 'text-accent-ink' : 'text-ink-2',
          )}
        />
      </div>
      <span
        className={cn(
          'text-xs leading-relaxed',
          feature.highlight && featured
            ? 'text-ink font-medium'
            : 'text-ink-2',
        )}
      >
        {feature.text}
      </span>
    </li>
  );
}

/* ── Plan card ───────────────────────────────────── */
function PlanCard({ plan, index }: { plan: (typeof plans)[0]; index: number }) {
  const allFeatureCount = plan.groups.reduce(
    (a, g) => a + g.features.filter((f) => f.included).length,
    0,
  );

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-panel border bg-surface transition-colors duration-200',
        // Ajratish faqat ramka va soya bilan — referensdagi kabi.
        plan.featured
          ? 'border-accent shadow-pop lg:-my-4'
          : 'border-line-subtle shadow-card hover:border-line',
      )}
      style={{ animation: `fade-up 0.6s ease-out ${0.1 + index * 0.1}s both` }}
    >
      {/* Ilgari bu yerda ikkita bezak bor edi va ikkalasi ham olib tashlandi:
          • yuqoridagi «shimmer» chizig'i — uzluksiz animatsiya, ma'nosiz shovqin
          • «orange glow» — `absolute -inset-px` qatlam. U qorong'i mavzuda
            yarim shaffof (`orange-500/20`) edi va kartani ohang bilan
            bo'yardi. Yorug' mavzuda esa u OPAQUE bo'lib qoldi va butun
            kartani yopib qo'ydi — Starter tarifi umuman ko'rinmasdi.

          Referensda ajratish uchun bezak kerak emas: apelsin ramka,
          yuqorida suzib turgan «Ommabop» tabletkasi va quyma CTA yetarli. */}

      {/* ── Card top ───────────────────────────────── */}
      <div className="p-6 rounded-t-2xl">
        {/* Badge */}
        {plan.badge && (
          <div
            className={cn(
              'inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border mb-4',
              plan.featured
                ? 'border-accent-line bg-accent-quiet text-accent-ink'
                : 'border-line bg-surface-sunken text-ink-2',
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                plan.featured ? 'bg-accent' : 'bg-ink-faint',
              )}
            />
            {plan.badge}
          </div>
        )}

        {/* Plan name */}
        <p className="text-xs text-ink-3 mb-1">{plan.desc}</p>
        <h3 className="text-lg font-bold text-ink mb-3">{plan.name}</h3>

        {/* Price */}
        <div className="flex items-end gap-1.5 mb-1">
          <span
            className={cn(
              'text-4xl font-black tracking-tight',
              plan.featured ? 'text-accent-ink' : 'text-ink',
            )}
          >
            {plan.price}
          </span>
          {plan.period !== 'har doim bepul' && (
            <span className="text-sm text-ink-3 mb-1.5">
              / {plan.period}
            </span>
          )}
        </div>
        {plan.period === 'har doim bepul' && (
          <p className="text-xs text-ink-3">{plan.period}</p>
        )}

        {/* Included features count */}
        <p className="text-[11px] text-ink-3 mt-3">
          <span className="text-ink-2 font-semibold">{allFeatureCount}</span>{' '}
          ta imkoniyat kiradi
        </p>
      </div>

      {/* Divider */}
      <div
        className={cn(
          'mx-6 border-t',
          plan.featured ? 'border-accent-line' : 'border-line',
        )}
      />

      {/* ── Feature groups ──────────────────────────── */}
      <div className="flex-1 p-6 space-y-4">
        {plan.groups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] uppercase tracking-widest text-ink-3 font-medium mb-1.5">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.features.map((f) => (
                <FeatureRow key={f.text} feature={f} featured={plan.featured} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── CTA ─────────────────────────────────────── */}
      <div className="p-6 pt-0">
        <Link
          href={plan.href}
          className={cn(
            'w-full flex items-center justify-center text-sm font-semibold py-2.5 rounded-panel transition-all duration-200',
            plan.featured
              ? 'bg-accent hover:bg-accent-hover text-on-accent shadow-lg shadow-accent-line'
              : 'border border-line hover:border-line-strong text-ink-2 hover:text-ink hover:bg-surface-hover',
          )}
        >
          {plan.cta}
        </Link>
      </div>
    </div>
  );
}

/* ── Section ──────────────────────────────────────── */
export default function PricingSection() {
  return (
    <section id="narxlar" className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage:
              'radial-gradient(circle, #52525b 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent-quiet blur-[120px]"
          style={{ animation: 'blob 16s ease-in-out infinite' }}
        />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
      </div>

      <div className="relative z-10 max-w-landing mx-auto px-4">
        {/* Heading */}
        <div
          className="text-center mb-14"
          style={{ animation: 'fade-up 0.6s ease-out both' }}
        >
          <p className="text-xs uppercase tracking-widest text-accent-ink/80 font-medium mb-3">
            Narxlar
          </p>
          <h2 className="text-4xl font-bold tracking-tight leading-[1.1] mb-4">
            <span className="text-ink">Sodda narxlar.</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-hover">
              Yashirin to&apos;lovlar yo&apos;q.
            </span>
          </h2>
          <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed">
            Bepul boshlab, o&apos;sgach yangilaysiz. Istalgan vaqt bekor qilish
            mumkin.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {plans.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} index={i} />
          ))}
        </div>

        {/* Bottom trust row */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 text-sm text-ink-3"
          style={{ animation: 'fade-up 0.6s ease-out 0.4s both' }}
        >
          {[
            'Kredit karta kerak emas',
            'Istalgan vaqt bekor qilish',
            "Ma'lumotlar xavfsiz",
          ].map((t) => (
            <span key={t} className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-ink-3" />
              {t}
            </span>
          ))}
        </div>

        {/* Contact */}
        <p
          className="text-center text-xs text-ink-3 mt-6"
          style={{ animation: 'fade-up 0.6s ease-out 0.5s both' }}
        >
          Savol bormi?{' '}
          <a
            href="mailto:hello@metrix.io"
            className="text-ink-3 hover:text-ink transition-colors"
          >
            hello@metrix.io
          </a>{' '}
          ga yozing
        </p>
      </div>
    </section>
  );
}
