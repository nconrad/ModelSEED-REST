#!/usr/bin/env node

var fs = require('fs'),
    csvParser = require('babyparse');


String.prototype.allReplace = function(obj) {
    var newStr = this;
    for (var key in obj) {
        newStr = newStr.replace(new RegExp(key, 'g'), obj[key]);
    }

    return newStr;
};

var mangledUtf8Mapping= {
    'Ã¡': 'á',
    'Ã¤': 'ä',
    'Ã©': 'é', 
    'í©': 'é',
    'Ã³': 'ó',
    'íº': 'ú',
    'Ãº': 'ú',
    'Ã±': 'ñ',
    'í‘': 'Ñ',
    'Ã': 'í',
    'â': '-',
    'â€“': '–',
    'â€™': '\'',
    'â€¦': '...',
    'â€“': '-',
    'â€œ': '"',
    'â€': '"',
    'â€˜': '\'',
    'â€¢': '-',
    'â€¡': 'c',
    'Â': '',
    'ï»¿': '' 
}

function main() {
    var data = fs.readFileSync('henry-publications.csv', "utf8")
    var rows = csvParser.parse(data, {skipEmptyLines: true}).data;

    var publications = [];
    for (var i=0; i<rows.length; i++) {
        var row = rows[i];

        publications.push({
            authors: fixUtf8(row[0]).trim().replace(/;$/g,'').split('; '),
            title: fixUtf8(row[1]),
            publication: fixUtf8(row[2]),
            volumn: row[3],
            number: row[4],
            pages: row[5],
            year: parseInt(row[6], 10),
            publisher: fixUtf8(row[7])
        })
    }

    var publications = publications.slice(1); // skip header
    console.log(JSON.stringify(publications));
    process.exit(0);
}


function fixUtf8(text) {
    if (!text) return null;
    return text.allReplace(mangledUtf8Mapping);
}

if(require.main === module) {
    main();
}

