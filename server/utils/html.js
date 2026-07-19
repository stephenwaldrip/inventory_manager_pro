const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (value) =>
  value == null ? '' : String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

// Tagged template for email bodies: literal markup passes through, but every
// ${interpolation} is escaped. Names, emails and org titles are user-supplied,
// so building these strings by hand lets tenant input inject markup into mail.
//
//   html`<p>Hello ${user.name}</p>`
//
// Interpolated URLs are escaped too, which is what you want inside an href —
// a bare & in a query string is invalid HTML unescaped.
export const html = (strings, ...values) =>
  strings.reduce(
    (out, str, i) => out + str + (i < values.length ? escapeHtml(values[i]) : ''),
    ''
  );

export default html;
