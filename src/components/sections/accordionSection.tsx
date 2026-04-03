import { Title, Subtitle, Text } from '@/components/atoms/typography';
import { AccordionMolecule } from '@/components/molecule/accordion';

export function AccordionSection(data: any) {
  const objText = data.text[0];

  return (
    <div>
      {objText && (
        <div className={`container-1224 ${objText.textAlign}`} key={objText.id}>
          <Title data={objText} /><Subtitle data={objText} /><Text data={objText} />
        </div>
      )}
      <AccordionMolecule data={data.data} />
    </div>
  );
}
