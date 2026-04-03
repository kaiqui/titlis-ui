import { useState } from 'react';
import { checkDoc, isValidBirthDate } from '@/lib/validationtest';
import { Link } from 'react-router-dom';

type ConsignedFormProps = {
  btn: any;
  utm?: any;
  navigate?: (url: string) => void;
} & Record<string, unknown>;

export const navigateTo = (url: string) => {
  try {
    if (typeof globalThis?.location?.assign === 'function') globalThis.location.assign(url);
  } catch { /* no-op */ }
};

export function ConsignedForm(data: ConsignedFormProps) {
  const [document, setDocument] = useState<string>('');
  const [docValidated, setDocValidated] = useState<boolean>(false);
  const [birthDateValid, setBirthDateValid] = useState<boolean>(false);
  const [birthDate, setBirthDate] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [term, setTerm] = useState<boolean>(false);
  const isFormValid = docValidated && birthDateValid && phone.length >= 10 && term;
  const [onLoad] = useState<boolean>(false);

  const handleChangeBirthDate = (e: any) => {
    let value = e.replaceAll(/\D/g, '');
    if (value.length > 8) value = value.substring(0, 8);
    if (value.length > 4) value = value.replace(/^(\d{2})(\d{2})(\d{4})$/, '$1/$2/$3');
    else if (value.length > 2) value = value.replace(/^(\d{2})(\d{2})$/, '$1/$2');
    setBirthDate(value);
  };

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

  const performDocValidation = async (doc: any) => { setDocValidated(await checkDoc(doc)); };
  const performBirthDateValidation = async (date: any) => { setBirthDateValid(await isValidBirthDate(date)); };

  let btn: any[] = [];
  btn.push(data.btn);

  const requestConsigned = async () => {
    const [day, month, year] = birthDate.split('/');
    const formatBirthDate = `${year}-${month}-${day}T00:00:00.000Z`;
    const formatDocument = document.replaceAll(/\D/g, '');
    try {
      const leadBody = { cpf: formatDocument, phone, birthDate: formatBirthDate, utm: data.utm || {} };
      const consignedBody = { cpf: formatDocument, telefone: phone, dataNascimento: formatBirthDate };
      const [insertLeadRes, consignedRes] = await Promise.all([
        fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(leadBody) }),
        fetch('/api/consigned', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(consignedBody) }),
      ]);
      if (!consignedRes.ok) { console.error('Failed consigned:', consignedRes.status); return; }
      if (consignedRes.ok) {
        const { idSolicitacao } = await consignedRes.json();
        const go = data.navigate ?? navigateTo;
        go(`https://consignado.jeitto.com.br/simulador-emprestimo-consignado/buscar-oferta/${idSolicitacao}`);
      }
      if (!insertLeadRes.ok) console.error('Failed to insert lead:', insertLeadRes.status);
    } catch (err) { console.error('Error to request consigned:', err); }
  };

  return (
    <form>
      <div className="form-consigned">
        <input type="text" style={docValidated ? {} : { borderColor: 'red' }} id="cpf" name="cpf"
          placeholder="Digite seu CPF" onChange={(e) => handleChangeDoc(e.target.value)}
          value={document} maxLength={14} onBlur={async (e) => { await performDocValidation(e.target.value); }} required />
      </div>
      <div className="form-consigned">
        <input type="text" style={birthDateValid ? {} : { borderColor: 'red' }} id="birthdate" name="birthdate"
          placeholder="Sua data de nascimento" value={birthDate}
          onChange={(e) => handleChangeBirthDate(e.target.value)} maxLength={10} required
          onBlur={async (e) => { await performBirthDateValidation(e.target.value); }} />
      </div>
      <div className="form-consigned">
        <input type="tel" id="phone" name="phone" placeholder="Seu celular" value={phone}
          onChange={(e) => handleChangePhone(e.target.value)} required maxLength={11} />
      </div>
      <div className="checkbox-wrapper">
        <input type="checkbox" id="aceite_comunicacao" name="aceite_comunicacao" required onChange={(e) => setTerm(e.target.checked)} />
        <label htmlFor="aceite_comunicacao">
          Eu autorizo os{' '}
          <Link to="https://storage.googleapis.com/customers-files/econsignado/termoautorizacao/termo_autorizacao_v1.pdf"
            className="text-primary" target="_blank">&nbsp;termos e condições&nbsp;</Link>
          para a consulta
        </label>
      </div>
      <div className="mt-4">
        <button type="submit" className="button-invoice" disabled={!isFormValid || onLoad}
          onClick={(e) => { e.preventDefault(); if (isFormValid) requestConsigned(); }}>
          {btn[0]?.label}
        </button>
      </div>
    </form>
  );
}
