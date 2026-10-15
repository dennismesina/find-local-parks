/** Human label for a kebab-case amenity token: `dog-run` → "Dog run". Unknown tokens are humanized, never dropped. */
export function amenityLabel(token) {
  const spaced = String(token ?? '').trim().replace(/-/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
