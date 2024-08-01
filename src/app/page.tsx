import About from '@/components/About';
import Header from '../components/Header';
import HomeSection from '../components/Home';

export default function Home() {
  return (
    <body className='bg-bodyColor scroll-smooth'>
      <Header />
      <HomeSection />
      <About />
    </body>
  );
}
