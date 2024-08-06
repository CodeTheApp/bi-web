import Image from 'next/image';
import BackgroudImg from '../../assets/bg.png';
import lumi1 from '../../assets/lumi1.png';
import lumi2 from '../../assets/lumi2.png';

export default function Store() {
  return (
    <div
      id='loja'
      className='relative flex items-center justify-center bg-brand-white overflow-hidden bg-no-repeat bg-cover h-96 p-8'
      style={{
        backgroundImage: `url(${BackgroudImg.src})`,
      }}
    >
      <div className='absolute -left-52 top-10 transform overflow-hidden'>
        <Image src={lumi1} alt='luminária de chão' width={800} />
      </div>
      <div className='absolute left-64 top-[-60px] overflow-hidden'>
        <Image src={lumi2} alt='luminária de parede' width={300} />
      </div>

      <div className='text flex flex-col items-center gap-7 text-center'>
        <h1 className='text-4xl font-bold text-brand-dark max-w-[36rem]'>
          Descubra como a iluminação pode mudar o seu espaço
        </h1>
        <a
          className='bg-brand-orange text-brand-white px-6 py-2 rounded-full hover:bg-brand-orange-600'
          href='https://shop.brasiliailuminacao.com.br/'
          target='_blank'
        >
          Visite nossa loja
        </a>
      </div>
    </div>
  );
}
