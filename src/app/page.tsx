import About from '@/components/About';
import Services from '@/components/Services';
import Store from '@/components/Store';
import Testimonials from '@/components/Testimonials';
import { Separator } from '@/components/ui/separator';
import Header from '../components/Header';
import HomeSection from '../components/Home';

export default function Home() {
  return (
    <body className='bg-bodyColor scroll-smooth'>
      <Header />
      <HomeSection />
      <About />
      <Separator />
      <Services />
      <Separator />
      <Store />
      <Separator />
      <Testimonials />
    </body>
  );
}
