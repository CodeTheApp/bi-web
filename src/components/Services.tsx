import { Card, CardDescription, CardTitle } from './ui/card';

export default function Services() {
  return (
    <section
      id='services'
      className='section min-h-screen flex flex-col justify-center items-center bg-white'
    >
      <div className='container flex flex-col items-center'>
        <header className='mb-6'>
          <h1 className='text-3xl font-bold text-gray-900'>Serviços</h1>
        </header>
        <div className='flex flex-col md:flex-col gap-6 md:gap-8 w-full md:w-auto'>
          <Card className='w-[800px] p-4 bg-gray-50'>
            <CardTitle className='text-gray-500'>Create project</CardTitle>
            <CardDescription>
              Associa qualidade técnica ao design, apresentando soluções
              eficientes e compatíveis com a utilização de cada ambiente,
              possibilitando a composição de espaços viáveis e aconchegantes em
              projetos personalizados que alinham as necessidades aos sonhos e
              ao orçamento de cada cliente.k.
            </CardDescription>
            <CardDescription>
              Especifica e fornece luminárias e lâmpadas adequadas a utilização
              de cada espaço, otimizando as atividades nele realizadas. Através
              de reuniões online, marcadas previamente, apresentamos o pré
              projeto para aprovação dos clientes.
            </CardDescription>
            <CardDescription>
              Em seguida, damos andamento ao projeto executivo de iluminação,
              composto por três etapas fundamentais.
            </CardDescription>
          </Card>

          <Card className='w-[800px] p-4 bg-gray-50'>
            <CardTitle className='text-gray-500'>Create project</CardTitle>
            <CardDescription>
              Associa qualidade técnica ao design, apresentando soluções
              eficientes e compatíveis com a utilização de cada ambiente,
              possibilitando a composição de espaços viáveis e aconchegantes em
              projetos personalizados que alinham as necessidades aos sonhos e
              ao orçamento de cada cliente.k.
            </CardDescription>
            <CardDescription>
              Especifica e fornece luminárias e lâmpadas adequadas a utilização
              de cada espaço, otimizando as atividades nele realizadas. Através
              de reuniões online, marcadas previamente, apresentamos o pré
              projeto para aprovação dos clientes.
            </CardDescription>
            <CardDescription>
              Em seguida, damos andamento ao projeto executivo de iluminação,
              composto por três etapas fundamentais.
            </CardDescription>
          </Card>
        </div>
      </div>
    </section>
  );
}
