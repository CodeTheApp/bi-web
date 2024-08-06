import Image from 'next/image';
import logo from '../../assets/logo.png';

export default function Footer() {
  return (
    <footer className='bg-brand-primary py-9 px-36'>
      <div className='container mx-auto flex flex-col md:flex-row items-center justify-between'>
        <div className='flex flex-col items-center md:items-start text-center md:text-left'>
          <Image
            className='w-52 h-auto mb-4'
            src={logo}
            alt='logo da loja Brasilia Iluminação'
          />
          <p className='text-brand-gray-500 text-xs'>
            ©2023 Brasília Iluminação.
          </p>
          <p className='text-brand-gray-500 text-xs'>
            Todos os direitos reservados.
          </p>
        </div>

        <div className='flex gap-4 mt-6 md:mt-0'>
          <a
            href='https://www.instagram.com/brasilia_iluminacao/'
            target='_blank'
            rel='noopener noreferrer'
            className='transition-transform transform hover:translate-y-[-8px]'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='36'
              height='36'
              fill='currentColor'
              viewBox='0 0 256 256'
            >
              <rect width='256' height='256' fill='none'></rect>
              <circle
                cx='128'
                cy='128'
                r='40'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='12'
              ></circle>
              <rect
                x='36'
                y='36'
                width='184'
                height='184'
                rx='48'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='12'
              ></rect>
              <circle cx='180' cy='76' r='10'></circle>
            </svg>
          </a>
          <a
            href='https://br.pinterest.com/brasiliailuminacao/'
            target='_blank'
            rel='noopener noreferrer'
            className='transition-transform transform hover:translate-y-[-8px]'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='36'
              height='36'
              fill='currentColor'
              viewBox='0 0 256 256'
            >
              <rect width='256' height='256' fill='none'></rect>
              <line
                x1='120'
                y1='88'
                x2='88'
                y2='224'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='12'
              ></line>
              <path
                d='M61.5,156.6A80,80,0,1,1,208,112c0,44.2-32,72-64,72s-41.6-21.1-41.6-21.1'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='12'
              ></path>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
