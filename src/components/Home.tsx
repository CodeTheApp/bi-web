import banner from '../../assets/projeto2.jpg';

export default function HomeSection() {
  return (
    <section
      id='home'
      className='relative z-10 w-full h-screen bg-fixed bg-cover bg-center'
      style={{ backgroundImage: `url(${banner.src})` }}
    >
      <div
        id='opacity'
        className='absolute inset-0 bg-black bg-opacity-60 flex items-center'
      >
        <div className='flex justify-start items-center w-full px-5 text-gray-50'>
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
              className='bg-orange text-gray-50 px-6 py-2 rounded-full hover:bg-orange-600 transition duration-300'
            >
              Entre em contato
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
