import { Subtitle, Title, Text } from '@/components/atoms/typography';
import { Tabs } from '@/components/molecule/tabs';

export function TabsSection(data: any) {
  const tabsData = data.data;
  const background = data.background;
  const textData = data.text;

  return (
    <div className="container" style={background?.url
      ? { backgroundImage: `url(${background.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: background?.hex || 'transparent' }}>
      <div className="container-1224">
        {textData ? textData.map((t: any) => (
          <div className={`container-text-card ${t.textAlign}`} key={t.id}>
            <Title data={t} /><Subtitle data={t} /><Text data={t} />
          </div>
        )) : null}
        <Tabs data={tabsData} />
      </div>
    </div>
  );
}
