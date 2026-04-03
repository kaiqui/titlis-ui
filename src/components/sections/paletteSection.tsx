import { Subtitle, Title, Text } from '@/components/atoms/typography';
import { PaletteCard } from '@/components/molecule/palette';

export function PaletteSection(data: any) {
  const paletteData = data.data;
  const background = data.background;
  const textData = data.text;

  return (
    <div style={background?.url
      ? { backgroundImage: `url(${background.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: background?.hex || 'transparent' }}>
      <div className="container-1224">
        {textData ? textData.map((t: any) => (
          <div className={`container-text-card ${t.textAlign}`} key={t.id}>
            <Title data={t} /><Subtitle data={t} /><Text data={t} />
          </div>
        )) : null}
        <PaletteCard data={paletteData} />
      </div>
    </div>
  );
}
