var fs = require('fs');

var index = require('../data/builtData/index.json');

var years = [1995, 2000, 2005, 2010, 2015];

function extractAllText() {
  var string = '';
  Object.keys(index).forEach(function(title) {
    var description = index[title].description;
    string += title + endsWithPoint(title);
    string += ' ' + description + endsWithPoint(description) + '\n';
  });
  return string;
}

function endsWithPoint(string) {
  if (string === null || string === '')
    return '';
  return string.substring(string.length-1) === '.' ? '': '.';
}

function exportAllText() {
  fs.writeFileSync('../data/builtData/allTexts.txt', extractText());
}

function formatDate(date) {
  if (date === '') {
    console.log('empty');
  }
  else if (date.search(/\d{4}-\d{2}-\d{2}/) !== -1) {
    return + date.substring(0, 4);
  }
  else if (date.search(/^\d{4}-\d{2}$/) !== -1) {
    return + date.substring(0, 4);
  }
  else if (date.search(/^\d{4}$/) !== -1) {
    return + date;
  }
  else {
    console.log(date);
  }
}

function extractTextsByYear() {
  var strings = {};
  years.forEach(function(y) {
    strings[y] = '';
  });
  Object.keys(index).forEach(function(title) {
    var description = index[title].description;
    var yearg = yearGroup(formatDate(index[title].date));
    strings[yearg] += title + endsWithPoint(title);
    strings[yearg] += ' ' + description + endsWithPoint(description) + '\n';
  });
  return strings;
}

function yearGroup(year) {
  var yearGroup = -1;
  for (var i = 0; i < years.length && yearGroup === -1; i++) {
    if (year <= years[i]) {
      yearGroup = years[i];
    }
  }
  return yearGroup;
}

function exportTextsByYear() {
  var strings = extractTextsByYear();
  years.forEach(function(y) {
    fs.writeFileSync('../data/builtData/texts-' + y + '.txt', strings[y]);
  });
}

exportTextsByYear();
