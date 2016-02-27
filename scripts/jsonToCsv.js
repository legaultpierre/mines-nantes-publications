var fs = require('fs');

var index = require('../data/builtData/index.json');
var insideSeparator = '|';

function buildCsvString(index) {
  var string = 'title,type,date,creators,description\n';
  Object.keys(index).forEach(function(title) {
    var indexData = index[title];

    string += '"' + title + '","' + indexData.type + '","' + indexData.date + '","';
    indexData.creators.forEach(function(c) {
      string += c + '|'
    });
    string = string.substring(0, string.length-1) + '","' + indexData.description + '"\n';
  });

  return string;
}

fs.writeFileSync('../data/builtData/index.csv', buildCsvString(index));
