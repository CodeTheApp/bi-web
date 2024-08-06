import Image from 'next/image';
import logo from '../../assets/logo.png';

export default function Header() {
  return (
    <header
      id='header'
      className='flex items-center py-3 px-16 fixed top-0 left-0 z-[100] w-full mb-8'
    >
      <div
        className='container flex items-center px-24 py-2 justify-between border border-brand-gray-50 shadow-header rounded-full bg-brand-white
       bg-opacity-80'
      >
        <a className='title' href='#home'>
          <Image
            className='logo'
            src={logo}
            alt='logo da loja Brasilia Iluminação'
            width={140}
          />
        </a>

        <div className='menu flex items-center space-x-6 text-brand-dark'>
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
            className='title-loja cursor-pointer text-brand-orange'
            href='https://shop.brasiliailuminacao.com.br/'
          >
            Nossa Loja
          </a>
        </div>
      </div>
    </header>
  );
}
