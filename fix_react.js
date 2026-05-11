import fs from 'fs';
const files = [
  'merenda-web/src/components/ui/alert-dialog.tsx',
  'merenda-web/src/components/ui/badge.tsx',
  'merenda-web/src/components/ui/button.tsx',
  'merenda-web/src/components/ui/card.tsx'
];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import\s+(?:\*\s+as\s+React|React)\s+from\s+["']react["']\s*;?\n?/g, '');
  const usages = new Set();
  let match;
  const regex = /React\.([A-Za-z0-9_]+)/g;
  while ((match = regex.exec(content)) !== null) { usages.add(match[1]); }
  if (usages.size > 0) {
    const imports = Array.from(usages).join(', ');
    content = `import { ${imports} } from "react";\n` + content;
    content = content.replace(/React\.([A-Za-z0-9_]+)/g, '$1');
  }
  fs.writeFileSync(file, content);
  console.log('Fixed ' + file);
}
