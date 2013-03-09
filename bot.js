// Let's invite people to the party !
var irc = require('irc'), fs = require('fs');

// Messages logging
var linesBuffer=[],
	bufferTimeout,
 	IRC_SRV='irc.freenode.net',
 	IRC_PORT=8002,
 	BOT_NAME='FranceJSBot',
 	BOT_REAL_NAME='Robot FranceJS',
 	MAIN_CHANNEL='#francejs', // seconds
 	BUFFER_TIMEOUT=6, // seconds
 	BUFFER_SIZE=10, // lines
	LOG_DIR='logs'; // rel to script path

// Write messages to the log when timeout is fired
function writeMessages()
	{
	fs.appendFile(__dirname+'/'+LOG_DIR+'/irc.log', linesBuffer.join('\n')+'\n', function(err)
		{
		console.log(err||"Message buffer saved!");
		});
	linesBuffer.length=0;
	}
// Add message to buffer
function logMessage(from,message)
	{
	if(linesBuffer.length<BUFFER_SIZE&&bufferTimeout)
		clearTimeout(bufferTimeout);
	linesBuffer.push('"'+from+'","'+message+'",'+Date.now());
	bufferTimeout=setTimeout(writeMessages,BUFFER_TIMEOUT*1000);
	}

// Commands
function executeCommand(command)
	{
	switch(command.split(' ')[0])
		{
		case 'ls':
			return ['I understand the following commands :',
				'- ls/commands : list commands',
				'- hello/lo : kinda cool to say hello !',
				'- seen <nickname> : last connection of <nickname> (not implemented)',
				'- watch <nickname> : tells you when <nickname> talk (not implemented)',
				'- unwatch <nickname> : stops telling you when <nickname> talk (not implemented)',
				'- diffuse <message> : diffuse a message to each js chan (#parisjs, #francejs) (not implemented)',
				'- log <n> <start> <date> : give the <n> messages from <start> on <date> (not implemented)',
				'- todo : adds items todo (not implemented)'];
		case 'lo':
		case 'hello':
			return ['Hi ! Nice to see you !'];
		case 'seen':
		case 'watch':
		case 'unwatch':
		case 'diffuse':
		case 'log':
		case 'todo':
			return ['Not implemented, but feel free to : http://github.com/francejs'];
		}
	return ["You\'re talking to me ??"];
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
	console.log(from + ' => '+MAIN_CHANNEL+': ' + message);
	logMessage(from, message);
	// Looking for a comand to execute
	if(-1!==message.indexOf(BOT_NAME))
		{
		executeCommand(message.replace(botRegExp,'')).forEach(function(msg,i)
			{
			client.say(MAIN_CHANNEL,(i===0?from +': ':'')+ msg);
			});
		}
	});

client.addListener('pm', function (from, message)
	{
	executeCommand(message).forEach(function(msg)
		{
		client.say(from, msg);
		});
	});

client.addListener('error', function(message)
	{
	console.log('error: ', message);
	});
