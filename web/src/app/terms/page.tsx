import type { Metadata } from 'next';
import { LegalLayout, LegalSection } from '@/components/legal/legal-layout';

export const metadata: Metadata = {
  title: 'Foydalanish shartlari — Metrix',
  description: 'Metrix xizmatidan foydalanish shartlari va qoidalari.',
};

export default function TermsPage() {
  return (
    <LegalLayout title="Foydalanish shartlari" updated="2026-07-14">
      <p>
        Ushbu Foydalanish shartlari (&quot;Shartlar&quot;) Metrix analitika
        xizmati (&quot;Xizmat&quot;, &quot;biz&quot;) dan foydalanishingizni
        tartibga soladi. Hisob yaratish yoki Xizmatdan foydalanish orqali siz
        ushbu Shartlarga rozilik bildirasiz.
      </p>

      <LegalSection title="1. Xizmat tavsifi">
        <p>
          Metrix — veb-sayt tashrifchilari statistikasi va ijtimoiy tarmoq
          (YouTube, Telegram, Discord, Instagram, Bluesky, Reddit va boshqalar)
          ko&apos;rsatkichlarini bitta boshqaruv panelida birlashtiruvchi
          analitika xizmati. Xizmat sizga o&apos;z saytingizga kuzatuv skriptini
          o&apos;rnatish, ijtimoiy tarmoq hisoblaringizni ulash va
          yig&apos;ilgan ma&apos;lumotlar asosida hisobotlar (jumladan AI
          yordamida tayyorlangan tahlillar) olish imkonini beradi.
        </p>
      </LegalSection>

      <LegalSection title="2. Hisob yaratish">
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>
            Hisob yaratish uchun haqiqiy email manzil taqdim etishingiz kerak.
          </li>
          <li>Parolingiz va hisobingiz xavfsizligi uchun siz javobgarsiz.</li>
          <li>
            Xavfsizlikni oshirish uchun ixtiyoriy ikki bosqichli
            autentifikatsiya (2FA) mavjud — uni yoqishni tavsiya qilamiz.
          </li>
          <li>
            13 yoshdan kichik shaxslar Xizmatdan foydalanishi mumkin emas.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Obuna va to'lovlar">
        <p>
          Metrix bepul (Free) va pullik tarif rejalarini taklif qiladi. Pullik
          rejaga o&apos;tganingizda, tanlangan davr uchun to&apos;lov amalga
          oshiriladi. Obunani istalgan vaqtda bekor qilishingiz mumkin — bekor
          qilingan obuna joriy to&apos;langan davr oxirigacha kuchda qoladi.
          To&apos;lovlar, agar qonun talab qilmasa, qaytarilmaydi.
        </p>
      </LegalSection>

      <LegalSection title="4. Ruxsat etilgan foydalanish">
        <p>Xizmatdan foydalanganda quyidagilarga yo&apos;l qo&apos;yilmaydi:</p>
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>
            Boshqa foydalanuvchilarning ma&apos;lumotlariga ruxsatsiz kirishga
            urinish;
          </li>
          <li>
            Xizmat infratuzilmasiga ortiqcha yuk tushiradigan
            avtomatlashtirilgan so&apos;rovlar yuborish;
          </li>
          <li>
            Kuzatuv skriptidan (track.js) qonuniy tashrifchi statistikasidan
            tashqari maqsadlarda foydalanish;
          </li>
          <li>API kalitlaringizni uchinchi shaxslarga ruxsatsiz uzatish;</li>
          <li>
            Xizmatni noqonuniy, firibgarlik yoki zararli faoliyat uchun
            ishlatish.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Uchinchi tomon integratsiyalari">
        <p>
          Ijtimoiy tarmoq hisobingizni (YouTube, Instagram, Discord va h.k.)
          OAuth orqali ulaganingizda, siz shu platformaning o&apos;z foydalanish
          shartlariga ham bo&apos;ysunasiz. Metrix faqat sizning ushbu
          platformalardagi ochiq statistikangizni o&apos;qish uchun ruxsat
          so&apos;raydi.
        </p>
      </LegalSection>

      <LegalSection title="6. Ma'lumotlar egaligi">
        <p>
          Siz ulagan saytlar va hisoblar orqali yig&apos;ilgan barcha statistika
          ma&apos;lumotlariga egalik huquqi sizda qoladi. Batafsil ma&apos;lumot
          uchun{' '}
          <a href="/privacy" className="text-accent-ink hover:underline">
            Maxfiylik siyosati
          </a>
          ga qarang.
        </p>
      </LegalSection>

      <LegalSection title="7. Kafolatlarning yo'qligi">
        <p>
          Xizmat &quot;bor holicha&quot; (as is) taqdim etiladi. Biz uzluksiz,
          xatosiz ishlashni yoki barcha ijtimoiy tarmoq statistikasining 100%
          aniqligini kafolatlamaymiz — ba&apos;zi ko&apos;rsatkichlar uchinchi
          tomon platformalarining ochiq API cheklovlariga bog&apos;liq.
        </p>
      </LegalSection>

      <LegalSection title="8. Javobgarlikni cheklash">
        <p>
          Qonun ruxsat bergan darajada, Metrix Xizmatdan foydalanish natijasida
          yuzaga kelgan bilvosita, tasodifiy yoki oqibatdagi zararlar uchun
          javobgar emas.
        </p>
      </LegalSection>

      <LegalSection title="9. Hisobni to'xtatish">
        <p>
          Hisobingizni istalgan vaqtda Sozlamalar bo&apos;limidan
          o&apos;chirishingiz mumkin — ma&apos;lumotlaringiz 6 oy davomida
          tiklash uchun saqlanadi, so&apos;ngra butunlay o&apos;chiriladi. Biz
          ham ushbu Shartlarni buzgan hisoblarni to&apos;xtatib qo&apos;yish
          huquqini saqlab qolamiz.
        </p>
      </LegalSection>

      <LegalSection title="10. Shartlarga o'zgartirish">
        <p>
          Ushbu Shartlarni vaqti-vaqti bilan yangilashimiz mumkin. Muhim
          o&apos;zgarishlar haqida sizga email orqali yoki dashboard ichida
          xabar beramiz.
        </p>
      </LegalSection>

      <LegalSection title="11. Bog'lanish">
        <p>
          Savollaringiz bo&apos;lsa,{' '}
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
