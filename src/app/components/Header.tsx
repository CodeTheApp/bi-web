import Image from 'next/image';
import logo from '../../../assets/logo.png';

export default function Header() {
  return (
    <header
      id='header'
      className='border-b border-[#e4e4e4] mb-8 flex items-center p-4 fixed top-0 left-0 z-[100] bg-[var(--body-color)] w-full transition-all duration-300 ease-in-out'
    >
      <nav className='container mx-auto flex items-center justify-between'>
        <a className='title' href='#home'>
          <Image
            className='logo'
            src={logo}
            alt='logo da loja Brasilia Iluminação'
            width={190}
          />
        </a>

        <div className='menu flex items-center space-x-6'>
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
            className='title-loja cursor-pointer'
            href='https://shop.brasiliailuminacao.com.br/'
          >
            Nossa Loja
          </a>
        </div>
      </nav>
    </header>
  );
}
