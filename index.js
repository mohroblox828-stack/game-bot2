const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const PREFIX = '$';
const IMAGES = {
  roulette: 'https://cdn.discordapp.com/attachments/1494968677802709012/1512839852586959079/69_20260605130503.png',
  mafia: 'https://cdn.discordapp.com/attachments/1494968677802709012/1512839852586959079/69_20260605130503.png',
  panel: 'https://cdn.discordapp.com/attachments/1505992163043966986/1512837463876304916/69_20260605130503.png'
};

const points = new Map();
const activeGames = new Map();

client.once('ready', () => { console.log('Game Bot Online!'); client.user.setActivity('$العاب', { type: 3 }); });

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();

  if (cmd === 'العاب') {
    const embed = new EmbedBuilder().setTitle('🎮 | الألعاب').setDescription('`$روليت` | `$مافيا` | `$ريبلكا` | `$نقاط`').setColor('#8B5CF6');
    await message.channel.send({ embeds: [embed] });
  }

  if (cmd === 'روليت') {
    if (activeGames.has('r-' + message.channel.id)) return message.reply('⚠️ فيه لعبة شغالة!');
    activeGames.set('r-' + message.channel.id, true);
    startRoulette(message);
  }

  if (cmd === 'مافيا') {
    if (activeGames.has('m-' + message.channel.id)) return message.reply('⚠️ فيه لعبة شغالة!');
    activeGames.set('m-' + message.channel.id, true);
    startMafia(message);
  }

  if (cmd === 'ريبلكا') {
    message.reply('🤖 اكتب كلمة وأكررها! `$خروج` للإنهاء.');
    startReplica(message);
  }

  if (cmd === 'نقاط' || cmd === 'نقاطي') {
    const pts = points.get(message.author.id) || 0;
    await message.channel.send(`💎 | <@${message.author.id}> معاك **${pts}** نقطة!`);
  }

  if (cmd === 'ايقاف') {
    for (const [key] of activeGames) { if (key.includes(message.channel.id)) activeGames.delete(key); }
    await message.channel.send('⏹️ | تم إيقاف اللعبة.');
  }
});

async function startRoulette(message) {
  let players = [];
  const joinBtn = new ButtonBuilder().setCustomId('rj').setLabel('🎯 دخول').setStyle(ButtonStyle.Success);
  const exitBtn = new ButtonBuilder().setCustomId('re').setLabel('🚪 خروج').setStyle(ButtonStyle.Danger);
  const row = new ActionRowBuilder().addComponents(joinBtn, exitBtn);
  const lobbyMsg = await message.channel.send({ content: `**🎡 | روليت**\n👥: **0** | (4-100)\n⏳ دقيقتين`, files: [IMAGES.roulette], components: [row] });
  const collector = lobbyMsg.createMessageComponentCollector({ time: 120000 });

  collector.on('collect', async (i) => {
    if (i.customId === 'rj') {
      if (!players.find(p => p.id === i.user.id)) {
        if (players.length >= 100) return i.reply({ content: '⚠️ العدد اكتمل!', ephemeral: true });
        players.push({ id: i.user.id, name: i.user.username });
        await i.reply({ content: '✅ دخلت!', ephemeral: true });
      } else { await i.reply({ content: '⚠️ أنت داخل!', ephemeral: true }); }
    }
    if (i.customId === 're') { players = players.filter(p => p.id !== i.user.id); await i.reply({ content: '👋 خرجت!', ephemeral: true }); }
    await lobbyMsg.edit({ content: `**🎡 | روليت**\n👥: **${players.length}** | (4-100)\n⏳ دقيقتين` });
  });

  collector.on('end', async (_, reason) => {
    if (reason === 'forced') { activeGames.delete('r-' + message.channel.id); return; }
    if (players.length < 4) { activeGames.delete('r-' + message.channel.id); return message.channel.send(`❌ | عدد غير كافي (${players.length}/4).`); }
    await message.channel.send(`🕹️ | بدأت! **${players.length}** لاعبين.`);
    await playRound(message, players);
  });
}

async function playRound(message, players) {
  if (players.length === 2) {
    const winner = players[Math.floor(Math.random() * players.length)];
    const loser = players.find(p => p.id !== winner.id);
    const prize = Math.floor(Math.random() * 21) + 10;
    points.set(winner.id, (points.get(winner.id) || 0) + prize);
    const embed = new EmbedBuilder().setTitle('🏆 | اخر اثنين!').setDescription(`**${winner.name}** 🆚 **${loser.name}**\n🎉 | **${winner.name}** فاز! +${prize} 💎`).setColor('#FFD700');
    await message.channel.send({ embeds: [embed] });
    activeGames.delete('r-' + message.channel.id);
    return;
  }
  if (players.length === 1) {
    const winner = players[0];
    const prize = Math.floor(Math.random() * 21) + 10;
    points.set(winner.id, (points.get(winner.id) || 0) + prize);
    await message.channel.send(`👑 | **${winner.name}** فاز! +${prize} 💎`);
    activeGames.delete('r-' + message.channel.id);
    return;
  }

  const chooser = players[Math.floor(Math.random() * players.length)];
  const others = players.filter(p => p.id !== chooser.id);
  const embed = new EmbedBuilder().setTitle('🎯 | الدور').setDescription(`<@${chooser.id}> **${chooser.name}**، اختار لاعب!`).setColor('#3B82F6').setFooter({ text: `${players.length} لاعبين | 15 ثانية` });

  const rows = [];
  for (let i = 0; i < others.length; i += 5) {
    const chunk = others.slice(i, i + 5);
    rows.push(new ActionRowBuilder().addComponents(...chunk.map(p => new ButtonBuilder().setCustomId('k-' + p.id).setLabel(p.name.slice(0, 80)).setStyle(ButtonStyle.Danger))));
  }
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('kr').setLabel('🎲 عشوائي').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('kn').setLabel('☢️ نووي').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ks').setLabel('🚫 انسحاب').setStyle(ButtonStyle.Secondary)
  ));

  const roundMsg = await message.channel.send({ content: `<@${chooser.id}>`, embeds: [embed], components: rows });
  const filter = i => i.user.id === chooser.id;
  const roundCollector = roundMsg.createMessageComponentCollector({ filter, time: 15000, max: 1 });

  roundCollector.on('collect', async (i) => {
    let target;
    if (i.customId === 'kr') target = others[Math.floor(Math.random() * others.length)];
    else if (i.customId === 'kn') {
      if (others.length >= 2) {
        const t1 = others[Math.floor(Math.random() * others.length)];
        const t2 = others.filter(p => p.id !== t1.id)[Math.floor(Math.random() * (others.length - 1))];
        players = players.filter(p => p.id !== t1.id && p.id !== t2.id);
        await i.update({ content: `☢️ | **${chooser.name}** نووي! طرد 2`, components: [] });
        setTimeout(() => playRound(message, players), 2000);
        return;
      }
      target = others[Math.floor(Math.random() * others.length)];
    } else if (i.customId === 'ks') {
      players = players.filter(p => p.id !== chooser.id);
      await i.update({ content: `🚫 | **${chooser.name}** انسحب!`, components: [] });
      setTimeout(() => playRound(message, players), 2000);
      return;
    } else { target = players.find(p => p.id === i.customId.replace('k-', '')); }
    if (target) {
      players = players.filter(p => p.id !== target.id);
      await i.update({ content: `🚫 | **${chooser.name}** طرد **${target.name}**!`, components: [] });
      setTimeout(() => playRound(message, players), 2000);
    }
  });

  roundCollector.on('end', async (collected) => {
    if (collected.size === 0) {
      players = players.filter(p => p.id !== chooser.id);
      await message.channel.send(`⏰ | الوقت انتهى! **${chooser.name}** انطرد.`);
      setTimeout(() => playRound(message, players), 2000);
    }
  });
}

function startReplica(message) {
  const collector = message.channel.createMessageCollector({ filter: m => m.author.id === message.author.id, time: 60000 });
  collector.on('collect', async (m) => {
    if (m.content === '$خروج') { collector.stop(); return message.channel.send('👋 تم إنهاء الريبلكا!'); }
    const prize = Math.floor(Math.random() * 3) + 1;
    points.set(message.author.id, (points.get(message.author.id) || 0) + prize);
    await m.reply(`🤖: ${m.content}\n+${prize} 💎`);
  });
}

async function startMafia(message) {
  const joinBtn = new ButtonBuilder().setCustomId('mj').setLabel('🔪 دخول').setStyle(ButtonStyle.Danger);
  const exitBtn = new ButtonBuilder().setCustomId('me').setLabel('🚪 خروج').setStyle(ButtonStyle.Secondary);
  const row = new ActionRowBuilder().addComponents(joinBtn, exitBtn);
  const msg = await message.channel.send({ content: '**🔪 | مافيا**\n👥: **0** | (4-100)', files: [IMAGES.mafia], components: [row] });
  const players = [];
  const collector = msg.createMessageComponentCollector({ time: 60000 });

  collector.on('collect', async (i) => {
    if (i.customId === 'mj') { if (!players.includes(i.user.id)) { players.push(i.user.id); await i.reply({ content: '🔪 دخلت!', ephemeral: true }); } }
    if (i.customId === 'me') { players.splice(players.indexOf(i.user.id), 1); await i.reply({ content: '👋 خرجت!', ephemeral: true }); }
    await msg.edit({ content: `**🔪 | مافيا**\n👥: **${players.length}** | (4-100)` });
  });

  collector.on('end', async (_, reason) => {
    if (reason === 'forced') { activeGames.delete('m-' + message.channel.id); return; }
    if (players.length < 4) { activeGames.delete('m-' + message.channel.id); return message.channel.send(`❌ | عدد غير كافي (${players.length}/4).`); }
    const mafia = players[Math.floor(Math.random() * players.length)];
    await message.channel.send(`🔪 المافيا مخفي\n👥 المدنيين: ${players.filter(p => p !== mafia).length} لاعبين\n🎯 صوتوا بمنشن!`);
    const vc = message.channel.createMessageCollector({ filter: m => players.includes(m.author.id) && m.mentions.users.size > 0, time: 30000 });
    const votes = new Map();
    vc.on('collect', async (m) => { const t = m.mentions.users.first().id; if (t === m.author.id) return m.reply('❌ لا تصوت لنفسك!'); votes.set(m.author.id, t); await m.react('✅'); });
    vc.on('end', async () => {
      const count = {};
      for (const [, t] of votes) count[t] = (count[t] || 0) + 1;
      const eliminated = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
      if (eliminated && eliminated[0] === mafia) {
        for (const p of players) if (p !== mafia) points.set(p, (points.get(p) || 0) + 10);
        await message.channel.send(`🎉 **المدنيين فازوا!** المافيا كانت <@${mafia}>\n+10 💎 لكل مدني`);
      } else {
        points.set(mafia, (points.get(mafia) || 0) + 15);
        await message.channel.send(`💀 **المافيا فازت!** <@${mafia}> +15 💎`);
      }
      activeGames.delete('m-' + message.channel.id);
    });
  });
}

client.login('MTUxMjQyMTkzMjQ1OTYyMjU0MA.GqtTwS.PVFpAqdStV1atc7-pjHi1cdqa_H3hlxW5x38no');
