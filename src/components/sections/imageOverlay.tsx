import { useMemo } from 'react';
import { Forms } from '@/components/molecule/forms';
import { Card } from '@/components/molecule/card';
import { Title, Subtitle, Text } from '@/components/atoms/typography';
import { ConsignedForm } from '@/components/molecule/consigned-form';
import { useIsMobile } from '@/utils/checkMobile';

export function ImageOverlay(data: any) {
  const isMobile = useIsMobile();

  const utmData = useMemo(() => {
    const f = data?.form?.[0];
    if (!f) return {};
    return { utmCampaign: f.utmCampaign, utmMedium: f.utmMedium, utmSource: f.utmSource };
  }, [data?.form]);

  const asImage = (input: any) => {
    if (!input) return undefined;
    if (typeof input === 'string') return { url: input };
    if (input?.url) return input;
    return undefined;
  };

  const chooseImage = () => {
    if (isMobile) return asImage(data?.backgroundMobile) || asImage(data?.background) || data?.img?.[0]?.image;
    return asImage(data?.background) || data?.img?.[0]?.image;
  };

  const chosenImage = chooseImage();
  const objimg: any[] = [];
  if (chosenImage) objimg.push({ image: chosenImage });
  else if (data?.background?.hex) objimg.push({ color: data?.background?.hex });

  const objCard = data?.cards;
  const objForm = data?.form;

  const backgroundPosition = objimg[0]?.image?.focalPoint
    ? `calc(${objimg[0].image?.focalPoint?.x}*100%) calc(${objimg[0].image?.focalPoint?.y}*100%)` : 'center';

  const computeMinHeight = () => {
    const h = objimg[0]?.image?.height;
    if (h && h > 900) return '90vh';
    if (h) return `${h}px`;
    return '90vh';
  };

  const computeAlignItems = () => {
    if (!isMobile) return 'center';
    const y = objimg[0]?.image?.focalPoint?.y;
    if (typeof y === 'number') return y < 0.5 ? 'flex-end' : 'flex-start';
    return 'center';
  };

  const getFormClassName = (variation: string) => {
    if (variation === 'ConsignedForm') return 'consigned-box-form';
    if (variation === 'FormsBorder') return 'box-form-border';
    return 'card';
  };

  return (
    <div style={{
      backgroundImage: objimg[0]?.image?.url ? `url(${objimg[0]?.image?.url})` : undefined,
      backgroundColor: objimg[0]?.image?.url ? undefined : objimg[0]?.color,
      backgroundPosition, backgroundRepeat: 'no-repeat', backgroundSize: 'cover',
      height: 'auto', minHeight: computeMinHeight(), maxHeight: '150vh',
      alignItems: computeAlignItems(), margin: '0 auto', display: 'flex', padding: '10px',
    }}>
      <div className="div-manifesto container-1224">
        {objCard?.map((card: any) => (
          <div key={card.id} className="w-full h-full"
            style={{ justifyContent: !isMobile && card?.alignmentSideCard === 'right' ? 'flex-end' : 'flex-start', display: 'flex' }}>
            <div><Card side={card?.alignmentSideCard} data={data} /></div>
          </div>
        ))}
        {objForm?.map((a: any) => (
          <div key={a.id} className="w-full" style={{ justifyContent: a.alignmentSide === 'right' ? 'flex-end' : 'flex-start', display: 'flex' }}>
            <div className="w-full flex justify-center">
              <div className={getFormClassName(a.visualVariation)} style={{ color: a.textColor?.hex, backgroundColor: a.backgroundColor?.hex }}>
                <Title data={a} /><Subtitle data={a} /><Text data={a} />
                {a.visualVariation === 'ConsignedForm'
                  ? <ConsignedForm btn={a.button} key={a.id} utm={utmData} />
                  : <Forms class={a.visualVariation} btn={a.button} key={a.id} redirect={a?.redirect} utm={utmData} />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
