const fs = require('fs');
const path = 'src/components/molecules/DataActionsMenu.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  ['"Import / Export"', '"Impor / Ekspor"'],
  ['>Import<', '>Impor<'],
  ['"Upload Excel File"', '"Unggah File Excel"'],
  ['"Download Template"', '"Unduh Template"'],
  ['>Export<', '>Ekspor<'],
  ['"Export Selected"', '"Ekspor Terpilih"'],
  ['"Export to Excel"', '"Ekspor ke Excel"'],
  ['"Export to PDF"', '"Ekspor ke PDF"']
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Translated DataActionsMenu successfully!');
