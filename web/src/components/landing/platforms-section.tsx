'use client';

import { useState } from 'react';
import {
  Check,
  Copy,
  CheckCheck,
  ShieldCheck,
  Zap,
  Activity,
} from 'lucide-react';
import {
  YouTubeIcon,
  TelegramIcon,
  InstagramIcon,
  DiscordIcon,
  BlueskyIcon,
  FacebookIcon,
  ThreadsIcon,
  WebIcon,
} from '@/components/icons/platform-icons';

/* ── Color helpers ───────────────────────────────── */
// Yorug' sintaksis mavzusi. Ilgari bu ranglar qorong'i panel uchun edi
// (`purple-400`, `yellow-300`, `sky-400`) va oq fonda o'qilmasdi.
//
// Referensdagi kod bloki ikki tonli: teg va qiymatlar apelsin, qolgani
// oddiy siyoh. Ko'zga qulay va sahifaning aksentiga bog'lanadi.
const kw = (s: string) => <span className="text-accent-ink">{s}</span>; // keyword
const str = (s: string) => <span className="text-accent-ink">{s}</span>; // string
const atr = (s: string) => <span className="text-ink-2">{s}</span>; // attribute
const val = (s: string) => <span className="text-accent-ink">{s}</span>; // value/variable
const tag = (s: string) => <span className="text-accent-ink">{s}</span>; // tag/type name
const fn = (s: string) => <span className="text-info-ink">{s}</span>; // function
const pun = (s: string) => <span className="text-ink-3">{s}</span>; // punctuation/dim
const cmt = (s: string) => <span className="text-ink-3 italic">{s}</span>; // comment
const txt = (s: string) => <span className="text-ink-2">{s}</span>; // normal text

/* ── Line component ──────────────────────────────── */
function L({ n, children }: { n: number; children?: React.ReactNode }) {
  return (
    <div className="flex items-start min-h-[22px]">
      <span className="w-8 shrink-0 text-right pr-4 text-ink-3 text-[11px] leading-[22px] select-none tabular-nums">
        {n}
      </span>
      <span className="font-mono text-[12px] leading-[22px] whitespace-pre">
        {children ?? ' '}
      </span>
    </div>
  );
}

/* ── Code for each tab ───────────────────────────── */
function HTMLCode() {
  return (
    <>
      <L n={1}>{cmt('<!-- Metrix tracking -->')}</L>
      <L n={2}>
        {pun('<')}
        {tag('script')}
      </L>
      <L n={3}>
        {txt('  ')}
        {atr('src')}
        {pun('=')}
        {str('"https://app.metrix.io/track.js"')}
      </L>
      <L n={4}>
        {txt('  ')}
        {atr('data-site')}
        {pun('=')}
        {val('"mk_live_abc123"')}
      </L>
      <L n={5}>
        {txt('  ')}
        {kw('defer')}
      </L>
      <L n={6}>
        {pun('></')}
        {tag('script')}
        {pun('>')}
      </L>
    </>
  );
}

function ReactCode() {
  return (
    <>
      <L n={1}>
        {kw('import')}
        {txt(` { useEffect } `)}
        {kw('from')}
        {txt(' ')}
        {str("'react'")}
      </L>
      <L n={2} />
      <L n={3}>
        {fn('useEffect')}
        {pun('(')}
        {pun('()')}
        {txt(' => {')}
      </L>
      <L n={4}>
        {txt('  ')}
        {kw('const')}
        {txt(' s = document.')}
        {fn('createElement')}
        {pun('(')}
        {str("'script'")}
        {pun(')')}
      </L>
      <L n={5}>
        {txt('  s.')}
        {atr('src')}
        {txt(' = ')}
        {str('"https://app.metrix.io/track.js"')}
      </L>
      <L n={6}>
        {txt('  s.dataset.')}
        {atr('site')}
        {txt(' = ')}
        {val('"mk_live_abc123"')}
      </L>
      <L n={7}>
        {txt('  s.')}
        {atr('defer')}
        {txt(' = ')}
        {kw('true')}
      </L>
      <L n={8}>
        {txt('  document.body.')}
        {fn('appendChild')}
        {pun('(')}
        {txt('s')}
        {pun(')')}
      </L>
      <L n={9}>
        {pun('}, ')}
        {pun('[]')}
        {pun(')')}
      </L>
    </>
  );
}

function NextCode() {
  return (
    <>
      <L n={1}>
        {kw('import')}
        {txt(' Script ')}
        {kw('from')}
        {txt(' ')}
        {str("'next/script'")}
      </L>
      <L n={2} />
      <L n={3}>
        {kw('export default function')}
        {txt(' ')}
        {fn('Layout')}
        {pun('({')}
        {txt(' children ')}
        {pun('}){')}{' '}
      </L>
      <L n={4}>
        {txt('  ')}
        {kw('return')}
        {txt(' (')}
      </L>
      <L n={5}>
        {txt('    ')}
        {pun('<')}
        {tag('html')}
        {pun('>')}
      </L>
      <L n={6}>
        {txt('      ')}
        {pun('<')}
        {tag('body')}
        {pun('>')}
        {pun('{')}
        {txt('children')}
        {pun('}')}
        {pun('</')}
        {tag('body')}
        {pun('>')}
      </L>
      <L n={7}>
        {txt('      ')}
        {pun('<')}
        {tag('Script')}
      </L>
      <L n={8}>
        {txt('        ')}
        {atr('src')}
        {pun('=')}
        {str('"https://app.metrix.io/track.js"')}
      </L>
      <L n={9}>
        {txt('        ')}
        {atr('data-site')}
        {pun('=')}
        {val('"mk_live_abc123"')}
      </L>
      <L n={10}>
        {txt('        ')}
        {atr('strategy')}
        {pun('=')}
        {str('"afterInteractive"')}
      </L>
      <L n={11}>
        {txt('      ')}
        {pun('/>')}
      </L>
      <L n={12}>
        {txt('    ')}
        {pun('</')}
        {tag('html')}
        {pun('>')}
      </L>
      <L n={13}>{txt('  )')}</L>
      <L n={14}>{pun('}')}</L>
    </>
  );
}

function VueCode() {
  return (
    <>
      <L n={1}>{cmt('// main.ts')}</L>
      <L n={2}>
        {kw('import')}
        {txt(' { createApp } ')}
        {kw('from')}
        {txt(' ')}
        {str("'vue'")}
      </L>
      <L n={3}>
        {kw('import')}
        {txt(' App ')}
        {kw('from')}
        {txt(' ')}
        {str("'./App.vue'")}
      </L>
      <L n={4} />
      <L n={5}>{cmt('// Metrix tracking')}</L>
      <L n={6}>
        {kw('const')}
        {txt(' s = document.')}
        {fn('createElement')}
        {pun('(')}
        {str("'script'")}
        {pun(')')}
      </L>
      <L n={7}>
        {txt('s.')}
        {atr('src')}
        {txt(' = ')}
        {str('"https://app.metrix.io/track.js"')}
      </L>
      <L n={8}>
        {txt('s.')}
        {fn('setAttribute')}
        {pun('(')}
        {str("'data-site'")}
        {pun(', ')}
        {val("'mk_live_abc123'")}
        {pun(')')}
      </L>
      <L n={9}>
        {txt('document.head.')}
        {fn('appendChild')}
        {pun('(')}
        {txt('s')}
        {pun(')')}
      </L>
      <L n={10} />
      <L n={11}>
        {fn('createApp')}
        {pun('(')}
        {txt('App')}
        {pun(').')}
        {fn('mount')}
        {pun('(')}
        {str("'#app'")}
        {pun(')')}
      </L>
    </>
  );
}

function CurlCode() {
  return (
    <>
      <L n={1}>{cmt("# Sahifa ko'rishni yuborish")}</L>
      <L n={2}>
        {fn('curl')}
        {txt(' -X ')}
        {val('POST')}
        {txt(' ')}
        {str('https://app.metrix.io/track')}
        {txt(' \\')}
      </L>
      <L n={3}>
        {txt('  ')}
        {txt('-H ')}
        {str('"Content-Type: application/json"')}
        {txt(' \\')}
      </L>
      <L n={4}>
        {txt('  ')}
        {txt('-d ')}
        {str("'{")}{' '}
      </L>
      <L n={5}>
        {txt('    ')}
        {str('"siteKey"')}
        {pun(': ')}
        {val('"mk_live_abc123"')}
        {pun(',')}
      </L>
      <L n={6}>
        {txt('    ')}
        {str('"path"')}
        {pun(': ')}
        {val('"/home"')}
        {pun(',')}
      </L>
      <L n={7}>
        {txt('    ')}
        {str('"sessionId"')}
        {pun(': ')}
        {val('"sess_xyz789"')}
      </L>
      <L n={8}>
        {txt('  ')}
        {str("}'")}
      </L>
    </>
  );
}

/* ── Tab config ──────────────────────────────────── */
const tabs: Array<{
  id: string;
  file: string;
  lang: string;
  Code: () => React.ReactElement;
  raw: string;
}> = [
  {
    id: 'HTML',
    file: 'index.html',
    lang: 'HTML',
    Code: HTMLCode,
    raw: `<script\n  src="https://app.metrix.io/track.js"\n  data-site="mk_live_abc123"\n  defer\n></script>`,
  },
  {
    id: 'React',
    file: 'src/App.tsx',
    lang: 'TSX',
    Code: ReactCode,
    raw: `useEffect(() => {\n  const s = document.createElement('script')\n  s.src = 'https://app.metrix.io/track.js'\n  s.dataset.site = 'mk_live_abc123'\n  s.defer = true\n  document.body.appendChild(s)\n}, [])`,
  },
  {
    id: 'Next.js',
    file: 'app/layout.tsx',
    lang: 'TSX',
    Code: NextCode,
    raw: `<Script\n  src="https://app.metrix.io/track.js"\n  data-site="mk_live_abc123"\n  strategy="afterInteractive"\n/>`,
  },
  {
    id: 'Vue',
    file: 'src/main.ts',
    lang: 'TS',
    Code: VueCode,
    raw: `const s = document.createElement('script')\ns.src = 'https://app.metrix.io/track.js'\ns.setAttribute('data-site', 'mk_live_abc123')\ndocument.head.appendChild(s)`,
  },
  {
    id: 'cURL',
    file: 'terminal',
    lang: 'bash',
    Code: CurlCode,
    raw: `curl -X POST https://app.metrix.io/track \\\n  -H "Content-Type: application/json" \\\n  -d '{"siteKey":"mk_live_abc123","path":"/home"}'`,
  },
];

/* ── Copy button ─────────────────────────────────── */
function CopyButton({ raw }: { raw: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(raw).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-control border border-line hover:border-line-strong text-ink-3 hover:text-ink transition-all text-[11px]"
    >
      {copied ? (
        <>
          <CheckCheck className="w-3 h-3 text-positive-ink" />
          <span className="text-positive-ink">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

/* ── Platform grid ───────────────────────────────── */
const platforms = [
  { Icon: YouTubeIcon, name: 'YouTube', desc: 'Obunachi, video statistika' },
  { Icon: TelegramIcon, name: 'Telegram', desc: "Kanal a'zolari, o'sish" },
  { Icon: InstagramIcon, name: 'Instagram', desc: 'Kuzatuvchilar, reach' },
  { Icon: DiscordIcon, name: 'Discord', desc: "Server a'zolari, faollik" },
  { Icon: BlueskyIcon, name: 'Bluesky', desc: 'Followers, postlar' },
  { Icon: FacebookIcon, name: 'Facebook', desc: 'Sahifa statistikasi' },
  { Icon: ThreadsIcon, name: 'Threads', desc: 'Instagram bilan birga' },
  { Icon: WebIcon, name: 'Web sayt', desc: 'Tashrif, sessiya, sahifalar' },
];

const coming = ['Pinterest', 'Reddit', 'TikTok', 'LinkedIn', 'X (Twitter)'];

// Kod kartasi yonidagi uchta afzallik — nima uchun aynan bir qator kod
// yetarli ekanini tushuntiradi.
const perks = [
  {
    Icon: ShieldCheck,
    title: 'Cookie-siz va xavfsiz',
    body: "Cookie qo'yilmaydi, shaxsiy ma'lumot yig'ilmaydi. GDPR'ga to'liq mos — banner kerak emas.",
  },
  {
    Icon: Zap,
    title: 'Backend kerak emas',
    body: 'Server, baza yoki sozlash yo‘q. Script tegini qo‘shdingiz — ishlaydi.',
  },
  {
    Icon: Activity,
    title: 'Real vaqtda',
    body: "Birinchi tashrif bir necha soniyada dashboardda ko'rinadi.",
  },
];

/* ── Section ──────────────────────────────────────── */
export default function PlatformsSection() {
  const [activeId, setActiveId] = useState('HTML');
  const active = tabs.find((t) => t.id === activeId)!;

  return (
    <section className="relative py-24 overflow-hidden">
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
          className="absolute bottom-0 left-1/4 w-[600px] h-[400px] bg-accent-quiet blur-[100px]"
          style={{ animation: 'blob 14s ease-in-out 2s infinite' }}
        />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
      </div>

      <div className="relative z-10 max-w-landing mx-auto px-4">
        {/* Heading */}
        <div
          className="max-w-xl mb-12"
          style={{ animation: 'fade-up 0.6s ease-out both' }}
        >
          <p className="text-xs uppercase tracking-widest text-accent-ink/80 font-medium mb-3">
            Integratsiyalar
          </p>
          <h2 className="text-4xl font-bold tracking-tight leading-[1.1] mb-4">
            <span className="text-ink">Qaysi platforma,</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-hover">
              istalgan framework.
            </span>
          </h2>
          <p className="text-sm text-ink-3 leading-relaxed">
            8 ta platforma bilan ishlaydi. Saytingizni istalgan texnologiyada
            ulashingiz mumkin — faqat bir necha qator kod.
          </p>
        </div>

        {/* Platform grid */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4"
          style={{ animation: 'fade-up 0.6s ease-out 0.1s both' }}
        >
          {platforms.map((p) => (
            <div
              key={p.name}
              className="group flex items-center gap-2.5 p-3 rounded-panel border border-line bg-surface hover:border-line-strong hover:bg-surface-hover transition-all duration-200"
            >
              <p.Icon className="w-5 h-5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink">{p.name}</p>
                <p className="text-[10px] text-ink-3 truncate">{p.desc}</p>
              </div>
              <Check className="w-3.5 h-3.5 text-positive-ink shrink-0 ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>

        {/* Coming soon */}
        <div
          className="flex items-center gap-2 flex-wrap mb-14"
          style={{ animation: 'fade-up 0.6s ease-out 0.15s both' }}
        >
          <span className="text-xs text-ink-3">Tez kunda:</span>
          {coming.map((p) => (
            <span
              key={p}
              className="text-[11px] text-ink-3 px-2 py-0.5 rounded-control border border-line"
            >
              {p}
            </span>
          ))}
        </div>

        {/* ── Kod bloki + afzalliklar ──────────────────
            Referensdagi tuzilma: chapda oq kod kartasi (fayl nomi chapda,
            framework tablari va COPY o'ngda), o'ngda esa nuqtali chiziq
            bilan ulangan uchta afzallik. Ilgari tablar vertikal ustunda
            edi va kod paneli qattiq `#0c0c10` bilan qorong'i qolgandi. */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.7fr_1fr] lg:items-center">
          {/* Kod kartasi */}
          <div className="overflow-hidden rounded-panel border border-line-subtle bg-surface shadow-pop">
            <div className="flex flex-wrap items-center gap-3 border-b border-line-subtle px-4 py-3">
              <span className="font-mono text-caption text-ink-3">
                {active.file}
              </span>

              <div className="ml-auto flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {tabs.map((tab) => {
                  const isActive = activeId === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveId(tab.id)}
                      className={`shrink-0 rounded-control px-2.5 py-1.5 text-eyebrow font-semibold uppercase tracking-wider transition-colors ${
                        isActive
                          ? 'bg-accent-quiet text-accent-ink'
                          : 'text-ink-3 hover:bg-surface-hover hover:text-ink-2'
                      }`}
                    >
                      {tab.id}
                    </button>
                  );
                })}
              </div>

              <CopyButton raw={active.raw} />
            </div>

            <div className="overflow-x-auto p-5">
              <active.Code />
            </div>

            <div className="border-t border-line-subtle px-5 py-3.5">
              <div className="inline-flex flex-wrap items-center gap-2 rounded-control border border-line bg-surface-sunken px-3 py-1.5">
                <span className="font-mono text-eyebrow text-ink-3">
                  data-site:
                </span>
                <span className="font-mono text-caption font-bold text-accent-ink">
                  mk_live_abc123
                </span>
                <span className="text-eyebrow text-ink-3">
                  ← o&apos;zingizniki bilan almashtiring
                </span>
              </div>
            </div>
          </div>

          {/* Afzalliklar — nuqtali chiziq bilan bog'langan */}
          <div className="relative flex flex-col gap-8">
            {/* Vertikal nuqtali ulagich. `left-[22px]` — nishonning yarmi
                (h-11/w-11 = 44px), shuning uchun chiziq aynan ularning
                markazidan o'tadi va nishonlar uni `z-10` bilan yopadi. */}
            <span
              aria-hidden="true"
              className="absolute left-[22px] top-6 bottom-6 hidden w-px lg:block"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(to bottom, var(--mx-accent-line) 0 5px, transparent 5px 11px)',
              }}
            />
            {perks.map(({ Icon, title, body }) => (
              <div key={title} className="relative flex items-start gap-4">
                <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-subtle bg-surface shadow-card">
                  <Icon className="h-5 w-5 text-accent-ink" />
                </div>
                <div className="min-w-0 pt-1.5">
                  <h4 className="text-heading text-ink">{title}</h4>
                  <p className="mt-1 text-small leading-relaxed text-ink-2">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
