var fs = require('fs');

var index = {};
var base = '../data/exportOAIPMH/';
var exportBase = '../data/builtData/';

function generateFileArray(base, numMin, numMax) {
  var files = [];
  for (var i = numMin; i <= numMax; i++) {
    files.push(base + i + '.xml');
  }
  return files;
}

function readFiles(fileArray) {
  fileArray.forEach(function(file, i) {
    var initalData = fs.readFileSync(file, 'utf8');
    var splitedData = parseXML(initalData);
    indexSplitedData(splitedData);
  });
}

function run(numMin, numMax) {
  readFiles(generateFileArray(base, numMin, numMax));
}

function parseXML(string) {
  var matched = string.match(/<record>([\s\S]*?)<\/record>/g);
  if (matched === null) {
    console.log(string);
  }
  else {
    return string.match(/<record>([\s\S]*?)<\/record>/g).map(function(e) {
      return e.toLowerCase();
    });
  }
}

function exportIndex() {
  fs.writeFileSync(exportBase + 'index.json', JSON.stringify(index));
}

function indexSplitedData(array) {
  array.forEach(function(record) {
    var type = findInfo('type', record),
        creators = findInfo('creator', record),
        date = findInfo('date', record),
        title = findInfoEn('title', record),
        description = findInfoEn('description', record);

    if (title !== null && title.length === 1) {
      title = title[0];
      if (type !== null && type.length === 2) {
        type = type[1];
      }
      if (date !== null && date.length === 1) {
        date = date[0];
      }
      if (creators === null) {
        creators = []
      }
      if (description !== null && description.length === 1) {
        description = description[0];
        if (description === 'no abstract') {
          description = '';
        }
      }
      if (description === null) {
        description = '';
      }

      index[title] = {
        type: type,
        date: date,
        creators: creators,
        description: description
      };
    }
  });

  exportIndex();
}

function findInfo(infoToGet, string) {
  var regex = '<dc:' + infoToGet + '>([\\s\\S]*?)</dc:' + infoToGet + '>';
  regex = new RegExp(regex, 'g');
  var matched = string.match(regex);

  if (matched !== null) {
    matched = matched.map(function(e) {
      return e.replace('<dc:' + infoToGet + '>', '').replace('</dc:' + infoToGet + '>', '');
    });
  }
  return matched;
}

function findInfoEn(infoToGet, string) {
  var regex = '<dc:' + infoToGet + ' xml:lang="en">([\\s\\S]*?)</dc:' + infoToGet + '>';
  regex = new RegExp(regex, 'g');
  
  var matched = string.match(regex);
  if (matched !== null) {
    matched = matched.map(function(e) {
      return e.replace('<dc:' + infoToGet + ' xml:lang="en">', '').replace('</dc:' + infoToGet + '>', '');
    });
  }
  return matched;
}

run(1, 45);
