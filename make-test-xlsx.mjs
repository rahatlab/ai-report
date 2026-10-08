import ExcelJS from "exceljs";

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("Sales");

ws.addRow(["date", "region", "product", "units", "revenue"]);

const regions = ["Asia", "Europe", "North America"];
const products = ["Laptop", "Phone", "Tablet"];
let d = new Date(2024, 0, 1);

for (let i = 0; i < 30; i++) {
  const row = ws.addRow([
    d,
    regions[i % regions.length],
    products[i % products.length],
    5 + i,
    (5 + i) * (100 + i * 10),
  ]);
  row.getCell(1).numFmt = "yyyy-mm-dd"; // date format force
  d = new Date(d.getTime() + 86400000 * 2);
}

// blank-ish row to test empty handling
ws.addRow(["", "", "", "", ""]);

await wb.xlsx.writeFile("test.xlsx");
console.log("created test.xlsx");
