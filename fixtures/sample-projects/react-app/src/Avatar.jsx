// Fixture only — deliberately omits alt text, a real axe-core "image-alt"
// violation, to document a known accessibility bug this fixture carries.
export function Avatar({ src }) {
  return <img src={src} />;
}
