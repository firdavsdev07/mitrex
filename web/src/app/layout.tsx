import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

// Geist — yaxshi, lekin neytral grotesk: u hech qanday xarakter bermaydi.
// Referensdagi interfeys dumaloqroq, geometrikroq va sarlavhalarda qalinroq
// shriftga tayanadi — aynan shu unga «do'stona mahsulot» tuyg'usini beradi.
// Plus Jakarta Sans shu xarakterga ega va UI metrikalari ham to'g'ri
// (tabular raqamlar, tor interfeys balandligi).
const jakarta = Plus_Jakarta_Sans({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Metrix — Barcha analitikangiz bitta joyda',
  description:
    "YouTube, Telegram, Instagram va saytingiz — hammasi bitta minimalist dashboardda. Ertalab 1 daqiqada hamma narsa ko'z oldingizda.",
  keywords: ['analytics', 'dashboard', 'youtube', 'telegram', 'instagram'],
  openGraph: {
    title: 'Metrix — Barcha analitikangiz bitta joyda',
    description:
      'Unified analytics dashboard for solopreneurs and indie hackers.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // `data-theme="light"` — mahsulot standart holatda YORUG'. Ilgari bu
    // yerda `dark` turardi, lekin sahifalar baribir qorong'i ranglarni
    // qo'lda yozgani uchun token qatlami hech qachon ishlamagan.
    // Endi ranglar faqat tokenlardan keladi, shuning uchun almashtirgich
    // qo'shilganda shu atributni o'zgartirish kifoya.
    <html
      lang="uz"
      data-theme="light"
      className={jakarta.variable}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
