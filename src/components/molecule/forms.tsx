import { useState } from 'react';
import { Link } from 'react-router-dom';
import { checkDoc } from '@/lib/validationtest';

export function Forms(data: any) {
  const [term, setTerm] = useState<boolean>(false);
  const [document, setDocument] = useState<string>('');
  const [docValidated, setDocValidated] = useState<boolean>(false);
  const [phone, setPhone] = useState<string>('');
  const isFormValid = docValidated && phone.length >= 10 && term;
  const [successSend, setSuccessSend] = useState<boolean>(false);

  let btn: any[] = [];
  btn.push(data.btn);

  const handleChangePhone = (e: any) => {
    let value = e;
    value = value.replaceAll(/\D/g, '');
    if (value.length > 11) value = value.substring(0, 11);
    setPhone(value);
  };

  const handleChangeDoc = (e: string) => {
    let value = e;
    value = value.replaceAll(/\D/g, '');
    if (value.length > 11) value = value.substring(0, 11);
    if (value.length > 9) value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    else if (value.length > 6) value = value.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1.$2.$3');
    else if (value.length > 3) value = value.replace(/^(\d{3})(\d{3})$/, '$1.$2');
    else if (value.length > 0) value = value.replace(/^(\d{3})$/, '$1');
    setDocument(value);
  };

  const performDocValidation = async (doc: any) => {
    const check = await checkDoc(doc);
    setDocValidated(check);
  };

  const sendForm = async () => {
    setSuccessSend(false);
    const formatDocument = document.replaceAll(/\D/g, '');
    try {
      const leadBody = { cpf: formatDocument, phone, utm: data.utm || {} };
      const insertLeadRes = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadBody),
      });
      const raw = await insertLeadRes.text();
      let resp: any = null;
      try { resp = raw ? JSON.parse(raw) : null; } catch { resp = raw; }
      if (!insertLeadRes.ok || resp?.success === false) { console.error('Failed to insert lead:', insertLeadRes.status, resp); return; }
      setSuccessSend(true);
      setDocument('');
      setPhone('');
      setTerm(false);
      setDocValidated(false);
      if (data.redirect) globalThis.location.href = data.redirect;
    } catch (error) {
      console.error('Failed to save lead:', error);
    }
  };

  return (
    <form action="#" method="post" style={{ color: data.color ? data.color.hex : 'black' }}>
      <div className={data.class === 'FormLarge' ? 'form-grid' : ''}>
        <div className="input-group">
          <label htmlFor="phone" className="form-label text-uppercase">Telefone</label>
          <input type="tel" id="phone" name="phone"
            className={`${data.class === 'FormsBorder' ? 'input-field-border' : 'input-field'}`}
            placeholder="Celular com DDD" value={phone}
            onChange={(e) => handleChangePhone(e.target.value)} required maxLength={11} />
        </div>
        <div className="input-group">
          <label htmlFor="cpf" className="form-label text-uppercase">CPF</label>
          <input type="text" id="cpf" name="cpf"
            className={`${data.class === 'FormsBorder' ? 'input-field-border' : 'input-field'}`}
            placeholder="Seu CPF" onChange={(e) => handleChangeDoc(e.target.value)}
            value={document} maxLength={14}
            onBlur={async (e) => { await performDocValidation(e.target.value); }} required />
        </div>
      </div>
      <div className="checkbox-wrapper">
        <input type="checkbox" id="aceite_comunicacao" name="aceite_comunicacao" required onChange={(e) => setTerm(e.target.checked)} />
        <label htmlFor="aceite_comunicacao">
          Li e concordo com o&nbsp;
          <Link to="/terms/termo-de-ciencia-e-uso-de-dados" target="_blank" className="fw-bold"
            style={{ color: data.color ? data.color.hex : 'black' }}>Termo de Ciência e Uso de Dados</Link>
          &nbsp;e com a&nbsp;
          <Link to="/terms/politica-de-privacidade" target="_blank" className="fw-bold"
            style={{ color: data.color ? data.color.hex : 'black' }}>Política de Privacidade</Link>
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
                {!successSend && (
                  <button type="button" disabled={!isFormValid}
                    onClick={() => { sendForm(); }}
                    style={{ color: a?.textColor?.hex, backgroundColor: a?.backgroundColor?.hex, borderColor: a?.border?.borderColor?.hex, fontSize: `${a?.fontSize}px`, pointerEvents: isFormValid ? undefined : 'none', opacity: isFormValid ? 1 : 0.6 }}
                    className={`button-jeitto ${getBorderClass()}`}>
                    {a?.label || data.label}
                  </button>
                )}
                {successSend && (
                  <div className="mt-6">
                    <p className="fw-bold" style={{ color: data.color ? data.color.hex : 'black' }}>Termine o seu cadastro no app!</p>
                    <a href="https://jeitto.onelink.me/YzTs/9nsiloru" type="button"
                      style={{ color: a?.textColor?.hex, backgroundColor: a?.backgroundColor?.hex, borderColor: a?.border?.borderColor?.hex, fontSize: `${a?.fontSize}px` }}
                      className={`button-jeitto ${getBorderClass()}`}>Baixar o app</a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </form>
  );
}
