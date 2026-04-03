import { Card } from '@/components/molecule/card';
import { Img } from '@/components/atoms/img';
import { Title, Subtitle, Text } from '@/components/atoms/typography';

export function ImageRight(data: any) {
  const objimg = data.img;
  const objText = data.text;

  return (
    <div className="container" style={data.background?.url
      ? { backgroundImage: `url(${data.background.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: data.background?.hex || 'transparent' }}>
      {objText ? objText.map((t: any) => (
        <div className={`container-text-card ${t.textAlign}`} key={t.id}>
          <Title data={t} /><Subtitle data={t} /><Text data={t} />
        </div>
      )) : null}
      <div className="container-1224 div-manifesto">
        <Card data={data} />
        <Img data={objimg} />
      </div>
    </div>
  );
}
