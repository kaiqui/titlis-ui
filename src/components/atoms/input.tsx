export function Input(data: any) {
  return (
    <input
      type="text"
      className={`${data.class === 'FormsBorder' ? 'input-field-border' : 'input-field'}`}
      value={data.value}
      placeholder={data.placeholder}
    />
  );
}
