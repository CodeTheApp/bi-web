import Image from 'next/image';
import Camila from '../../assets/camila.jpg';

export default function About() {
  return (
    <section
      id='about'
      className='section min-h-[92vh] py-28 flex items-center bg-white'
    >
      <div className='container w-auto flex flex-col md:flex-row items-center'>
        <div className='relative mb-8 md:mb-0 md:mr-8'>
          <div className='absolute shadow-shape top-[-8.3%] left-[-33%] w-full h-full bg-brand-primary z-0 rounded-lg md:rounded-xl' />
          <Image
            src={Camila}
            alt='foto da proprietária em pé em fundo bege e roupa preta, sorrindo e de braços cruzados'
            width={380}
            className='relative rounded-lg md:rounded-xl shadow-shape'
          />
        </div>
        <div className=' max-w-[600px] opacity-80'>
          <h1 className='text-3xl text-gray-500 font-bold mb-4'>Quem somos</h1>
          <p className='text-base mb-4'>Entre. Sinta... A luz é sua!</p>
          <p className='text-lg mb-4'>
            Há mais de dez anos, sob o olhar sensível da designer Camila de
            Lelis, a luz própria de cada cliente é exteriorizada em ambientes
            que reluzem personalidade e essência.
          </p>
          <p className='text-lg mb-4'>
            Mais que iluminar, a Brasília Iluminação possibilita que os efeitos
            e sensações da luz sejam irradiados, criando, assim, emoções,
            trazendo aconchego, despertando vidas e sonhos, relaxando mentes e
            almas, clareando e contornando ideias que se materializam no acender
            de luzes.
          </p>
        </div>
      </div>
    </section>
  );
}
