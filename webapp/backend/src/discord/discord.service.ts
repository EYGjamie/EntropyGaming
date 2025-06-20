import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sqlite3 from 'sqlite3';

// Export interfaces so they can be used by controllers
export interface DiscordGuild {
  guildId: string;
  guildName: string;
  memberCount: number;
  onlineCount: number;
}

export interface DiscordChannel {
  channelId: string;
  channelName: string;
  channelType: string;
  memberCount?: number;
}

@Injectable()
export class DiscordService {
  private db: sqlite3.Database;

  constructor(private configService: ConfigService) {
    const dbPath = this.configService.get<string>('DATABASE_PATH') || '../bot/database.db';
    this.db = new sqlite3.Database(dbPath);
  }

  async getGuildInfo(): Promise<DiscordGuild | null> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(*) as memberCount,
          SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as activeCount
        FROM discord_users
      `;

      this.db.get(query, [], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            guildId: this.configService.get<string>('GUILD_ID') || 'unknown',
            guildName: this.configService.get<string>('GUILD_NAME') || 'Discord Server',
            memberCount: row.memberCount || 0,
            onlineCount: row.activeCount || 0,
          });
        }
      });
    });
  }

  async getDashboardData(): Promise<any> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(*) as totalMembers,
          SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as activeMembers,
          SUM(messageCount) as totalMessages,
          SUM(voiceMinutes) as totalVoiceMinutes,
          AVG(messageCount) as avgMessages
        FROM discord_users
      `;

      this.db.get(query, [], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            totalMembers: row.totalMembers || 0,
            activeMembers: row.activeMembers || 0,
            totalMessages: row.totalMessages || 0,
            totalVoiceMinutes: row.totalVoiceMinutes || 0,
            avgMessages: Math.round(row.avgMessages || 0),
          });
        }
      });
    });
  }

  async getServerStatistics(): Promise<any> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(*) as totalUsers,
          COUNT(CASE WHEN lastActive > datetime('now', '-7 days') THEN 1 END) as weeklyActive,
          COUNT(CASE WHEN lastActive > datetime('now', '-1 day') THEN 1 END) as dailyActive,
          SUM(messageCount) as totalMessages,
          SUM(voiceMinutes) as totalVoiceTime
        FROM discord_users
      `;

      this.db.get(query, [], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            totalUsers: row.totalUsers || 0,
            weeklyActiveUsers: row.weeklyActive || 0,
            dailyActiveUsers: row.dailyActive || 0,
            totalMessages: row.totalMessages || 0,
            totalVoiceTime: row.totalVoiceTime || 0,
          });
        }
      });
    });
  }

  async getRecentActivity(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          userID,
          username,
          lastActive,
          messageCount,
          voiceMinutes
        FROM discord_users 
        WHERE lastActive IS NOT NULL 
        ORDER BY lastActive DESC 
        LIMIT 20
      `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async getTopActiveUsers(limit: number = 10): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          userID,
          username,
          messageCount,
          voiceMinutes,
          (messageCount + (voiceMinutes / 60)) as activityScore
        FROM discord_users 
        ORDER BY activityScore DESC 
        LIMIT ?
      `;

      this.db.all(query, [limit], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async getMemberGrowth(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          DATE(joinedAt) as date,
          COUNT(*) as newMembers
        FROM discord_users 
        WHERE joinedAt IS NOT NULL 
          AND joinedAt > datetime('now', '-30 days')
        GROUP BY DATE(joinedAt)
        ORDER BY date ASC
      `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async searchMembers(searchTerm: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          userID,
          username,
          nickname,
          lastActive,
          messageCount,
          voiceMinutes,
          isActive
        FROM discord_users 
        WHERE username LIKE ? OR nickname LIKE ? OR userID LIKE ?
        ORDER BY messageCount DESC
        LIMIT 50
      `;

      const searchPattern = `%${searchTerm}%`;
      this.db.all(query, [searchPattern, searchPattern, searchPattern], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }
}