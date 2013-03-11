// Let's invite people to the party !
var irc = require('irc'), fs = require('fs');

// vars
var	linesBuffer=[],
	bufferTimeout,
	watchs=[],
// consts
 	IRC_SRV='irc.freenode.net',
 	IRC_PORT=8002,
 	BOT_NAME='FranceJSBot',
 	BOT_REAL_NAME='Robot FranceJS',
 	MAIN_CHANNEL='#francejs',
 	BUFFER_TIMEOUT=6, // seconds
 	BUFFER_SIZE=10, // lines
	LOG_DIR='logs', // rel to script path
	IRC_EVENT_MSG=1,
	IRC_EVENT_JOIN=2,
	IRC_EVENT_PART=4,
	IRC_EVENT_TOPIC=8,
	IRC_EVENT_BOT=16;

// Write messages to the log when timeout is fired
function writeMessages()
	{
	var curDate=new Date();
	fs.appendFile(__dirname+'/'+LOG_DIR+'/irc-'+curDate.getDate()+'-'+curDate.getFullYear()+'.log',
		linesBuffer.join('\n')+'\n', function(err)
		{
		console.log(err||"Message buffer saved!");
		});
	linesBuffer.length=0;
	}

// Add message to buffer
function logMessage(type,fields)
	{
	var message;
	if(linesBuffer.length<BUFFER_SIZE&&bufferTimeout)
		clearTimeout(bufferTimeout);
	if(fields.length!==2)
		throw RangeError('Not enougth fields sent');
	// Saving message
	message=fields[1];
	// Escaping double quotes
	fields.forEach(function(item,i)
		{
		fields[i]='"'+item.replace(/"/g,'\\"')+'"';
		});
	// Adding log type and date
	fields.unshift(type,Date.now()); // unshift to keep CSV format extendable
	// Pushing to the buffer
	linesBuffer.push(fields.join(','));
	bufferTimeout=setTimeout(writeMessages,BUFFER_TIMEOUT*1000);
	return message;
	}

// Commands
function executeCommand(command,from)
	{
	switch(command.split(' ')[0].toLowerCase())
		{
		case 'ls':
		case 'help':
		case 'commands':
			return ['I understand the following commands :',
				'- ls/commands : list commands',
				'- hello/lo : kinda cool to say hello!',
				'- watch <nickname> : tells you when <nickname> talk',
				'- unwatch <nickname> : stops telling you when <nickname> talk',
				'- seen <nickname> : last connection of <nickname> (not implemented)',
				'- diffuse <message> : diffuse a message to each js chan (#parisjs, #francejs) (not implemented)',
				'- log <n> <start> <date> : give the <n> messages from <start> on <date> (not implemented)',
				'- todo : adds items todo (not implemented)'];
		case 'lo':
		case 'hello':
		case 'hi':
			return ['Hi! Nice to see you!'];
		case 'bitch':
		case 'bastard':
		case 'motherfucker':
		case 'fucker':
		case 'idiot':
		case 'git':
			return ['Nice to meet you "'+command.split(' ')[0]+'", I\'m '+BOT_NAME+', waiting for commands!'];
		case 'watch':
			var args=command.split(' ');
			if(args.length<2)
				return ['Not enought args given for the watch command.'];
			if(args[1]==BOT_NAME)
				return ['Bots have private life too.'];
			if(watchs[args[1]]&&-1!==watchs[args[1]].indexOf(from))
				return ['You\'re already watching '+args[1]+'.'];
			(undefined!==watchs[args[1]]&&watchs[args[1]].push(from)||(watchs[args[1]]=[from+'']));
			return ['Now you\'re watching '+args[1]+'.'];
		case 'unwatch':
			var args=command.split(' ');
			if(args.length<2)
				return ['Not enought args given for the unwatch command'];
			var index=watchs[args[1]].indexOf(from);
			if(watchs[args[1]]&&-1!==index&&watchs[args[1]].splice(index,1));
				return ['You unwatched '+args[1]+'.'];
			return ['You wasn\'t watching '+args[1]+'.'];
		case 'seen':
		case 'diffuse':
		case 'log':
		case 'todo':
			return ['Not implemented, but feel free to : https://github.com/francejs/irc-bot'];
		}
	return ["You\'re talking to me ?? Try ls."];
	}
	
// Starting IRC client
var client = new irc.Client(IRC_SRV, BOT_NAME,
	{
	realName: BOT_REAL_NAME,
	port: IRC_PORT,
	debug: true,
	channels: [MAIN_CHANNEL] //,'#parisjs'
	});

// Listening for messages
var botRegExp=new RegExp(BOT_NAME+'([ ,:]+)');
client.addListener('message'+MAIN_CHANNEL, function (from, message)
	{
	// Logging message
	logMessage(IRC_EVENT_MSG,[from, message]);
	// Looking for a comand to execute
	if(-1!==message.indexOf(BOT_NAME))
		{
		executeCommand(message.replace(botRegExp,''),from).forEach(function(msg,i)
			{
			client.say(MAIN_CHANNEL,logMessage(IRC_EVENT_MSG|IRC_EVENT_BOT,[BOT_NAME,(i===0?from +': ':'')+ msg]));
			});
		}
	// Telling watchers
	(watchs[from]||[]).forEach(function(watcher,i)
			{
			client.say(watcher,from +' said : '+ message);
			});
	});

client.addListener('pm', function (from, message)
	{
	executeCommand(message,from).forEach(function(msg)
		{
		client.say(from, msg);
		});
	});

// Listening for incoming people
client.addListener('join'+MAIN_CHANNEL, function (from, message)
	{
	if(-1!==from.indexOf(BOT_NAME))
		{
		logMessage(IRC_EVENT_JOIN|IRC_EVENT_BOT,[from, from+' join the chan.']);
		client.say(MAIN_CHANNEL, logMessage(IRC_EVENT_MSG|IRC_EVENT_BOT,[BOT_NAME,'Pouah! This chan is filled with humans.']));
		}
	else
		{
		logMessage(IRC_EVENT_JOIN,[from, from+' join the chan.']);
		// Enable this when someone connects for the first time only
		//client.say(MAIN_CHANNEL, logMessage(IRC_EVENT_MSG|IRC_EVENT_BOT,[BOT_NAME,'Welcome '+from+'. I obey to commands, not to humans.']));
		}
	});

// Listening for topic changes
client.addListener('topic', function (chan, topic, nick, message)
	{
	nick&&logMessage(IRC_EVENT_TOPIC,[nick, nick+' change topic to "'+topic+'"']);
	});

// Listening for leaving people
client.addListener('part'+MAIN_CHANNEL, function (from, message)
	{
	logMessage(IRC_EVENT_PART,[from, from+' leave the chan.']);
	});
client.addListener('quit', function (nick, reason, channels, message)
	{
	if(-1!==channels.indexOf(MAIN_CHANNEL))
		logMessage(IRC_EVENT_QUIT,[nick, nick+' leave the irc ('+reason+' '+message+').']);
	});

// Shoud listen for disconnections to discard watchs
// or not, people will assume that watchs are disconnect safe

client.addListener('error', function(message)
	{
	console.log('error: ', message);
	});
