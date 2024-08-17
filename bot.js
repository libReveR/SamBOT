// SamBOT ~ Script author by ReveR (Batu)
// İyi kullanımlar dilerim, bir sorun olursa discord adresim 'benbatuya' ekleyebilirsiniz yardımcı olurum.

const { Client, GatewayIntentBits } = require('discord.js');
const ytdl = require('ytdl-core');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const queue = new Map();

client.once('ready', () => {
  console.log('Ready!');
});

client.on('messageCreate', async message => {
  if (message.content.startsWith('!play')) {
    const args = message.content.split(' ');
    const url = args[1];

    if (!ytdl.validateURL(url)) {
      return message.reply('Geçerli bir YouTube URL\'si girin.');
    }

    const serverQueue = queue.get(message.guild.id);

    if (!serverQueue) {
      const queueConstruct = {
        textChannel: message.channel,
        voiceChannel: message.member.voice.channel,
        connection: null,
        songs: [],
        playing: true
      };

      queue.set(message.guild.id, queueConstruct);
      queueConstruct.songs.push(url);

      try {
        const connection = await message.member.voice.channel.join();
        queueConstruct.connection = connection;
        play(message.guild, queueConstruct.songs[0]);
      } catch (err) {
        console.log(err);
        queue.delete(message.guild.id);
        return message.channel.send(err);
      }
    } else {
      serverQueue.songs.push(url);
      return message.channel.send(`Şarkı sıraya eklendi: ${url}`);
    }
  } else if (message.content.startsWith('!skip')) {
    skip(message, queue);
  } else if (message.content.startsWith('!stop')) {
    stop(message, queue);
  } else if (message.content.startsWith('!volume')) {
    const args = message.content.split(' ');
    const volume = parseFloat(args[1]);

    if (isNaN(volume) || volume < 0 || volume > 1) {
      return message.reply('Lütfen 0 ile 1 arasında bir ses seviyesi girin.');
    }

    const serverQueue = queue.get(message.guild.id);
    if (serverQueue && serverQueue.connection.dispatcher) {
      serverQueue.connection.dispatcher.setVolume(volume);
      return message.reply(`Ses seviyesi ayarlandı: ${volume}`);
    } else {
      return message.reply('Şu anda çalan bir şarkı yok.');
    }
  } else if (message.content.startsWith('!queue')) {
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue) {
      return message.reply('Kuyrukta şarkı yok.');
    }

    let queueMessage = 'Şarkı Kuyruğu:\n';
    serverQueue.songs.forEach((song, index) => {
      queueMessage += `${index + 1}. ${song}\n`;
    });

    return message.reply(queueMessage);
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
    .play(ytdl(song, { filter: 'audioonly' }))
    .on('finish', () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on('error', error => console.error(error));

  serverQueue.textChannel.send(`Şu an çalıyor: ${song}`);
}

function skip(message, queue) {
  const serverQueue = queue.get(message.guild.id);
  if (!message.member.voice.channel) {
    return message.channel.send('Önce bir ses kanalına katılmalısınız!');
  }
  if (!serverQueue) {
    return message.channel.send('Atlayacak şarkı yok!');
  }
  serverQueue.connection.dispatcher.end();
}

function stop(message, queue) {
  const serverQueue = queue.get(message.guild.id);
  if (!message.member.voice.channel) {
    return message.channel.send('Önce bir ses kanalına katılmalısınız!');
  }
  if (!serverQueue) {
    return message.channel.send('Durduracak şarkı yok!');
  }
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

client.login(token);
