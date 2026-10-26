const stepHeader = ['#', 'StepOrder', 'Name', 'StepType', 'Config (JSON)', 'ExpectedResult']

function normalizeHtmlFormatting(content: string): string {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  let inCodeFence = false

  return lines.map((line) => {
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence
      return line
    }
    if (inCodeFence) return line

    // Keep inline code and unknown <placeholders> literal. ReactMarkdown escapes
    // remaining HTML because rehypeRaw is intentionally not enabled.
    return line.split(/(`[^`]*`)/g).map((part) => {
      if (part.startsWith('`') && part.endsWith('`')) return part
      return part
        .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?(?:p|div|section|article|h[1-6])(?:\s[^>]*)?>/gi, '\n\n')
        .replace(/<\/?(?:table|thead|tbody)(?:\s[^>]*)?>/gi, '\n')
        .replace(/<\/?tr(?:\s[^>]*)?>/gi, '\n')
        .replace(/<(?:td|th)(?:\s[^>]*)?>/gi, '\t')
        .replace(/<\/(?:td|th)\s*>/gi, '')
        .replace(/<li(?:\s[^>]*)?>/gi, '\n- ')
        .replace(/<\/li\s*>|<\/?(?:ul|ol)(?:\s[^>]*)?>/gi, '\n')
        .replace(/<(?:strong|b)(?:\s[^>]*)?>|<\/(?:strong|b)\s*>/gi, '**')
        .replace(/<(?:em|i)(?:\s[^>]*)?>|<\/(?:em|i)\s*>/gi, '*')
        .replace(/<code(?:\s[^>]*)?>/gi, '`')
        .replace(/<\/code\s*>/gi, '` ')
        .replace(/<\/?(?:span|a|u|small|mark)(?:\s[^>]*)?>/gi, '')
    }).join('')
  }).join('\n')
}

function formatJson(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

/** Make tab-separated step output readable in the narrow chat sidebar. */
export function formatAssistantContent(content: string): string {
  const lines = normalizeHtmlFormatting(content).split('\n')
  const formatted: string[] = []

  for (let index = 0; index < lines.length; index++) {
    const header = lines[index].split('\t').map((cell) => cell.trim())
    if (header.length !== stepHeader.length ||
      !header.every((cell, cellIndex) => cell.toLowerCase() === stepHeader[cellIndex].toLowerCase())) {
      formatted.push(lines[index])
      continue
    }

    const steps: string[] = []
    let next = index + 1
    while (next < lines.length) {
      const cells = lines[next].split('\t').map((cell) => cell.trim())
      if (cells.length !== stepHeader.length || !/^\d+$/.test(cells[0]) || !/^\d+$/.test(cells[1])) break
      const [number, order, name, type, config, expected] = cells
      steps.push(
        `### ${number}. ${name}`,
        '',
        `**StepOrder:** ${order} · **Loại:** \`${type}\``,
        '',
        '**Config (JSON)**',
        '```json',
        formatJson(config),
        '```',
        '',
        '**ExpectedResult**',
        '```json',
        formatJson(expected),
        '```',
        '',
      )
      next++
    }

    if (steps.length === 0) {
      formatted.push(lines[index])
      continue
    }
    formatted.push('', ...steps)
    index = next - 1
  }

  return formatted.join('\n')
}
