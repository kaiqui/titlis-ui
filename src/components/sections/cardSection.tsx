import { Card } from '@/components/molecule/card';
import { Title, Subtitle, Text } from '@/components/atoms/typography';
import { Img } from '@/components/atoms/img';

export function CardSection(data: any) {
  const objCard = data;
  const objText = objCard.text;
  const objimg = data.img;

  return (
    <div className="container" style={data.background?.url
      ? { backgroundImage: `url(${data.background.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: data.background?.hex || 'transparent' }}>
      <div className="container-1224">
        {objText ? objText.map((t: any) => (
          <div className={`container-text-card ${t.textAlign}`} key={t.id}>
            <Title data={t} /><Subtitle data={t} /><Text data={t} />
          </div>
        )) : null}
        <Card data={objCard} />
        {objCard.layout === 'CardSimpleImg' && objimg && (
          <div className="flex justify-center">
            <Img data={objimg} layout={objCard.layout} />
          </div>
        )}
      </div>
    </div>
  );
}
