export async function encryptToToken(data: Record<string, string>): Promise<string> {
  const json = JSON.stringify(data);
  return btoa(json);
}
