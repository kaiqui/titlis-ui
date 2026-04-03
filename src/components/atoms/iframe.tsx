export function Iframe(data: any) {
  const objIframe = data?.data ?? {};

  const publicOrigin =
    typeof globalThis !== 'undefined' && globalThis.location?.origin
      ? globalThis.location.origin
      : '';

  const hasOrigin = Boolean(publicOrigin);
  const uid = objIframe?.providerUid;
  const provider = objIframe?.provider;
  const title = objIframe?.title || 'Video';
  const rawUrl = objIframe?.url;

  let embedUrl = '';
  if (provider === 'youtube' && uid) {
    const base = `https://www.youtube-nocookie.com/embed/${uid}`;
    const params = new URLSearchParams({ enablejsapi: '1', modestbranding: '1', rel: '0' });
    if (hasOrigin) params.set('origin', publicOrigin);
    embedUrl = `${base}?${params.toString()}`;
  } else if (provider === 'vimeo' && uid) {
    const base = `https://player.vimeo.com/video/${uid}`;
    const params = new URLSearchParams();
    if (hasOrigin) params.set('origin', publicOrigin);
    params.set('dnt', '1');
    embedUrl = `${base}?${params.toString()}`;
  } else if (typeof rawUrl === 'string' && rawUrl.length > 0) {
    embedUrl = rawUrl;
  }

  return (
    <iframe
      className="iframe-video h-full w-full"
      src={embedUrl}
      title={title}
      referrerPolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}
