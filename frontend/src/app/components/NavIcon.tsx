'use client'

export const NavIcon = ({ src, alt, href }: { src: string; alt: string; href: string }) => {
    return (
      <a
        href={href}
        className="w-10 h-10 rounded-full overflow-hidden bg-[#ffffff] flex items-center justify-center"
      >
        <img
          src={src}
          alt={alt}
          className="w-8 h-8 object-cover rounded-full"
        />
      </a>
    );
  };
  