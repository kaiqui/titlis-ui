import { Title, Subtitle, Text } from '@/components/atoms/typography';
import { ButtonDefault } from '@/components/atoms/button';

export function AlertBarSection(data: any) {
  return (
    <div style={{ backgroundColor: data?.background?.hex || 'transparent', padding: '15px', textAlign: 'center', minHeight: '50px', width: '100vw', zIndex: 1000, justifyContent: 'center', display: 'flex' }}>
      {data?.text?.map((t: any) => (
        <div key={t.id} style={{ alignItems: 'center', display: 'flex', height: '100%' }}>
          <Title data={t} /><Subtitle data={t} /><Text data={t} />
          &nbsp;<ButtonDefault button={data?.btn} />
        </div>
      ))}
    </div>
  );
}
