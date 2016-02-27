var fs = require('fs');

var index = require('../data/builtData/index.json');

var authors = {};
var authorPubliCount = {};

var years = [1995, 2000, 2005, 2010, 2015, 2020];

var categories = ['journal articles', 'book sections'];
// var categories = ['conference papers', 'reports', 'journal articles', 'book sections'];



function linkAuthors(authorsInPubli) {
  var links = {};

  console.log('length ', Object.keys(authorsInPubli).length);
  Object.keys(authorsInPubli).forEach(function(year) {
    var yearData = authorsInPubli[year];
    links[year] = {};

    Object.keys(yearData).forEach(function(title) {
      var authorsIndexes = yearData[title];
      // console.log(authorsIndexes);
      for (var i = 0; i < authorsIndexes.length; i++) {
        var currentAuthor = authorsIndexes[i];

        for (var j = i+1; j < authorsIndexes.length; j++) {
          var nextAuthor = authorsIndexes[j];
          var linksCurrentDefined = links[year][currentAuthor] !== undefined,
              linksNextDefined = links[year][nextAuthor] !== undefined;

          if (linksCurrentDefined && links[year][currentAuthor][nextAuthor] !== undefined) {
            links[year][currentAuthor][nextAuthor]++;
          }
          else if (linksNextDefined && links[year][nextAuthor][currentAuthor] !== undefined) {
            links[year][nextAuthor][currentAuthor]++;
          }
          else if (linksCurrentDefined) {
            links[year][currentAuthor][nextAuthor] = 1;
          }
          else if (linksNextDefined) {
            links[year][nextAuthor][currentAuthor] = 1;
          }
          else {
            links[year][currentAuthor] = {};
            links[year][currentAuthor][nextAuthor] = 1;
          }
        }

      }
    });
  });
  return links;
}

function initiateAuthors() {
  years.forEach(function(y) {
    authors[y] = [];
    authorPubliCount[y] = [];
  });
}

function generateCouples(index) {
  var links = {};
  var authorsInPubli = {};

  initiateAuthors();
  console.log(authors, authorPubliCount);

  Object.keys(index).forEach(function(title) {
    var publi = index[title];
    if (categories.indexOf(publi.type) !== -1) {  
      var date = yearGroup(formatDate(publi.date));
      var creators = publi.creators;
      var correspondingAuthors = authors[date];

      if (authorsInPubli[date] === undefined) {
        authorsInPubli[date] = {};
      }

      for (var i = 0; i < creators.length; i++) {
        var ci = creators[i];

        if (correspondingAuthors.indexOf(ci) === -1) {
          correspondingAuthors.push(ci);
          authorPubliCount[date].push(0);
        }
        var indexCurrentAuthor = correspondingAuthors.indexOf(ci);
        authorPubliCount[date][indexCurrentAuthor]++;

        if (authorsInPubli[date][title] === undefined)
          authorsInPubli[date][title] = [];
        authorsInPubli[date][title].push(indexCurrentAuthor);
      }
    }
  });
  console.log('couples');
  // console.log(authorsInPubli);
  links = linkAuthors(authorsInPubli);
  return links;
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

function formatDate(date) {
  if (date === '') {
    console.log('empty');
  }
  else if (date.search(/\d{4}-\d{2}-\d{2}/) !== -1) {
    return + date.substring(0, 4);
  }
  else if (date.search(/\d{4}-\d{2}/) !== -1) {
    return + date.substring(0, 4);
  }
  else if (date.search(/^\d{4}$/) !== -1) {
    return + date;
  }
  else {
    console.log(date);
  }
}

var initiateGEXF = function(file) {
  var text = '<?xml version="1.0" encoding="UTF-8"?>\n' +
             '<gexf xmlns:viz="http://www.gexf.net/1.1draft/viz" version="1.1" xmlns="http://www.gexf.net/1.1draft">\n' +
             '  <graph mode="static" defaultedgetype="undirected">\n';
  fs.writeFileSync(file, text);
};

var closeGEXF = function(file) {
  var text = '  </graph>\n' +
             '</gexf>';
  fs.appendFileSync(file, text);
};

var addNodes = function(file, authors, authorPubliCount) {
  var text = '    <nodes>\n';
  authors.forEach(function(author, i) {
    text += '      <node id="' + i + '" label="' + author + '">\n';
    text += '        <viz:size value="' + authorPubliCount[i] + '"/>\n';
    text += '      </node>\n';
  });
  text += '    </nodes>\n';
  fs.appendFileSync(file, text);
};

var addEdges = function(file, links) {
  var text = '    <edges>\n';
  fs.appendFileSync(file, text);
  var index = 0;
  // console.log(links.length);
  Object.keys(links).forEach(function(author1) {

    var coupleData = links[author1];
    // console.log(coupleData)

    Object.keys(coupleData).forEach(function(author2) {
      text = '      <edge id="' + index + '" '+
                          'source="' + author1 + '" ' +
                          'target="' + author2 + '" ' +
                          'weight="' + coupleData[author2] + '"/>\n';
      fs.appendFileSync(file, text);
      index++;
    });

  });
  text = '    </edges>\n';
      fs.appendFileSync(file, text);
  console.log('String OK');
};


/*
 * Creates the GEXF file
 */
var writeGEXF = exports.writeGEXF = function(fileBase) {
  var links = generateCouples(index);
  Object.keys(links).forEach(function(year) {
    var file = fileBase + '_' + year + '.gexf';
    initiateGEXF(file);
    addNodes(file, authors[year], authorPubliCount[year]);
    addEdges(file, links[year]);
    closeGEXF(file);
  })
  console.log('links Generated')
};

writeGEXF('../data/builtData/authorsGexf');
