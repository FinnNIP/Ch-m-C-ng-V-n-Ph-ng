const fs = require('fs');
let code = fs.readFileSync('src/sheets.ts', 'utf8');

code = code.replace(/const range = "DanhSachNhanVien!A:A";/g, 'const range = "DanhSachNhanVien!A:H";');

fs.writeFileSync('src/sheets.ts', code);
