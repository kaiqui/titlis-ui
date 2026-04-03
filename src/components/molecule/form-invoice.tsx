import { useState } from 'react';
import { checkDoc } from '@/lib/validationtest';
import { encryptToToken } from '@/utils/crypto';

export type FormInvoiceProps = Readonly<{
  navigate?: (url: string) => void;
}>;

export function FormInvoice({ navigate }: FormInvoiceProps) {
  const [document, setDocument] = useState<string>('');
  const [docValidated, setDocValidated] = useState<boolean>(false);
  const [birthDate, setBirthDate] = useState<string>('');
  const [onLoad, setOnLoad] = useState<boolean>(false);
  const isFormValid = docValidated && birthDate.length === 10;

  const handleChangeBirthDate = (e: any) => {
    let value = e.replaceAll(/\D/g, '');
    if (value.length > 8) value = value.substring(0, 8);
    if (value.length > 4) value = value.replace(/^(\d{2})(\d{2})(\d{4})$/, '$1/$2/$3');
    else if (value.length > 2) value = value.replace(/^(\d{2})(\d{2})$/, '$1/$2');
    setBirthDate(value);
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

  const getInvoice = async () => {
    setOnLoad(true);
    const [day, month, year] = birthDate.split('/');
    const formatBirthDate = `${year}-${month}-${day}`;
    const formatDocument = document.replaceAll(/\D/g, '');
    try {
      const token = await encryptToToken({ document: formatDocument, birthDate: formatBirthDate });
      const params = new URLSearchParams({ token });
      const nav = navigate ?? ((url: string) => { globalThis.location.assign(url); });
      nav(`/fatura?${params.toString()}`);
    } finally {
      setOnLoad(false);
    }
  };

  return (
    <div style={{ padding: '0 10px' }}>
      <div className="title-box-vector-banner image-sub-title-invoice">
        <h1 className="invoice-font-title">Minha fatura</h1>
        <img src="/sub-font.svg" loading="lazy" alt="Vetor line" width={200} height={20} />
      </div>
      <div className="border-light bg-primary p-8 border-primary form-invoice"
        style={{ maxWidth: '550px', maxHeight: '700px', height: 'auto' }}>
        <h1 className="title-box-invoice">Quer conferir sua fatura?<br />Só colocar seu CPF e data de nascimento aqui e pronto!</h1>
        <form action="#" method="post">
          <div className="line-white mb-2">
            <input
              style={{ borderColor: !docValidated && document.length > 0 ? 'var(--color-error)' : '' }}
              type="text" id="cpf" name="cpf" placeholder="Seu CPF"
              onChange={(e) => handleChangeDoc(e.target.value)} value={document} maxLength={14}
              onBlur={async (e) => { await performDocValidation(e.target.value); }} required />
          </div>
          <div className="line-white">
            <input type="text" value={birthDate} onChange={(e) => handleChangeBirthDate(e.target.value)}
              maxLength={10} id="data-nascimento" name="data-nascimento" placeholder="Sua Data de Nascimento" required />
          </div>
          <div className="mt-2">
            <button type="submit" disabled={!isFormValid || onLoad}
              onClick={(e) => { e.preventDefault(); if (isFormValid) getInvoice(); }}
              className="button-invoice">
              {onLoad ? 'Buscando CPF ...' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
