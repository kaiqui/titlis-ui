export function PaletteCard(data: any) {
  const cardsData = data?.data || [];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '20px', justifyContent: 'center' }}>
      {cardsData.map((card: any, index: number) => (
        <div key={card.id || index} style={{ padding: '12px', borderRadius: '16px', width: 'auto', display: 'flex', flexDirection: 'column', gap: 'auto' }}>
          <div style={{ background: card.color.hex, width: '100%', aspectRatio: '1/1', borderRadius: '12px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 15px', fontSize: '20px' }} className="family-neighbor">
            <div><span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>RGB</span><p style={{ margin: 0 }}>{card.rgb}</p></div>
            <div><span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>CMYK</span><p style={{ margin: 0 }}>{card.cmyk}</p></div>
            <div><span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>HEX</span><p style={{ margin: 0 }}>{card.hex}</p></div>
            <div><span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>PANTONE</span><p style={{ margin: 0 }}>{card.pantone}</p></div>
          </div>
        </div>
      ))}
    </div>
  );
}
