import React from 'react';
import { Forms } from '@/components/molecule/forms';
import { Title, Subtitle, Text } from '@/components/atoms/typography';
import { FormsFirebase } from '@/components/molecule/form-firebase';

export function FormSection(data: any) {
  const objForm = data.form;
  const objFormFirebase = data.formFire;
  const objImg = data.img;

  const utmData = {
    utmCampaign: data?.form[0]?.utmCampaign,
    utmMedium: data?.form[0]?.utmMedium,
    utmSource: data?.form[0]?.utmSource,
  };

  const mountForm = () => {
    if (objForm?.length > 0) return objForm;
    return objFormFirebase;
  };

  return (
    <div style={data.background?.url
      ? { backgroundImage: `url(${data.background?.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: data.background?.hex || 'transparent' }}>
      <div key={mountForm()?.[0]?.id}
        className={`container-form ${mountForm()?.[0]?.visualVariation === 'FormLarge' ? 'width-form-lg' : 'width-form-base'}`}>
        {mountForm()?.map((a: any) => {
          const getBorderClass = (visual: string | undefined) => {
            switch (visual) {
              case 'border-default': return 'border-default';
              case 'border-light': return 'border-light';
              case 'border-triple': return 'border-triple';
              case 'border-radius': return 'border-radius';
              default: return '';
            }
          };
          const borderClass = getBorderClass(a.borderForm?.visual);
          return (
            <div key={a.id} className={`padding-form ${borderClass}`}
              style={{ backgroundColor: a.backgroundColor?.hex ?? 'transparent', '--color-var': a.backgroundColor?.hex ?? 'transparent', borderColor: a.borderForm?.borderColor?.hex } as React.CSSProperties}>
              <Title data={a} color={a.textColor} />
              <Subtitle data={a} />
              <Text data={a} />
              {objForm?.length > 0
                ? <Forms class={a?.visualVariation} btn={a?.button} color={a?.textColor} redirect={a?.redirect} utm={utmData} />
                : <FormsFirebase class={a?.visualVariation} btn={a?.button} color={a?.textColor} redirect={a?.redirect}
                    field={a?.formField} campaignTermsUrl={a?.campaignTermsUrl}
                    successMessage={a?.successMessage} duplicateRecordMessage={a?.duplicateRecordMessage} />}
            </div>
          );
        })}
        {objImg?.map((x: any) => (
          <div className="justify-center flex hero-image mt-8" key={x.id}>
            <img src={x.image?.url} alt="..." width={x.image?.width} height={x.image?.height} />
          </div>
        ))}
      </div>
    </div>
  );
}
