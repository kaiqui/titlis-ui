import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ButtonNav } from '@/components/atoms/button-nav';

interface NavItem { id: string; slug: string; pageName: string; }
interface DropdownItem { id: string; slug: string; pageName: string; }
interface ButtonNavItem { id: string; button: any; }
interface Logo { url: string; }
interface NavbarClientProps {
  allNavbars: { navItem: NavItem[]; dropdownItem: DropdownItem[]; buttonNav: ButtonNavItem[] };
  logo: Logo;
}

export function NavbarClient({ allNavbars, logo }: Readonly<NavbarClientProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [topScreen, setTopScreen] = useState(true);

  const menuToggle = useCallback(() => setIsOpen((v) => !v), []);
  const dropdownToggle = useCallback(() => setDropOpen((v) => !v), []);

  useEffect(() => {
    const windowScroll = () => setTopScreen(window.scrollY <= 100);
    window.addEventListener('scroll', windowScroll);
    windowScroll();
    return () => window.removeEventListener('scroll', windowScroll);
  }, []);

  return (
    <div className="navbar-container" style={{ position: topScreen ? 'relative' : 'fixed' }}>
      <nav className={`navbar ${topScreen ? '' : 'navbar-radius'}`}>
        <Link to="/" className="logo">
          <img src={logo?.url} alt="Logo" width={40} height={40} />
        </Link>

        <div className="nav-links">
          <button className="btn-dropdown" onClick={dropdownToggle} aria-label="Pra você">
            Pra você
            {dropOpen
              ? <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="m256-424-56-56 280-280 280 280-56 56-224-223-224 223Z" /></svg>
              : <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M480-345 240-585l56-56 184 183 184-183 56 56-240 240Z" /></svg>}
          </button>
          {allNavbars?.navItem.map((x: any) => (
            <button onClick={() => setDropOpen(false)} className="text-white link-button" key={x.id} aria-label={`Navigate to ${x.pageName}`}>
              <Link to={'/' + x.slug}>{x.pageName}</Link>
            </button>
          ))}
        </div>

        {allNavbars.buttonNav.map((btn: any) => (
          <div key={btn.id} className="nav-buttons">
            <ButtonNav button={btn.button} fontSize={16} />
          </div>
        ))}

        <div className="toggle-sm">
          <button onClick={menuToggle} className={`btn bg-transparent ${isOpen ? 'close-menu-outlined' : 'menu-outlined'}`} />
        </div>
      </nav>

      {isOpen && (
        <div className={`nav-sm container-fluid ${isOpen ? 'menu-smart' : ''}`}>
          <ul className="nav-links">
            <button className="btn-dropdown" onClick={dropdownToggle} aria-label="Pra você">
              Pra você
              {dropOpen
                ? <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="m256-424-56-56 280-280 280 280-56 56-224-223-224 223Z" /></svg>
                : <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M480-345 240-585l56-56 184 183 184-183 56 56-240 240Z" /></svg>}
            </button>
            {dropOpen && (
              <div className="w-full">
                <div className={`dropdown-toggle ${dropOpen ? 'dropdown-toggle-sm' : ''}`}>
                  <ul>
                    {allNavbars?.dropdownItem.map((item: any) => (
                      <li key={item.id}>
                        <Link onClick={() => { menuToggle(); setDropOpen(false); }} to={'/' + item.slug} className="text-white">{item.pageName}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {allNavbars.navItem.map((x: any) => {
              if (x.slug !== '/') {
                return (
                  <li key={x.id}>
                    <Link onClick={() => { menuToggle(); setDropOpen(false); }} to={'/' + x.slug} className="text-white">{x.pageName}</Link>
                  </li>
                );
              }
            })}
          </ul>
          {allNavbars.buttonNav.map((btn: any) => (
            <div key={btn.id}>
              <ButtonNav button={btn.button} fontSize={13} />
            </div>
          ))}
        </div>
      )}

      {dropOpen && (
        <div className="w-full">
          <div className={`dropdown-toggle ${dropOpen ? 'dropdown-toggle-open' : ''}`}>
            <ul>
              {allNavbars?.dropdownItem.map((item: any) => (
                <li key={item.id}>
                  <Link onClick={() => setDropOpen(false)} to={'/' + item.slug} className="text-white dropdown-nav">{item.pageName}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
