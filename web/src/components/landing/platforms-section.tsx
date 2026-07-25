'use client';

import { useState } from 'react';
import { Check, Copy, CheckCheck } from 'lucide-react';
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
const kw = (s: string) => <span className="text-purple-400">{s}</span>; // keyword
const str = (s: string) => <span className="text-green-400">{s}</span>; // string
const atr = (s: string) => <span className="text-yellow-300/90">{s}</span>; // attribute
const val = (s: string) => <span className="text-orange-400">{s}</span>; // value/variable
const tag = (s: string) => <span className="text-blue-400">{s}</span>; // tag/type name
const fn = (s: string) => <span className="text-sky-400">{s}</span>; // function
const pun = (s: string) => <span className="text-zinc-500">{s}</span>; // punctuation/dim
const cmt = (s: string) => <span className="text-zinc-600 italic">{s}</span>; // comment
const txt = (s: string) => <span className="text-zinc-300">{s}</span>; // normal text

/* ── Line component ──────────────────────────────── */
function L({ n, children }: { n: number; children?: React.ReactNode }) {
  return (
    <div className="flex items-start min-h-[22px]">
      <span className="w-8 shrink-0 text-right pr-4 text-zinc-700 text-[11px] leading-[22px] select-none tabular-nums">
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
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-700 hover:border-zinc-600 text-zinc-500 hover:text-zinc-300 transition-all text-[11px]"
    >
      {copied ? (
        <>
          <CheckCheck className="w-3 h-3 text-green-400" />
          <span className="text-green-400">Copied!</span>
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
          className="absolute bottom-0 left-1/4 w-[600px] h-[400px] bg-orange-500/6 blur-[100px]"
          style={{ animation: 'blob 14s ease-in-out 2s infinite' }}
        />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4">
        {/* Heading */}
        <div
          className="max-w-xl mb-12"
          style={{ animation: 'fade-up 0.6s ease-out both' }}
        >
          <p className="text-xs uppercase tracking-widest text-orange-500/80 font-medium mb-3">
            Integratsiyalar
          </p>
          <h2 className="text-4xl font-bold tracking-tight leading-[1.1] mb-4">
            <span className="text-zinc-100">Qaysi platforma,</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">
              istalgan framework.
            </span>
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
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
              className="group flex items-center gap-2.5 p-3 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all duration-200"
            >
              <p.Icon className="w-5 h-5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-200">{p.name}</p>
                <p className="text-[10px] text-zinc-600 truncate">{p.desc}</p>
              </div>
              <Check className="w-3.5 h-3.5 text-green-500 shrink-0 ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>

        {/* Coming soon */}
        <div
          className="flex items-center gap-2 flex-wrap mb-14"
          style={{ animation: 'fade-up 0.6s ease-out 0.15s both' }}
        >
          <span className="text-xs text-zinc-600">Tez kunda:</span>
          {coming.map((p) => (
            <span
              key={p}
              className="text-[11px] text-zinc-700 px-2 py-0.5 rounded-md border border-zinc-800"
            >
              {p}
            </span>
          ))}
        </div>

        {/* ── Code integration block ──────────────────── */}
        <div
          className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden"
          style={{ animation: 'fade-up 0.6s ease-out 0.2s both' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <div>
              <p className="text-sm font-semibold text-zinc-100">
                Saytingizni ulang
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Framework tanlang — kod avtomatik o&apos;zgaradi
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border border-orange-500/20 bg-orange-500/8 text-orange-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
              2 daqiqada tayyor
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr]">
            {/* ── Tab list (vertical) ─────────────────── */}
            <div className="border-b md:border-b-0 md:border-r border-zinc-800 p-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible bg-zinc-900/50">
              {tabs.map((tab) => {
                const isActive = activeId === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveId(tab.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150 shrink-0 md:shrink group w-full ${
                      isActive
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                        isActive
                          ? 'bg-orange-500'
                          : 'bg-zinc-700 group-hover:bg-zinc-500'
                      }`}
                    />
                    <div>
                      <p className="text-[13px] font-semibold leading-none">
                        {tab.id}
                      </p>
                      <p
                        className={`text-[10px] font-mono mt-1 transition-colors ${
                          isActive ? 'text-zinc-500' : 'text-zinc-700'
                        }`}
                      >
                        {tab.file}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── Code panel ──────────────────────────── */}
            <div className="bg-[#0c0c10] flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-900/30 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  </div>
                  <span className="text-[11px] text-zinc-600 font-mono">
                    {active.file}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-600 font-mono border border-zinc-700/50">
                    {active.lang}
                  </span>
                  <CopyButton raw={active.raw} />
                </div>
              </div>

              {/* Code content */}
              <div className="p-5 overflow-x-auto flex-1">
                <active.Code />
              </div>

              {/* Site key hint */}
              <div className="px-5 pb-4 border-t border-zinc-800/40 pt-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60">
                  <span className="text-[10px] text-zinc-600 font-mono">
                    data-site:
                  </span>
                  <span className="text-[11px] font-mono font-bold text-orange-400">
                    mk_live_abc123
                  </span>
                  <span className="text-[10px] text-zinc-700">
                    ← o&apos;zingizniki bilan almashtiring
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
