import Image from 'next/image';
import logo from '../../../assets/logo.png';

export default function Header() {
  return (
    <nav className='border-b border-solid border-[#e4e4e4] flex items-center p-4 w-full'>
      <Image src={logo} alt='logo da loja Brasilia Iluminação' width={200} />
      <div className='max-w-[1120px] mx-auto'>Início</div>
      <div className='max-w-[1120px] mx-auto'>Quem somos</div>
      <div className='max-w-[1120px] mx-auto'>Serviços</div>
      <div className='max-w-[1120px] mx-auto'>Depoimentos</div>
      <div className='max-w-[1120px] mx-auto'>Projetos</div>
      <div className='max-w-[1120px] mx-auto'>Contato</div>
      <div className='max-w-[1120px] mx-auto'>Nossa Loja</div>
    </nav>
  );
}
