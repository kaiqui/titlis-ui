import { useState } from 'react';
import { Link } from 'react-router-dom';
import { checkDoc } from '@/lib/validationtest';

export function FormsFirebase(data: any) {
  const [term, setTerm] = useState<boolean>(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState<boolean>(false);
  const [successSend, setSuccessSend] = useState<boolean>(false);
  const [doubleSend, setDoubleSend] = useState<boolean>(false);
  const [messageReturn, setMessageReturn] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const dataField = data.field || {};
  const isFormValid = term && isValid && Object.keys(formValues).length === dataField?.inputSet?.length;
  const collectionDb = dataField?.collectionDb || '';

  let campaignTermsUrl = data.campaignTermsUrl || '';
  let btn: any[] = [];
  btn.push(data.btn);

  const handleInputChange = (value: string, input: any) => {
    if (input === 'cpf' || input === 'phone') value = value.replaceAll(/\D/g, '');
    if (input === 'phone' && value.length > 11) value = value.substring(0, 11);
    setFormValues(prev => ({ ...prev, [input]: value }));
  };

  const performDocValidation = async (value: string, input: any) => {
    if (input === 'cpf') {
      setIsValid(false);
      const valid = await checkDoc(value);
      if (valid) setIsValid(true);
    }
  };

  const sendForm = async () => {
    setSuccessSend(false); setDoubleSend(false); setMessageReturn(null); setLoading(true);
    const formToSend = { ...formValues, collectionDb };
    try {
      const response = await fetch('/api/campaing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formToSend),
      });
      if (response?.ok) { setMessageReturn(null); setSuccessSend(true); setFormValues({}); setLoading(false); }
      if (response?.status === 409) { setMessageReturn(null); setDoubleSend(true); setFormValues({}); setLoading(false); }
      if (response?.status !== 409 && !response?.ok) {
        const errorData = await response.json();
        setMessageReturn(errorData.error || 'Unknown error'); setLoading(false);
      }
    } catch (error) { setSuccessSend(false); setDoubleSend(false); setLoading(false); console.error('Failed to save lead:', error); }
  };

  return (
    <form action="#" method="post" style={{ color: data.color ? data.color.hex : 'black' }}>
      <div className={data.class === 'FormLarge' ? 'form-grid' : ''}>
        {dataField ? dataField?.inputSet.map((y: any) => (
          <div className="input-group" key={y.id}>
            <div><label htmlFor={y.id} className="form-label text-uppercase">{y.label}</label></div>
            <input
              type={y.typeField} id={y.id} name={y.input}
              className={(() => {
                if (data.class === 'FormsBorder') return 'input-field-border';
                return y.input === 'cpf' && !isValid ? 'input-field-error' : 'input-field';
              })()}
              placeholder={y.placeholder} value={formValues[y.input] ?? ''}
              onChange={(e) => handleInputChange(e.target.value, y.input)}
              maxLength={y.maxLength ? y.maxLength : 50}
              onBlur={async (e) => { await performDocValidation(e.target.value, y.input); }}
              required
            />
          </div>
        )) : null}
      </div>
      <div className="checkbox-wrapper">
        <input type="checkbox" id="aceite_comunicacao" name="aceite_comunicacao" required onChange={(e) => setTerm(e.target.checked)} />
        <label htmlFor="aceite_comunicacao">
          Li e concordo com o&nbsp;
          <Link to={campaignTermsUrl} target="_blank" className="fw-bold" style={{ color: data.color ? data.color.hex : 'black' }}>Regulamento da Campanha,</Link>
          &nbsp;com o&nbsp;
          <Link to="/terms/termo-de-ciencia-e-uso-de-dados" target="_blank" className="fw-bold" style={{ color: data.color ? data.color.hex : 'black' }}>Termo de Ciência e Uso de Dados</Link>
          &nbsp;e com a&nbsp;
          <Link to="/terms/politica-de-privacidade" target="_blank" className="fw-bold" style={{ color: data.color ? data.color.hex : 'black' }}>Política de Privacidade</Link>
        </label>
      </div>
      <div className="mt-4">
        <div className="text-center">
          {btn?.map((a: any) => {
            const getBorderClass = () => {
              const visual = a?.border?.visual;
              if (visual === 'border-default') return 'border-default';
              if (visual === 'border-light') return 'border-light';
              if (visual === 'border-triple') return 'border-triple';
              if (visual === 'border-radius') return 'border-radius-btn';
              return 'btn-default';
            };
            return (
              <div key={a?.id}>
                {!successSend && !doubleSend && !loading && (
                  <button type="button" disabled={!isFormValid} onClick={() => { sendForm(); }}
                    style={{ color: a?.textColor?.hex, backgroundColor: a?.backgroundColor?.hex, borderColor: a?.border?.borderColor?.hex, fontSize: `${a?.fontSize}px`, pointerEvents: isFormValid ? undefined : 'none', opacity: isFormValid ? 1 : 0.6 }}
                    className={`button-jeitto ${getBorderClass()}`}>{a?.label || data.label}</button>
                )}
                {messageReturn && !loading && <p className="fw-bold text-black">{messageReturn}</p>}
                {loading && <div className="justify-center flex"><p className="spinner" /></div>}
                {(successSend && !loading) || (doubleSend && !loading) ? (
                  <div className="mt-6">
                    {successSend && <p className="fw-bold text-success">{data?.successMessage || 'Enviado com sucesso'}</p>}
                    {doubleSend && <p className="fw-bold text-success">{data?.duplicateRecordMessage || 'Enviado com sucesso'}</p>}
                    <a href="https://jeitto.onelink.me/YzTs/9nsiloru" type="button"
                      style={{ color: a?.textColor?.hex, backgroundColor: a?.backgroundColor?.hex, borderColor: a?.border?.borderColor?.hex, fontSize: `${a?.fontSize}px` }}
                      className={`button-jeitto ${getBorderClass()}`}>Baixar o app</a>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </form>
  );
}
