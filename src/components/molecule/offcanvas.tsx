import { QRCodeSVG } from 'qrcode.react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function Offcanvas({ isOpen, onClose, data }: Readonly<Props & { data: any }>) {
  const objAppsFlyer = data?.ctaAppsflyer?.appsflyer || data;
  let finalOneLink = '';
  if (objAppsFlyer?.qrcode) {
    finalOneLink = `${objAppsFlyer.onelinkUrl}?pid=${objAppsFlyer.mediaSourceDefault}&c=${objAppsFlyer.mediaKey}`;
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose(); }}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100,
          transition: 'opacity 0.3s', opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden', pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />
      <div
        style={{
          position: 'fixed', top: 0, right: 0, height: '100vh', width: '35%',
          background: 'white', zIndex: 9999, boxShadow: '0 0 20px rgba(0,0,0,0.15)',
          transition: 'transform 0.3s ease-in-out',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)', padding: '15px',
        }}
      >
        <div className="flex justify-end">
          <button onClick={onClose} className="close-menu-grey pointer" style={{ border: 'none', background: 'none', padding: 0 }} />
        </div>
        <div className="flex justify-center">
          <span className="logo-full" />
        </div>
        <div className="text-center">
          <h3 className="heading-41">{objAppsFlyer?.title}</h3>
          <p className="text-block-subtitle-qrcode">{objAppsFlyer?.subtitle}</p>
        </div>
        <div className="qrcode-area">
          <div>
            <div className="text-block-qrcode"><strong>1.</strong> Aponte a sua câmera para o QR code.</div>
            <div className="text-block-qrcode"><strong>2.</strong> Baixe o app no Google Play ou na App Store.</div>
            <div className="text-block-qrcode"><strong>3.</strong> Faça o seu cadastro e descubra se você tem um limite aprovado.</div>
          </div>
          <div className="flex justify-center">
            <QRCodeSVG value={finalOneLink} size={300} level="H" marginSize={4} />
          </div>
          <p className="text-block-qrcode text-center"><strong>E depois?</strong> É só começar <br /> a usar do seu jeito!</p>
        </div>
      </div>
    </>
  );
}
