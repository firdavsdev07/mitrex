import type { Metadata } from 'next';
import { LegalLayout, LegalSection } from '@/components/legal/legal-layout';

export const metadata: Metadata = {
  title: 'Maxfiylik siyosati — Metrix',
  description:
    "Metrix qanday ma'lumot yig'ishi, ishlatishi va himoya qilishi haqida.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Maxfiylik siyosati" updated="2026-07-14">
      <p>
        Ushbu Maxfiylik siyosati Metrix (&quot;biz&quot;) sizning shaxsiy
        ma&apos;lumotlaringizni qanday yig&apos;ishi, ishlatishi va himoya
        qilishini tushuntiradi. Xizmatdan foydalanish orqali siz quyidagi
        amaliyotlarga rozilik bildirasiz.
      </p>

      <LegalSection title="1. Qanday ma'lumot yig'amiz">
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>
            <span className="text-ink-2">Hisob ma&apos;lumotlari</span> —
            email, ism, parol (bcrypt bilan xeshlangan holda saqlanadi), yoki
            OAuth provayderdan (Google, GitHub, Discord, Facebook, Apple) kelgan
            profil ma&apos;lumotlari.
          </li>
          <li>
            <span className="text-ink-2">Sayt analitikasi</span> — sahifa
            ko&apos;rishlar, sessiya davomiyligi, qurilma/brauzer turi, taxminiy
            davlat (IP orqali, IP manzilning o&apos;zi taxminiy geolokatsiyadan
            keyin uzoq muddat saqlanmaydi), referrer va UTM parametrlari —
            bularning barchasi siz o&apos;rnatgan track.js skripti orqali
            yig&apos;iladi.
          </li>
          <li>
            <span className="text-ink-2">Ijtimoiy tarmoq statistikasi</span>{' '}
            — OAuth orqali ulagan hisoblaringizning ochiq ko&apos;rsatkichlari
            (obunachilar, ko&apos;rishlar, layklar va h.k.).
          </li>
          <li>
            <span className="text-ink-2">Texnik ma&apos;lumotlar</span> —
            kirish tarixi (IP, brauzer, vaqt), xavfsizlik auditi maqsadida.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Ma'lumotlardan qanday foydalanamiz">
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>
            Sizga analitika boshqaruv panelini va hisobotlarni taqdim etish
            uchun;
          </li>
          <li>
            Haftalik AI-tahlil (agar yoqilgan bo&apos;lsa) tayyorlash uchun;
          </li>
          <li>
            Hisobingiz xavfsizligini ta&apos;minlash (login audit, shubhali
            faoliyatni aniqlash) uchun;
          </li>
          <li>
            Xizmatni yaxshilash va texnik muammolarni bartaraf etish uchun.
          </li>
        </ul>
        <p>
          Ma&apos;lumotlaringizni hech qachon reklama maqsadida sotmaymiz yoki
          uchinchi shaxslarga ijaraga bermaymiz.
        </p>
      </LegalSection>

      <LegalSection title="3. Cookie va localStorage">
        <p>
          Kuzatuv skripti (track.js) tashrifchi brauzerida localStorage&apos;da
          anonim sessiya identifikatorini saqlaydi (30 daqiqa harakatsizlikdan
          keyin yangilanadi) — bu identifikator shaxsni aniqlamaydi. Boshqaruv
          panelida esa sessiyangizni saqlash uchun faqat JavaScript o&apos;qiy
          olmaydigan (httpOnly) cookie ishlatiladi.
        </p>
      </LegalSection>

      <LegalSection title="4. Ma'lumotlarni saqlash va xavfsizlik">
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>Parollar bcrypt bilan bir tomonlama xeshlanadi;</li>
          <li>
            Ijtimoiy tarmoq OAuth tokenlari AES-256-GCM bilan shifrlangan holda
            saqlanadi;
          </li>
          <li>
            API kalitlar xom holda saqlanmaydi — faqat ularning kriptografik
            xeshi;
          </li>
          <li>
            Sayt analitikasi ma&apos;lumotlari tarif rejangizga bog&apos;liq
            muddat davomida saqlanadi, so&apos;ngra avtomatik o&apos;chiriladi;
          </li>
          <li>
            Hisobni o&apos;chirishda ma&apos;lumotlar 6 oy davomida tiklash
            uchun saqlanadi, so&apos;ngra butunlay va qaytarib bo&apos;lmas
            tarzda o&apos;chiriladi.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Uchinchi tomonlar bilan almashish">
        <p>
          Ma&apos;lumotlaringizni faqat quyidagi hollarda uchinchi tomonlarga
          uzatamiz: (a) siz OAuth orqali ulagan platformaning API&apos;siga
          statistika so&apos;rash uchun so&apos;rov yuborilganda, (b) email
          yuborish xizmati (Resend) orqali sizga xabarnoma yuborilganda, yoki
          (c) qonuniy talab bo&apos;lganda.
        </p>
      </LegalSection>

      <LegalSection title="6. Sizning huquqlaringiz">
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>
            Barcha ma&apos;lumotlaringizni JSON formatida eksport qilish
            (Sozlamalar bo&apos;limidan);
          </li>
          <li>
            Hisobingizni va unga tegishli barcha ma&apos;lumotlarni
            o&apos;chirish;
          </li>
          <li>Ijtimoiy tarmoq ulanishlarini istalgan vaqtda uzish;</li>
          <li>
            Haftalik AI-hisobotdan bosh tortish (Sozlamalar → Xavfsizlik).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Bolalar maxfiyligi">
        <p>
          Xizmat 13 yoshdan kichik shaxslar uchun mo&apos;ljallanmagan va biz
          ongli ravishda ulardan ma&apos;lumot yig&apos;maymiz.
        </p>
      </LegalSection>

      <LegalSection title="8. Ushbu siyosatga o'zgartirishlar">
        <p>
          Ushbu Maxfiylik siyosatini vaqti-vaqti bilan yangilashimiz mumkin.
          Muhim o&apos;zgarishlar haqida email orqali xabar beramiz.
        </p>
      </LegalSection>

      <LegalSection title="9. Bog'lanish">
        <p>
          Ma&apos;lumotlaringiz yuzasidan savol yoki so&apos;rovlaringiz
          bo&apos;lsa,{' '}
          <a
            href="mailto:privacy@metrix.io"
            className="text-accent-ink hover:underline"
          >
            privacy@metrix.io
          </a>{' '}
          manziliga yozing.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
