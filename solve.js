/**
 * Parse CSV by slicing spans between structural characters. Quotes only
 * introduce a quoted field at its original start.
 */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const rows = [];
  const errors = [];
  const quotedStop = /["\r\n]/g;
  let columns = null;
  let width = 0;
  let offset = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;

  while (offset < text.length) {
    // Empty physical lines can be skipped before allocating a record.
    const first = text.charCodeAt(offset);
    if (first === 10 || (first === 13 && text.charCodeAt(offset + 1) === 10)) {
      offset += first === 10 ? 1 : 2;
      line++;
      continue;
    }

    const recordLine = line;
    const row = header && columns === null ? null : rows.length;
    const fields = [];
    let quoted;
    let delimiter;

    do {
      const start = offset;
      quoted = text.charCodeAt(start) === 34;
      let value = '';
      let closed = false;

      if (quoted) {
        let chunk = start + 1;
        let extraLines = 0;
        quotedStop.lastIndex = chunk;
        for (let match; (match = quotedStop.exec(text)) !== null;) {
          const end = match.index;
          const token = match[0];
          if (token === '"') {
            value += text.slice(chunk, end);
            if (text.charCodeAt(end + 1) !== 34) {
              offset = end + 1;
              line += extraLines;
              closed = true;
              break;
            }
            value += '"';
            chunk = end + 2;
            quotedStop.lastIndex = chunk;
          } else {
            extraLines++;
            if (token === '\r') {
              value += text.slice(chunk, end) + '\n';
              chunk = end + (text.charCodeAt(end + 1) === 10 ? 2 : 1);
              quotedStop.lastIndex = chunk;
            }
          }
        }
        if (!closed) {
          errors.push({ code: 'unterminated_quote', line: recordLine, row });
          value = '';
        }
      }

      let chunk = offset;
      let end = offset;
      let hasSuffix = false;
      for (;;) {
        while (end < text.length) {
          delimiter = text.charCodeAt(end);
          if (delimiter === 44 || delimiter === 10 || delimiter === 13) break;
          end++;
        }
        if (end > chunk) {
          value += text.slice(chunk, end);
          hasSuffix = true;
        }
        if (end === text.length) {
          delimiter = 0;
          offset = end;
          break;
        }
        offset = end + 1;
        if (delimiter !== 13) break;
        if (text.charCodeAt(offset) === 10) {
          offset++;
          break;
        }
        errors.push({ code: 'stray_cr', line: recordLine, row });
        chunk = offset;
        end = offset;
      }

      if (closed && hasSuffix) errors.push({ code: 'quote_junk', line: recordLine, row });
      if (delimiter === 13 || delimiter === 10) line++;
      fields.push(value);
    } while (delimiter === 44);

    if (fields.length === 1 && fields[0] === '' && !quoted) continue;
    if (width === 0) width = fields.length;
    if (row === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row, extra: fields.splice(width) });
    }
    rows.push(fields);
  }

  return { columns: header ? columns ?? [] : null, rows, errors };
}
