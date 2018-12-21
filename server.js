const Discord = require('discord.js')
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');
const queue = new Map();
const client = new Discord.Client({disableEveryone: true});
const fs = require('fs' );
let config = require('./config.json');
var servers = {};
const youtube = new YouTube(config.YT_KEY);

client.on('ready', () => {
console.log('Ready')
});

client.on("message", async message => {

 if(message.author.bot) return;
  if(message.channel.type === "dm") return;

    var args2 = message.content.substring(config.prefix.length).split(" ");
    if (!message.content.startsWith(config.prefix)) return;
  var searchString = args2.slice(1).join(' ');
  var url = args2[1] ? args2[1].replace(/<(.+)>/g, '$1') : '';
  var serverQueue = queue.get(message.guild.id);
    switch (args2[0].toLowerCase()) {
      case "play":
    var voiceChannel = message.member.voiceChannel;
    if (!voiceChannel) return message.channel.send('You need to be in voice channel first!');
    var permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT')) {
      const errorconnect = new Discord.RichEmbed()
            .setColor(`RED`)
      .setFooter(`This message will be deleted in 10 seconds..`)
      .setDescription(`I couldn't connect into your voice channel, Missing **CONNECT** Permission.`)
      return message.channel.send(errorconnect).then(message => {
        message.delete(10000)
      })
    }
    if (!permissions.has('SPEAK')) {
      const errorspeak = new Discord.RichEmbed()
      .setColor(`RED`)
      .setFooter(`This message will be deleted in 10 seconds..`)
      .setDescription(`I couldn't speak at your voice channel, Missing **SPEAK** Permission.`)
      return message.channel.send(errorspeak).then(message => {
        message.delete(10000)
      })
    }
      if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
      var playlist = await youtube.getPlaylist(url);
      var videos = await playlist.getVideos();
      for (const video of Object.values(videos)) {
        var video2 = await youtube.getVideoByID(video.id);
        await handleVideo(video2, message, voiceChannel, true);
      }
        const playlistembed = new Discord.RichEmbed()
        .setColor(`GREEN`)
        .setDescription(`âœ… ${playlist.title} has been added to the queue!`)
      return message.channel.send(playlistembed);
    } else {
      try {
        var video = await youtube.getVideo(url);
      } catch (error) {
        try {
          var videos = await youtube.searchVideos(searchString, 9);
          var index = 0;
          let selectionemb = new Discord.RichEmbed()
          .setTitle(`:notes: Song selection`)
          .setDescription(`${videos.map(video2 => `**${++index} -** [${video2.title}](${video2.url})`).join('\n')}`)
          .setFooter('ðŸ”Ž Please provide a number to select one of the search results ranging from 1-9.')
          .setColor('#0fe709')
          message.channel.send(selectionemb).then(message => {
            message.delete(11000)
          })
          // eslint-disable-next-line max-depth
          try {
            var response = await message.channel.awaitMessages(message2 => message2.content > 0 && message2.content < 10, {
              maxMatches: 1,
              time: 10000,
              errors: ['time']
            });
          } catch (err) {
            console.error(err);
            let noinvemb = new Discord.RichEmbed()
            .setDescription('No or invalid value entered, cancelling video selection.')
            .setColor('#e41016')
            return message.channel.send(noinvemb).then(message => {
              message.delete(5000)
            })
          }
          var videoIndex = parseInt(response.first().content);
          var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
        } catch (err) {
          console.error(err);
          return message.channel.send('Can\'t find the video');
        }
      }
      return handleVideo(video, message, voiceChannel);
    }
        break;
      case "skip":
    if (!message.member.voiceChannel) return message.channel.send('You are not in a voice channel!');
    if (!serverQueue) return message.channel.send('There is nothing playing.');
    serverQueue.connection.dispatcher.end('Skip command has been used!');
        message.channel.send(':ok_hand: Skipped!')
    return undefined;
        break;
      case "np":
    if (!serverQueue) return message.channel.send('There is nothing playing.');
        let nowplayingemb = new Discord.RichEmbed()
        .setDescription(`ðŸŽ¶ Now playing: **${serverQueue.songs[0].title}**`)
        .setColor(`GREEN`)
    return message.channel.send(nowplayingemb);
break;
 case "queue":
    if (!serverQueue) return message.channel.send('No music playing right now.');
        let queueemb = new Discord.RichEmbed()
        .setAuthor(`${message.guild.name} Queue list `)
        .setDescription(`${serverQueue.songs.map(song => `**â€¢** [${song.title}](https://www.youtube.com/watch?v=${song.id}})`).join('\n')}\n\nðŸŽ¶ **Now playing:** ${serverQueue.songs[0].title}`)
        .setColor(`GREEN`)
    return message.channel.send(queueemb)
break;
     case "loop":
       const serverQueue = queue.get(message.guild.id);
 	if (!message.member.voiceChannel) return message.channel.send({ embed: { description: 'Please Connect To A Voice Channel To Loop The Song!'}});
    if(serverQueue.voiceChannel.id !== message.member.voiceChannel.id) return message.channel.send({ embed: { color: 0xf91d1d, description: `You must be in **${serverQueue.voiceChannel.name}** to skip the song`}});
		if (!serverQueue) return message.channel.send({ embed: { description: 'There Is Nothing Playing In The Server Right Now'}});
  serverQueue.loop.single = !serverQueue.loop.single;
  client.queue.set(message.guild.id, serverQueue);
  if(serverQueue.loop.single) return message.channel.send({ embed: { description: '🔁 Looping Current Song.'}});
  return message.channel.send({ embed: { description: 'Sucessfully Loop off.'}});
      break;
 case "stop":
    if (!message.member.voiceChannel) return message.channel.send('Please connect to a voice channel.');

     message.guild.me.voiceChannel.leave();

  return message.channel.send('**Successfully Leaved**')
  break;
}
async function handleVideo(video, message, voiceChannel, playlist = true) {
  var serverQueue = queue.get(message.guild.id);
  console.log(video);
  var song = {
    id: video.id,
    title: video.title,
    url: `https://www.youtube.com/watch?v=${video.id}`,
    channel: video.channel.title,
    durationm: video.duration.minutes,
    durations: video.duration.seconds,
    durationh: video.duration.hours,
    publishedAt: video.publishedAt,
  };
  if (!serverQueue) {
    var queueConstruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };
    queue.set(message.guild.id, queueConstruct);

    queueConstruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      var listener = await voiceChannel.join();
      connection.on('error', console.error);
      queueConstruct.connection = connection;
      play(message.guild, queueConstruct.songs[0]);
    } catch (error) {
      queue.delete(message.guild.id);
      return message.channel.send(`I could not join the voice channel: ${error}`);
    }
  } else {
    serverQueue.songs.push(song);
    console.log(serverQueue.songs);
    if (playlist) return undefined;
    let queueemb = new Discord.RichEmbed()
    .setAuthor(`Added to ${message.guild.name} Queue list`, message.author.displayAvatarURL)
    .setColor(`0xff3262`)
    .addField(`Publisher:`, `${song.channel}`, true)
    .addField(`Video ID:`, song.id , true)
    .setFooter(`Video Published At ${song.publishedAt}`)
    .addField(`Duration:`, `**${song.durationh}** hours, **${song.durationm}** minutes, **${song.durations}** seconds`, true)
    .setThumbnail(`https://i.ytimg.com/vi/${song.id}/sddefault.jpg`)
    .setDescription(`[${song.title}](https://www.youtube.com/watch?v=${song.id}})`)
    .setColor(`GREEN`)
    return message.channel.send(queueemb).then(msg => {
      message.delete(10000)
    })
  }
  return undefined;
}
  function play(guild, song) {
  var serverQueue = queue.get(guild.id);

  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }
  console.log(serverQueue.songs);

  const dispatcher = serverQueue.connection.playStream(ytdl(song.url))

  .on('end', reason => {
      if (reason === 'Stream is not generating quickly enough.') console.log('Song ended.');
      else console.log(reason);
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
  .on('error', error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    let playingemb = new Discord.RichEmbed()
    .setTitle(`:notes: Now playing`)
    .setColor(`GREEN`)
    .addField(`Publisher:`, `${song.channel}`, true)
    .addField(`Video ID:`, song.id, true)
    .setFooter(`Video Published At ${song.publishedAt}`)
    .addField(`Duration:`, `**${song.durationh}** hours, **${song.durationm}** minutes, **${song.durations}** seconds`, true)
    .setThumbnail(`https://i.ytimg.com/vi/${song.id}/sddefault.jpg`)
    .setDescription(`[${song.title}](https://www.youtube.com/watch?v=${song.id}})`)
    .setTimestamp()

    serverQueue.textChannel.send(playingemb);

}
  const prefix = config.prefix
  let messageArray = message.content.split(" ");
  let cmd = messageArray[0];
  let args = messageArray.slice(1);

    if(cmd === `${prefix}help`) {
  let bicon = client.user.displayAvatarURL;
  let support = new Discord.RichEmbed()
.setAuthor(client.user.username)
.setThumbnail(bicon)
.setColor("RANDOM")
.setTitle("**My Commands**")
.addField(`${prefix}play`,"To Play Music")
.addField(`${prefix}skip`,"To Skip Music")
.addField(`${prefix}np`,"To See Now Playing Music")
.addField(`${prefix}queue`,"To See Server Queue")
.addField(`${prefix}stop`,"To Leave The Vc")
.addField(`${prefix}radio`,"Listen.Moe Radio")
.setTimestamp()
.setFooter('Reqeuested By ' + message.author.tag)

message.channel.send(support);
  }
});

client.login(process.env.TOKEN)
