export default function Testimonials() {
  return (
    <section id='testimonials' className='section bg-white py-12'>
      <div className='container flex flex-col items-center'>
        <header className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-500'>
            Depoimentos de quem já passou por aqui
          </h1>
        </header>
        <div className='flex flex-row gap-6 justify-center'>
          <div className=' w-[40rem] p-6 bg-white bg-opacity-80 shadow-shape rounded-2xl'>
            <div className='flex flex-col gap-3'>
              <blockquote className='mb-4'>
                <p className='text-gray-700 text-sm'>
                  <span className='text-orange text-3xl'>&ldquo;</span>
                  Além de ser muito técnica é muito humana. Confio todos os meus
                  projetos de iluminação a ela que sempre agrega valor às minhas
                  ideias e potencializa os resultados. Durante os atendimentos,
                  me senti ouvida, cuidada e compreendida!
                </p>
              </blockquote>
              <cite className='text-gray-500 text-xs'>
                Tatiana Murta - Lago Norte/DF
              </cite>
            </div>
          </div>

          <div className='  w-[40rem] p-6 bg-white bg-opacity-80 shadow-shape rounded-2xl'>
            <div className='flex flex-col gap-3'>
              <blockquote className='mb-4'>
                <p className='text-gray-700 text-sm'>
                  <span className='text-orange text-3xl'>&ldquo;</span>
                  Encontrei a Camila, em outro local em que ela trabalhava com
                  iluminação e a contratei agora pela empresa dela para cuidar
                  de outra fase da minha iluminação. Me senti acolhido em todo o
                  processo de atendimento e indicaria os serviços com certeza.
                </p>
              </blockquote>
              <cite className='text-gray-500 text-xs'>
                Vitor - Jardim Botânico/DF
              </cite>
            </div>
          </div>

          {/* <div className='  w-[40rem] p-6 bg-white bg-opacity-80 shadow-shape rounded-2xl'>
            <div className='flex flex-col gap-3'>
              <blockquote className='mb-4'>
                <p className='text-gray-700 text-sm'>
                  <span className='text-orange text-3xl'>&ldquo;</span>
                  Camila é muito atenciosa, os materiais são bem especificados.
                  Ela estudou o projeto de iluminação e propôs soluções para
                  melhorar o custo-benefício. Interagiu com o engenheiro
                  responsável pela obra e indicou profissionais. Houve suporte
                  pós-venda dentro do esperado.
                </p>
              </blockquote>
              <cite className='text-gray-500 text-xs'>
                Hugo Affonso - Sudoeste/DF
              </cite>
            </div>
          </div> */}
        </div>
      </div>
    </section>
  );
}
