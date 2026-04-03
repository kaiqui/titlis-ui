import { useState } from 'react';
import Offcanvas from '@/components/molecule/offcanvas';
import { FloatingButton } from '@/components/atoms/floating-button';
import { useIsMobile } from '@/utils/checkMobile';

export default function OffcanvasWrapper({ data }: Readonly<{ data: any }>) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
      <FloatingButton
        data={data}
        onClick={isMobile ? () => window.open(data?.ctaAppsflyer?.appsflyer?.onelinkUrl, '_blank') : toggleMenu}
      />
      <Offcanvas isOpen={isOpen} onClose={() => setIsOpen(false)} data={data} />
    </>
  );
}
