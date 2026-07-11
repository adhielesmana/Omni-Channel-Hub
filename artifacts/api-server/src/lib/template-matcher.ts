interface TemplateComponent {
  type: string;
  text?: string;
  format?: string;
  buttons?: Array<Record<string, unknown>>;
}

interface TemplateMatch {
  templateName: string;
  templateLanguage: string;
  params: string[];
  score: number;
}

export function findBestTemplateMatch(
  content: string,
  templates: Array<{
    name: string;
    language: string;
    components: string | null;
  }>
): TemplateMatch | null {
  const matches: TemplateMatch[] = [];

  for (const template of templates) {
    if (!template.components) continue;

    let components: TemplateComponent[];
    try {
      components = JSON.parse(template.components) as TemplateComponent[];
    } catch {
      continue;
    }

    const bodyComponent = components.find(
      (c) => c.type === "BODY" && c.text
    );
    if (!bodyComponent?.text) continue;

    const bodyText = bodyComponent.text;
    const pattern = bodyText.replace(/\{\{\d+\}\}/g, "(.+)");
    const regex = new RegExp(`^${escapeRegex(pattern)}$`, "s");

    const match = content.match(regex);
    if (match) {
      const params = match.slice(1);
      const score = calculateScore(bodyText, params);
      matches.push({
        templateName: template.name,
        templateLanguage: template.language,
        params,
        score,
      });
    }
  }

  if (matches.length === 0) return null;

  matches.sort((a, b) => b.score - a.score);
  return matches[0];
}

function escapeRegex(pattern: string): string {
  return pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\([.+?^$()\]\\])/g, "$1");
}

function calculateScore(bodyText: string, params: string[]): number {
  const placeholderCount = (bodyText.match(/\{\{\d+\}\}/g) || []).length;
  const paramLength = params.reduce((sum, p) => sum + p.length, 0);
  return placeholderCount * 100 + paramLength;
}
