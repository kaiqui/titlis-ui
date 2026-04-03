import React from 'react';
import { ButtonDefault } from '@/components/atoms/button';
import { Title, Subtitle, Text } from '@/components/atoms/typography';
import { Iframe } from '@/components/atoms/iframe';

function getCardClassName(objData: any, a: any) {
  let layoutClass = '';
  switch (objData.layout) {
    case 'CardVertical':
      layoutClass = objData.cards?.length >= 3 ? 'card-st' : 'card-lg';
      break;
    case 'CardHorizontal':
      layoutClass = 'card';
      break;
    case 'ImageRight':
    case 'ImageLeft':
      layoutClass = 'card-lg';
      break;
    case 'ImageOverlay':
      layoutClass = 'card-overlay';
      break;
    case 'CardSimple':
    case 'CardSimpleImg':
      layoutClass = '';
      break;
    default:
      layoutClass = 'card';
  }

  const borderClass = a.border?.visual ? a.border.visual : '';
  const validBorderClasses = ['border-default', 'border-light', 'border-triple', 'border-radius'];
  const finalBorderClass = validBorderClasses.includes(borderClass) ? borderClass : '';
  return `${layoutClass} ${finalBorderClass}`.trim();
}

export function Card(data: any) {
  let objData = data;
  if (!data.layout) objData = data.data;

  return (
    <div className={objData.layout === 'CardVertical'
      ? `card-area-container grid grid-cols-${Math.min(objData.cards?.length || 1, 4)} `
      : 'card-container flex-col'}>
      {objData.cards.card || objData.cards?.map((a: any) => (
        <div key={a.id}>
          <div
            className={getCardClassName(objData, a)}
            style={{
              color: a.textColor?.hex || 'black',
              backgroundColor: a.backgroundColor?.hex || 'transparent',
              '--color-var': a.backgroundColor?.hex || 'transparent',
              borderColor: a.border?.borderColor?.hex,
              margin: '0 auto',
              paddingBottom: '15px',
            } as React.CSSProperties}
          >
            <div className="vertical-align-items w-full">
              {a.imageCard && (
                <>
                  <div className="justify-center flex">
                    <div className="icon-image">
                      <img
                        src={a.imageCard?.url}
                        alt="..."
                        width={a.imageCard?.width}
                        height={a.imageCard?.height}
                      />
                    </div>
                  </div>
                  <br />
                </>
              )}
              <div className={`${a.textAlign} ${a.border?.visual === 'border-triple' ? 'pl-4' : ''}`}>
                <Title data={a} />
                <Subtitle data={a} />
                <Text data={a} />
              </div>
              {a.video && (
                <div className="container-1224">
                  <div className="video-responsive-wrapper">
                    <Iframe data={a.video} />
                  </div>
                </div>
              )}
              {a.buttonCard && (
                <div className="p-4">
                  <ButtonDefault button={[a.buttonCard]} />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      {objData.btn && (
        <div>
          <ButtonDefault button={objData.btn} />
        </div>
      )}
    </div>
  );
}
