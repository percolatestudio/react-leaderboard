var POINTS = 5;

var Leaderboard = React.createClass({
  propTypes: {
    collection: React.PropTypes.instanceOf(Mongo.Collection).isRequired
  },
  
  getInitialState: function() {
    return {
      players: [],
      selectedPlayerId: null
    };
  },
  
  componentWillMount: function() {
    var getPlayers = function() {
      var players = this.props.collection.find({}, {sort: {score: -1}}).fetch();
      this.setState({players: players});
    }.bind(this);
    
    // XXX: For some reason Tracker throws something about fibers when I try to
    // create the autorun on the server, this is valid as I don't actuall want
    // an autorun but I'd like to know why.
    if (Meteor.isClient) {
      this.dep = Tracker.autorun(function() { getPlayers(); }.bind(this));
    } else {
      getPlayers();
    }
  },
  
  componentWillUnmount: function() {
    this.dep.stop();
  },
  
  handlePlayerSelected: function(id) {
    this.setState({selectedPlayerId: id});
  },
  
  handleAddPoints: function() {
    this.props.collection.update(this.state.selectedPlayerId, {$inc: {score: POINTS}});
  },
  
  render: function() {
    return (
      <div className="leaderboard">
        <PlayerList state={this.state} onPlayerSelected={this.handlePlayerSelected} />
        <PlayerSelector state={this.state} onAddPoints={this.handleAddPoints} />
      </div>
    );
  }
});

var PlayerSelector = React.createClass({
  propTypes: {
    state: React.PropTypes.object.isRequired
  },
  
  selectedPlayerName: function() { 
    var player = _.find(this.props.state.players, function(x) { 
      return x._id === this.props.state.selectedPlayerId;
    }.bind(this));

    return player && player.name; 
  },
  
  render: function() {
    var selectedName = this.selectedPlayerName();
    var node;
    
    if (selectedName) {
      node = <div className="details">
        <div className="name">{selectedName}</div>
        <button className="inc" onClick={this.props.onAddPoints}>Add {POINTS} points</button>
      </div>;
    } else {
      node = <div className="message">Click a player to select</div>;
    }
  
    return node;
  }
});

var PlayerList = React.createClass({
  propTypes: {
    state: React.PropTypes.object.isRequired
  },
  
  render: function() {
    // harmony destructuring assignment
    var { state, ...other } = this.props;

    var playerNodes = state.players.map(function(player, index) {
      var selected = state.selectedPlayerId === player._id;

      return (
        <Player {...other} player={player} key={index} selected={selected} />
      );
    });
    return (
      <div className="playerList">
        {playerNodes}
      </div>
    );
  }
});

var Player = React.createClass({
  propTypes: {
    // This could check instancOf Player if we had models
    player: React.PropTypes.object.isRequired,
    onPlayerSelected: React.PropTypes.func.isRequired,
    selected: React.PropTypes.bool.isRequired
  },
  
  handleClick: function(event) {
    this.props.onPlayerSelected(this.props.player._id);
  },
  
  render: function() {
    // just sugar. classes could be a String of class names
    var classes = React.addons.classSet({
      'player': true,
      'selected': this.props.selected
    });

    return (
      <li className={classes} onClick={this.handleClick}>
        <span className="name">{this.props.player.name}</span>
        <span className="score">{this.props.player.score}</span>
      </li>
    );
  }
});

var Body = React.createClass({
  propTypes: {
    collection: React.PropTypes.instanceOf(Mongo.Collection).isRequired,
    where: React.PropTypes.string.isRequired
  },

  render: function() {
    return (
      <div className="app">
        <h3>Rendered on the {this.props.where}</h3>
        <div className="outer">
          <div className="logo"></div>
          <h1 className="title">Leaderboard</h1>
          <div className="subtitle">Select a scientist to give them points</div>
        </div>
        <Leaderboard collection={Players} />
      </div>
    );
  }
});

if (Meteor.isServer) {
  // add a raw connect handler for / that renders the body with react.
  var url = Npm.require("url");
  
  WebApp.rawConnectHandlers.use(
    Meteor.bindEnvironment(function(req, res, next) {
      if (url.parse(req.url).path === '/') {
        req.body =
          React.renderToString(<Body collection={Players} where='server' />);
      }

      next();
    }, 'ssr-router')
  );
} else {
  // on the client, just render to the body
  Meteor.startup(function() {
    // wait 3 seconds to show folks that the output is indeed server rendered
    Meteor.setTimeout(function() {
      React.render(<Body collection={Players} where='client' />, document.body);
    }, 3000);
  });
}

