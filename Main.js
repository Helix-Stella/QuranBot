const { Client, GatewayIntentBits } = require('discord.js'); // Import the necessary classes
const ytdl = require('ytdl-core');
const { YTSearcher } = require('ytsearcher');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates
  ]
});
const prefix = '-';

const queue = new Map();
const searcher = new YTSearcher({
  key: 'AIzaSyDD9a-HBV8hXYAYiAOqkUz78zSP-x65feM',
  revealed: true,
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('message', async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  const serverQueue = queue.get(message.guild.id);

  if (command === '24/7') {
    if (!message.member.voice.channel) {
      return message.reply('You need to be in a voice channel to use this command.');
    }

    const permissions = message.member.voice.channel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
      return message.reply('I need the permissions to join and speak in your voice channel.');
    }

    const query = 'https://www.youtube.com/watch?v=dYhV2Hl0UUA';
    const video = await searcher.search(query, { type: 'video' });

    const songInfo = {
      title: video.first.title,
      url: video.first.url,
    };

    const song = {
      title: songInfo.title,
      url: songInfo.url,
    };

    if (!serverQueue) {
      const queueContruct = {
        textChannel: message.channel,
        voiceChannel: message.member.voice.channel,
        connection: null,
        songs: [],
        volume: 5,
        playing: true,
      };

      queue.set(message.guild.id, queueContruct);
      queueContruct.songs.push(song);

      try {
        const connection = await message.member.voice.channel.join();
        queueContruct.connection = connection;
        play(message.guild, queueContruct.songs[0]);
      } catch (err) {
        console.error(err);
        queue.delete(message.guild.id);
        return message.channel.send(err);
      }
    } else {
      serverQueue.songs.push(song);
      return message.channel.send(`${song.title} has been added to the queue!`);
    }
  } else if (command === 'disconnect') {
    if (serverQueue && serverQueue.playing) {
      serverQueue.playing = false;
      serverQueue.connection.dispatcher.end();
      message.channel.send('Leaving the voice channel.');
    }
  } else if (command === 'v') {
    const volume = parseInt(args[0]);
    if (!isNaN(volume) && volume >= 1 && volume <= 100) {
      if (serverQueue) {
        serverQueue.volume = volume;
        serverQueue.connection.dispatcher.setVolumeLogarithmic(volume / 100);
        message.channel.send(`Volume set to ${volume}`);
      }
    } else {
      message.channel.send('Please provide a valid volume between 1 and 100.');
    }
  }
});

function play(guild, song) {
  const serverQueue = queue.get(guild.id);

  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url), { quality: 'highestaudio' })
    .on('finish', () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on('error', (error) => console.error(error));
  
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 100);
  serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

// Replace 'YOUR_TOKEN' with your actual bot token
client.login('MTE0NjQxNDY0OTE3NzI5Mjg3Mg.GBXrhY.nOn7GNQigD1jY4SAhTjvChABjTtpev4yEV4bCo');
