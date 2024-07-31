import Header from './components/Header';
import HomeSection from './components/Home';

export default function Home() {
  return (
    <>
      <Header />
      <div className='content'>
        <HomeSection />
      </div>
    </>
  );
}
