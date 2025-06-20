import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sqlite3 from 'sqlite3';

// Export interface so it can be used by controllers
export interface DiscordUser {
  userID: string;
  username: string;
  joinedAt: string;
  lastActive: string;
  messageCount: number;
  voiceMinutes: number;
  nickname?: string;
  isActive: boolean;
  roles?: string[];
}

@Injectable()
export class DiscordUsersService {
  private db: sqlite3.Database;

  constructor(private configService: ConfigService) {
    const dbPath = this.configService.get<string>('DATABASE_PATH') || '../bot/database.db';
    this.db = new sqlite3.Database(dbPath);
  }

  async getAllDiscordUsers(): Promise<DiscordUser[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          userID,
          username,
          joinedAt,
          lastActive,
          messageCount,
          voiceMinutes,
          nickname,
          isActive
        FROM discord_users 
        ORDER BY joinedAt DESC
      `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const users = rows.map(row => ({
            userID: row.userID,
            username: row.username,
            joinedAt: row.joinedAt,
            lastActive: row.lastActive,
            messageCount: row.messageCount || 0,
            voiceMinutes: row.voiceMinutes || 0,
            nickname: row.nickname,
            isActive: row.isActive === 1,
          }));
          resolve(users);
        }
      });
    });
  }

  async getDiscordUser(userID: string): Promise<DiscordUser | null> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          userID,
          username,
          joinedAt,
          lastActive,
          messageCount,
          voiceMinutes,
          nickname,
          isActive
        FROM discord_users 
        WHERE userID = ?
      `;

      this.db.get(query, [userID], (err, row: any) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve({
            userID: row.userID,
            username: row.username,
            joinedAt: row.joinedAt,
            lastActive: row.lastActive,
            messageCount: row.messageCount || 0,
            voiceMinutes: row.voiceMinutes || 0,
            nickname: row.nickname,
            isActive: row.isActive === 1,
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  async searchDiscordUsers(searchTerm: string): Promise<DiscordUser[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          userID,
          username,
          joinedAt,
          lastActive,
          messageCount,
          voiceMinutes,
          nickname,
          isActive
        FROM discord_users 
        WHERE username LIKE ? OR nickname LIKE ? OR userID = ?
        ORDER BY messageCount DESC
        LIMIT 50
      `;

      const searchPattern = `%${searchTerm}%`;
      this.db.all(query, [searchPattern, searchPattern, searchTerm], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const users = rows.map(row => ({
            userID: row.userID,
            username: row.username,
            joinedAt: row.joinedAt,
            lastActive: row.lastActive,
            messageCount: row.messageCount || 0,
            voiceMinutes: row.voiceMinutes || 0,
            nickname: row.nickname,
            isActive: row.isActive === 1,
          }));
          resolve(users);
        }
      });
    });
  }

  async getActiveDiscordUsers(limit: number = 20): Promise<DiscordUser[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          userID,
          username,
          joinedAt,
          lastActive,
          messageCount,
          voiceMinutes,
          nickname,
          isActive
        FROM discord_users 
        WHERE isActive = 1 
        ORDER BY lastActive DESC 
        LIMIT ?
      `;

      this.db.all(query, [limit], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const users = rows.map(row => ({
            userID: row.userID,
            username: row.username,
            joinedAt: row.joinedAt,
            lastActive: row.lastActive,
            messageCount: row.messageCount || 0,
            voiceMinutes: row.voiceMinutes || 0,
            nickname: row.nickname,
            isActive: row.isActive === 1,
          }));
          resolve(users);
        }
      });
    });
  }

  async getMostActiveDiscordUsers(limit: number = 20): Promise<DiscordUser[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          userID,
          username,
          joinedAt,
          lastActive,
          messageCount,
          voiceMinutes,
          nickname,
          isActive,
          (messageCount + (voiceMinutes / 60)) as activityScore
        FROM discord_users 
        ORDER BY activityScore DESC 
        LIMIT ?
      `;

      this.db.all(query, [limit], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const users = rows.map(row => ({
            userID: row.userID,
            username: row.username,
            joinedAt: row.joinedAt,
            lastActive: row.lastActive,
            messageCount: row.messageCount || 0,
            voiceMinutes: row.voiceMinutes || 0,
            nickname: row.nickname,
            isActive: row.isActive === 1,
          }));
          resolve(users);
        }
      });
    });
  }

  async getDiscordUserStats(): Promise<any> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(*) as totalUsers,
          COUNT(CASE WHEN isActive = 1 THEN 1 END) as activeUsers,
          SUM(messageCount) as totalMessages,
          SUM(voiceMinutes) as totalVoiceMinutes,
          AVG(messageCount) as avgMessages,
          MAX(messageCount) as maxMessages
        FROM discord_users
      `;

      this.db.get(query, [], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            totalUsers: row.totalUsers || 0,
            activeUsers: row.activeUsers || 0,
            totalMessages: row.totalMessages || 0,
            totalVoiceMinutes: row.totalVoiceMinutes || 0,
            avgMessages: Math.round(row.avgMessages || 0),
            maxMessages: row.maxMessages || 0,
          });
        }
      });
    });
  }
}