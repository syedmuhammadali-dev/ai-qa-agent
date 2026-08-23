// Fixture only — deliberately renders unsanitized HTML to verify detection.
export function Comment({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
