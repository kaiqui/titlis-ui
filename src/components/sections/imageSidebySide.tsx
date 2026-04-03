
export function SidebySide(data: any) {
  const objimg = data.img;

  return (
    <div className="container" style={data.background?.url
      ? { backgroundImage: `url(${data.background.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: data.background?.hex || 'transparent' }}>
      <div className="container-1224 p-4" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '400px' }}>
        {objimg.map((img: any) => (
          <div key={img.id}>
            <div className="grid">
              <div className="image-fit grid-cols-2">
                <img src={img.image.url} alt={img.id} width={500} height={400} style={{ display: 'block' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
