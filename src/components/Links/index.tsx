import React from "react";

type LinkProps = {
  children: React.ReactNode;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

export const Link = ({ children, ...props }: LinkProps) => {
  return (
    <a
      className="px-2 h-6 text-zinc-500 hover:text-zinc-700 transition-all duration-200 ease-in-out  uppercase text-sm relative
      font-bold after:block after:absolute after:-bottom-2 after:rounded-md after:left-1/2
      after:-translate-x-1/2 after:w-0 after:h-[2px] after:bg-amber-500 after:transition-all
      after:duration-200 after:ease-in-out hover:after:w-full after:origin-bottom"
      {...props}
    >
      {children}
    </a>
  );
};

export default Link;
