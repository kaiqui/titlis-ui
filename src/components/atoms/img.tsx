export function Img(img: any) {
  const objimg = img?.data;
  const layoutValid = img?.layout;

  return (
    <>
      {objimg.map((item: any) => (
        <div key={item.id} className={`${layoutValid === 'CardSimpleImg' ? 'hero-image-lg' : 'hero-image'}`}>
          <img
            src={item?.image?.url}
            alt="..."
            width={item?.image?.width}
            height={item?.image?.height}
            style={{ display: 'block' }}
          />
        </div>
      ))}
    </>
  );
}
