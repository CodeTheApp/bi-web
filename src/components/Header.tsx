import Image from 'next/image';
import logo from '../../assets/logo.png';

export default function Header() {
  return (
    <header
      id='header'
      className='mb-8 flex items-center  p-3 fixed top-0 left-0 z-[100] w-full transition-all duration-300 ease-in-out'
    >
      <div className='container flex items-center px-7 py-2 justify-between border border-white rounded-xl bg-white bg-opacity-30'>
        <a className='title' href='#home'>
          <Image
            className='logo'
            src={logo}
            alt='logo da loja Brasilia Iluminação'
            width={150}
          />
        </a>

        <div className='menu flex items-center space-x-6 text-white'>
          <a className='title cursor-pointer' href='#home'>
            Início
          </a>
          <a className='title cursor-pointer' href='#about'>
            Quem somos
          </a>
          <a className='title cursor-pointer' href='#services'>
            Serviços
          </a>
          <a className='title cursor-pointer' href='#testimonials'>
            Depoimentos
          </a>
          <a className='title cursor-pointer' href='#gallery'>
            Projetos
          </a>
          <a className='title cursor-pointer' href='#contact'>
            Contato
          </a>
          <a
            className='title-loja cursor-pointer text-orange '
            href='https://shop.brasiliailuminacao.com.br/'
          >
            Nossa Loja
          </a>
        </div>
      </div>
    </header>
  );
}