import type { Grammar } from './index'

const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s)

/** Anglais : pas de contraction, « of » invariable. L'article français éventuel est ignoré. */
export const en: Grammar = {
  of: (name) => `of ${name}`,
  list: (items) =>
    items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`,
  plural: (noun) => (/(s|x|z|ch|sh)$/i.test(noun) ? `${noun}es` : /[^aeiou]y$/i.test(noun) ? `${noun.slice(0, -1)}ies` : `${noun}s`),
  direction: (dir) => (dir === 'asc' ? 'ascending' : 'descending'),
  cap,
}
