// index.js (полная версия)

/**
 * Бот для управления законодательными процессами 
 * с поддержкой Государственных Дум и Совета Федерации
 * Made by Валерий Зорькин 
 * discord -        treak_
 */
import 'dotenv/config';
import { nanoid } from "nanoid";
import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  Events,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
  PermissionFlagsBits
} from "discord.js";
import db from "./database.js";

/* ================== CONFIG ================== */
// ВСЕ РАСПОЛОЖЕНЫ НА .ENV И НЕ ЗАГРУЖЕНО В РЕПАЗИТОРИЙ
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ID каналов для разных палат
const CHAMBER_CHANNELS = {
  'sf': process.env.SF_CHANNEL_ID,
  'gd_rublevka': process.env.GD_RUBLEVKA_CHANNEL_ID,
  'gd_arbat': process.env.GD_ARBAT_CHANNEL_ID,
  'gd_patricki': process.env.GD_PATRICKI_CHANNEL_ID,
  'gd_tverskoy': process.env.GD_TVERSKOY_CHANNEL_ID
};

// ID каналов для заседаний
const MEETING_CHANNELS = {
  'sf': process.env.SF_MEETING_CHANNEL_ID,
  'gd_rublevka': process.env.GD_RUBLEVKA_MEETING_CHANNEL_ID,
  'gd_arbat': process.env.GD_ARBAT_MEETING_CHANNEL_ID,
  'gd_patricki': process.env.GD_PATRICKI_MEETING_CHANNEL_ID,
  'gd_tverskoy': process.env.GD_TVERSKOY_MEETING_CHANNEL_ID
};

// ID ролей для упоминаний
const MEETING_MENTION_ROLES = {
  'sf': process.env.SF_MENTION_ROLE_ID,
  'gd_rublevka': process.env.GD_RUBLEVKA_MENTION_ROLE_ID,
  'gd_arbat': process.env.GD_ARBAT_MENTION_ROLE_ID,
  'gd_patricki': process.env.GD_PATRICKI_MENTION_ROLE_ID,
  'gd_tverskoy': process.env.GD_TVERSKOY_MENTION_ROLE_ID
};

// ID ролей для голосования
const VOTER_ROLES_BY_CHAMBER = {
  'sf': process.env.SF_VOTER_ROLE_ID,
  'gd_rublevka': process.env.GD_RUBLEVKA_VOTER_ROLE_ID,
  'gd_arbat': process.env.GD_ARBAT_VOTER_ROLE_ID,
  'gd_patricki': process.env.GD_PATRICKI_VOTER_ROLE_ID,
  'gd_tverskoy': process.env.GD_TVERSKOY_VOTER_ROLE_ID
};

// ID ролей
const ROLES = {
  SENATOR: process.env.SENATOR_ROLE_ID,
  SENATOR_NO_VOTE: process.env.SENATOR_NO_VOTE_ROLE_ID,
  DEPUTY: process.env.DEPUTY_ROLE_ID,
  DEPUTY_NO_VOTE: process.env.DEPUTY_NO_VOTE_ROLE_ID,
  CHAIRMAN: process.env.CHAIRMAN_ROLE_ID,
  VICE_CHAIRMAN: process.env.VICE_CHAIRMAN_ROLE_ID,
  GOVERNMENT_CHAIRMAN: process.env.GOVERNMENT_CHAIRMAN_ROLE_ID,
  PRESIDENT: process.env.PRESIDENT_USER_ID,
  // Роли для доступа к думам
  RUBLEVKA: process.env.RUBLEVKA_ROLE_ID,
  ARBAT: process.env.ARBAT_ROLE_ID,
  PATRICKI: process.env.PATRICKI_ROLE_ID,
  TVERSKOY: process.env.TVERSKOY_ROLE_ID
};

// ID тегов форума
const FORUM_TAGS = {
  ON_REVIEW: process.env.FORUM_TAG_ON_REVIEW,
  APPROVED: process.env.FORUM_TAG_APPROVED,
  REJECTED: process.env.FORUM_TAG_REJECTED,
  NOT_APPROVED: process.env.FORUM_TAG_NOT_APPROVED,
  SIGNED: process.env.FORUM_TAG_SIGNED,
  VETOED: process.env.FORUM_TAG_VETOED
};

const ADMIN_ROLE_SEND_ID = process.env.ADMIN_ROLE_SEND_ID;
const SYSADMIN_ROLE_ID = process.env.SYSADMIN_ROLE_ID;

const FOOTER = "РЕАЛИЗОВАНО ПРИ ПОДДЕРЖКЕ ВСЕРОССИЙСКОЙ ПОЛИТИЧЕСКОЙ ПАРТИИ «ДОБРОДЕТЕЛИ РОССИИ»";

const COLORS = {
  PRIMARY: 0x3498db,
  SUCCESS: 0x2ecc71,
  DANGER: 0xe74c3c,
  WARNING: 0xf39c12,
  SECONDARY: 0x95a5a6,
  INFO: 0x9b59b6,
  GOLD: 0xf1c40f
};

// Маппинг палат на названия
const CHAMBER_NAMES = {
  'sf': 'Совет Федерации',
  'gd_rublevka': 'Государственная дума | Рублевка',
  'gd_arbat': 'Государственная дума | Арбат', 
  'gd_patricki': 'Государственная дума | Патрики',
  'gd_tverskoy': 'Государственная дума | Тверской'
};

// Маппинг палат на роли председателей
const CHAMBER_CHAIRMAN_ROLES = {
  'sf': [ROLES.CHAIRMAN, ROLES.VICE_CHAIRMAN],
  'gd_rublevka': [ROLES.CHAIRMAN, ROLES.VICE_CHAIRMAN, ROLES.RUBLEVKA],
  'gd_arbat': [ROLES.CHAIRMAN, ROLES.VICE_CHAIRMAN, ROLES.ARBAT],
  'gd_patricki': [ROLES.CHAIRMAN, ROLES.VICE_CHAIRMAN, ROLES.PATRICKI],
  'gd_tverskoy': [ROLES.CHAIRMAN, ROLES.VICE_CHAIRMAN, ROLES.TVERSKOY]
};

// Маппинг ID каналов заседаний на палаты
const CHANNEL_TO_CHAMBER = Object.fromEntries(
  Object.entries(MEETING_CHANNELS).map(([chamber, channelId]) => [channelId, chamber])
);

// Эмодзи для событий хронологии
const EVENT_EMOJIS = {
  'registration': '📥',
  'vote_result': '🗳️',
  'government_approval': '✅',
  'government_return': '↩️',
  'president_sign': '🖊️',
  'president_veto': '❌',
  'transfer': '🔄',
  'default': '📌'
};
/* ============================================ */

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("Please set DISCORD_TOKEN, CLIENT_ID, GUILD_ID env vars.");
  process.exit(1);
}

// Функция проверки прав администратора
function isAdmin(member) {
  return member.roles.cache.has(ADMIN_ROLE_SEND_ID) || member.roles.cache.has(SYSADMIN_ROLE_ID);
}

// Функция проверки прав председателя для палаты
function isChamberChairman(member, chamber) {
  const requiredRoles = CHAMBER_CHAIRMAN_ROLES[chamber];
  if (!requiredRoles) return false;
  
  return requiredRoles.some(roleId => member.roles.cache.has(roleId));
}

// Функция проверки прав правительства для палаты
function isGovernmentChairman(member, chamber) {
  return member.roles.cache.has(ROLES.GOVERNMENT_CHAIRMAN) && 
         member.roles.cache.has(getChamberTerritoryRole(chamber));
}

// Функция получения роли территории для палата
function getChamberTerritoryRole(chamber) {
  switch(chamber) {
    case 'gd_rublevka': return ROLES.RUBLEVKA;
    case 'gd_arbat': return ROLES.ARBAT;
    case 'gd_patricki': return ROLES.PATRICKI;
    case 'gd_tverskoy': return ROLES.TVERSKOY;
    default: return null;
  }
}

// Функция для получения палаты по ID канала
function getChamberByChannel(channelId) {
  return CHANNEL_TO_CHAMBER[channelId];
}

/* ========== In-memory timers ========== */
const meetingTimers = new Map();
const voteTimers = new Map();

/* ========== Discord client ========== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

const rest = new REST({ version: "10" }).setToken(TOKEN);

const commands = [
  new SlashCommandBuilder().setName("send").setDescription("Открыть форму регистрации законопроекта"),
  new SlashCommandBuilder().setName("sendkol").setDescription("Открыть форму регистрации законопроекта с количественным голосованием"),
  new SlashCommandBuilder()
    .setName("create_meeting")
    .setDescription("Создать заседание (только для председателей)")
    .addStringOption((o) => o.setName("title").setDescription("Наименование заседания").setRequired(true))
    .addStringOption((o) => o.setName("date").setDescription("Дата и время заседания").setRequired(true)),
  new SlashCommandBuilder().setName("res_meeting").setDescription("Снять роль голосующего у всех (админы)"),
].map((c) => c.toJSON());

(async () => {
  try {
    console.log("Registering commands...");
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log("Commands registered.");
  } catch (e) {
    console.error("Error registering commands:", e);
  }
})();

/* ===== Utility functions ===== */
function parseDurationStr(s) {
  if (s === "0s") return 0;
  if (s === "30s") return 30_000;
  if (s === "1m") return 60_000;
  if (s === "2m") return 120_000;
  if (s === "3m") return 180_000;
  if (s === "5m") return 300_000;
  return 60_000;
}

function formatTimeLeft(ms) {
  if (ms <= 0) return "0s";
  const sec = Math.ceil(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Функция для форматирования времени с учетом часового пояса Москвы
function formatMoscowTime(timestamp) {
  return new Date(timestamp).toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/* ===== Улучшенная хронология ===== */
async function updateHistoryMessage(proposalId) {
  try {
    const proposal = db.getProposal(proposalId);
    if (!proposal || !proposal.threadId) return;

    const thread = await client.channels.fetch(proposal.threadId);
    
    // Формируем текст для embed с улучшенным оформлением
    let description = '';
    if (proposal.events && proposal.events.length > 0) {
      // Сортируем события по времени
      const sortedEvents = [...proposal.events].sort((a, b) => a.timestamp - b.timestamp);
      
      for (const event of sortedEvents) {
        const timestamp = formatMoscowTime(event.timestamp);
        const emoji = EVENT_EMOJIS[event.type] || EVENT_EMOJIS.default;
        
        // Красивое форматирование для разных типов событий
        let eventText = `${emoji} **${getEventTitle(event)}**\n`;
        eventText += `⏰ ${timestamp}\n`;
        
        if (event.description) {
          // Улучшаем описание события
          let formattedDescription = event.description;
          
          // Заменяем упоминания пользователей на красивые ссылки
          formattedDescription = formattedDescription.replace(/<@!?(\d+)>/g, (match, userId) => {
            return `**<@${userId}>**`;
          });
          
          // Добавляем эмодзи в зависимости от типа события
          if (event.type === 'vote_result') {
            const resultEmoji = event.result === 'Принято' ? '✅' : 
                               event.result === 'Отклонено' ? '❌' : '⚪';
            formattedDescription = `${resultEmoji} ${formattedDescription}`;
          }
          
          eventText += `${formattedDescription}\n`;
        }
        
        // Добавляем разделитель между событиями
        eventText += '\\_\\_\\_\\_\\_\n\n';
        description += eventText;
      }
    } else {
      description = '📝 *Событий пока нет. История начнет заполняться после регистрации и рассмотрения законопроекта.*';
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📜 Хронология законопроекта')
      .setDescription(description)
      .setColor(COLORS.PRIMARY)
      .setFooter({ text: FOOTER })
      .setTimestamp();
    
    if (proposal.historyMessageId) {
      try {
        const message = await thread.messages.fetch(proposal.historyMessageId);
        await message.edit({ embeds: [embed] });
        return;
      } catch (e) {
        console.log("History message not found, sending new one");
      }
    }
    
    // Если сообщение не найдено, отправляем новое
    const message = await thread.send({ embeds: [embed] });
    db.updateProposalHistoryMessage(proposalId, message.id);
    
  } catch (error) {
    console.error("Error updating history message:", error);
  }
}

// Функция для получения заголовка события
function getEventTitle(event) {
  switch (event.type) {
    case 'registration':
      return `Внесение в ${CHAMBER_NAMES[event.chamber]}`;
    case 'vote_result':
      return `Результат голосования в ${CHAMBER_NAMES[event.chamber]}`;
    case 'government_approval':
      return 'Одобрено Правительством';
    case 'government_return':
      return 'Возвращено Правительством';
    case 'president_sign':
      return 'Подписано Президентом';
    case 'president_veto':
      return 'Отклонено Президентом';
    case 'transfer':
      return 'Передача в Совет Федерации';
    default:
      return 'Событие';
  }
}

// Функция для обновления хронологии в родительском законопроекте (если есть)
async function updateParentProposalHistory(parentProposalId) {
  try {
    const parentProposal = db.getProposal(parentProposalId);
    if (parentProposal && parentProposal.threadId) {
      await updateHistoryMessage(parentProposalId);
    }
  } catch (error) {
    console.error("Error updating parent proposal history:", error);
  }
}

/* ===== Thread management ===== */
async function closeThreadWithTag(threadId, tagId) {
  try {
    const thread = await client.channels.fetch(threadId);
    console.log(`Attempting to close thread ${threadId} and set tag ${tagId}`);

    if (thread.parent?.type === 15) { // GUILD_FORUM
      try {
        await thread.edit({
          archived: true,
          appliedTags: tagId ? [tagId] : thread.appliedTags,
          reason: 'Голосование завершено'
        });
        console.log(`Successfully closed thread and set tag ${tagId} for ${threadId}`);
      } catch (e) {
        console.error("Failed to set tag and close thread:", e.message);
        try {
          if (tagId) {
            await thread.edit({ appliedTags: [tagId] });
          }
          await thread.setArchived(true, 'Голосование завершено');
        } catch (e2) {
          console.error("Failed separate operations:", e2.message);
        }
      }
    } else {
      if (thread.manageable && !thread.archived) {
        await thread.setArchived(true, 'Голосование завершено');
      }
    }
  } catch (e) {
    console.error("Error in closeThreadWithTag:", e.message);
  }
}

// Функция для предотвращения архивации неголосованных инициатив
async function keepActiveProposalsInForum() {
  try {
    const allProposals = db.getAllProposals();
    
    for (const proposal of allProposals) {
      if (!proposal.threadId) continue;
      
      const voting = db.getVoting(proposal.id);
      // Если голосование не начиналось, убедимся что тред не архивирован
      if (!voting && proposal.status === "На рассмотрении") {
        try {
          const thread = await client.channels.fetch(proposal.threadId);
          if (thread.archived) {
            await thread.setArchived(false, 'Инициатива активна');
            console.log(`Reactivated thread for proposal ${proposal.number}`);
          }
        } catch (e) {
          console.error(`Error reactivating thread for ${proposal.number}:`, e.message);
        }
      }
    }
  } catch (error) {
    console.error("Error keeping active proposals:", error);
  }
}

/* ===== Update speakers message ===== */
async function updateSpeakersMessage(proposalId) {
  try {
    const proposal = db.getProposal(proposalId);
    if (!proposal || !proposal.threadId) return;

    const speakers = db.getSpeakers(proposalId);
    const thread = await client.channels.fetch(proposal.threadId);
    
    // Группируем выступающих по типам
    const speakersByType = {
      'доклад': [],
      'содоклад': [],
      'прения': []
    };
    
    speakers.forEach(speaker => {
      if (speakersByType[speaker.type]) {
        speakersByType[speaker.type].push(speaker);
      }
    });
    
    // Формируем текст для embed
    let description = '';
    
    // Докладчик (автор) всегда первый
    if (speakersByType['доклад'].length > 0) {
      description += `**1. Доклад:**\n`;
      speakersByType['доклад'].forEach((speaker, index) => {
        description += `   ${index + 1}. <@${speaker.userId}> (${speaker.displayName})\n`;
      });
    } else {
      // Если нет докладчиков, автор автоматически становится докладчиком
      description += `**1. Доклад:**\n`;
      description += `   1. <@${proposal.authorId}> (автор инициативы)\n`;
      
      // Добавляем автора в базу как докладчика
      const authorSpeaker = {
        proposalId,
        userId: proposal.authorId,
        type: 'доклад',
        displayName: 'автор инициативы',
        registeredAt: Date.now()
      };
      db.addSpeaker(authorSpeaker);
    }
    
    // Содокладчики
    if (speakersByType['содоклад'].length > 0) {
      description += `\n**2. Содоклад:**\n`;
      speakersByType['содоклад'].forEach((speaker, index) => {
        description += `   ${index + 1}. <@${speaker.userId}> (${speaker.displayName})\n`;
      });
    }
    
    // Прения
    if (speakersByType['прения'].length > 0) {
      description += `\n**3. Прения:**\n`;
      speakersByType['прения'].forEach((speaker, index) => {
        description += `   ${index + 1}. <@${speaker.userId}> (${speaker.displayName})\n`;
      });
    }
    
    if (description === '') {
      description = 'Пока нет зарегистрированных выступающих.';
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🎤 Список выступающих')
      .setDescription(description)
      .setColor(COLORS.PRIMARY)
      .setFooter({ text: FOOTER })
      .setTimestamp();
    
    if (proposal.speakersMessageId) {
      try {
        const message = await thread.messages.fetch(proposal.speakersMessageId);
        await message.edit({ embeds: [embed] });
        return;
      } catch (e) {
        console.log("Speakers message not found, sending new one");
      }
    }
    
    // Если сообщение не найдено, отправляем новое
    const message = await thread.send({ embeds: [embed] });
    db.updateProposalSpeakersMessage(proposalId, message.id);
    
  } catch (error) {
    console.error("Error updating speakers message:", error);
  }
}

/* ===== Disable registration buttons ===== */
async function disableRegistrationButtons() {
  try {
    const allProposals = db.getAllProposals();
    
    for (const proposal of allProposals) {
      if (!proposal.threadId || !proposal.initialMessageId) continue;
      
      try {
        const thread = await client.channels.fetch(proposal.threadId);
        
        // **FIX:** Не пытаемся редактировать сообщение в архивированном треде
        if (thread.archived) continue;
        
        const initialMessage = await thread.messages.fetch(proposal.initialMessageId);
        
        // Создаем кнопки с отключенной кнопкой регистрации
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`start_vote_${proposal.id}`)
            .setLabel("▶️ Начать голосование")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`register_speaker_${proposal.id}`)
            .setLabel("🎤 Зарегистрироваться выступить")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true)
        );
        
        await initialMessage.edit({ components: [row] });
      } catch (error) {
        // **FIX:** Добавляем обработку ошибок, если тред архивирован или сообщение удалено
        if (error.code === 50083 || error.code === 10008) { // 50083: Thread archived, 10008: Unknown Message
          console.log(`Skipping button disable for proposal ${proposal.id}: Thread archived or message not found.`);
        } else {
          console.error(`Error disabling button for proposal ${proposal.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error disabling registration buttons:", error);
  }
}

/* ===== Disable registration button for single proposal ===== */
async function disableRegistrationButtonForProposal(proposalId) {
  try {
    const proposal = db.getProposal(proposalId);
    if (!proposal || !proposal.threadId || !proposal.initialMessageId) return;
    
    const thread = await client.channels.fetch(proposal.threadId);
    
    // **FIX:** Не пытаемся редактировать сообщение в архивированном треде
    if (thread.archived) return;
    
    const initialMessage = await thread.messages.fetch(proposal.initialMessageId);
    
    // Создаем кнопки с отключенной кнопкой регистрации
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`start_vote_${proposal.id}`)
        .setLabel("▶️ Начать голосование")
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`register_speaker_${proposal.id}`)
        .setLabel("🎤 Зарегистрироваться выступить")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true)
    );
    
    await initialMessage.edit({ components: [row] });
  } catch (error) {
    // **FIX:** Добавляем обработку ошибок, если тред архивирован или сообщение удалено
    if (error.code === 50083 || error.code === 10008) {
      console.log(`Skipping button disable for proposal ${proposalId}: Thread archived or message not found.`);
    } else {
      console.error(`Error disabling button for proposal ${proposalId}:`, error);
    }
  }
}

/* ===== Restore timers on startup ===== */
async function restoreAllTimers() {
  // Meetings
  const openMeetings = db.getOpenMeetings();
  for (const meeting of openMeetings) {
    startMeetingTicker(meeting.id).catch(console.error);
  }
  
  // Votes
  const openVotings = db.getOpenVotings();
  for (const voting of openVotings) {
    startVoteTicker(voting.id).catch(console.error);
  }
  
  // Запускаем проверку активных инициатив
  setInterval(keepActiveProposalsInForum, 60000); // Каждую минуту
}

/* ===== Meeting ticker ===== */
async function startMeetingTicker(meetingId) {
  if (meetingTimers.has(meetingId)) {
    clearInterval(meetingTimers.get(meetingId));
    meetingTimers.delete(meetingId);
  }

  const updateFn = async () => {
    const meeting = db.getMeeting(meetingId);
    if (!meeting) {
      if (meetingTimers.has(meetingId)) clearInterval(meetingTimers.get(meetingId));
      return;
    }
    
    const left = meeting.expiresAt - Date.now();
    try {
      const ch = await client.channels.fetch(meeting.channelId);
      const msg = await ch.messages.fetch(meeting.messageId);
      
      if (left <= 0) {
        // Finalize meeting
        db.closeMeeting(meetingId);
        db.updateMeeting(meetingId, { status: 'voting' });
        const registered = db.getMeetingRegistrations(meetingId);
        const registeredCount = registered.length;
        const quorum = meeting.quorum || 1;
        const totalMembers = meeting.totalMembers || 53;
        
        const listText = registeredCount ? registered.map(r => `<@${r.userId}>`).join("\n") : "Никто не зарегистрирован";
        
        // Проверяем кворум
        const isQuorumMet = registeredCount >= quorum;
        const quorumStatus = isQuorumMet ? "✅ Кворум собран" : "❌ Кворум не собран";
        
        const finalEmbed = new EmbedBuilder()
          .setTitle(`📋 Регистрация завершена`)
          .setDescription(`**${meeting.title}**`)
          .addFields(
            { name: "👥 Количество зарегистрированных", value: String(registeredCount), inline: true },
            { name: "📊 Требуемый кворум", value: String(quorum), inline: true },
            { name: "📈 Статус кворума", value: quorumStatus, inline: true },
            { name: "👥 Общее количество членов", value: String(totalMembers), inline: true },
            { name: "⏱️ Время регистрации", value: formatTimeLeft(meeting.durationMs), inline: true },
            { name: "🕐 Начало регистрации", value: formatMoscowTime(meeting.createdAt), inline: false },
            { name: "📝 Список зарегистрированных", value: listText, inline: false }
          )
          .setColor(isQuorumMet ? COLORS.SUCCESS : COLORS.DANGER)
          .setFooter({ text: FOOTER })
          .setTimestamp();

        // Создаем кнопку для очистки ролей
        const clearRolesButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`clear_roles_${meetingId}`)
            .setLabel("🧹 Очистить роли")
            .setStyle(ButtonStyle.Danger)
        );
          
        await msg.edit({ content: null, embeds: [finalEmbed], components: [clearRolesButton] });
        
        // ВЫДАЕМ РОЛИ ДЛЯ ГОЛОСОВАНИЯ - ИСПРАВЛЕННАЯ ЧАСТЬ
        if (isQuorumMet) {
          const voterRoleId = VOTER_ROLES_BY_CHAMBER[meeting.chamber];
          let rolesGiven = 0;
          
          for (const reg of registered) {
            try {
              const member = await ch.guild.members.fetch(reg.userId);
              if (!member.roles.cache.has(voterRoleId)) {
                await member.roles.add(voterRoleId, `Registered for meeting ${meeting.title}`);
                rolesGiven++;
                console.log(`✅ Выдана роль голосования пользователю ${member.user.tag} для заседания ${meeting.title}`);
              }
            } catch (e) {
              console.error(`❌ Ошибка при выдаче роли голосования пользователю ${reg.userId}:`, e);
            }
          }
          
          // Отправляем сообщение о успешной выдаче ролей
          if (rolesGiven > 0) {
            await ch.send(`✅ **Роли для голосования выданы!** Успешно выдано ${rolesGiven} ролей из ${registeredCount} зарегистрированных.`);
          } else {
            await ch.send(`ℹ️ **Все зарегистрированные уже имеют роли для голосования.**`);
          }
        } else {
          // Если кворум не собран, уведомляем
          await ch.send(`❌ **Кворум не собран!** Зарегистрировано ${registeredCount} из ${quorum} необходимых участников. Роли для голосования не выданы.`);
        }
        
        clearInterval(meetingTimers.get(meetingId));
        meetingTimers.delete(meetingId);
        
        // Отключаем кнопки регистрации во всех инициативах
        await disableRegistrationButtons();
      } else {
        // Update meeting message
        const leftStr = formatTimeLeft(left);
        const registeredCount = db.getRegistrationCount(meetingId);
        const quorum = meeting.quorum || 1;
        
        const embed = new EmbedBuilder()
          .setTitle(`🔔 Открыта регистрация`)
          .setDescription(`**${meeting.title}**`)
          .addFields(
            { name: "⏳ Время до конца регистрации", value: leftStr, inline: true },
            { name: "👥 Зарегистрировано", value: `${registeredCount}/${quorum}`, inline: true },
            { name: "📊 Статус кворума", value: registeredCount >= quorum ? "✅ Собран" : "❌ Не собран", inline: true }
          )
          .setColor(registeredCount >= quorum ? COLORS.SUCCESS : COLORS.WARNING)
          .setFooter({ text: FOOTER })
          .setTimestamp();
          
        await msg.edit({ content: null, embeds: [embed] });
      }
    } catch (e) {
      console.error("Update meeting message failed:", e);
    }
  };

  await updateFn();
  const id = setInterval(updateFn, 10_000);
  meetingTimers.set(meetingId, id);
}

/* ===== Vote ticker ===== */
async function startVoteTicker(proposalId) {
  if (voteTimers.has(proposalId)) {
    clearInterval(voteTimers.get(proposalId));
    voteTimers.delete(proposalId);
  }

  const updateFn = async () => {
    const proposal = db.getProposal(proposalId);
    const voting = db.getVoting(proposalId);
    
    if (!proposal || !voting?.open) {
      if (voteTimers.has(proposalId)) {
        clearInterval(voteTimers.get(proposalId));
        voteTimers.delete(proposalId);
      }
      return;
    }

    // Skip timer for infinite voting
    if (voting.durationMs === 0) return;

    const left = voting.expiresAt - Date.now();
    try {
      const thread = await client.channels.fetch(proposal.threadId);
      
      // Для количественного голосования используем отдельное сообщение для второго тура
      const messageId = voting.stage === 2 && voting.runoffMessageId ? voting.runoffMessageId : voting.messageId;
      const voteMsg = await thread.messages.fetch(messageId);
      
      if (left <= 0) {
        await finalizeVote(proposalId);
        if (voteTimers.has(proposalId)) {
          clearInterval(voteTimers.get(proposalId));
          voteTimers.delete(proposalId);
        }
        return;
      } else {
        const leftStr = formatTimeLeft(left);
        const embed = new EmbedBuilder()
          .setTitle(`🗳️ Голосование — ${proposal.number}${voting.stage === 2 ? ' (Второй тур)' : ''}`)
          .setDescription(`Голосование активно`)
          .addFields(
            { name: "⏳ До завершения", value: leftStr, inline: true },
            { name: "🕐 Начало", value: formatMoscowTime(voting.startedAt), inline: true },
            { name: "🔒 Тип голосования", value: voting.isSecret ? "Тайное" : "Открытое", inline: true },
            { name: "📊 Формула", value: getFormulaDescription(voting.formula), inline: true }
          )
          .setColor(COLORS.INFO)
          .setFooter({ text: FOOTER })
          .setTimestamp();
        await voteMsg.edit({ content: null, embeds: [embed] });
      }
    } catch (e) {
      console.error("Vote ticker update failed:", e);
    }
  };

  await updateFn();
  const id = setInterval(updateFn, 10_000);
  voteTimers.set(proposalId, id);
}

/* ===== Функции для работы с формулами голосования ===== */
function getFormulaDescription(formula) {
  switch (formula) {
    case '0': return 'Простое большинство';
    case '1': return '2/3 голосов';
    case '2': return '3/4 голосов';
    case '3': return 'Большинство от общего количества';
    default: return 'Простое большинство';
  }
}

function calculateVoteResult(forCount, againstCount, abstainCount, formula, totalMembers = 53) {
  const totalVoted = forCount + againstCount + abstainCount;
  
  let requiredFor = 0;
  let requiredTotal = 0;
  
  switch (formula) {
    case '0': // Простое большинство
      requiredFor = Math.floor(totalVoted / 2) + 1;
      requiredTotal = totalVoted;
      break;
    case '1': // 2/3 голосов
      requiredFor = Math.ceil(totalVoted * 2 / 3);
      requiredTotal = totalVoted;
      break;
    case '2': // 3/4 голосов
      requiredFor = Math.ceil(totalVoted * 3 / 4);
      requiredTotal = totalVoted;
      break;
    case '3': // Большинство от общего количества
      requiredFor = Math.ceil(totalMembers / 2);
      requiredTotal = totalMembers;
      break;
    default: // Простое большинство
      requiredFor = Math.floor(totalVoted / 2) + 1;
      requiredTotal = totalVoted;
  }
  
  return { requiredFor, requiredTotal, isPassed: forCount >= requiredFor };
}

/* ===== Finalize vote ===== */
async function finalizeVote(proposalId) {
  const proposal = db.getProposal(proposalId);
  if (!proposal) return;

  const voting = db.getVoting(proposalId);
  const isQuantitative = proposal.isQuantitative;
  const stage = voting?.stage || 1;

  if (isQuantitative && stage === 1) {
    await finalizeQuantitativeVote(proposalId);
  } else if (isQuantitative && stage === 2) {
    await finalizeQuantitativeRunoff(proposalId);
  } else {
    await finalizeRegularVote(proposalId);
  }
}
/* ===== Finalize regular vote ===== */
async function finalizeRegularVote(proposalId) {
  const proposal = db.getProposal(proposalId);
  if (!proposal) return;

  // Get vote counts
  const voteCounts = db.getVoteCounts(proposalId);
  const forCount = voteCounts.find(v => v.voteType === 'for')?.count || 0;
  const againstCount = voteCounts.find(v => v.voteType === 'against')?.count || 0;
  const abstainCount = voteCounts.find(v => v.voteType === 'abstain')?.count || 0;
  
  const totalVoted = forCount + againstCount + abstainCount;
  
  // **FIX (Point 3):** Получаем информацию о заседании ТОЛЬКО для этой палаты
  const meetingInfo = db.getLastMeetingByChamber(proposal.chamber);
  
  // Используем данные из последнего заседания этой палаты, или ставим разумные заглушки
  const voteQuorum = meetingInfo ? meetingInfo.quorum : 1; 
  const totalMembers = meetingInfo ? meetingInfo.totalMembers : 53; 
  const registeredCount = meetingInfo ? db.getRegistrationCount(meetingInfo.id) : 0;
  
  const totalPossible = totalMembers;
  const notVoted = Math.max(0, totalPossible - totalVoted);
  const notVotedRegistered = Math.max(0, registeredCount - totalVoted);

  // Получаем информацию о голосовании
  const voting = db.getVoting(proposalId);
  const formula = voting?.formula || '0';
  const isSecret = voting?.isSecret || false;
  
  // Вычисляем результат по формуле
  const { requiredFor, requiredTotal, isPassed } = calculateVoteResult(forCount, againstCount, abstainCount, formula, totalMembers);
  
  // Определяем результат с учетом кворума и других условий
  let resultText = "Не принято";
  let resultColor = COLORS.SECONDARY;
  let resultEmoji = "❌";
  let tagId = FORUM_TAGS.NOT_APPROVED;
  
  // Проверяем кворум (общее количество голосов должно быть >= кворуму из последнего заседания)
  const isQuorumMet = totalVoted >= voteQuorum;
  
  // Проверяем условия по порядку:
  // 1. Если не набрали кворум (меньше требуемого количества голосов)
  if (!isQuorumMet) {
    resultText = "Не принято";
    resultColor = COLORS.SECONDARY;
    resultEmoji = "❌";
    tagId = FORUM_TAGS.NOT_APPROVED;
  }
  // 2. Если против больше, чем за
  else if (againstCount > forCount) {
    resultText = "Отклонено";
    resultColor = COLORS.DANGER;
    resultEmoji = "❌";
    tagId = FORUM_TAGS.REJECTED;
  }
  // 3. Если воздержавшихся больше, чем за и против вместе взятых
  else if (abstainCount > (forCount + againstCount)) {
    resultText = "Не принято";
    resultColor = COLORS.SECONDARY;
    resultEmoji = "❌";
    tagId = FORUM_TAGS.NOT_APPROVED;
  }
  // 4. Если прошло по формуле
  else if (isPassed) {
    resultText = "Принято";
    resultColor = COLORS.SUCCESS;
    resultEmoji = "✅";
    tagId = FORUM_TAGS.APPROVED;
  }
  // 5. Во всех остальных случаях - не принято
  else {
    resultText = "Не принято";
    resultColor = COLORS.SECONDARY;
    resultEmoji = "❌";
    tagId = FORUM_TAGS.NOT_APPROVED;
  }

  // Get detailed votes (только для открытого голосования)
  const allVotes = isSecret ? [] : db.getVotes(proposalId);
  const listParts = allVotes.map(vote => {
    const emoji = vote.voteType === 'for' ? '✅' : vote.voteType === 'against' ? '❌' : '⚪';
    return `${emoji} <@${vote.userId}>`;
  });
  const listText = listParts.length ? listParts.join("\n") : (isSecret ? "Голосование было тайным" : "Нет голосов");

  const embed = new EmbedBuilder()
    .setTitle(`📊 Результаты голосования — ${proposal.number}`)
    .setDescription(`## ${resultEmoji} ${resultText}`)
    .addFields(
      { name: "✅ За", value: String(forCount), inline: true },
      { name: "❌ Против", value: String(againstCount), inline: true },
      { name: "⚪ Воздержалось", value: String(abstainCount), inline: true },
      { name: "📊 Всего проголосовало", value: String(totalVoted), inline: true },
      { name: "📋 Требуемый кворум", value: `${voteQuorum} голосов`, inline: true },
      { name: "📈 Статус кворума", value: isQuorumMet ? "✅ Собран" : "❌ Не собран", inline: true },
      { name: "👥 Общее количество", value: String(totalMembers), inline: true },
      { name: "❓ Не голосовало", value: `${notVoted} (из них ${notVotedRegistered} зарегистрированных)`, inline: true },
      { name: "📈 Явка", value: `${Math.round((totalVoted / totalPossible) * 100)}%`, inline: true },
      { name: "📈 Требуется голосов", value: `${requiredFor}/${requiredTotal}`, inline: true },
      { name: "🔒 Тип голосования", value: isSecret ? "Тайное" : "Открытое", inline: true },
      { name: "📋 Формула", value: getFormulaDescription(formula), inline: false }
    )
    .setColor(resultColor)
    .setFooter({ text: FOOTER })
    .setTimestamp();

  // Добавляем поле с поименным голосованием только для открытого голосования
  if (!isSecret) {
    embed.addFields({ 
      name: "🗳️ Поимённое голосование", 
      value: listText.substring(0, 1024), 
      inline: false 
    });
  }

  embed.addFields(
    { name: "🕐 Начало", value: voting?.startedAt ? formatMoscowTime(voting.startedAt) : "—", inline: true },
    { name: "🕐 Завершено", value: formatMoscowTime(Date.now()), inline: true }
  );

  try {
    const thread = await client.channels.fetch(proposal.threadId);
    
    // Создаем Action Row для кнопок
    const actionRow = new ActionRowBuilder();
    
    // Если голосование прошло в ГосДуме и результат "Принято", добавляем кнопки для председателя правительства
    if (resultText === "Принято" && proposal.chamber !== 'sf' && !proposal.isQuantitative) {
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`gov_approve_${proposal.id}`)
          .setLabel("✅ Одобрить")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`gov_return_${proposal.id}`)
          .setLabel("↩️ Вернуть")
          .setStyle(ButtonStyle.Secondary)
      );
    }
    
    // Если голосование прошло в Совете Федерации и результат "Принято", добавляем кнопки для президента
    if (resultText === "Принято" && proposal.chamber === 'sf' && !proposal.isQuantitative) {
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`president_sign_${proposal.id}`)
          .setLabel("✅ Подписать")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`president_veto_${proposal.id}`)
          .setLabel("❌ Отклонить")
          .setStyle(ButtonStyle.Danger)
      );
    }

    const components = actionRow.components.length > 0 ? [actionRow] : [];

    if (voting?.messageId) {
      try {
        const voteMsg = await thread.messages.fetch(voting.messageId);
        await voteMsg.edit({ content: null, embeds: [embed], components });
      } catch (e) {
        await thread.send({ embeds: [embed], components });
      }
    } else {
      await thread.send({ embeds: [embed], components });
    }

    // Для количественного голосования или отклоненных предложений закрываем тред
    if (proposal.isQuantitative || resultText !== "Принято") {
      setTimeout(async () => {
        await closeThreadWithTag(proposal.threadId, tagId);
      }, 30_000);
    }

  } catch (e) {
    console.error("Error publishing vote results:", e);
  }

  // Update database
  db.endVoting(proposalId, Date.now());
  db.updateProposalStatus(proposalId, resultText);

  // Добавляем событие в историю
  const events = proposal.events || [];
  events.push({
    type: 'vote_result',
    result: resultText,
    timestamp: Date.now(),
    chamber: proposal.chamber,
    description: `Голосование в ${CHAMBER_NAMES[proposal.chamber]} завершено. Результат: ${resultText}`
  });
  db.updateProposalEvents(proposalId, events);
  
  // **FIX (Point 4):** Обновляем сообщение с хронологией
  await updateHistoryMessage(proposalId);

  // Clear timer
  if (voteTimers.has(proposalId)) {
    clearInterval(voteTimers.get(proposalId));
    voteTimers.delete(proposalId);
  }
}

/* ===== Finalize quantitative vote (first round) ===== */
async function finalizeQuantitativeVote(proposalId) {
  const proposal = db.getProposal(proposalId);
  if (!proposal) return;

  const voting = db.getVoting(proposalId);
  const items = db.getQuantitativeItems(proposalId);
  const voteCounts = db.getVoteCounts(proposalId);
  
  // Подсчитываем голоса по пунктам
  const itemVotes = {};
  items.forEach(item => {
    itemVotes[item.itemIndex] = voteCounts.find(v => v.voteType === `item_${item.itemIndex}`)?.count || 0;
  });
  
  const abstainCount = voteCounts.find(v => v.voteType === 'abstain')?.count || 0;
  const totalVoted = Object.values(itemVotes).reduce((sum, count) => sum + count, 0) + abstainCount;
  
  // **FIX (Point 3):** Получаем информацию о заседании ТОЛЬКО для этой палаты
  const meetingInfo = db.getLastMeetingByChamber(proposal.chamber);
  
  // Используем данные из последнего заседания этой палаты, или ставим разумные заглушки
  const voteQuorum = meetingInfo ? meetingInfo.quorum : 1; 
  const totalMembers = meetingInfo ? meetingInfo.totalMembers : 53; 
  const registeredCount = meetingInfo ? db.getRegistrationCount(meetingInfo.id) : 0;
  
  const totalPossible = totalMembers;
  const notVoted = Math.max(0, totalPossible - totalVoted);
  const notVotedRegistered = Math.max(0, registeredCount - totalVoted);
  
  const formula = voting?.formula || '0';
  const isSecret = voting?.isSecret || false;
  
  // Проверяем кворум
  const isQuorumMet = totalVoted >= voteQuorum;
  
  // Находим победителя по формуле
  let winnerIndex = null;
  let winnerVotes = 0;
  
  for (const [index, votes] of Object.entries(itemVotes)) {
    const { requiredFor, isPassed } = calculateVoteResult(votes, 0, 0, formula, totalMembers);
    if (isPassed && votes > winnerVotes) {
      winnerIndex = index;
      winnerVotes = votes;
    }
  }
  
  let resultText = "Не принято";
  let resultColor = COLORS.SECONDARY;
  let resultEmoji = "❌";
  let tagId = FORUM_TAGS.NOT_APPROVED;
  
  if (winnerIndex !== null && isQuorumMet) {
    resultText = `Принят пункт ${winnerIndex}`;
    resultColor = COLORS.SUCCESS;
    resultEmoji = "✅";
    tagId = FORUM_TAGS.APPROVED;
    
    // Публикуем результаты
    const embed = createQuantitativeResultsEmbed(proposal, items, itemVotes, abstainCount, totalVoted, 
      voteQuorum, isQuorumMet, notVoted, notVotedRegistered, formula, isSecret, winnerIndex, "Первый тур", totalMembers);
    
    try {
      const thread = await client.channels.fetch(proposal.threadId);
      if (voting?.messageId) {
        try {
          const voteMsg = await thread.messages.fetch(voting.messageId);
          await voteMsg.edit({ content: null, embeds: [embed], components: [] });
        } catch (e) {
          await thread.send({ embeds: [embed] });
        }
      } else {
        await thread.send({ embeds: [embed] });
      }
      
      // Close thread after delay
      setTimeout(async () => {
        await closeThreadWithTag(proposal.threadId, tagId);
      }, 30_000);
      
      // Update database
      db.endVoting(proposalId, Date.now());
      db.updateProposalStatus(proposalId, resultText);
      
    } catch (e) {
      console.error("Error publishing quantitative vote results:", e);
    }
  } else {
    // Если нет победителя, запускаем второй тур между двумя лидерами
    const sortedItems = Object.entries(itemVotes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2);
    
    if (sortedItems.length >= 2 && isQuorumMet) {
      // Публикуем результаты первого тура
      const embed = createQuantitativeResultsEmbed(proposal, items, itemVotes, abstainCount, totalVoted, 
        voteQuorum, isQuorumMet, notVoted, notVotedRegistered, formula, isSecret, null, "Первый тур", totalMembers);
      
      try {
        const thread = await client.channels.fetch(proposal.threadId);
        if (voting?.messageId) {
          try {
            const voteMsg = await thread.messages.fetch(voting.messageId);
            await voteMsg.edit({ content: null, embeds: [embed], components: [] });
          } catch (e) {
            await thread.send({ embeds: [embed] });
          }
        } else {
          await thread.send({ embeds: [embed] });
        }
        
        // Запускаем второй тур
        await startQuantitativeRunoff(proposalId, sortedItems.map(([index]) => parseInt(index)));
        
      } catch (e) {
        console.error("Error starting quantitative runoff:", e);
      }
    } else {
      // Если нет кворума или недостаточно пунктов для второго тура
      const embed = createQuantitativeResultsEmbed(proposal, items, itemVotes, abstainCount, totalVoted, 
        voteQuorum, isQuorumMet, notVoted, notVotedRegistered, formula, isSecret, null, "Первый тур", totalMembers);
      
      try {
        const thread = await client.channels.fetch(proposal.threadId);
        if (voting?.messageId) {
          try {
            const voteMsg = await thread.messages.fetch(voting.messageId);
            await voteMsg.edit({ content: null, embeds: [embed], components: [] });
          } catch (e) {
            await thread.send({ embeds: [embed] });
          }
        } else {
          await thread.send({ embeds: [embed] });
        }
        
        // Close thread after delay
        setTimeout(async () => {
          await closeThreadWithTag(proposal.threadId, tagId);
        }, 30_000);
        
        // Update database
        db.endVoting(proposalId, Date.now());
        db.updateProposalStatus(proposalId, resultText);
        
      } catch (e) {
        console.error("Error publishing quantitative vote results:", e);
      }
    }
  }
  
  // Clear timer
  if (voteTimers.has(proposalId)) {
    clearInterval(voteTimers.get(proposalId));
    voteTimers.delete(proposalId);
  }
}

/* ===== Start quantitative runoff ===== */
async function startQuantitativeRunoff(proposalId, itemIndexes) {
  const proposal = db.getProposal(proposalId);
  const items = db.getQuantitativeItems(proposalId);
  const voting = db.getVoting(proposalId);
  
  const runoffItems = items.filter(item => itemIndexes.includes(item.itemIndex));
  
  // Обновляем голосование для второго тура
  const updatedVoting = {
    proposalId,
    open: 1,
    startedAt: Date.now(),
    durationMs: 30000, // 30 секунд для второго тура
    expiresAt: Date.now() + 30000,
    messageId: voting.messageId,
    isSecret: voting.isSecret,
    formula: voting.formula,
    stage: 2
  };
  
  try {
    const thread = await client.channels.fetch(proposal.threadId);
    
    // Создаем кнопки для голосования по пунктам второго тура
    const voteRows = [];
    let currentRow = new ActionRowBuilder();
    
    runoffItems.forEach(item => {
      if (currentRow.components.length >= 3) {
        voteRows.push(currentRow);
        currentRow = new ActionRowBuilder();
      }
      currentRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`vote_item_${item.itemIndex}_${proposalId}`)
          .setLabel(`Пункт ${item.itemIndex}`)
          .setStyle(ButtonStyle.Primary)
      );
    });
    
    // Добавляем кнопку воздержаться
    if (currentRow.components.length >= 3) {
      voteRows.push(currentRow);
      currentRow = new ActionRowBuilder();
    }
    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`vote_abstain_${proposalId}`)
        .setLabel("⚪ Воздержаться")
        .setStyle(ButtonStyle.Secondary)
    );
    
    if (currentRow.components.length > 0) {
      voteRows.push(currentRow);
    }
    
    const embed = new EmbedBuilder()
      .setTitle(`🗳️ Второй тур голосования — ${proposal.number}`)
      .setDescription(`Ни один пункт не набрал требуемого количества голосов в первом туре. Голосуйте между двумя лидерами!\n\nГолосование продлится 30 секунд.`)
      .addFields(
        { name: "📋 Пункты для голосования", value: runoffItems.map(item => `**${item.itemIndex}.** ${item.text}`).join('\n'), inline: false },
        { name: "⏱️ Длительность", value: "30 секунд", inline: true },
        { name: "🔒 Тип голосования", value: voting.isSecret ? "Тайное" : "Открытое", inline: true }
      )
      .setColor(COLORS.WARNING)
      .setFooter({ text: FOOTER })
      .setTimestamp();
    
    const runoffMessage = await thread.send({ 
      content: "🔄 **Запуск второго тура голосования!**",
      embeds: [embed], 
      components: voteRows 
    });
    
    updatedVoting.runoffMessageId = runoffMessage.id;
    db.startVoting(updatedVoting);
    
    // Запускаем таймер для второго тура
    await startVoteTicker(proposalId);
    
  } catch (e) {
    console.error("Error starting quantitative runoff:", e);
  }
}

/* ===== Finalize quantitative runoff ===== */
async function finalizeQuantitativeRunoff(proposalId) {
  const proposal = db.getProposal(proposalId);
  if (!proposal) return;

  const voting = db.getVoting(proposalId);
  const items = db.getQuantitativeItems(proposalId);
  const voteCounts = db.getVoteCounts(proposalId, 2);
  
  // Подсчитываем голоса по пунктам во втором туре
  const itemVotes = {};
  items.forEach(item => {
    itemVotes[item.itemIndex] = voteCounts.find(v => v.voteType === `item_${item.itemIndex}`)?.count || 0;
  });
  
  const abstainCount = voteCounts.find(v => v.voteType === 'abstain')?.count || 0;
  const totalVoted = Object.values(itemVotes).reduce((sum, count) => sum + count, 0) + abstainCount;
  
  // Находим победителя (простое большинство)
  let winnerIndex = null;
  let winnerVotes = 0;
  
  for (const [index, votes] of Object.entries(itemVotes)) {
    if (votes > winnerVotes) {
      winnerIndex = index;
      winnerVotes = votes;
    }
  }
  
  let resultText = "Не принято";
  let resultColor = COLORS.SECONDARY;
  let resultEmoji = "❌";
  let tagId = FORUM_TAGS.NOT_APPROVED;
  
  if (winnerIndex !== null && winnerVotes > 0) {
    resultText = `Принят пункт ${winnerIndex} (второй тур)`;
    resultColor = COLORS.SUCCESS;
    resultEmoji = "✅";
    tagId = FORUM_TAGS.APPROVED;
  }
  
  // Публикуем результаты второго тура
  const embed = createQuantitativeResultsEmbed(proposal, items, itemVotes, abstainCount, totalVoted, 
    0, true, 0, 0, '0', voting.isSecret, winnerIndex, "Второй тур", 0);
  
  try {
    const thread = await client.channels.fetch(proposal.threadId);
    const messageId = voting.runoffMessageId || voting.messageId;
    
    if (messageId) {
      try {
        const voteMsg = await thread.messages.fetch(messageId);
        await voteMsg.edit({ content: null, embeds: [embed], components: [] });
      } catch (e) {
        await thread.send({ embeds: [embed] });
      }
    } else {
      await thread.send({ embeds: [embed] });
    }
    
    // Close thread after delay
    setTimeout(async () => {
      await closeThreadWithTag(proposal.threadId, tagId);
    }, 30_000);
    
    // Update database
    db.endVoting(proposalId, Date.now());
    db.updateProposalStatus(proposalId, resultText);
    
  } catch (e) {
    console.error("Error publishing quantitative runoff results:", e);
  }
  
  // Clear timer
  if (voteTimers.has(proposalId)) {
    clearInterval(voteTimers.get(proposalId));
    voteTimers.delete(proposalId);
  }
}

/* ===== Create quantitative results embed ===== */
function createQuantitativeResultsEmbed(proposal, items, itemVotes, abstainCount, totalVoted, 
  voteQuorum, isQuorumMet, notVoted, notVotedRegistered, formula, isSecret, winnerIndex, round, totalMembers) {
  
  let description = `## ${round}\n`;
  
  if (winnerIndex) {
    const winnerItem = items.find(item => item.itemIndex == winnerIndex);
    description += `### ✅ Принят пункт ${winnerIndex}\n`;
    description += `**${winnerItem.text}**\n\n`;
  } else if (round === "Первый тур") {
    description += "### ❌ Ни один пункт не набрал требуемого количества голосов\n\n";
  } else {
    description += "### ❌ Не принято\n\n";
  }
  
  const embed = new EmbedBuilder()
    .setTitle(`📊 Результаты количественного голосования — ${proposal.number}`)
    .setDescription(description)
    .setColor(winnerIndex ? COLORS.SUCCESS : COLORS.SECONDARY)
    .setFooter({ text: FOOTER })
    .setTimestamp();
  
  // Добавляем результаты по пунктам
  items.forEach(item => {
    const votes = itemVotes[item.itemIndex] || 0;
    const percentage = totalVoted > 0 ? Math.round((votes / totalVoted) * 100) : 0;
    embed.addFields({
      name: `Пункт ${item.itemIndex} — ${votes} голосов (${percentage}%)`,
      value: item.text.length > 100 ? item.text.substring(0, 100) + '...' : item.text,
      inline: false
    });
  });
  
  embed.addFields(
    { name: "⚪ Воздержалось", value: String(abstainCount), inline: true },
    { name: "📊 Всего проголосовало", value: String(totalVoted), inline: true }
  );
  
  if (round === "Первый тур") {
    embed.addFields(
      { name: "📋 Требуемый кворум", value: `${voteQuorum} голосов`, inline: true },
      { name: "📈 Статус кворума", value: isQuorumMet ? "✅ Собран" : "❌ Не собран", inline: true },
      { name: "👥 Общее количество", value: String(totalMembers), inline: true },
      { name: "❓ Не голосовало", value: `${notVoted} (из них ${notVotedRegistered} зарегистрированных)`, inline: true },
      { name: "📋 Формула", value: getFormulaDescription(formula), inline: true }
    );
  }
  
  embed.addFields(
    { name: "🔒 Тип голосования", value: isSecret ? "Тайное" : "Открытое", inline: true }
  );
  
  return embed;
}

/* ===== Client ready ===== */
client.on(Events.ClientReady, async () => {
  console.log(`Bot ready: ${client.user.tag}`);
  await restoreAllTimers();
});

/* ===== Interaction handling ===== */
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Slash commands
    if (interaction.isChatInputCommand?.()) {
      const cmd = interaction.commandName;
      
      const member = interaction.member;
      
      if (cmd === "send" || cmd === "sendkol") {
        const availableChambers = getAvailableChambers(member);
        
        if (availableChambers.length === 0) {
          await interaction.reply({ 
            content: "❌ У вас нет доступа ни к одной палате для внесения законопроектов.", 
            flags: 64 
          });
          return;
        }
        
        // Создаем выпадающий список с доступными палатами
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`chamber_select_${cmd}`)
          .setPlaceholder('Выберите палату для внесения законопроекта')
          .addOptions(
            availableChambers.map(chamber => 
              new StringSelectMenuOptionBuilder()
                .setLabel(chamber.label)
                .setValue(chamber.value)
            )
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        await interaction.reply({
          content: '📋 Выберите палату для внесения законопроекта:',
          components: [row],
          flags: 64
        });
        return;
      }

      if (cmd === "create_meeting") {
        const member = interaction.member;
        
        // Определяем палату по каналу
        const chamber = getChamberByChannel(interaction.channelId);
        if (!chamber) {
          await interaction.reply({ 
            content: "❌ Эта команда может быть использована только в канале для заседаний.", 
            flags: 64 
          });
          return;
        }
        
        // Проверяем права председателя для этой палаты
        if (!isChamberChairman(member, chamber) && !isAdmin(member)) {
          await interaction.reply({ content: "❌ У вас нет прав для создания заседания в этой палате.", flags: 64 });
          return;
        }
        
        const title = interaction.options.getString("title", true);
        const date = interaction.options.getString("date", true);

        const id = nanoid(8);
        const meeting = {
          id,
          title,
          meetingDate: date,
          chamber: chamber,
          channelId: interaction.channelId,
          messageId: null,
          createdAt: Date.now(),
          durationMs: 0,
          expiresAt: 0,
          open: 0,
          quorum: 0,
          totalMembers: 0,
          status: 'planned'
        };

        db.createMeeting(meeting);

        try {
          // Получаем роль для упоминания
          const mentionRoleId = MEETING_MENTION_ROLES[chamber];
          
          const embed = new EmbedBuilder()
            .setTitle(`📅 Заседание: ${title}`)
            .setDescription(`Заседание запланировано на **${date}**`)
            .addFields(
              { name: "🏛️ Палата", value: CHAMBER_NAMES[chamber], inline: true },
              { name: "📅 Дата и время", value: date, inline: true },
              { name: "📋 Статус", value: "Запланировано", inline: true }
            )
            .setColor(COLORS.PRIMARY)
            .setFooter({ text: FOOTER })
            .setTimestamp();

          const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`start_registration_${id}`).setLabel("Начать регистрацию").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`cancel_meeting_${id}`).setLabel("Отменить").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`postpone_meeting_${id}`).setLabel("Перенести").setStyle(ButtonStyle.Secondary)
          );

          await interaction.reply({ 
            content: `<@&${mentionRoleId}>`, 
            embeds: [embed], 
            components: [buttons]
          });
          
          // Получаем сообщение через fetchReply отдельно
          const message = await interaction.fetchReply();
          db.updateMeetingMessage(id, message.id);
        } catch (e) {
          console.error("Error sending meeting message:", e);
          await interaction.editReply({ content: "❌ Ошибка при создании заседания." });
        }
        return;
      }

      if (cmd === "res_meeting") {
        const member = interaction.member;
        if (!isAdmin(member)) {
          await interaction.reply({ content: "❌ У вас нет прав для этой команды.", flags: 64 });
          return;
        }
        
        await interaction.reply({ content: "🔄 Запуск снятия роли у всех (начинаю)...", flags: 64 });
        
        try {
          const guildMembers = await interaction.guild.members.fetch();
          let count = 0;
          
          // Снимаем все роли для голосования
          for (const [, m] of guildMembers) {
            for (const roleId of Object.values(VOTER_ROLES_BY_CHAMBER)) {
              if (m.roles.cache.has(roleId)) {
                try {
                  await m.roles.remove(roleId, "Снято командой /res_meeting");
                  count++;
                } catch (e) {
                  console.error("Failed to remove role:", m.id, e);
                }
              }
            }
          }
          
          await interaction.followUp({ content: `✅ Роли сняты у ${count} участников.`, flags: 64 });
        } catch (e) {
          console.error("Error in res_meeting:", e);
          await interaction.followUp({ content: "❌ Ошибка при снятии ролей.", flags: 64 });
        }
        return;
      }
    }

    // Select menu interactions
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('chamber_select_')) {
        const chamber = interaction.values[0];
        const cmd = interaction.customId.split('chamber_select_')[1];
        
        let modal;
        
        if (cmd === 'send') {
          modal = new ModalBuilder()
            .setCustomId(`send_modal_${chamber}`)
            .setTitle(`Регистрация законопроекта`);
          
          const nameInput = new TextInputBuilder()
            .setCustomId("proj_name")
            .setLabel("Наименование законопроекта")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
          
          const partyInput = new TextInputBuilder()
            .setCustomId("proj_party")
            .setLabel("Партия/организация")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
          
          const linkInput = new TextInputBuilder()
            .setCustomId("proj_link")
            .setLabel("Ссылка на документ")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
          
          modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(partyInput),
            new ActionRowBuilder().addComponents(linkInput)
          );
        } else if (cmd === 'sendkol') {
          modal = new ModalBuilder()
            .setCustomId(`sendkol_modal_${chamber}`)
            .setTitle(`Регистрация (кол. голос.)`);
          
          const nameInput = new TextInputBuilder()
            .setCustomId("proj_name")
            .setLabel("Наименование законопроекта")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
          
          const partyInput = new TextInputBuilder()
            .setCustomId("proj_party")
            .setLabel("Партия/организация")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
          
          const linkInput = new TextInputBuilder()
            .setCustomId("proj_link")
            .setLabel("Ссылка на документ")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
          
          const itemsInput = new TextInputBuilder()
            .setCustomId("items")
            .setLabel("Пункты (через ;)")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setPlaceholder("Пункт 1; Пункт 2; Пункт 3");
          
          modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(partyInput),
            new ActionRowBuilder().addComponents(linkInput),
            new ActionRowBuilder().addComponents(itemsInput)
          );
        }
        
        await interaction.showModal(modal);
        return;
      }
    }

    // Modal submit
    if (interaction.isModalSubmit?.()) {
      if (interaction.customId.startsWith("send_modal_")) {
        await interaction.deferReply({ flags: 64 });
        
        const chamber = interaction.customId.split("send_modal_")[1];
        const name = interaction.fields.getTextInputValue("proj_name");
        const party = interaction.fields.getTextInputValue("proj_party");
        const link = interaction.fields.getTextInputValue("proj_link");

        const number = db.getNextProposalNumber(chamber);
        const id = nanoid(8);
        
        // Создаем начальные события
        const initialEvents = [{
          type: 'registration',
          chamber: chamber,
          timestamp: Date.now(),
          description: `Внесение в ${CHAMBER_NAMES[chamber]} (Автор: <@${interaction.user.id}>)`
        }];
        
        const proposal = {
          id,
          number,
          name,
          party,
          link,
          chamber,
          status: "На рассмотрении",
          createdAt: Date.now(),
          authorId: interaction.user.id,
          threadId: null,
          channelId: CHAMBER_CHANNELS[chamber],
          isQuantitative: 0,
          events: initialEvents
        };

        try {
          db.createProposal(proposal);

          const forum = await client.channels.fetch(CHAMBER_CHANNELS[chamber]);
          const embed = new EmbedBuilder()
            .setTitle(`📋 ЗАКОНОПРОЕКТ ${number}`)
            .setDescription(`Зарегистрирован новый законопроект`)
            .addFields(
              { name: "🏛️ Палата", value: CHAMBER_NAMES[chamber], inline: false },
              { name: "📝 Наименование", value: name, inline: false },
              { name: "🏛️ Партия / Организация", value: party, inline: false },
              { name: "🔗 Ссылка на документ", value: `[Кликабельно](${link})`, inline: false },
              { name: "👤 Автор инициативы", value: `<@${interaction.user.id}>`, inline: false },
              { name: "📅 Дата регистрации", value: formatMoscowTime(Date.now()), inline: false }
            )
            .setColor(COLORS.PRIMARY)
            .setFooter({ text: FOOTER })
            .setTimestamp();

          const threadMessage = await forum.threads.create({
            name: `${number} — ${name}`,
            appliedTags: [FORUM_TAGS.ON_REVIEW],
            message: {
              embeds: [embed],
              components: [
                new ActionRowBuilder().addComponents(
                  new ButtonBuilder().setCustomId(`start_vote_${id}`).setLabel("▶️ Начать голосование").setStyle(ButtonStyle.Success),
                  new ButtonBuilder().setCustomId(`register_speaker_${id}`).setLabel("🎤 Зарегистрироваться выступить").setStyle(ButtonStyle.Primary),
                  new ButtonBuilder().setCustomId(`delete_proposal_${id}`).setLabel("🗑️ Удалить/Отозвать").setStyle(ButtonStyle.Danger)
                ),
              ],
            },
          });

          // Получаем ID первого сообщения в ветке
          const firstMessage = await threadMessage.fetchStarterMessage();
          db.updateProposalInitialMessage(id, firstMessage.id);
          db.updateProposalThread(id, threadMessage.id);
          
          // **FIX (Point 4):** Создаем сообщения в правильном порядке
          await updateHistoryMessage(id);
          await updateSpeakersMessage(id);
          
          await interaction.editReply({ content: `✅ Законопроект зарегистрирован: ${threadMessage.url}` });
        } catch (e) {
          console.error("Error creating forum thread:", e);
          await interaction.editReply({ content: "❌ Ошибка при создании темы в форуме — проверь права бота и ID форума." });
        }
        return;
      }

      if (interaction.customId.startsWith("sendkol_modal_")) {
        await interaction.deferReply({ flags: 64 });
        
        const chamber = interaction.customId.split("sendkol_modal_")[1];
        const name = interaction.fields.getTextInputValue("proj_name");
        const party = interaction.fields.getTextInputValue("proj_party");
        const link = interaction.fields.getTextInputValue("proj_link");
        const itemsText = interaction.fields.getTextInputValue("items");

        const number = db.getNextProposalNumber(chamber);
        const id = nanoid(8);
        
        // Создаем начальные события
        const initialEvents = [{
          type: 'registration',
          chamber: chamber,
          timestamp: Date.now(),
          description: `Внесение в ${CHAMBER_NAMES[chamber]} (Автор: <@${interaction.user.id}>)`
        }];
        
        const proposal = {
          id,
          number,
          name,
          party,
          link,
          chamber,
          status: "На рассмотрении",
          createdAt: Date.now(),
          authorId: interaction.user.id,
          threadId: null,
          channelId: CHAMBER_CHANNELS[chamber],
          isQuantitative: 1,
          events: initialEvents
        };

        try {
          db.createProposal(proposal);

          // Обрабатываем пункты из текстового поля
          const items = itemsText 
            ? itemsText.split(';')
                .map(item => item.trim())
                .filter(item => item !== '')
                .slice(0, 5) // Ограничиваем максимум 5 пунктами
            : [];

          // Сохраняем пункты количественного голосования
          items.forEach((itemText, index) => {
            db.addQuantitativeItem({
              proposalId: id,
              itemIndex: index + 1,
              text: itemText
            });
          });

          const forum = await client.channels.fetch(CHAMBER_CHANNELS[chamber]);
          const embed = new EmbedBuilder()
            .setTitle(`📋 ЗАКОНОПРОЕКТ ${number} (Количественное голосование)`)
            .setDescription(`Зарегистрирован новый законопроект с количественным голосованием`)
            .addFields(
              { name: "🏛️ Палата", value: CHAMBER_NAMES[chamber], inline: false },
              { name: "📝 Наименование", value: name, inline: false },
              { name: "🏛️ Партия / Организация", value: party, inline: false },
              { name: "🔗 Ссылка на документ", value: `[Кликабельно](${link})`, inline: false },
              { name: "👤 Автор инициативы", value: `<@${interaction.user.id}>`, inline: false },
              { name: "📅 Дата регистрации", value: formatMoscowTime(Date.now()), inline: false }
            )
            .setColor(COLORS.PRIMARY)
            .setFooter({ text: FOOTER })
            .setTimestamp();

          const threadMessage = await forum.threads.create({
            name: `${number} — ${name}`,
            appliedTags: [FORUM_TAGS.ON_REVIEW],
            message: {
              embeds: [embed],
              components: [
                new ActionRowBuilder().addComponents(
                  new ButtonBuilder().setCustomId(`start_vote_${id}`).setLabel("▶️ Начать голосование").setStyle(ButtonStyle.Success),
                  new ButtonBuilder().setCustomId(`register_speaker_${id}`).setLabel("🎤 Зарегистрироваться выступить").setStyle(ButtonStyle.Primary),
                  new ButtonBuilder().setCustomId(`delete_proposal_${id}`).setLabel("🗑️ Удалить/Отозвать").setStyle(ButtonStyle.Danger)
                ),
              ],
            },
          });

          // Получаем ID первого сообщения в ветке
          const firstMessage = await threadMessage.fetchStarterMessage();
          db.updateProposalInitialMessage(id, firstMessage.id);
          db.updateProposalThread(id, threadMessage.id);
          
          // **FIX (Point 4):** Создаем сообщения в правильном порядке
          await updateHistoryMessage(id);
          await updateSpeakersMessage(id);
          
          // Создаем сообщение с пунктами количественного голосования
          if (items.length > 0) {
            const itemsEmbed = new EmbedBuilder()
              .setTitle(`📊 Пункты для количественного голосования`)
              .setDescription(`Данный законопроект подразумевает количественное голосование по следующим пунктам:`)
              .setColor(COLORS.INFO)
              .setFooter({ text: FOOTER })
              .setTimestamp();
            
            items.forEach((item, index) => {
              itemsEmbed.addFields({
                name: `Пункт ${index + 1}`,
                value: item,
                inline: false
              });
            });
            
            await threadMessage.send({ embeds: [itemsEmbed] });
          }
          
          await interaction.editReply({ content: `✅ Законопроект с количественным голосованием зарегистрирован: ${threadMessage.url}` });
        } catch (e) {
          console.error("Error creating forum thread:", e);
          await interaction.editReply({ content: "❌ Ошибка при создании темы в форуме — проверь права бота и ID форума." });
        }
        return;
      }

      // Modal for starting vote
      if (interaction.customId.startsWith("start_vote_modal_")) {
        await interaction.deferReply({ flags: 64 });
        
        const pid = interaction.customId.split("start_vote_modal_")[1];
        const durInput = interaction.fields.getTextInputValue("vote_duration").trim();
        const voteTypeInput = interaction.fields.getTextInputValue("vote_type").trim();
        const formulaInput = interaction.fields.getTextInputValue("vote_formula").trim();
        
        const allowed = ["0s", "30s", "1m", "2m", "3m", "5m"];
        const chosen = allowed.includes(durInput) ? durInput : "1m";
        const ms = parseDurationStr(chosen);
        
        const isSecret = voteTypeInput === "0";
        const formula = ["0", "1", "2", "3"].includes(formulaInput) ? formulaInput : "0";

        const proposal = db.getProposal(pid);
        if (!proposal) {
          await interaction.editReply({ content: "❌ Проект не найден." });
          return;
        }

        const existingVoting = db.getVoting(pid);
        if (existingVoting?.open) {
          await interaction.editReply({ content: "❌ Голосование уже идёт." });
          return;
        }

        const voting = {
          proposalId: pid,
          open: 1,
          startedAt: Date.now(),
          durationMs: ms,
          expiresAt: ms > 0 ? Date.now() + ms : null,
          messageId: null,
          isSecret: isSecret ? 1 : 0,
          formula,
          stage: 1
        };

        db.startVoting(voting);

        try {
          const thread = await client.channels.fetch(proposal.threadId);
          const timeText = ms > 0 ? 
            `🕐 **Начало:** ${formatMoscowTime(voting.startedAt)}\n⏰ **Завершение:** ${formatMoscowTime(voting.expiresAt)}` :
            `🕐 **Начало:** ${formatMoscowTime(voting.startedAt)}\n⏰ **Завершение:** До ручного завершения`;

          // Для количественного голосования создаем специальные кнопки
          let voteRows = [];
          let controlRow;
          
          if (proposal.isQuantitative) {
            const items = db.getQuantitativeItems(pid);
            let currentRow = new ActionRowBuilder();
            
            items.forEach(item => {
              if (currentRow.components.length >= 3) {
                voteRows.push(currentRow);
                currentRow = new ActionRowBuilder();
              }
              currentRow.addComponents(
                new ButtonBuilder()
                  .setCustomId(`vote_item_${item.itemIndex}_${pid}`)
                  .setLabel(`Пункт ${item.itemIndex}`)
                  .setStyle(ButtonStyle.Primary)
              );
            });
            
            // Добавляем кнопку воздержаться
            if (currentRow.components.length >= 3) {
              voteRows.push(currentRow);
              currentRow = new ActionRowBuilder();
            }
            currentRow.addComponents(
              new ButtonBuilder()
                .setCustomId(`vote_abstain_${pid}`)
                .setLabel("⚪ Воздержаться")
                .setStyle(ButtonStyle.Secondary)
            );
            
            if (currentRow.components.length > 0) {
              voteRows.push(currentRow);
            }
            
            controlRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`end_vote_${pid}`).setLabel("⏹️ Завершить голосование").setStyle(ButtonStyle.Danger)
            );
            
          } else {
            // Обычное голосование
            voteRows = [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`vote_for_${pid}`).setLabel("✅ За").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`vote_against_${pid}`).setLabel("❌ Против").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`vote_abstain_${pid}`).setLabel("⚪ Воздержался").setStyle(ButtonStyle.Secondary)
              )
            ];
            
            controlRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`end_vote_${pid}`).setLabel("⏹️ Завершить голосование").setStyle(ButtonStyle.Danger)
            );
          }

          const embed = new EmbedBuilder()
            .setTitle(`🗳️ Голосование по инициативе ${proposal.number}${proposal.isQuantitative ? ' (Количественное)' : ''}`)
            .setDescription(`Голосование началось!\n\n${timeText}`)
            .addFields(
              { name: "🔒 Тип голосования", value: isSecret ? "Тайное" : "Открытое", inline: true },
              { name: "📋 Формула", value: getFormulaDescription(formula), inline: true }
            )
            .setColor(COLORS.INFO)
            .setFooter({ text: FOOTER })
            .setTimestamp();
            
          const allComponents = [...voteRows, controlRow];
          const voteMsg = await thread.send({ embeds: [embed], components: allComponents });

          // Update voting with message ID
          voting.messageId = voteMsg.id;
          db.startVoting(voting);

          // Отключаем кнопки в первоначальном сообщении
          await disableRegistrationButtonForProposal(pid);

          if (ms > 0) {
            await startVoteTicker(pid);
          }

          const durationText = ms > 0 ? chosen : "до ручного завершения";
          await interaction.editReply({ 
            content: `✅ Голосование запущено на ${durationText}. Тип: ${isSecret ? "тайное" : "открытое"}, формула: ${getFormulaDescription(formula)}.` 
          });
        } catch (e) {
          console.error("Error starting vote:", e);
          await interaction.editReply({ content: "❌ Ошибка при запуске голосования." });
        }
        return;
      }

      // Modal for speaker registration
      if (interaction.customId.startsWith("speaker_modal_")) {
        const pid = interaction.customId.split("speaker_modal_")[1];
        const typeInput = interaction.fields.getTextInputValue("speaker_type");
        
        let speakerType = 'прения';
        let displayName = 'участник прений';
        
        if (typeInput === '1') {
          speakerType = 'доклад';
          displayName = 'докладчик';
        } else if (typeInput === '2') {
          speakerType = 'содоклад';
          displayName = 'содокладчик';
        } else if (typeInput === '3') {
          speakerType = 'прения';
          displayName = 'участник прений';
        }
        
        // Проверяем, не зарегистрирован ли уже пользователь
        const existingSpeakers = db.getSpeakers(pid);
        const alreadyRegistered = existingSpeakers.find(s => s.userId === interaction.user.id);
        
        if (alreadyRegistered) {
          // Если уже зарегистрирован, обновляем тип
          db.removeSpeaker(pid, interaction.user.id);
        }
        
        const speaker = {
          proposalId: pid,
          userId: interaction.user.id,
          type: speakerType,
          displayName: displayName,
          registeredAt: Date.now()
        };
        
        db.addSpeaker(speaker);
        
        // Обновляем сообщение со списком выступающих
        await updateSpeakersMessage(pid);
        
        await interaction.reply({ 
          content: `✅ Вы зарегистрированы как **${displayName}** для выступления по этой инициативе.`, 
          flags: 64 
        });
        return;
      }

      // Modal for deleting proposal
      if (interaction.customId.startsWith("delete_proposal_modal_")) {
        await interaction.deferReply({ flags: 64 });
        
        const pid = interaction.customId.split("delete_proposal_modal_")[1];
        const reason = interaction.fields.getTextInputValue("delete_reason");
        
        const proposal = db.getProposal(pid);
        if (!proposal) {
          await interaction.editReply({ content: "❌ Законопроект не найден." });
          return;
        }

        // Проверяем, что нет активного голосования
        const voting = db.getVoting(pid);
        if (voting?.open) {
          await interaction.editReply({ content: "❌ Нельзя удалить законопроект во время голосования." });
          return;
        }

        try {
          const thread = await client.channels.fetch(proposal.threadId);
          
          // Создаем embed с информацией об удалении
          const deleteEmbed = new EmbedBuilder()
            .setTitle(`🗑️ Законопроект отозван`)
            .setDescription(`Законопроект **${proposal.number}** был отозван`)
            .addFields(
              { name: "📝 Наименование", value: proposal.name, inline: false },
              { name: "👤 Отозвал", value: `<@${interaction.user.id}>`, inline: true },
              { name: "📅 Дата отзыва", value: formatMoscowTime(Date.now()), inline: true },
              { name: "📋 Причина", value: reason, inline: false }
            )
            .setColor(COLORS.DANGER)
            .setFooter({ text: FOOTER })
            .setTimestamp();
          
          await thread.send({ embeds: [deleteEmbed] });
          
          // Закрываем тред
          await thread.setArchived(true, 'Законопроект отозван');
          
          // Удаляем из базы данных
          db.deleteProposal(pid);
          
          await interaction.editReply({ content: "✅ Законопроект успешно отозван." });
        } catch (e) {
          console.error("Error deleting proposal:", e);
          await interaction.editReply({ content: "❌ Ошибка при отзыве законопроекта." });
        }
        return;
      }

      // Modal for starting registration
      if (interaction.customId.startsWith("start_registration_modal_")) {
        await interaction.deferReply({ flags: 64 });
        
        const meetingId = interaction.customId.split("start_registration_modal_")[1];
        const duration = interaction.fields.getTextInputValue("registration_duration");
        const quorum = parseInt(interaction.fields.getTextInputValue("registration_quorum"));
        const totalMembers = parseInt(interaction.fields.getTextInputValue("registration_total_members"));
        
        const meeting = db.getMeeting(meetingId);
        if (!meeting) {
          await interaction.editReply({ content: "❌ Заседание не найдено." });
          return;
        }

        const ms = parseDurationStr(duration);
        
        // Обновляем заседание
        meeting.durationMs = ms;
        meeting.expiresAt = Date.now() + ms;
        meeting.open = 1;
        meeting.quorum = quorum;
        meeting.totalMembers = totalMembers;
        meeting.status = 'registration';
        
        // Используем новый метод updateMeeting
        db.updateMeeting(meetingId, {
          durationMs: ms,
          expiresAt: Date.now() + ms,
          open: 1,
          quorum: quorum,
          totalMembers: totalMembers,
          status: 'registration'
        });

        try {
          const ch = await client.channels.fetch(meeting.channelId);
          const msg = await ch.messages.fetch(meeting.messageId);
          
          const regBtn = new ButtonBuilder()
            .setCustomId(`get_card_${meetingId}`)
            .setLabel("🎫 Получить карточку для голосования")
            .setStyle(ButtonStyle.Primary);
          const row = new ActionRowBuilder().addComponents(regBtn);
          
          const embed = new EmbedBuilder()
            .setTitle(`🔔 Открыта регистрация`)
            .setDescription(`**${meeting.title}**`)
            .addFields(
              { name: "⏱️ Время регистрации", value: formatTimeLeft(ms), inline: true },
              { name: "📊 Требуемый кворум", value: String(quorum), inline: true },
              { name: "👥 Общее количество", value: String(totalMembers), inline: true },
              { name: "🕐 Начало регистрации", value: formatMoscowTime(Date.now()), inline: true }
            )
            .setColor(COLORS.PRIMARY)
            .setFooter({ text: FOOTER })
            .setTimestamp();
            
          await msg.edit({ embeds: [embed], components: [row] });

          await startMeetingTicker(meetingId);
          await interaction.editReply({ content: "✅ Регистрация начата." });
        } catch (e) {
          console.error("Error starting registration:", e);
          await interaction.editReply({ content: "❌ Ошибка при запуске регистрации." });
        }
        return;
      }

      // Modal for canceling meeting
      if (interaction.customId.startsWith("cancel_meeting_modal_")) {
        await interaction.deferReply({ flags: 64 });
        
        const meetingId = interaction.customId.split("cancel_meeting_modal_")[1];
        const reason = interaction.fields.getTextInputValue("cancel_reason");
        
        const meeting = db.getMeeting(meetingId);
        if (!meeting) {
          await interaction.editReply({ content: "❌ Заседание не найдено." });
          return;
        }

        // Используем новый метод updateMeeting
        db.updateMeeting(meetingId, {
          status: 'cancelled',
          open: 0
        });

        try {
          const ch = await client.channels.fetch(meeting.channelId);
          const msg = await ch.messages.fetch(meeting.messageId);
          
          const embed = new EmbedBuilder()
            .setTitle(`❌ Заседание отменено`)
            .setDescription(`**${meeting.title}**`)
            .addFields(
              { name: "📅 Изначальная дата", value: meeting.meetingDate, inline: true },
              { name: "👤 Отменил", value: `<@${interaction.user.id}>`, inline: true },
              { name: "📅 Дата отмены", value: formatMoscowTime(Date.now()), inline: true },
              { name: "📋 Причина", value: reason, inline: false }
            )
            .setColor(COLORS.DANGER)
            .setFooter({ text: FOOTER })
            .setTimestamp();
            
          await msg.edit({ embeds: [embed], components: [] });
          await interaction.editReply({ content: "✅ Заседание отменено." });
        } catch (e) {
          console.error("Error canceling meeting:", e);
          await interaction.editReply({ content: "❌ Ошибка при отмене заседания." });
        }
        return;
      }

      // Modal for postponing meeting
      if (interaction.customId.startsWith("postpone_meeting_modal_")) {
        await interaction.deferReply({ flags: 64 });
        
        const meetingId = interaction.customId.split("postpone_meeting_modal_")[1];
        const newDate = interaction.fields.getTextInputValue("postpone_new_date");
        const reason = interaction.fields.getTextInputValue("postpone_reason");
        
        const meeting = db.getMeeting(meetingId);
        if (!meeting) {
          await interaction.editReply({ content: "❌ Заседание не найдено." });
          return;
        }

        const oldDate = meeting.meetingDate;
        
        // Используем новый метод updateMeeting
        db.updateMeeting(meetingId, {
          meetingDate: newDate,
          status: 'postponed'
        });

        try {
          const ch = await client.channels.fetch(meeting.channelId);
          const msg = await ch.messages.fetch(meeting.messageId);
          
          const embed = new EmbedBuilder()
            .setTitle(`🔄 Заседание перенесено`)
            .setDescription(`**${meeting.title}**`)
            .addFields(
              { name: "📅 Старая дата", value: oldDate, inline: true },
              { name: "📅 Новая дата", value: newDate, inline: true },
              { name: "👤 Перенес", value: `<@${interaction.user.id}>`, inline: true },
              { name: "📅 Дата переноса", value: formatMoscowTime(Date.now()), inline: true },
              { name: "📋 Причина", value: reason, inline: false }
            )
            .setColor(COLORS.WARNING)
            .setFooter({ text: FOOTER })
            .setTimestamp();
            
          await msg.edit({ embeds: [embed], components: [] });
          await interaction.editReply({ content: "✅ Заседание перенесено." });
        } catch (e) {
          console.error("Error postponing meeting:", e);
          await interaction.editReply({ content: "❌ Ошибка при переносе заседания." });
        }
        return;
      }
    }

    // Buttons
    if (interaction.isButton?.()) {
      const cid = interaction.customId;

      // Meeting registration
      if (cid.startsWith("get_card_")) {
        const meetingId = cid.split("get_card_")[1];
        const meeting = db.getMeeting(meetingId);
        
        if (!meeting || !meeting.open) {
          await interaction.reply({ content: "❌ Регистрация закрыта.", flags: 64 });
          return;
        }
        
        // Только регистрируем пользователя, роль будет выдана позже если кворум собран
        if (!db.isUserRegistered(meetingId, interaction.user.id)) {
          db.registerForMeeting(meetingId, interaction.user.id);
        }
        
        await interaction.reply({ content: "✅ Вы зарегистрированы! Роль для голосования будет выдана после завершения регистрации, если будет собран кворум.", flags: 64 });
        return;
      }

      // Clear roles button
      if (cid.startsWith("clear_roles_")) {
        const meetingId = cid.split("clear_roles_")[1];
        const meeting = db.getMeeting(meetingId);
        
        if (!meeting) {
          await interaction.reply({ content: "❌ Заседание не найдено.", flags: 64 });
          return;
        }
        
        const member = interaction.member;
        if (!isChamberChairman(member, meeting.chamber) && !isAdmin(member)) {
          await interaction.reply({ content: "❌ У вас нет прав для очистки ролей.", flags: 64 });
          return;
        }
        
        await interaction.deferReply({ flags: 64 });
        
        try {
          const voterRoleId = VOTER_ROLES_BY_CHAMBER[meeting.chamber];
          const guildMembers = await interaction.guild.members.fetch();
          let count = 0;
          
          for (const [, m] of guildMembers) {
            if (m.roles.cache.has(voterRoleId)) {
              try {
                await m.roles.remove(voterRoleId, `Очистка ролей после заседания ${meeting.title}`);
                count++;
              } catch (e) {
                console.error("Failed to remove role:", m.id, e);
              }
            }
          }
          
          await interaction.editReply({ content: `✅ Роли очищены у ${count} участников.` });
          
          // **FIX (Point 1):** Убираем кнопку после нажатия
          await interaction.message.edit({ components: [] });
          
        } catch (e) {
          console.error("Error clearing roles:", e);
          await interaction.editReply({ content: "❌ Ошибка при очистке ролей." });
        }
        return;
      }

      // Start registration button for meeting
      if (cid.startsWith("start_registration_")) {
        const meetingId = cid.split("start_registration_")[1];
        const meeting = db.getMeeting(meetingId);
        
        if (!meeting) {
          await interaction.reply({ content: "❌ Заседание не найдено.", flags: 64 });
          return;
        }
        
        const member = interaction.member;
        if (!isChamberChairman(member, meeting.chamber) && !isAdmin(member)) {
          await interaction.reply({ content: "❌ У вас нет прав для начала регистрации.", flags: 64 });
          return;
        }
        
        const modal = new ModalBuilder()
          .setCustomId(`start_registration_modal_${meetingId}`)
          .setTitle("Настройки регистрации");
          
        const durationInput = new TextInputBuilder()
          .setCustomId("registration_duration")
          .setLabel("Время регистрации")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("30s, 1m, 2m, 3m, 5m");
          
        const quorumInput = new TextInputBuilder()
          .setCustomId("registration_quorum")
          .setLabel("Кворум (минимальное количество)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("Например: 10");
          
        const totalMembersInput = new TextInputBuilder()
          .setCustomId("registration_total_members")
          .setLabel("Общее количество депутатов/сенаторов")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("Например: 53");
          
        modal.addComponents(
          new ActionRowBuilder().addComponents(durationInput),
          new ActionRowBuilder().addComponents(quorumInput),
          new ActionRowBuilder().addComponents(totalMembersInput)
        );
        
        await interaction.showModal(modal);
        return;
      }

      // Cancel meeting button
      if (cid.startsWith("cancel_meeting_")) {
        const meetingId = cid.split("cancel_meeting_")[1];
        const meeting = db.getMeeting(meetingId);
        
        if (!meeting) {
          await interaction.reply({ content: "❌ Заседание не найдено.", flags: 64 });
          return;
        }
        
        const member = interaction.member;
        if (!isChamberChairman(member, meeting.chamber) && !isAdmin(member)) {
          await interaction.reply({ content: "❌ У вас нет прав для отмены заседания.", flags: 64 });
          return;
        }
        
        const modal = new ModalBuilder()
          .setCustomId(`cancel_meeting_modal_${meetingId}`)
          .setTitle("Отмена заседания");
          
        const reasonInput = new TextInputBuilder()
          .setCustomId("cancel_reason")
          .setLabel("Причина отмены")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setPlaceholder("Опишите причину отмены заседания");
          
        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(modal);
        return;
      }

      // Postpone meeting button
      if (cid.startsWith("postpone_meeting_")) {
        const meetingId = cid.split("postpone_meeting_")[1];
        const meeting = db.getMeeting(meetingId);
        
        if (!meeting) {
          await interaction.reply({ content: "❌ Заседание не найдено.", flags: 64 });
          return;
        }
        
        const member = interaction.member;
        if (!isChamberChairman(member, meeting.chamber) && !isAdmin(member)) {
          await interaction.reply({ content: "❌ У вас нет прав для переноса заседания.", flags: 64 });
          return;
        }
        
        const modal = new ModalBuilder()
          .setCustomId(`postpone_meeting_modal_${meetingId}`)
          .setTitle("Перенос заседания");
          
        const newDateInput = new TextInputBuilder()
          .setCustomId("postpone_new_date")
          .setLabel("Новая дата и время")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("Например: 15.12.2024 14:00");
          
        const reasonInput = new TextInputBuilder()
          .setCustomId("postpone_reason")
          .setLabel("Причина переноса")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setPlaceholder("Опишите причину переноса заседания");
          
        modal.addComponents(
          new ActionRowBuilder().addComponents(newDateInput),
          new ActionRowBuilder().addComponents(reasonInput)
        );
        await interaction.showModal(modal);
        return;
      }

      // Start vote button
      if (cid.startsWith("start_vote_")) {
        const pid = cid.split("start_vote_")[1];
        const proposal = db.getProposal(pid);
        
        if (!proposal) {
          await interaction.reply({ content: "❌ Законопроект не найден.", flags: 64 });
          return;
        }
        
        const member = interaction.member;
        
        // Проверяем права председателя для этой палаты
        if (!isChamberChairman(member, proposal.chamber) && !isAdmin(member)) {
          await interaction.reply({ content: "❌ У вас нет прав запускать голосование в этой палате.", flags: 64 });
          return;
        }
        
        const modal = new ModalBuilder()
          .setCustomId(`start_vote_modal_${pid}`)
          .setTitle("Настройки голосования");
          
        const durInput = new TextInputBuilder()
          .setCustomId("vote_duration")
          .setLabel("Время голосования")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("0s, 30s, 1m, 2m, 3m, 5m");
          
        const voteTypeInput = new TextInputBuilder()
          .setCustomId("vote_type")
          .setLabel("Тип голосования")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("0 - тайное, 1 - открытое")
          .setMaxLength(1);
          
        const formulaInput = new TextInputBuilder()
          .setCustomId("vote_formula")
          .setLabel("Формула")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("0-больш, 1-2/3, 2-3/4, 3-от общего")
          .setMaxLength(1);
          
        modal.addComponents(
          new ActionRowBuilder().addComponents(durInput),
          new ActionRowBuilder().addComponents(voteTypeInput),
          new ActionRowBuilder().addComponents(formulaInput)
        );
        
        await interaction.showModal(modal);
        return;
      }

      // End vote button
      if (cid.startsWith("end_vote_")) {
        const pid = cid.split("end_vote_")[1];
        const proposal = db.getProposal(pid);
        
        if (!proposal) {
          await interaction.reply({ content: "❌ Законопроект не найден.", flags: 64 });
          return;
        }
        
        const member = interaction.member;
        
        // Проверяем права председателя для этой палаты
        if (!isChamberChairman(member, proposal.chamber) && !isAdmin(member)) {
          await interaction.reply({ content: "❌ У вас нет прав завершать голосование в этой палате.", flags: 64 });
          return;
        }
        
        await interaction.deferReply({ flags: 64 });
        await finalizeVote(pid);
        await interaction.editReply({ content: "⏹️ Голосование завершено.", flags: 64 });
        return;
      }

      // Register speaker button
      if (cid.startsWith("register_speaker_")) {
        const pid = cid.split("register_speaker_")[1];
        
        const modal = new ModalBuilder()
          .setCustomId(`speaker_modal_${pid}`)
          .setTitle("Тип выступления");
          
        const typeInput = new TextInputBuilder()
          .setCustomId("speaker_type")
          .setLabel("Введите 1, 2 или 3")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("1 - доклад, 2 - содоклад, 3 - прения")
          .setMaxLength(1);
          
        modal.addComponents(new ActionRowBuilder().addComponents(typeInput));
        await interaction.showModal(modal);
        return;
      }

      // Delete proposal button
      if (cid.startsWith("delete_proposal_")) {
        const pid = cid.split("delete_proposal_")[1];
        const proposal = db.getProposal(pid);
        
        if (!proposal) {
          await interaction.reply({ content: "❌ Законопроект не найден.", flags: 64 });
          return;
        }
        
        const member = interaction.member;
        
        // Проверяем права: автор, председатель или администратор
        const isAuthor = interaction.user.id === proposal.authorId;
        const isChairman = isChamberChairman(member, proposal.chamber);
        const isAdminUser = isAdmin(member);
        
        if (!isAuthor && !isChairman && !isAdminUser) {
          await interaction.reply({ content: "❌ У вас нет прав для удаления этого законопроекта.", flags: 64 });
          return;
        }
        
        // Проверяем, что нет активного голосования
        const voting = db.getVoting(pid);
        if (voting?.open) {
          await interaction.reply({ content: "❌ Нельзя удалить законопроект во время голосования.", flags: 64 });
          return;
        }
        
        const modal = new ModalBuilder()
          .setCustomId(`delete_proposal_modal_${pid}`)
          .setTitle("Удаление законопроекта");
          
        const reasonInput = new TextInputBuilder()
          .setCustomId("delete_reason")
          .setLabel("Причина удаления/отзыва")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setPlaceholder("Опишите причину удаления или отзыва законопроекта");
          
        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(modal);
        return;
      }

      // Government approval buttons - УБИРАЕМ КНОПКИ ПОСЛЕ НАЖАТИЯ
      if (cid.startsWith("gov_approve_") || cid.startsWith("gov_return_")) {
        await interaction.deferReply({ flags: 64 });
        
        const pid = cid.split("_").slice(2).join("_");
        const action = cid.startsWith("gov_approve_") ? 'approve' : 'return';
        
        const proposal = db.getProposal(pid);
        if (!proposal) {
          await interaction.editReply({ content: "❌ Законопроект не найден." });
          return;
        }
        
        const member = interaction.member;
        
        // Проверяем права председателя правительства для этой палаты
        if (!isGovernmentChairman(member, proposal.chamber)) {
          await interaction.editReply({ content: "❌ У вас нет прав для одобрения законопроектов в этой палате." });
          return;
        }
        
        // УБИРАЕМ КНОПКИ С СООБЩЕНИЯ
        try {
          await interaction.message.edit({ components: [] });
        } catch (e) {
          console.error("Error removing government buttons:", e);
        }
        
        if (action === 'approve') {
          // Создаем новый законопроект в Совете Федерации
          const newNumber = db.getNextProposalNumber('sf');
          const newId = nanoid(8);
          
          // Обновляем события оригинального законопроекта
          const events = proposal.events || [];
          events.push({
            type: 'government_approval',
            timestamp: Date.now(),
            description: `Одобрен Председателем Правительства (<@${interaction.user.id}>)`
          });
          db.updateProposalEvents(pid, events);
          db.updateProposalStatus(pid, 'Одобрен Правительством');
          
          // **FIX (Point 4):** Обновляем хронологию в оригинальном треде
          await updateHistoryMessage(pid);
          
          // Создаем новый законопроект в Совете Федерации
          const newEvents = [{
            type: 'transfer',
            timestamp: Date.now(),
            description: `Передан из ${CHAMBER_NAMES[proposal.chamber]} (исх. номер ${proposal.number})`
          }];
          
          // Копируем всю историю
          proposal.events.forEach(e => newEvents.push(e));
          
          const newProposal = {
            id: newId,
            number: newNumber,
            name: proposal.name,
            party: proposal.party,
            link: proposal.link,
            chamber: 'sf',
            status: "На рассмотрении",
            createdAt: proposal.createdAt, // Сохраняем исходную дату
            authorId: proposal.authorId, // Сохраняем исходного автора
            threadId: null,
            channelId: CHAMBER_CHANNELS['sf'],
            isQuantitative: 0,
            parentProposalId: pid,
            events: newEvents
          };
          
          db.createProposal(newProposal);
          
          try {
            const forum = await client.channels.fetch(CHAMBER_CHANNELS['sf']);
            const embed = new EmbedBuilder()
              .setTitle(`📋 ЗАКОНОПРОЕКТ ${newNumber}`)
              .setDescription(`Законопроект передан в Совет Федерации после одобрения Правительством`)
              .addFields(
                { name: "🏛️ Исходная палата", value: CHAMBER_NAMES[proposal.chamber], inline: false },
                { name: "📝 Наименование", value: proposal.name, inline: false },
                { name: "🏛️ Партия / Организация", value: proposal.party, inline: false },
                { name: "🔗 Ссылка на документ", value: `[Кликабельно](${proposal.link})`, inline: false },
                { name: "👤 Автор инициативы", value: `<@${proposal.authorId}>`, inline: false }
              )
              .setColor(COLORS.SUCCESS)
              .setFooter({ text: FOOTER })
              .setTimestamp();

            const threadMessage = await forum.threads.create({
              name: `${newNumber} — ${proposal.name}`,
              appliedTags: [FORUM_TAGS.ON_REVIEW],
              message: {
                embeds: [embed],
                components: [
                  new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`start_vote_${newId}`).setLabel("▶️ Начать голосование").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`register_speaker_${newId}`).setLabel("🎤 Зарегистрироваться выступить").setStyle(ButtonStyle.Primary)
                  ),
                ],
              },
            });
            
            // Получаем ID первого сообщения в ветке
            const firstMessage = await threadMessage.fetchStarterMessage();
            db.updateProposalInitialMessage(newId, firstMessage.id);
            db.updateProposalThread(newId, threadMessage.id);
            
            // **FIX (Point 4):** Создаем сообщения в правильном порядке
            await updateHistoryMessage(newId);
            await updateSpeakersMessage(newId);
            
            // Обновляем оригинальный тред и закрываем его
            const originalThread = await client.channels.fetch(proposal.threadId);
            const approvalEmbed = new EmbedBuilder()
              .setTitle(`✅ Законопроект одобрен Правительством`)
              .setDescription(`Законопроект **${proposal.number}** был одобрен Председателем Правительства и передан в Совет Федерации под номером **${newNumber}**`)
              .setColor(COLORS.SUCCESS)
              .setFooter({ text: FOOTER })
              .setTimestamp();
            
            await originalThread.send({ embeds: [approvalEmbed] });
            
            // Закрываем тред исходного законопроекта
            await closeThreadWithTag(proposal.threadId, FORUM_TAGS.APPROVED);
            
            await interaction.editReply({ 
              content: `✅ Законопроект одобрен и передан в Совет Федерации под номером ${newNumber}.`
            });
          } catch (e) {
            console.error("Error creating SF proposal:", e);
            await interaction.editReply({ content: "❌ Ошибка при передаче законопроекта в Совет Федерации." });
          }
        } else {
          // Return action
          const events = proposal.events || [];
          events.push({
            type: 'government_return',
            timestamp: Date.now(),
            description: `Возвращен Председателем Правительства (<@${interaction.user.id}>)`
          });
          db.updateProposalEvents(pid, events);
          db.updateProposalStatus(pid, 'Возвращен Правительством');
          
          // **FIX (Point 4):** Обновляем хронологию
          await updateHistoryMessage(pid);
          
          // Обновляем тред
          const thread = await client.channels.fetch(proposal.threadId);
          const returnEmbed = new EmbedBuilder()
            .setTitle(`↩️ Законопроект возвращен Правительством`)
            .setDescription(`Законопроект **${proposal.number}** был возвращен Председателем Правительства для доработки`)
            .setColor(COLORS.WARNING)
            .setFooter({ text: FOOTER })
            .setTimestamp();
          
          await thread.send({ embeds: [returnEmbed] });
          
          await interaction.editReply({ 
            content: "✅ Законопроект возвращен для доработки."
          });
        }
        return;
      }

      // President actions - УБИРАЕМ КНОПКИ ПОСЛЕ НАЖАТИЯ
      if (cid.startsWith("president_sign_") || cid.startsWith("president_veto_")) {
        await interaction.deferReply({ flags: 64 });
        
        const pid = cid.split("_").slice(2).join("_");
        const action = cid.startsWith("president_sign_") ? 'sign' : 'veto';
        
        // Проверяем, что это президент
        if (interaction.user.id !== ROLES.PRESIDENT) {
          await interaction.editReply({ content: "❌ Только Президент может подписывать или отклонять законопроекты." });
          return;
        }
        
        const proposal = db.getProposal(pid);
        if (!proposal) {
          await interaction.editReply({ content: "❌ Законопроект не найден." });
          return;
        }
        
        // УБИРАЕМ КНОПКИ С СООБЩЕНИЯ
        try {
          await interaction.message.edit({ components: [] });
        } catch (e) {
          console.error("Error removing president buttons:", e);
        }
        
        if (action === 'sign') {
          // Подписание законопроекта
          const events = proposal.events || [];
          events.push({
            type: 'president_sign',
            timestamp: Date.now(),
            description: `Подписан Президентом (<@${interaction.user.id}>) ✅`
          });
          db.updateProposalEvents(pid, events);
          db.updateProposalStatus(pid, 'Подписан');
          
          // **FIX (Point 4):** Обновляем хронологию
          await updateHistoryMessage(pid);
          
          // Обновляем тред
          const thread = await client.channels.fetch(proposal.threadId);
          const signEmbed = new EmbedBuilder()
            .setTitle(`✅ Законопроект подписан Президентом`)
            .setDescription(`Законопроект **${proposal.number}** был подписан Президентом и вступает в силу`)
            .setColor(COLORS.SUCCESS)
            .setFooter({ text: FOOTER })
            .setTimestamp();
          
          await thread.send({ embeds: [signEmbed] });
          
          // Обновляем тег
          await closeThreadWithTag(proposal.threadId, FORUM_TAGS.SIGNED);
          
          await interaction.editReply({ 
            content: "✅ Законопроект подписан и вступает в силу." 
          });
        } else {
          // Вето президента
          const events = proposal.events || [];
          events.push({
            type: 'president_veto',
            timestamp: Date.now(),
            description: `Отклонен Президентом (<@${interaction.user.id}>) ❌`
          });
          db.updateProposalEvents(pid, events);
          db.updateProposalStatus(pid, 'Отклонен Президентом');
          
          // **FIX (Point 4):** Обновляем хронологию
          await updateHistoryMessage(pid);
          
          // Обновляем тред
          const thread = await client.channels.fetch(proposal.threadId);
          const vetoEmbed = new EmbedBuilder()
            .setTitle(`❌ Законопроект отклонен Президентом`)
            .setDescription(`Законопроект **${proposal.number}** был отклонен Президентом`)
            .setColor(COLORS.DANGER)
            .setFooter({ text: FOOTER })
            .setTimestamp();
          
          await thread.send({ embeds: [vetoEmbed] });
          
          // Обновляем тег
          await closeThreadWithTag(proposal.threadId, FORUM_TAGS.VETOED);
          
          await interaction.editReply({ 
            content: "✅ Законопроект отклонен." 
          });
        }
        return;
      }

      // Vote buttons for regular voting
      if (cid.startsWith("vote_for_") || cid.startsWith("vote_against_") || cid.startsWith("vote_abstain_")) {
        const parts = cid.split("_");
        const kind = parts[1];
        const pid = parts.slice(2).join("_");
        
        // ИСПРАВЛЕННАЯ ЧАСТЬ: Ищем активное заседание для соответствующей палаты
        const proposal = db.getProposal(pid);
        if (!proposal) {
          await interaction.reply({ content: "❌ Законопроект не найден.", flags: 64 });
          return;
        }
        
        // Ищем активное заседание для этой палаты
        const activeMeetings = db.getActiveMeetings();
        const activeMeeting = activeMeetings.find(m => m.chamber === proposal.chamber);
        
        if (!activeMeeting) {
          await interaction.reply({ content: "❌ Нет активного заседания для этой палаты.", flags: 64 });
          return;
        }
        
        const voterRoleId = VOTER_ROLES_BY_CHAMBER[activeMeeting.chamber];
        const member = interaction.member;
        if (!member.roles.cache.has(voterRoleId)) {
          await interaction.reply({ content: "❌ У вас нет роли для голосования.", flags: 64 });
          return;
        }
        
        const voting = db.getVoting(pid);
        
        if (!voting?.open) {
          await interaction.reply({ content: "❌ Голосование не активно.", flags: 64 });
          return;
        }
        
        const vote = {
          proposalId: pid,
          userId: interaction.user.id,
          voteType: kind,
          createdAt: Date.now(),
          stage: voting.stage || 1
        };
        
        db.addVote(vote);

        await interaction.reply({ content: `✅ Ваш голос учтен`, flags: 64 });
        return;
      }

      // Vote buttons for quantitative voting
      if (cid.startsWith("vote_item_")) {
        const parts = cid.split("_");
        const itemIndex = parts[2];
        const pid = parts.slice(3).join("_");
        
        // ИСПРАВЛЕННАЯ ЧАСТЬ: Ищем активное заседание для соответствующей палаты
        const proposal = db.getProposal(pid);
        if (!proposal) {
          await interaction.reply({ content: "❌ Законопроект не найден.", flags: 64 });
          return;
        }
        
        // Ищем активное заседание для этой палаты
        const activeMeetings = db.getActiveMeetings();
        const activeMeeting = activeMeetings.find(m => m.chamber === proposal.chamber);
        
        if (!activeMeeting) {
          await interaction.reply({ content: "❌ Нет активного заседания для этой палаты.", flags: 64 });
          return;
        }
        
        const voterRoleId = VOTER_ROLES_BY_CHAMBER[activeMeeting.chamber];
        const member = interaction.member;
        if (!member.roles.cache.has(voterRoleId)) {
          await interaction.reply({ content: "❌ У вас нет роли для голосования.", flags: 64 });
          return;
        }
        
        const voting = db.getVoting(pid);
        
        if (!voting?.open) {
          await interaction.reply({ content: "❌ Голосование не активно.", flags: 64 });
          return;
        }
        
        // Проверяем, что это количественное голосование
        if (!proposal.isQuantitative) {
          await interaction.reply({ content: "❌ Это не количественное голосование.", flags: 64 });
          return;
        }
        
        const vote = {
          proposalId: pid,
          userId: interaction.user.id,
          voteType: `item_${itemIndex}`,
          createdAt: Date.now(),
          stage: voting.stage || 1
        };
        
        db.addVote(vote);

        await interaction.reply({ 
          content: `✅ Ваш голос учтен за пункт ${itemIndex}`, 
          flags: 64 
        });
        return;
      }

      // Abstain button for quantitative voting
      if (cid.startsWith("vote_abstain_") && !cid.includes("_against_") && !cid.includes("_for_")) {
        const pid = cid.split("vote_abstain_")[1];
        
        // ИСПРАВЛЕННАЯ ЧАСТЬ: Ищем активное заседание для соответствующей палаты
        const proposal = db.getProposal(pid);
        if (!proposal) {
          await interaction.reply({ content: "❌ Законопроект не найден.", flags: 64 });
          return;
        }
        
        // Ищем активное заседание для этой палаты
        const activeMeetings = db.getActiveMeetings();
        const activeMeeting = activeMeetings.find(m => m.chamber === proposal.chamber);
        
        if (!activeMeeting) {
          await interaction.reply({ content: "❌ Нет активного заседания для этой палаты.", flags: 64 });
          return;
        }
        
        const voterRoleId = VOTER_ROLES_BY_CHAMBER[activeMeeting.chamber];
        const member = interaction.member;
        if (!member.roles.cache.has(voterRoleId)) {
          await interaction.reply({ content: "❌ У вас нет роли для голосования.", flags: 64 });
          return;
        }
        
        const voting = db.getVoting(pid);
        
        if (!voting?.open) {
          await interaction.reply({ content: "❌ Голосование не активно.", flags: 64 });
          return;
        }
        
        // Проверяем, что это количественное голосование
        if (!proposal.isQuantitative) {
          await interaction.reply({ content: "❌ Ошибка голосования (неверный тип).", flags: 64 });
          return;
        }
        
        const vote = {
          proposalId: pid,
          userId: interaction.user.id,
          voteType: 'abstain',
          createdAt: Date.now(),
          stage: voting.stage || 1
        };
        
        db.addVote(vote);

        await interaction.reply({ 
          content: `✅ Ваш голос учтен (воздержались)`, 
          flags: 64 
        });
        return;
      }
    } // закрытие interaction.isButton
  } catch (err) {
    console.error("Interaction error:", err);
    try {
      if (interaction && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ Ошибка при обработке.", flags: 64 });
      } else if (interaction && interaction.deferred) {
        await interaction.editReply({ content: "❌ Ошибка при обработке." });
      }
    } catch (e2) {
      console.error("Error sending error reply:", e2);
    }
  }
}); // закрытие client.on(Events.InteractionCreate)

/* ===== Функция для получения доступных палат для пользователя ===== */
function getAvailableChambers(member) {
  const available = [];
  
  // Проверяем доступ к каждой палате
  for (const [chamber, channelId] of Object.entries(CHAMBER_CHANNELS)) {
    if (hasChamberAccess(member, chamber)) {
      available.push({
        value: chamber,
        label: CHAMBER_NAMES[chamber]
      });
    }
  }
  
  return available;
}

/* ===== Функция проверки прав для палаты ===== */
function hasChamberAccess(member, chamber) {
  const chamberRoles = {
    'sf': [ROLES.SENATOR, ROLES.SENATOR_NO_VOTE],
    'gd_rublevka': [ROLES.DEPUTY, ROLES.DEPUTY_NO_VOTE, ROLES.RUBLEVKA],
    'gd_arbat': [ROLES.DEPUTY, ROLES.DEPUTY_NO_VOTE, ROLES.ARBAT],
    'gd_patricki': [ROLES.DEPUTY, ROLES.DEPUTY_NO_VOTE, ROLES.PATRICKI],
    'gd_tverskoy': [ROLES.DEPUTY, ROLES.DEPUTY_NO_VOTE, ROLES.TVERSKOY]
  };
  
  const requiredRoles = chamberRoles[chamber];
  if (!requiredRoles) return false;
  
  return requiredRoles.some(roleId => member.roles.cache.has(roleId));
}

/* ===== Error handling ===== */
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

/* ===== Login ===== */
client.login(TOKEN).catch((e) => {
  console.error("Login error:", e);
  process.exit(1);
});