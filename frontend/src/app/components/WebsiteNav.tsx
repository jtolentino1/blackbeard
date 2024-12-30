'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface NavLink {
  href: string;
  label: string;
}

export default function WebsiteNav() {  
  const links: NavLink[] = [
    { href: '/chat', label: 'Chat' },
    { href: '/rules', label: 'Rules' },
    { href: '/faq', label: 'FAQ' },
    { href: '/terms', label: 'Terms' }
  ];

  return (
    <div className="flex flex-col sm:flex-row">
      {links.map((link, index) => (
        <div key={link.href} className="flex">
          <Link
            href={link.href}
            className="font-semibold pointer-events-auto text-base text-[#2985D4] transition-colors"
          >
            {link.label}
          </Link>
          {index < links.length - 1 && (
            <span className="hidden sm:inline text-gray-400 mx-4">|</span>
          )}
        </div>
      ))}
    </div>
  );
}