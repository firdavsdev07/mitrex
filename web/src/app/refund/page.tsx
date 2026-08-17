import type { Metadata } from 'next';
import { LegalLayout, LegalSection } from '@/components/legal/legal-layout';

export const metadata: Metadata = {
  title: "Qaytarish siyosati — Metrix",
  description:
    "Metrix obunalari uchun pulni qaytarish (refund) va bekor qilish siyosati.",
};

export default function RefundPage() {
  return (
    <LegalLayout title="Qaytarish siyosati" updated="2026-08-18">
      <p>
        Ushbu Qaytarish siyosati Metrix (&quot;biz&quot;) pullik tarif
        rejalari uchun to&apos;lovlarni qaytarish shartlarini belgilaydi.
        Ushbu siyosat{' '}
        <a href="/terms" className="text-accent-ink hover:underline">
          Foydalanish shartlari
        </a>
        ning bir qismi hisoblanadi.
      </p>

      <LegalSection title="1. 14 kunlik pulni qaytarish kafolati">
        <p>
          Har qanday pullik tarif rejasiga birinchi marta obuna
          bo&apos;lganingizdan so&apos;ng 14 kalendar kuni ichida, sababini
          ko&apos;rsatmasdan, to&apos;liq pulni qaytarishni so&apos;rashingiz
          mumkin. So&apos;rov tasdiqlangach, to&apos;lov to&apos;liq hajmda
          asl to&apos;lov usulingizga qaytariladi.
        </p>
      </LegalSection>

      <LegalSection title="2. 14 kundan keyingi holatlar">
        <p>
          14 kunlik muddat o&apos;tgandan so&apos;ng amalga oshirilgan
          to&apos;lovlar, umumiy holda, qaytarilmaydi — bu joriy hisob-kitob
          davri uchun taqdim etilgan xizmatga tegishli. Bundan mustasno:
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>
            Xizmatda uzoq muddatli texnik nosozlik bo&apos;lib, biz uni
            oqilona muddatda bartaraf eta olmasak;
          </li>
          <li>
            Sizdan bilmagan holda yoki ruxsatsiz (masalan, hisobingiz
            buzilgandan keyin) to&apos;lov amalga oshirilgan bo&apos;lsa;
          </li>
          <li>
            Xuddi shu davr uchun ikki marta to&apos;lov yechilgan
            (dublikat tranzaksiya) bo&apos;lsa;
          </li>
          <li>Amaldagi qonunchilik boshqacha talab qilsa.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Obunani bekor qilish">
        <p>
          Obunani Sozlamalar bo&apos;limidan yoki{' '}
          <a
            href="mailto:hello@metrix.io"
            className="text-accent-ink hover:underline"
          >
            hello@metrix.io
          </a>{' '}
          orqali istalgan vaqtda bekor qilishingiz mumkin. Bekor qilingan
          obuna avtomatik yangilanmaydi, lekin joriy to&apos;langan davr
          oxirigacha kuchda qoladi — ya&apos;ni davr tugamasdan oldingi
          kunlar uchun mutanosib (pro-rata) qaytarish amalga oshirilmaydi,
          14-bandda ko&apos;rsatilgan holatlar bundan mustasno.
        </p>
      </LegalSection>

      <LegalSection title="4. Qaytarish qanday so'raladi">
        <p>
          Qaytarish so&apos;rovini{' '}
          <a
            href="mailto:hello@metrix.io"
            className="text-accent-ink hover:underline"
          >
            hello@metrix.io
          </a>{' '}
          manziliga hisobingiz emaili va to&apos;lov sanasini
          ko&apos;rsatgan holda yuboring. So&apos;rovlarni odatda 5 ish kuni
          ichida ko&apos;rib chiqamiz va natija haqida email orqali xabar
          beramiz.
        </p>
      </LegalSection>

      <LegalSection title="5. Qaytarish muddati">
        <p>
          Tasdiqlangan qaytarishlar to&apos;lov provayderi orqali qayta
          ishlanadi va odatda 5–10 ish kuni ichida asl to&apos;lov
          usulingizda (bank kartasi va h.k.) ko&apos;rinadi — aniq muddat
          bankingizga bog&apos;liq.
        </p>
      </LegalSection>

      <LegalSection title="6. Bepul (Free) reja">
        <p>
          Bepul reja uchun to&apos;lov talab qilinmaydi, shuning uchun ushbu
          siyosat faqat pullik tarif rejalariga tegishli.
        </p>
      </LegalSection>

      <LegalSection title="7. Bog'lanish">
        <p>
          Qaytarish yoki to&apos;lovlar yuzasidan savollaringiz bo&apos;lsa,{' '}
          <a
            href="mailto:hello@metrix.io"
            className="text-accent-ink hover:underline"
          >
            hello@metrix.io
          </a>{' '}
          orqali murojaat qiling.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
