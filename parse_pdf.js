const fs = require('fs');
const PDFParser = require("pdf2json");

function parseAndSave(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
        let pdfParser = new PDFParser(this, 1);
        pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
        pdfParser.on("pdfParser_dataReady", pdfData => {
            fs.writeFileSync(outputFile, pdfParser.getRawTextContent());
            resolve();
        });
        pdfParser.loadPDF(inputFile);
    });
}

(async () => {
    try {
        await parseAndSave('MH APP_Self_Help Strategies.pdf', 'self_help.txt');
        await parseAndSave('MH App Psycheducation material_Final.pdf', 'psychoeducation.txt');
        console.log("Parsed both PDFs successfully.");
    } catch (e) {
        console.error(e);
    }
})();
