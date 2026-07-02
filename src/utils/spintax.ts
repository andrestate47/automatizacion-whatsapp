/**
 * Processes a Spintax string and returns a randomly generated variation.
 * Example: "{Hola|Buenas|Qué tal} amigo" -> "Hola amigo"
 */
export function processSpintax(text: string): string {
  if (!text) return '';
  const regex = /\{([^{}]+)\}/g;
  return text.replace(regex, (match, contents) => {
    const options = contents.split('|');
    const randomIndex = Math.floor(Math.random() * options.length);
    return options[randomIndex];
  });
}
