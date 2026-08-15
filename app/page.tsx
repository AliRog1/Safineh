import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import WhySafineh from '@/components/WhySafineh';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <WhySafineh />
      </main>
      <Footer />
    </>
  );
}
