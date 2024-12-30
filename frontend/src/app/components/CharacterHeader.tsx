"use client";

import Image from "next/image";

interface CharacterHeaderProps {
  content: string;
}

const CharacterHeader = ({ content }: CharacterHeaderProps) => {
  return (
    <header className="flex flex-col p-2 sm:p-4 rounded-lg bg-transparent">
      <div className="flex items-center gap-2">
        <Image
          src="/images/blackbeard.jpg"
          alt="Blackbeard"
          width={32}
          height={32}
          className="rounded-full object-cover"
        />
        <h2 className="text-sm sm:text-base text-[var(--foreground)] font-semibold">
          Blackbeard
        </h2>
      </div>

      {/* The bubble for character's message */}
      <div
        className="
          mt-1 
          w-full 
          rounded-lg 
          p-2 sm:p-3 
          bg-[var(--background)] 
          text-[var(--foreground)] 
          border border-[var(--border)] 
          text-xs sm:text-sm 
          opacity-90
        "
      >
        <p className="break-words w-full">{content}</p>
      </div>
    </header>
  );
};

export default CharacterHeader;
