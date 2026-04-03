// In Vite/React Router, navbar data is passed as props (no CMS server fetch)
import { NavbarClient } from './navbar-client';

interface NavbarProps {
  navItems?: any[];
  dropdownItems?: any[];
  buttonNavItems?: any[];
  logo?: { url: string };
}

export function Navbar({ navItems = [], dropdownItems = [], buttonNavItems = [], logo = { url: '' } }: NavbarProps) {
  return (
    <NavbarClient
      allNavbars={{ navItem: navItems, dropdownItem: dropdownItems, buttonNav: buttonNavItems }}
      logo={logo}
    />
  );
}
