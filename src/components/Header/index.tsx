import { useEffect, useState } from "react";
import { Logo } from "../../assets";
import Link from "../Links";

const Header = () => {
  const [scrolled, setScrolled] = useState(false);

  const changeHeaderColor = () => {
    if (window.scrollY >= 100) {
      return setScrolled(true);
    }

    return setScrolled(false);
  };

  useEffect(() => {
    window.addEventListener("scroll", changeHeaderColor);

    return () => {
      window.removeEventListener("scroll", changeHeaderColor);
    };
  });

  return (
    <div
      className={`flex ${
        scrolled ? "bg-white shadow-md" : "bg-zinc-300/60"
      } fixed w-full items-center justify-center transition-all duration-300 ease-in-out`}
    >
      <div className="flex items-center justify-between w-full max-w-6xl text-white py-4 px-8">
        <div className="w-52 h-full flex items-center">
          <img src={Logo} alt="Brasília Iluminação Logo" />
        </div>

        <button className="md:hidden flex items-center justify-center w-fit h-14 bg-yellow-500 p-4 rounded-md hover:bg-yellow-400 transition duration-200 ease-in-out">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <nav className="hidden md:flex items-center justify-between w-1/2">
          <Link href="#">Quem somos</Link>
          <Link href="#">Serviços</Link>
          <Link href="#">Projetos</Link>
          <Link href="#">Contato</Link>
        </nav>
      </div>
    </div>
  );
};

export default Header;
