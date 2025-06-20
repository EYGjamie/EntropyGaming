import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sqlite3 from 'sqlite3';

interface DiscordGuild {
  guildId: string;
  guildName: string;
  memberCount: number;
  onlineCount: number;
}

interface DiscordChannel {
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
          resolve(rows.map(row => ({
            userID: row.userID,
            username: row.username,
            lastActive: row.lastActive,
            messageCount: row.messageCount || 0,
            voiceMinutes: row.voiceMinutes || 0,
          })));
        }
      });
    });
  }

  async getServerStatistics(): Promise<any> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(*) as totalMembers,
          SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as activeMembers,
          SUM(messageCount) as totalMessages,
          SUM(voiceMinutes) as totalVoiceMinutes,
          AVG(messageCount) as avgMessages,
          COUNT(CASE WHEN joinedAt > datetime('now', '-30 days') THEN 1 END) as newMembersThisMonth,
          COUNT(CASE WHEN lastActive > datetime('now', '-7 days') THEN 1 END) as activeThisWeek
        FROM discord_users
      `;

      this.db.get(query, [], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            totalMembers: row.totalMembers || 0,
            activeMembers: row.activeMembers || 0,
            inactiveMembers: (row.totalMembers || 0) - (row.activeMembers || 0),
            totalMessages: row.totalMessages || 0,
            totalVoiceMinutes: row.totalVoiceMinutes || 0,
            avgMessages: Math.round(row.avgMessages || 0),
            newMembersThisMonth: row.newMembersThisMonth || 0,
            activeThisWeek: row.activeThisWeek || 0,
            totalVoiceHours: Math.round((row.totalVoiceMinutes || 0) / 60),
          });
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
          AND joinedAt > datetime('now', '-90 days')
        GROUP BY DATE(joinedAt)
        ORDER BY date ASC
      `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => ({
            date: row.date,
            newMembers: row.newMembers,
          })));
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
        WHERE isActive = 1
        ORDER BY activityScore DESC
        LIMIT ?
      `;

      this.db.all(query, [limit], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => ({
            userID: row.userID,
            username: row.username,
            messageCount: row.messageCount || 0,
            voiceMinutes: row.voiceMinutes || 0,
            activityScore: Math.round(row.activityScore || 0),
          })));
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
          joinedAt,
          lastActive,
          messageCount,
          voiceMinutes,
          isActive
        FROM discord_users 
        WHERE username LIKE ? OR nickname LIKE ? OR userID = ?
        ORDER BY isActive DESC, lastActive DESC
        LIMIT 50
      `;

      const searchPattern = `%${searchTerm}%`;
      this.db.all(query, [searchPattern, searchPattern, searchTerm], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => ({
            userID: row.userID,
            username: row.username,
            nickname: row.nickname,
            joinedAt: row.joinedAt,
            lastActive: row.lastActive,
            messageCount: row.messageCount || 0,
            voiceMinutes: row.voiceMinutes || 0,
            isActive: row.isActive === 1,
          })));
        }
      });
    });
  }

  async getDashboardData(): Promise<any> {
    const [guildInfo, stats, recentActivity, topUsers] = await Promise.all([
      this.getGuildInfo(),
      this.getServerStatistics(),
      this.getRecentActivity(),
      this.getTopActiveUsers(5),
    ]);

    return {
      guild: guildInfo,
      statistics: stats,
      recentActivity: recentActivity.slice(0, 10),
      topActiveUsers: topUsers,
      lastUpdated: new Date().toISOString(),
    };
  }
}