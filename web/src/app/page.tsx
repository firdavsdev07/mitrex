import Navbar from '@/components/landing/navbar';
import Hero from '@/components/landing/hero';
import ProblemSection from '@/components/landing/problem-section';
// «Yechim» va «Imkoniyatlar» bitta bo'limga birlashtirildi — ular bir xil
// va'dani ikki marta aytardi (dashboard, AI, alertlar, jamoa ikkalasida ham).
import ProductSection from '@/components/landing/product-section';
import PlatformsSection from '@/components/landing/platforms-section';
import PricingSection from '@/components/landing/pricing-section';
import FaqSection from '@/components/landing/faq-section';
import CtaSection from '@/components/landing/cta-section';
import Footer from '@/components/landing/footer';

export default function LandingPage() {
  return (
    // Landing ham mahsulot bilan bir xil — yorug'. «Landing va'dasi ≈
    // mahsulot tajribasi»: foydalanuvchi ro'yxatdan o'tib kirganda
    // boshqa dunyoga tushmasligi kerak.
    //
    // Bo'limlarning o'z foni yo'q, ular `body` ga tayanadi — shuning uchun
    // `bg-canvas` shu yerda aniq beriladi.
    <div className="bg-canvas text-ink">
      <Navbar />
      <main>
        <Hero />
        <ProblemSection />
        <ProductSection />
        <PlatformsSection />
        <PricingSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
