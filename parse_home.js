const fs = require('fs');
const PDFParser = require("pdf2json");
let pdfParser = new PDFParser(this, 1);
pdfParser.on("pdfParser_dataReady", pdfData => {
    fs.writeFileSync('home_page.txt', pdfParser.getRawTextContent());
    console.log("Done");
});
pdfParser.loadPDF('home page.pdf');
