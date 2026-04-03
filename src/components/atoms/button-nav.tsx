export function ButtonNav(data: any) {
  const objBtn = data.button;
  const fontSize = data.fontSize || 18;

  return (
    <div className="text-center">
      {objBtn?.map((btn: any) => {
        const getBorderClass = (visual: string | undefined) => {
          switch (visual) {
            case 'border-default': return 'border-default';
            case 'border-light': return 'border-light';
            case 'border-triple': return 'border-triple';
            case 'border-radius': return 'border-radius-btn';
            default: return 'btn-default';
          }
        };
        const borderClass = getBorderClass(btn.border?.visual);
        return (
          <a
            href={btn.url}
            key={btn.id}
            rel="noopener noreferrer"
            style={{
              color: btn.textColor?.hex,
              backgroundColor: btn.backgroundColor?.hex,
              borderColor: btn.border?.borderColor?.hex,
              fontSize: `${fontSize}px`,
            }}
            className={`button-nav ${borderClass}`}
          >
            {btn.label || data.label}
          </a>
        );
      })}
    </div>
  );
}
