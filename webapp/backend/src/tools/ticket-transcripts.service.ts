import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

// Export interfaces so they can be used by controllers
export interface TicketMessage {
  userID: string;
  username: string;
  message: string;
  timestamp: string;
  attachments?: TicketAttachment[];
}

export interface TicketAttachment {
  id: string;
  filename: string;
  url: string;
  localPath?: string;
}

export interface TicketTranscript {
  ticketId: string;
  channelName: string;
  createdAt: string;
  closedAt: string;
  creator: {
    userID: string;
    username: string;
  };
  closer?: {
    userID: string;
    username: string;
  };
  messages: TicketMessage[];
  messageCount: number;
  participantCount: number;
  participants: string[];
}

@Injectable()
export class TicketTranscriptsService {
  private transcriptsPath: string;

  constructor(private configService: ConfigService) {
    // Pfad zu den Ticket-Transkripten aus der Konfiguration
    this.transcriptsPath = this.configService.get<string>('TICKET_TRANSCRIPTS_PATH') || '../../bot/transcripts';
  }

  async getAllTranscripts(): Promise<any[]> {
    try {
      const files = fs.readdirSync(this.transcriptsPath);
      const transcriptFiles = files.filter(file => file.endsWith('.json'));
      
      const transcripts = [];
      
      for (const file of transcriptFiles) {
        try {
          const content = await this.readTranscriptFile(file);
          const summary = this.extractTranscriptSummary(content, file);
          transcripts.push(summary);
        } catch (error) {
          console.error(`Error reading transcript ${file}:`, error);
        }
      }

      // Sortiere nach Erstellungsdatum (neueste zuerst)
      return transcripts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Error reading transcripts directory:', error);
      return [];
    }
  }

  async getTranscript(filename: string): Promise<TicketTranscript> {
    const filePath = path.join(this.transcriptsPath, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Transcript ${filename} not found`);
    }

    try {
      const content = await this.readTranscriptFile(filename);
      return this.parseTranscript(content, filename);
    } catch (error) {
      throw new NotFoundException(`Error reading transcript ${filename}`);
    }
  }

  async searchTranscripts(searchTerm: string): Promise<any[]> {
    const allTranscripts = await this.getAllTranscripts();
    
    return allTranscripts.filter(transcript => 
      transcript.channelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transcript.creator.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transcript.ticketId.includes(searchTerm)
    );
  }

  async getTranscriptsByDateRange(startDate: string, endDate: string): Promise<any[]> {
    const allTranscripts = await this.getAllTranscripts();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return allTranscripts.filter(transcript => {
      const createdDate = new Date(transcript.createdAt);
      return createdDate >= start && createdDate <= end;
    });
  }

  async getTranscriptStats(): Promise<any> {
    const allTranscripts = await this.getAllTranscripts();
    
    const totalTranscripts = allTranscripts.length;
    const totalMessages = allTranscripts.reduce((sum, t) => sum + t.messageCount, 0);
    const avgMessages = totalMessages / totalTranscripts || 0;
    
    // Gruppiere nach Monat
    const monthlyStats = allTranscripts.reduce((acc, transcript) => {
      const month = new Date(transcript.createdAt).toISOString().slice(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = { count: 0, messages: 0 };
      }
      acc[month].count++;
      acc[month].messages += transcript.messageCount;
      return acc;
    }, {});

    return {
      totalTranscripts,
      totalMessages,
      avgMessages: Math.round(avgMessages),
      monthlyStats,
      oldestTranscript: allTranscripts[allTranscripts.length - 1]?.createdAt,
      newestTranscript: allTranscripts[0]?.createdAt,
    };
  }

  private async readTranscriptFile(filename: string): Promise<any> {
    const filePath = path.join(this.transcriptsPath, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  }

  private extractTranscriptSummary(content: any, filename: string): any {
    const messages = content.messages || [];
    // Fix: Use string[] for participants instead of unknown[]
    const participants = [...new Set(messages.map((m: any) => m.username as string))] as string[];
    
    return {
      filename,
      ticketId: this.extractTicketId(filename),
      channelName: content.channelName || 'Unknown',
      createdAt: content.createdAt || new Date().toISOString(),
      closedAt: content.closedAt || null,
      creator: content.creator || { userID: 'unknown', username: 'Unknown' },
      closer: content.closer || null,
      messageCount: messages.length,
      participantCount: participants.length,
      participants: participants.slice(0, 5), // Zeige nur die ersten 5 Teilnehmer
      firstMessage: messages[0]?.timestamp || null,
      lastMessage: messages[messages.length - 1]?.timestamp || null,
    };
  }

  private parseTranscript(content: any, filename: string): TicketTranscript {
    const messages = content.messages || [];
    // Fix: Use string[] for participants instead of unknown[]
    const participants: string[] = [...new Set<string>(messages.map((m: any) => m.username as string))];
    
    return {
      ticketId: this.extractTicketId(filename),
      channelName: content.channelName || 'Unknown',
      createdAt: content.createdAt || new Date().toISOString(),
      closedAt: content.closedAt || null,
      creator: content.creator || { userID: 'unknown', username: 'Unknown' },
      closer: content.closer || null,
      messages: messages.map((m: any) => ({
        userID: m.userID,
        username: m.username,
        message: m.message,
        timestamp: m.timestamp,
        attachments: m.attachments || [],
      })),
      messageCount: messages.length,
      participantCount: participants.length,
      participants,
    };
  }

  private extractTicketId(filename: string): string {
    // Extrahiere Ticket-ID aus dem Dateinamen
    // z.B. "ticket-12345-transcript.json" -> "12345"
    const match = filename.match(/ticket-(\d+)-/);
    return match ? match[1] : filename.replace('.json', '');
  }
}