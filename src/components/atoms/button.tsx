import Offcanvas from '@/components/molecule/offcanvas';
import { useIsMobile } from '@/utils/checkMobile';
import { useState } from 'react';

function getBorderClass(visual: string) {
  if (visual === 'border-default') return 'border-default';
  if (visual === 'border-light') return 'border-light';
  if (visual === 'border-triple') return 'border-triple';
  if (visual === 'border-radius') return 'border-radius-btn';
  return 'btn-default';
}

export function ButtonDefault(data: any) {
  const objBtn = data.button;
  const disabled = data.disabled || false;
  const fontSize = data.fontSize || 18;
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const toggleMenu = () => setIsOpen(!isOpen);
  const isCallToAction = objBtn?.[0]?.callToAction;

  function handleClick(btn: any) {
    if (isMobile) {
      window.open(btn?.callToAction?.appsflyer?.onelinkUrl || btn.url, '_blank');
      return;
    }
    if (btn?.callToAction) {
      toggleMenu();
      return;
    }
    window.open(btn.url, '_blank');
  }

  if (!objBtn) return null;

  return (
    <div className="text-center mb-8">
      {objBtn.map((btn: any) => (
        <button
          key={btn.id}
          onClick={() => handleClick(btn)}
          rel="noopener noreferrer"
          style={{
            color: btn.textColor?.hex,
            backgroundColor: btn.backgroundColor?.hex,
            borderColor: btn.border?.borderColor?.hex,
            fontSize: `${fontSize}px`,
            pointerEvents: disabled ? 'none' : undefined,
            opacity: disabled ? 0.6 : 1,
          }}
          className={`button-jeitto ${getBorderClass(btn.border?.visual)} ${disabled ? 'disabled' : ''}`}
        >
          {btn.label || data.label}
        </button>
      ))}
      {isCallToAction && !isMobile && (
        <Offcanvas isOpen={isOpen} onClose={() => setIsOpen(false)} data={objBtn[0]?.callToAction?.appsflyer} />
      )}
    </div>
  );
}
