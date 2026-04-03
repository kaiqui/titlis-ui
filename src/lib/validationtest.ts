export async function isValidBirthDate(date: string): Promise<boolean> {
  const cleaned = date.replace(/\D/g, '');
  if (cleaned.length !== 8) return false;
  const [day, month, year] = [
    parseInt(cleaned.slice(0, 2)),
    parseInt(cleaned.slice(2, 4)),
    parseInt(cleaned.slice(4, 8)),
  ];
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return false;
  const now = new Date();
  const age = now.getFullYear() - year - (now < new Date(now.getFullYear(), month - 1, day) ? 1 : 0);
  return age >= 18 && age <= 120;
}

export async function checkDoc(doc: string): Promise<boolean> {
  const cleaned = doc.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === parseInt(cleaned[10]);
}
