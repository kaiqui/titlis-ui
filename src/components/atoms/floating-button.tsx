
interface Props {
  onClick: () => void;
}

export function FloatingButton({ data, onClick }: Readonly<{ data: any }> & Props) {
  const objFloat = data;

  return (
    <button
      key={objFloat?.id}
      onClick={onClick}
      style={{
        position: 'fixed',
        top: '200px',
        right: '0px',
        zIndex: 1000,
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
      }}
    >
      <img
        src={objFloat?.image?.url}
        alt="Image"
        width={objFloat?.image?.width || 100}
        height={objFloat?.image?.height || 100}
        style={{ display: 'block' }}
      />
    </button>
  );
}
