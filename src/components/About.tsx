import Image from 'next/image';
import Camila from '../../assets/camila.jpg';

export default function About() {
  return (
    <section id='about' className='section py-16'>
      <div className='container mx-auto flex flex-col md:flex-row items-center'>
        <div className='image flex-shrink-0 mb-6 md:mb-0 md:mr-8'>
          <Image
            src={Camila}
            alt='foto da proprietária em pé em fundo bege e roupa preta, sorrindo e de braços cruzados'
            width={300}
            height={400}
          />
        </div>
        <div className='text text-gray-800'>
          <h1 className='text-3xl text-brand-dark font-bold mb-4'>
            Quem somos
          </h1>
          <p className='text-lg mb-4'>Entre. Sinta... A luz é sua!</p>
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
