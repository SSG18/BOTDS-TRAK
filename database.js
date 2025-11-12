// database.js (исправленная версия)

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'congress.db');

class CongressDatabase {
  constructor() {
    this.db = new Database(DB_PATH);
    this.init();
  }

  init() {
    // Включаем поддержку внешних ключей
    this.db.pragma('foreign_keys = ON');

    // Таблица для счетчиков предложений по палатам
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chamber_counters (
        chamberId TEXT PRIMARY KEY,
        value INTEGER NOT NULL DEFAULT 1
      )
    `);

    // Таблица для предложений
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS proposals (
        id TEXT PRIMARY KEY,
        number TEXT NOT NULL,
        name TEXT NOT NULL,
        party TEXT NOT NULL,
        link TEXT NOT NULL,
        chamber TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'На рассмотрении',
        createdAt INTEGER NOT NULL,
        authorId TEXT NOT NULL,
        threadId TEXT,
        channelId TEXT,
        speakersMessageId TEXT,
        historyMessageId TEXT,
        initialMessageId TEXT,
        isQuantitative INTEGER DEFAULT 0,
        parentProposalId TEXT,
        events TEXT DEFAULT '[]'
      )
    `);

    // Таблица для пунктов количественного голосования
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quantitative_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proposalId TEXT NOT NULL,
        itemIndex INTEGER NOT NULL,
        text TEXT NOT NULL,
        FOREIGN KEY (proposalId) REFERENCES proposals (id) ON DELETE CASCADE
      )
    `);

    // Таблица для информации о голосованиях
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS votings (
        proposalId TEXT PRIMARY KEY,
        open INTEGER NOT NULL DEFAULT 0,
        startedAt INTEGER,
        endedAt INTEGER,
        durationMs INTEGER,
        expiresAt INTEGER,
        messageId TEXT,
        isSecret INTEGER DEFAULT 0,
        formula TEXT DEFAULT '0',
        stage INTEGER DEFAULT 1,
        runoffMessageId TEXT,
        FOREIGN KEY (proposalId) REFERENCES proposals (id) ON DELETE CASCADE
      )
    `);

    // Таблица для голосов
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proposalId TEXT NOT NULL,
        userId TEXT NOT NULL,
        voteType TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        stage INTEGER DEFAULT 1,
        UNIQUE(proposalId, userId, stage),
        FOREIGN KEY (proposalId) REFERENCES proposals (id) ON DELETE CASCADE
      )
    `);

    // Таблица для встреч
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        chamber TEXT NOT NULL,
        meetingDate TEXT NOT NULL,
        channelId TEXT NOT NULL,
        messageId TEXT,
        createdAt INTEGER NOT NULL,
        durationMs INTEGER NOT NULL DEFAULT 0,
        expiresAt INTEGER NOT NULL DEFAULT 0,
        open INTEGER NOT NULL DEFAULT 0,
        quorum INTEGER DEFAULT 0,
        totalMembers INTEGER DEFAULT 53,
        status TEXT DEFAULT 'planned'
      )
    `);

    // Таблица для регистраций на встречи
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS meeting_registrations (
        meetingId TEXT NOT NULL,
        userId TEXT NOT NULL,
        registeredAt INTEGER NOT NULL,
        PRIMARY KEY (meetingId, userId),
        FOREIGN KEY (meetingId) REFERENCES meetings (id) ON DELETE CASCADE
      )
    `);

    // Таблица для выступающих
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS speakers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proposalId TEXT NOT NULL,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        displayName TEXT NOT NULL,
        registeredAt INTEGER NOT NULL,
        FOREIGN KEY (proposalId) REFERENCES proposals (id) ON DELETE CASCADE
      )
    `);

    // Таблица для настроек бота
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bot_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // Добавляем недостающие столбцы
    this.addMissingColumns();

    // Инициализация счетчиков для каждой палаты
    const chambers = ['sf', 'gd_rublevka', 'gd_arbat', 'gd_patricki', 'gd_tverskoy'];
    chambers.forEach(chamber => {
      const counter = this.db.prepare('SELECT * FROM chamber_counters WHERE chamberId = ?').get(chamber);
      if (!counter) {
        this.db.prepare('INSERT INTO chamber_counters (chamberId, value) VALUES (?, 1)').run(chamber);
      }
    });
  }

  // Метод для добавления недостающих колонок
  addMissingColumns() {
    const columnsToAdd = [
      { table: 'proposals', column: 'chamber', type: 'TEXT' },
      { table: 'proposals', column: 'parentProposalId', type: 'TEXT' },
      { table: 'proposals', column: 'events', type: 'TEXT DEFAULT \'[]\'' },
      { table: 'proposals', column: 'historyMessageId', type: 'TEXT' },
      { table: 'meetings', column: 'chamber', type: 'TEXT' },
      { table: 'meetings', column: 'meetingDate', type: 'TEXT' },
      { table: 'meetings', column: 'totalMembers', type: 'INTEGER DEFAULT 53' },
      { table: 'meetings', column: 'status', type: 'TEXT DEFAULT \'planned\'' }
    ];

    columnsToAdd.forEach(({ table, column, type }) => {
      try {
        this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        console.log(`Added column ${column} to table ${table}`);
      } catch (e) {
        // Колонка уже существует - это нормально
        if (!e.message.includes('duplicate column name')) {
          console.error(`Error adding column ${column} to table ${table}:`, e.message);
        }
      }
    });
  }

  // Методы для работы с предложениями
  getNextProposalNumber(chamber) {
    const result = this.db.prepare('SELECT value FROM chamber_counters WHERE chamberId = ?').get(chamber);
    const number = String(result.value).padStart(3, '0');
    const prefix = chamber === 'sf' ? 'СФ' : 'ГД';
    const fullNumber = `${prefix}-${number}`;
    this.db.prepare('UPDATE chamber_counters SET value = value + 1 WHERE chamberId = ?').run(chamber);
    return fullNumber;
  }

  createProposal(proposal) {
    // Преобразуем events в JSON строку, если это массив
    const eventsString = Array.isArray(proposal.events) 
      ? JSON.stringify(proposal.events) 
      : (proposal.events || '[]');

    const stmt = this.db.prepare(`
      INSERT INTO proposals (
        id, number, name, party, link, chamber, status, createdAt, 
        authorId, threadId, channelId, speakersMessageId, historyMessageId, initialMessageId, 
        isQuantitative, parentProposalId, events
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      proposal.id,
      proposal.number,
      proposal.name,
      proposal.party,
      proposal.link,
      proposal.chamber,
      proposal.status,
      proposal.createdAt,
      proposal.authorId,
      proposal.threadId || null,
      proposal.channelId || null,
      proposal.speakersMessageId || null,
      proposal.historyMessageId || null,
      proposal.initialMessageId || null,
      proposal.isQuantitative || 0,
      proposal.parentProposalId || null,
      eventsString
    );
  }

  updateProposalEvents(id, events) {
    const eventsString = Array.isArray(events) ? JSON.stringify(events) : events;
    this.db.prepare('UPDATE proposals SET events = ? WHERE id = ?').run(eventsString, id);
  }

  updateProposalStatus(id, status) {
    this.db.prepare('UPDATE proposals SET status = ? WHERE id = ?').run(status, id);
  }

  updateProposalChannel(id, channelId) {
    this.db.prepare('UPDATE proposals SET channelId = ? WHERE id = ?').run(channelId, id);
  }

  updateProposalThread(id, threadId) {
    this.db.prepare('UPDATE proposals SET threadId = ? WHERE id = ?').run(threadId, id);
  }

  updateProposalSpeakersMessage(id, messageId) {
    this.db.prepare('UPDATE proposals SET speakersMessageId = ? WHERE id = ?').run(messageId, id);
  }

  updateProposalHistoryMessage(id, messageId) {
    this.db.prepare('UPDATE proposals SET historyMessageId = ? WHERE id = ?').run(messageId, id);
  }

  updateProposalInitialMessage(id, messageId) {
    this.db.prepare('UPDATE proposals SET initialMessageId = ? WHERE id = ?').run(messageId, id);
  }

  getProposal(id) {
    const proposal = this.db.prepare('SELECT * FROM proposals WHERE id = ?').get(id);
    if (proposal && proposal.events) {
      try {
        proposal.events = JSON.parse(proposal.events);
      } catch (e) {
        console.error('Error parsing events JSON:', e);
        proposal.events = [];
      }
    } else if (proposal) {
      proposal.events = [];
    }
    return proposal;
  }

  getProposalByNumber(number) {
    const proposal = this.db.prepare('SELECT * FROM proposals WHERE number = ?').get(number);
    if (proposal && proposal.events) {
      try {
        proposal.events = JSON.parse(proposal.events);
      } catch (e) {
        console.error('Error parsing events JSON:', e);
        proposal.events = [];
      }
    } else if (proposal) {
      proposal.events = [];
    }
    return proposal;
  }

  getAllProposals() {
    const proposals = this.db.prepare('SELECT * FROM proposals ORDER BY createdAt DESC').all();
    return proposals.map(proposal => {
      if (proposal.events) {
        try {
          proposal.events = JSON.parse(proposal.events);
        } catch (e) {
          console.error('Error parsing events JSON:', e);
          proposal.events = [];
        }
      } else {
        proposal.events = [];
      }
      return proposal;
    });
  }

  getProposalsByChamber(chamber) {
    const proposals = this.db.prepare('SELECT * FROM proposals WHERE chamber = ? ORDER BY createdAt DESC').all(chamber);
    return proposals.map(proposal => {
      if (proposal.events) {
        try {
          proposal.events = JSON.parse(proposal.events);
        } catch (e) {
          console.error('Error parsing events JSON:', e);
          proposal.events = [];
        }
      } else {
        proposal.events = [];
      }
      return proposal;
    });
  }

  deleteProposal(id) {
    return this.db.prepare('DELETE FROM proposals WHERE id = ?').run(id);
  }

  // Методы для работы с пунктами количественного голосования
  addQuantitativeItem(item) {
    const stmt = this.db.prepare(`
      INSERT INTO quantitative_items (proposalId, itemIndex, text)
      VALUES (?, ?, ?)
    `);
    return stmt.run(item.proposalId, item.itemIndex, item.text);
  }

  getQuantitativeItems(proposalId) {
    return this.db.prepare('SELECT * FROM quantitative_items WHERE proposalId = ? ORDER BY itemIndex').all(proposalId);
  }

  // Методы для работы с голосованиями
  startVoting(voting) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO votings (proposalId, open, startedAt, durationMs, expiresAt, messageId, isSecret, formula, stage, runoffMessageId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      voting.proposalId,
      voting.open,
      voting.startedAt,
      voting.durationMs,
      voting.expiresAt,
      voting.messageId,
      voting.isSecret,
      voting.formula,
      voting.stage || 1,
      voting.runoffMessageId || null
    );
  }

  endVoting(proposalId, endedAt) {
    this.db.prepare('UPDATE votings SET open = 0, endedAt = ? WHERE proposalId = ?').run(endedAt, proposalId);
  }

  getVoting(proposalId) {
    return this.db.prepare('SELECT * FROM votings WHERE proposalId = ?').get(proposalId);
  }

  getOpenVotings() {
    return this.db.prepare(`
      SELECT p.*, v.open, v.startedAt, v.endedAt, v.durationMs, v.expiresAt, v.messageId, v.isSecret, v.formula, v.stage
      FROM proposals p 
      JOIN votings v ON p.id = v.proposalId 
      WHERE v.open = 1
    `).all();
  }

  // Методы для работы с голосами
  addVote(vote) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO votes (proposalId, userId, voteType, createdAt, stage)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(vote.proposalId, vote.userId, vote.voteType, vote.createdAt, vote.stage || 1);
  }

  getVotes(proposalId, stage = 1) {
    return this.db.prepare('SELECT * FROM votes WHERE proposalId = ? AND stage = ?').all(proposalId, stage);
  }

  getVoteCounts(proposalId, stage = 1) {
    return this.db.prepare(`
      SELECT voteType, COUNT(*) as count 
      FROM votes 
      WHERE proposalId = ? AND stage = ?
      GROUP BY voteType
    `).all(proposalId, stage);
  }

  // Методы для работы с встречами
  createMeeting(meeting) {
    const stmt = this.db.prepare(`
      INSERT INTO meetings (id, title, chamber, meetingDate, channelId, messageId, createdAt, durationMs, expiresAt, open, quorum, totalMembers, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      meeting.id,
      meeting.title,
      meeting.chamber,
      meeting.meetingDate,
      meeting.channelId,
      meeting.messageId,
      meeting.createdAt,
      meeting.durationMs,
      meeting.expiresAt,
      meeting.open,
      meeting.quorum,
      meeting.totalMembers,
      meeting.status
    );
  }

  updateMeeting(id, updates) {
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    
    values.push(id);
    
    const stmt = this.db.prepare(`
      UPDATE meetings SET ${fields.join(', ')} WHERE id = ?
    `);
    return stmt.run(...values);
  }

  getMeeting(id) {
    return this.db.prepare('SELECT * FROM meetings WHERE id = ?').get(id);
  }

  getAllMeetings() {
    return this.db.prepare('SELECT * FROM meetings ORDER BY createdAt DESC').all();
  }

  getOpenMeetings() {
    return this.db.prepare('SELECT * FROM meetings WHERE open = 1').all();
  }

  getActiveMeetings() {
    return this.db.prepare('SELECT * FROM meetings WHERE open = 1 OR status = \'voting\'').all();
  }

  getLastMeetingByChamber(chamber) {
    return this.db.prepare('SELECT * FROM meetings WHERE chamber = ? ORDER BY createdAt DESC LIMIT 1').get(chamber);
  }

  updateMeetingMessage(id, messageId) {
    this.db.prepare('UPDATE meetings SET messageId = ? WHERE id = ?').run(messageId, id);
  }

  closeMeeting(id) {
    this.db.prepare('UPDATE meetings SET open = 0 WHERE id = ?').run(id);
  }

  // Методы для работы с регистрациями на встречи
  registerForMeeting(meetingId, userId) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO meeting_registrations (meetingId, userId, registeredAt)
      VALUES (?, ?, ?)
    `);
    return stmt.run(meetingId, userId, Date.now());
  }

  getMeetingRegistrations(meetingId) {
    return this.db.prepare('SELECT userId FROM meeting_registrations WHERE meetingId = ?').all(meetingId);
  }

  isUserRegistered(meetingId, userId) {
    const result = this.db.prepare('SELECT 1 FROM meeting_registrations WHERE meetingId = ? AND userId = ?').get(meetingId, userId);
    return !!result;
  }

  getRegistrationCount(meetingId) {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM meeting_registrations WHERE meetingId = ?').get(meetingId);
    return result.count;
  }

  // Новый метод для получения времени регистрации
  getRegistrationTime(meetingId, userId) {
    const result = this.db.prepare('SELECT registeredAt FROM meeting_registrations WHERE meetingId = ? AND userId = ?').get(meetingId, userId);
    return result ? result.registeredAt : null;
  }

  // Методы для работы с выступающими
  addSpeaker(speaker) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO speakers (proposalId, userId, type, displayName, registeredAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(
      speaker.proposalId,
      speaker.userId,
      speaker.type,
      speaker.displayName,
      speaker.registeredAt
    );
  }

  getSpeakers(proposalId) {
    return this.db.prepare('SELECT * FROM speakers WHERE proposalId = ? ORDER BY registeredAt ASC').all(proposalId);
  }

  removeSpeaker(proposalId, userId) {
    return this.db.prepare('DELETE FROM speakers WHERE proposalId = ? AND userId = ?').run(proposalId, userId);
  }

  // Методы для работы с настройками
  getBotSetting(key) {
    const result = this.db.prepare('SELECT value FROM bot_settings WHERE key = ?').get(key);
    return result ? result.value : null;
  }

  setBotSetting(key, value) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO bot_settings (key, value)
      VALUES (?, ?)
    `);
    return stmt.run(key, value);
  }

  close() {
    this.db.close();
  }
}

export default new CongressDatabase();
