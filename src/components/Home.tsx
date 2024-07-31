import Image from 'next/image';
import banner from '../../assets/projeto2.jpg';

export default function HomeSection() {
  return (
    <section className='relative w-full h-screen'>
      <Image
        src={banner}
        alt='Projeto da loja Brasília Iluminação'
        layout='fill'
        objectFit='cover'
        quality={100}
      />
      <div
        id='opacity'
        className='absolute inset-0 bg-black bg-opacity-50 flex items-center'
      >
        <div className='flex justify-start items-center w-full px-5 text-white'>
          <div
            id='content'
            className='text-center md:text-left p-5 max-w-custom-600 ml-96'
          >
            <h1 className='text-4xl md:text-5xl lg:text-7xl font-bold mb-4'>
              Uma experiência única em atendimento
            </h1>
            <p className='text-base md:text-lg mb-6'>
              Empresa exclusiva em Brasília, especializada em projetos,
              especificação e revenda de produtos de iluminação.
            </p>
            <a
              href='#contact'
              className='bg-orange text-white px-6 py-2 rounded-md hover:bg-orange-600 transition duration-300'
            >
              Entre em contato
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
