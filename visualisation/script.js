var React = require('react');
var ReactDOM = require('react-dom');

/**
 * Generate a cluster index
 */
var generateClusterIndex = function(sigmaGraph, nodes, index) {
  nodes.forEach(function(node) {

    if (index[node.attributes.category] === undefined) {
      index[node.attributes.category] = {
        label: node.attributes.category,
        count: 0,
        nodes: []
      }
    }
    if (index[node.attributes.category].color === undefined) {
      index[node.attributes.category].color = node.color;
    }

    index[node.attributes.category].count ++;
    index[node.attributes.category].nodes.push({
      'label': node.label,
      'id':  node.id,
      'frequency': node.attributes.frequency,
    });
  });
  Object.keys(index).forEach(function(category) {
    var categoryData = index[category],
        linkedCategories = {};

    categoryData.nodes.forEach(function(node) {
      var neighbors = sigmaGraph.neighbors(node.id);
      Object.keys(neighbors).forEach(function(neighbor) {
        var neighborData = neighbors[neighbor];
        var neighborCategory = neighborData.attributes.category,
            neighborWeight = neighborData.weight;
        
        if (neighborCategory !== category) {
          if (linkedCategories[neighborCategory] === undefined) {
            linkedCategories[neighborCategory] = neighborWeight;
          }
          else {
            linkedCategories[neighborCategory] += neighborWeight;
          }
        }
      });
    });
    index[category].linkedCategories = Object.keys(linkedCategories).map(function(cat) {
      return {
        category: cat,
        number: linkedCategories[cat]
      }
    }).sort(function(a, b) {
      return b.number - a.number;
    });
  });
};


var generateWordIndex = function(nodes, sigmaInstance, index) {
  nodes.forEach(function(node) {
    index[node.label] = {
      'label': node.label,
      'id': node.id,
      'frequency': node.attributes.frequency
    }
  });
}

var generateTransparent = function(rgbString, transparency) {
  var colors = rgbString.match(/\d+/g);
  return 'rgba(' + colors[0] + ',' + colors[1] + ',' + colors[2] + ',' + transparency + ')';
};

var changeTransparency = function(rgbaString, transparency) {
  return rgbaString.replace(/\d\.*\d*\)/, transparency + ')');
}

//Contains the main graph
var MainGraphContainer = React.createClass({
  getInitialState: function() {
    return {sigmaInstance: {}};
  },
  componentDidMount: function() {
    //Allows to select some node's neighbors
    sigma.classes.graph.addMethod('neighbors', function(nodeId) {
      var k,
          neighbors = {},
          index = this.allNeighborsIndex[nodeId] || {};
      for (k in index) {
        neighbors[k] = this.nodesIndex[k];
        neighbors[k].weight = index[k][Object.keys(index[k])[0]].weight;
      }

      return neighbors;
    });

    //Puts up all the given node and its neighbors
    sigma.classes.graph.addMethod('activeNodesUp', function(nodeId) {
      var neighbors = this.neighbors(nodeId);
      neighbors[nodeId] = this.nodesIndex[nodeId];
      var array = this.nodesArray.sort(function(a, b) {
        if (a.id === nodeId) {
          return 1;
        }
        else if (b.id === nodeId) {
          return -1;
        }
        else if (neighbors[a.id] !== undefined && neighbors[b.id] === undefined)
          return 1;
        else if (neighbors[a.id] === undefined && neighbors[b.id] !== undefined)
          return -1;
        else {
          return 0;
        }
      }); 
      this.nodesArray = array;
    });

    sigma.classes.graph.addMethod('activeEdgesUp', function(nodeId) {
      var selector = 'source';
      var array = this.edgesArray.sort(function(a, b) {
        if (a[selector] !== nodeId && b[selector] === nodeId)
          return -1;
        else if (a[selector] === nodeId && b[selector] !== nodeId)
          return 1;
        else
          return 0;
      });
      this.edgesArray = array;
    });

    //Allows to get the linked clusters of a node
    sigma.classes.graph.addMethod('linkedCategories', function(nodeId) {
      var neighbors = this.neighbors(nodeId),
          clustersId = {};
      for (var n in neighbors) {
        var nData = neighbors[n];
        var cluster = nData.attributes['category'] === undefined ? 
                      'Unknown' : nData.attributes['category'];

        var weight = 0;
        var inNeighNnodeId = this.inNeighborsIndex[n][nodeId];
        var inNeighNodeIdN = this.inNeighborsIndex[nodeId][n];
        if (inNeighNnodeId !== undefined) {
          weight = inNeighNnodeId[Object.keys(inNeighNnodeId)[0]].weight;
        }
        else {
          weight = inNeighNodeIdN[Object.keys(inNeighNodeIdN)[0]].weight;
        }
        if (clustersId[cluster] === undefined) {
          clustersId[cluster] = {count: weight, nodes: [nData]};
        }
        else {
          clustersId[cluster].count += weight;
          clustersId[cluster].nodes.push(nData);
        }
      }
      return clustersId;
    });

    // We gave our own name 'border' to the custom renderer
    sigma.canvas.nodes.border = function(node, context, settings) {
      var prefix = settings('prefix') || '';

      context.fillStyle = node.color || settings('defaultNodeColor');
      context.beginPath();
      context.arc(
        node[prefix + 'x'],
        node[prefix + 'y'],
        node[prefix + 'size'],
        0,
        Math.PI * 2,
        true
      );

      context.closePath();
      context.fill();

      // Adding a border
      context.lineWidth = node.borderWidth || 0;
      context.strokeStyle = node.borderColor || '#fff';
      context.stroke();
    };

    sigma.canvas.labels.def = function(node, context, settings) {
      var fontSize,
          prefix = settings('prefix') || '',
          size = node[prefix + 'size'];

      if (node.staticLabel !== true)
        return;

      if (!node.label || typeof node.label !== 'string')
        return;

      fontSize = (settings('labelSize') === 'fixed') ?
        settings('defaultLabelSize') :
        settings('labelSizeRatio') * size;

      context.font = (settings('fontStyle') ? settings('fontStyle') + ' ' : '') +
        fontSize + 'px ' + settings('font');
      context.fillStyle = (settings('labelColor') === 'node') ?
        (node.color || settings('defaultNodeColor')) :
        settings('defaultLabelColor');

      context.fillText(
        node.label,
        Math.round(node[prefix + 'x'] + size + 3),
        Math.round(node[prefix + 'y'] + fontSize / 3)
      );
    };

    sigma.canvas.edges.transparent = function(edge, source, target, context, settings) {
      var color = edge.color,
          prefix = settings('prefix') || '',
          size = edge[prefix + 'size'] || 1,
          edgeColor = settings('edgeColor'),
          defaultNodeColor = settings('defaultNodeColor'),
          defaultEdgeColor = settings('defaultEdgeColor'),
          transparency = 0.3;

      if (!color) {
        switch (edgeColor) {
          case 'source':
            color = generateTransparent(source.color,transparency) || generateTransparent(defaultNodeColor, transparency);
            break;
          case 'target':
            color = generateTransparent(target.color,transparency) || generateTransparent(defaultNodeColor, transparency);
            break;
          default:
            color = defaultEdgeColor;
            break;
        }
        edge.originalColor = color;
      }
      edge.color = color;
      context.strokeStyle = color;
      context.lineWidth = size;
      context.beginPath();
      context.moveTo(
        source[prefix + 'x'],
        source[prefix + 'y']
      );
      context.lineTo(
        target[prefix + 'x'],
        target[prefix + 'y']
      );
      context.stroke();
    };
    var s = new sigma({
      renderer: {
        type: 'canvas',
        container: 'mainGraphContainer'
      },
      settings: {
        defaultNodeType: 'border',
        defaultEdgeType: 'transparent'
      }
    });
    var _this = this;

    s.bind('overNode', function(e) {
      var containerComponent = document.getElementById('mainGraphContainer');
      containerComponent.setAttribute('class', containerComponent.getAttribute('class') + ' pointable');
    })
    s.bind('outNode', function(e) {
      var containerComponent = document.getElementById('mainGraphContainer'),
          classes = containerComponent.getAttribute('class').replace(' pointable', '');
      containerComponent.setAttribute('class', classes);
    });

    s.bind("clickNode", function (e) {
      // _this.restoreNodeProperties();
      //Colors the linked nodes
      var nodeId = e.data.node.id,
          toKeep = s.graph.neighbors(nodeId);
      toKeep[nodeId] = e.data.node;
      s.graph.activeNodesUp(nodeId);
      s.graph.activeEdgesUp(nodeId);


      s.graph.nodes().forEach(function(n) {

        if (toKeep[n.id]) {
          n.color = n.originalColor;
          n.label = n.originalLabel;
          if (n.id === nodeId)
            n.staticLabel = true;
          
        }
        else {
          n.color = '#eee';
          // n.viz.color = '#eee';
          n.label = '';
          n.staticLabel = false;
        }

        if (n.id !== nodeId) {
          n.borderColor = n.color;
          n.borderWidth = 0;
        }
        else {
          n.borderWidth = 3;
          n.borderColor = 'black';
        }
      });
      s.graph.edges().forEach(function(e) {
        if (toKeep[e.source] && toKeep[e.target]){
          console.log('colorbefore', e.color);
          e.color = changeTransparency(e.originalColor,0.8);
          console.log('colorafter', e.color);
        }
        else
          e.color = '#eee';
      });
      //Update the state of the app
      var nodeData = {
        label: e.data.node.label,
        cluster: e.data.node.attributes['category'],
        id: e.data.node.id,
        size: e.data.node.size,
        neighbors: s.graph.neighbors(e.data.node.id),
        linkedCategories: s.graph.linkedCategories(e.data.node.id)
      };

      s.refresh();
      _this.props.onNodeChange(nodeData);

    });

    s.bind('clickStage', function(e) {
      _this.restoreNodeProperties();
      s.refresh();
      _this.props.onNodeChange({});
    });

    //First time the graph is loaded
    sigma.parsers.gexf(
      './graphFiles/before' + this.props.yearGroup + '.gexf',
      s,
      function() {
        s.graph.nodes().forEach(function(n) {
          n.borderColor = n.color;
          n.borderSize = 0;
          n.originalColor = n.color;
          n.originalLabel = n.label;
          n.originalSize = n.size;
        });

        var indexClusters = {},
            indexWords = {};
        generateClusterIndex(s.graph, s.graph.nodes(), indexClusters);
        generateWordIndex(s.graph.nodes(), s, indexWords);
        _this.props.onCategoryIndexChange(indexClusters);
        _this.props.onWordIndexChange(indexWords);
        s.refresh();
      }
    );

    this.setState({
      sigmaInstance: s
    });

    //prevent text from beeing selected on double click
    document.getElementById('mainGraphContainer').addEventListener('mousedown', function(e){ e.preventDefault(); }, false);
  },
  restoreNodeProperties: function() {
    var s = this.state.sigmaInstance;
    s.graph.nodes().forEach(function(n) {
      n.borderWidth = 0;
      n.borderColor = n.originalColor;
      n.color = n.originalColor;
      n.label = n.originalLabel;
      n.size = n.originalSize;
      n.staticLabel = false;
    });

    s.graph.edges().forEach(function(n) {
      n.color = n.originalColor;
    });

  },
  hideNodes: function(nodes, hidingColor) {
    var sigmaInstance = this.state.sigmaInstance;
    if (hidingColor === undefined) {
      hidingColor = '#eee'
    }
    var toKeep = {};
    nodes.forEach(function(node) {
      toKeep[node.id] = node;
    });
    sigmaInstance.graph.nodes().forEach(function(n) {

      if (toKeep[n.id]) {
        n.color = n.originalColor;
        n.label = n.originalLabel;
        n.staticLabel = false;
      }
      else {
        n.color = hidingColor;
        // n.viz.color = '#eee';
        n.label = '';
        n.staticLabel = false;
      }

      n.borderColor = n.color;
      n.borderWidth = 0;
    });
    sigmaInstance.graph.edges().forEach(function(e) {
      if (toKeep[e.source] && toKeep[e.target])
        e.color = changeTransparency(e.originalColor,0.8);
      else
        e.color = hidingColor;
    });
  },
  loadGraph: function() {
    var sigmaInstance = this.state.sigmaInstance;

    //Data is loaded only if it not the first build
    if (Object.keys(sigmaInstance).length > 1) {
      this.sigmaRecenter();
      var _this = this;
      sigma.parsers.gexf(
        './graphFiles/before' + this.props.yearGroup + '.gexf',
        sigmaInstance,
        function() {
          sigmaInstance.graph.nodes().forEach(function(n) {
            n.borderColor = n.color;
            n.borderSize = 0;
            n.originalColor = n.color;
            n.originalLabel = n.label;
            n.originalSize = n.size;
          });
          var indexCluster = {};
          var wordIndex = {};
          generateClusterIndex(sigmaInstance.graph, sigmaInstance.graph.nodes(), indexCluster);
          generateWordIndex(sigmaInstance.graph.nodes(), sigmaInstance, wordIndex);
          _this.props.onCategoryIndexChange(indexCluster);
          _this.props.onWordIndexChange(wordIndex);
          sigmaInstance.refresh();
        }
      );
    }
  },
  sigmaRecenter: function(){
    var c = this.state.sigmaInstance.cameras[0]
    c.goTo({
      ratio: 1
      ,x: 0
      ,y: 0
    })
  },
  sigmaZoom: function(){
    var c = this.state.sigmaInstance.cameras[0]
    c.goTo({
      ratio: c.ratio / c.settings('zoomingRatio')
    })
  },
  sigmaUnzoom: function(){
    var c = this.state.sigmaInstance.cameras[0]
    c.goTo({
      ratio: c.ratio * c.settings('zoomingRatio')
    })
  },
  componentWillReceiveProps: function(nextProps) {
    if (Object.keys(nextProps.selectedCategory).length !== 0) {
      this.hideNodes(nextProps.selectedCategory.nodes);
      this.state.sigmaInstance.refresh();
    }
  },
  shouldComponentUpdate: function(nextProps, nextState) {
    if (this.props.yearGroup !== nextProps.yearGroup) {
      return true;
    }
    return false;
  },
  render: function() {
    this.loadGraph();
    return (
      <div id="leftPart">
        <div id="zoomButtons">
          <button onClick={this.sigmaZoom}><i className="fa fa-plus"></i></button>
          <button onClick={this.sigmaUnzonoom}><i className="fa fa-minus"></i></button>
          <button onClick={this.sigmaRecenter}><i className="fa fa-dot-circle-o"></i></button>
        </div>
        <div id="mainGraphContainer">
        </div>
      </div>
    );
  }
});


var NoInfo = React.createClass({
  render: function() {
    return (
      <div id="noInfo">
        <p>Aucun noeud ou catégorie sélectionné</p>
      </div>
    );
  }
});

var ClusterInfo = React.createClass({
  render: function() {
    var categoryData = this.props.categoryData;

    var numberOfWords = 5, wordList = [], categoryList = [];
    
    categoryData.nodes.sort(function(a, b) {
      return b.frequency - a.frequency;
    }).forEach(function(e, i) {
      if (i < numberOfWords) {
        wordList.push(
          <tr key={e.label}>
            <td>{e.label}</td>
            <td>{e.frequency}</td>
          </tr>
        );
      }
    });
    categoryData.linkedCategories.forEach(function(e) {
      categoryList.push(
        <tr key={e.category}>
          <td>{e.category}</td>
          <td>{e.number}</td>
        </tr>
      );
    })
    return (
      <div id="clusterInformation">
        <h2>Catégorie</h2>
        <p className="bold italic">{categoryData.label}</p>
        <ul>
          <li><span className="lighterBold">Nombre de mots</span>: {categoryData.count}</li>
          <li>
            <table className="fullWidth">
              <thead>
                <tr>
                  <th>Catégories liées</th>
                  <th>Liens pondérés</th>
                </tr>
              </thead>
              <tbody>
                {
                  categoryList
                }
              </tbody>
            </table>
          </li>
          <li className="topWord">
            <table className="fullWidth">
              <thead>
                <tr>
                  <th>Mots liés - Top 5</th>
                  <th>Fréquence</th>
                </tr>
              </thead>
              <tbody>
                {
                  wordList
                }
              </tbody>
            </table>
          </li>
        </ul>
      </div>
    );
  }
});

var NodeInfo = React.createClass({
  render: function() {
    var nodeData = this.props.nodeData;

    if (nodeData.linkedCategories === undefined) {
      return (
          <div id="nodeInformation">
            <h2>Noeud</h2>
            <p>Aucun noeud sélectionné</p>
          </div>
        );
    }

    var linkedCategories = [], linkedWord = [], numberOfWords = 5;

    Object.keys(nodeData.linkedCategories).sort(function(a, b) {
      var cA = nodeData.linkedCategories[a],
          cB = nodeData.linkedCategories[b];
      return cB.count - cA.count;
    })
    .forEach(function(clusterName) {
      var clusterData = nodeData.linkedCategories[clusterName];
      var clusterName = clusterName;
      // if (clusterName !== nodeData.cluster) {
        linkedCategories.push(
          <tr key={clusterName}>
            <td>{clusterName}</td>
            <td>{clusterData.count}</td>
          </tr>
        );
      // }
    });
    var wordClassment = Object.keys(nodeData.neighbors).map(function(wordId) {
      var data = nodeData.neighbors[wordId];
      return {label: data.label, weight: data.weight};
    }).sort(function(a, b) {
      return b.weight - a.weight;
    }).forEach(function(e, i) {
      if (i < numberOfWords) {
        linkedWord.push(
          <tr key={e.label}>
            <td>{e.label}</td>
            <td>{e.weight}</td>
          </tr>
        );
      }
    });
    return (
      <div id="nodeInformation">
        <h2>Noeud</h2>
        <p className="italic lighterBold">{nodeData.label}</p>
        <ul>
          <li><span className="lighterBold">Catégorie</span>: {nodeData.cluster}</li>
          <li>
            <table className="fullWidth">
              <thead>
                <tr>
                  <th>Catégories liées</th>
                  <th>Liens pondérés</th>
                </tr>
              </thead>
              <tbody>
                {
                  linkedCategories
                }
              </tbody>
            </table>
          </li>
          <li className="topWord"> 
            <table className="fullWidth">
              <thead>
                <tr>
                  <th>Mots liés - Top 5</th>
                  <th>Nombre de liens</th>
                </tr>
              </thead>
              <tbody>
                {
                  linkedWord
                }
              </tbody>
            </table>
          </li>
        </ul>
      </div>
    );
  }
});

var FirstRightBox = React.createClass({
  render: function() {
    var ComponentToDisplay;
    if (Object.keys(this.props.nodeData).length === 0 &&
        Object.keys(this.props.categoryData).length === 0) {
      ComponentToDisplay = <NoInfo/>
    }
    else if (Object.keys(this.props.nodeData).length > 0) {
      ComponentToDisplay = <NodeInfo nodeData={this.props.nodeData}/>
    }
    else if (Object.keys(this.props.categoryData).length > 0) {
      ComponentToDisplay = <ClusterInfo categoryData={this.props.categoryData}/>
    }
    return (
      <div id="firstRightBox">
        {ComponentToDisplay}
      </div>
    );
  }
});

var SecondRightBox = React.createClass({
  changeYear: function(e) {
    var activeButton = document.querySelector('#yearButtons > button.active');
    if (activeButton !== null){
      activeButton.classList.remove('active');
      activeButton.disabled = false;
    }


    e.currentTarget.classList.add('active');
    e.currentTarget.disabled = true;
    this.props.onYearChange(e.currentTarget.value);
  },
  render: function() {
    return (
      <div id="secondRightBox">
        <h2>Années</h2>
        <div id="yearButtons">
          <button value="1995" onClick={this.changeYear} className='active'>avant 1995</button>
          <button value="2000" onClick={this.changeYear}>1996 - 2000</button>
          <button value="2005" onClick={this.changeYear}>2001 - 2005</button>
          <button value="2010" onClick={this.changeYear}>2006 - 2010</button>
          <button value="2015" onClick={this.changeYear}>2011 - 2015</button>
        </div>
      </div>
    );
  }
});

var RightBox = React.createClass({
  render: function() {
    return (
      <div id="rightBox">
        <SecondRightBox onYearChange={this.props.onYearChange}/>
        <FirstRightBox nodeData={this.props.nodeData}
                       categoryData={this.props.categoryData}/>
      </div>
    );
  }
});

var Rectangle = React.createClass({
  render: function() {
    return (
      <div className="clusterRectangle" style={{'backgroundColor': this.props.color, 'opacity': this.props.opacity}}>
      </div>
    );
  }
});

var ClusterLegend = React.createClass({
  handleCategoryClick: function(event) {
    this.props.onCategoryChange(event.currentTarget.getAttribute('title'));
  },
  render: function() {
    return (
      <div className="clusterLegend" title={this.props.category}
           style={{'cursor': this.props.clickable ? 'pointer': 'default'}}
           onClick={this.props.clickable? this.handleCategoryClick : null }>
        <Rectangle color={this.props.color} opacity={this.props.opacity}/>
        <span className={'legendTitle' + (this.props.bold ? ' bold': '')}>{this.props.category}</span>
      </div>
    );
  }
});

var ClusterLegendContainer = React.createClass({
  render: function() {
    var defaultCategories = ['Nuclear', 'Physics', 'Energy', 'IT','Problem Solving'];
    var defaultColor = '#CCC';
    var defaultClickable = false;
    
    var selectedCategory = this.props.selectedCategory;

    var defaultBold = false,
        defaultOpacity = 0.3;
    if (Object.keys(selectedCategory).length === 0) {
      
      defaultBold = true;
      defaultOpacity = 1;
    }

    var _this = this;
    
    var Component;
    return (
      <div id="clusterLegendContainer">
        <h2>Catégories</h2>
        <div className="columns">
          <div className="leftColumn">
            {
              defaultCategories.map(function(category, i) {
                if (i < 3) {
                  var catInfo = _this.props.categoriesData[category] || {};
                  var color = catInfo.color || defaultColor;
                  var clickable = Object.keys(catInfo).length === 0 ? false : true;
                  return <ClusterLegend key={category}
                                        onCategoryChange={_this.props.onCategoryChange}
                                        category={category}
                                        color={color}
                                        bold={category === selectedCategory.label ? true: defaultBold}
                                        opacity={category === selectedCategory.label ? 1: defaultOpacity}
                                        clickable={clickable}/>
                }
              })
            }
          </div>
          <div className="rightColumn">
            {
              defaultCategories.map(function(category, i) {
                if (i >= 3) {
                  var catInfo = _this.props.categoriesData[category] || {};
                  var color = catInfo.color || defaultColor;
                  var clickable = Object.keys(catInfo).length === 0 ? false : true;
                  return <ClusterLegend key={category}
                                        onCategoryChange={_this.props.onCategoryChange}
                                        category={category}
                                        color={color}
                                        bold={category === selectedCategory.label ? true: defaultBold}
                                        opacity={category === selectedCategory.label ? 1: defaultOpacity}
                                        clickable={clickable}/>
                }
              })
            }
          </div>
        </div>
      </div>
    );
  }
});

var GraphStats = React.createClass({
  render: function() {
    return (
      <div id="graphStats">
        <h2>Informations Générales</h2>
        <ul>
          <li><span className="bold">Nombre de noeuds:</span> 65</li>
          <li><span className="bold">Nombre de liens:</span> 21321</li>
        </ul>
      </div>
    );
  }
});

var TopWordsGlobal = React.createClass({
  render: function() {
    var number = 10;
    var _this = this;
    var wordIndex = this.props.wordIndex;
    var topArray = [];
    Object.keys(wordIndex).sort(function(a, b){
      return wordIndex[b].frequency - wordIndex[a].frequency;
    }).forEach(function(e, i) {
      if (i >= number) {
        return;
      }
      else {
        topArray.push({
          word: wordIndex[e].label,
          count: wordIndex[e].frequency
        });
      }
    });

    return (
      <div id="topWordsGlobal">
        <h2>Top {number} des mots</h2>
        <div className="columns">
          <div className="leftColumn">
            <ul className="noTopMargin">
              {
                topArray.map(function(e, i) {
                  if (i < number/2) {
                    return (
                      <li key={i}><span className="bold">{i+1}. {e.word}</span> - {e.count} fois</li>
                    )
                  }
                })
              }
            </ul>
          </div>
          <div className="rightColumn">
            <ul className="noTopMargin">
              {
                topArray.map(function(e, i) {
                  if (i >= number/2) {
                    return (
                      <li key={i}><span className="bold">{i+1}. {e.word}</span> - {e.count} fois</li>
                    )
                  }
                })
              }
            </ul>
          </div>
        </div>
      </div>
    );
  }
});

var TopCategories = React.createClass({
  render: function() {
    var categoriesData = this.props.categoriesData;
    var topArray = []
    Object.keys(categoriesData).sort(function(a, b) {
      return categoriesData[b].count - categoriesData[a].count
    }).forEach(function(e, i) {
      if (e !== 'undefined' && e !== '') {
        topArray.push({
          label: categoriesData[e].label,
          count: categoriesData[e].count
        });
      }
    });
    return (
      <div id="topCategories">
        <h2>Classement des catégories</h2>
        <ul>
          {
            topArray.map(function(e, i) {
              return (
                <li key={i}><span className="bold">{i+1}. {e.label}</span> - {e.count} mots</li>
              );
            })
          }
        </ul>
      </div>
    );
  }
});


var BottomBox = React.createClass({
  render: function() {
    return (
      <div id="graphInfo">
        <ClusterLegendContainer categoriesData={this.props.categoriesData}
                                selectedCategory={this.props.selectedCategory}
                                onCategoryChange={this.props.onCategoryChange}/>
        <TopWordsGlobal wordIndex={this.props.wordIndex}/>
        <TopCategories categoriesData={this.props.categoriesData}/>
      </div>
    );
  }
});

//Wrap up all the components of the page
var BoxesContainer = React.createClass({
  getInitialState: function() {
    return {
      yearGroup: 1995,
      selectedWord: {},
      selectedCategory: {},
      categoriesIndex: {},
      wordIndex: {}
    };
  },
  handleYearChange: function(year) {
    this.setState({
      yearGroup: year,
      selectedWord: {},
      selectedCategory: {}
    });
  },
  handleSelectNode: function(node) {
    this.setState({selectedWord: node, selectedCategory:{}});
  },
  handleSelectCategory: function(categoryName) {
    this.setState({
      selectedCategory: this.state.categoriesIndex[categoryName],
      selectedWord:{}
    });
  },
  handleCategoriesIndexChange: function(catIndex) {
    this.setState({categoriesIndex: catIndex});
  },
  handleWordIndexChange: function(wordIndex) {
    this.setState({wordIndex: wordIndex});
  },
  render: function() {
    return (
      <div>
        <div id="boxesContainer">
          <MainGraphContainer yearGroup={this.state.yearGroup}
                              onCategoryIndexChange={this.handleCategoriesIndexChange}
                              onWordIndexChange={this.handleWordIndexChange}
                              selectedCategory={this.state.selectedCategory}
                              onNodeChange={this.handleSelectNode} />
          <RightBox onYearChange={this.handleYearChange}
                    nodeData={this.state.selectedWord}
                    categoryData={this.state.selectedCategory}/>
        </div>
        <BottomBox categoriesData={this.state.categoriesIndex}
                   wordIndex={this.state.wordIndex}
                   selectedCategory={this.state.selectedCategory}
                   onCategoryChange={this.handleSelectCategory}/>
      </div>
    );
  }
});


ReactDOM.render(
  <BoxesContainer/>,
  document.getElementById('mainContainer')
);
