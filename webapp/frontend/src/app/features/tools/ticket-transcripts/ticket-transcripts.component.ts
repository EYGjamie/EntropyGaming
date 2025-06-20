import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TicketTranscriptsService } from '../services/ticket-transcripts.service';

interface TicketTranscript {
  filename: string;
  ticketId: string;
  userId: string;
  username: string;
  messageCount: number;
  createdAt: string;
  closedAt: string;
  category: string;
}

interface TranscriptStats {
  totalTranscripts: number;
  totalMessages: number;
  avgMessages: number;
  categories: { [key: string]: number };
}

@Component({
  selector: 'app-ticket-transcripts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  providers: [TicketTranscriptsService],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-6 py-4">
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Ticket Transkripte</h1>
          <p class="text-gray-600">Durchsuchen und analysieren Sie Discord-Ticket-Unterhaltungen.</p>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6" *ngIf="stats">
        <div class="bg-white shadow rounded-lg p-6">
          <div class="flex items-center">
            <div class="text-3xl mr-4">📝</div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ stats.totalTranscripts }}</p>
              <p class="text-sm text-gray-600">Transkripte</p>
            </div>
          </div>
        </div>

        <div class="bg-white shadow rounded-lg p-6">
          <div class="flex items-center">
            <div class="text-3xl mr-4">💬</div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ formatNumber(stats.totalMessages) }}</p>
              <p class="text-sm text-gray-600">Nachrichten</p>
            </div>
          </div>
        </div>

        <div class="bg-white shadow rounded-lg p-6">
          <div class="flex items-center">
            <div class="text-3xl mr-4">📊</div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ Math.round(stats.avgMessages) }}</p>
              <p class="text-sm text-gray-600">Ø Nachrichten</p>
            </div>
          </div>
        </div>

        <div class="bg-white shadow rounded-lg p-6">
          <div class="flex items-center">
            <div class="text-3xl mr-4">📁</div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ Object.keys(stats.categories).length }}</p>
              <p class="text-sm text-gray-600">Kategorien</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-6 py-4">
          <div class="flex flex-col sm:flex-row gap-4">
            <!-- Search -->
            <div class="flex-1">
              <label for="search" class="sr-only">Transkripte suchen</label>
              <div class="relative">
                <input
                  type="text"
                  id="search"
                  [(ngModel)]="searchTerm"
                  (input)="onSearch()"
                  placeholder="Nach Ticket-ID, Benutzer oder Kategorie suchen..."
                  class="block w-full pr-10 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                  🔍
                </div>
              </div>
            </div>

            <!-- Category Filter -->
            <div class="sm:w-48">
              <select
                [(ngModel)]="selectedCategory"
                (change)="onCategoryChange()"
                class="block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Alle Kategorien</option>
                <option *ngFor="let category of categories" [value]="category">{{ category }}</option>
              </select>
            </div>

            <!-- Sort -->
            <div class="sm:w-48">
              <select
                [(ngModel)]="sortBy"
                (change)="onSortChange()"
                class="block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="newest">Neueste zuerst</option>
                <option value="oldest">Älteste zuerst</option>
                <option value="messages">Nach Nachrichtenanzahl</option>
                <option value="username">Nach Benutzer</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Transcripts Table -->
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-medium text-gray-900">
              Transkripte {{ selectedCategory ? '(' + selectedCategory + ')' : '' }}
            </h2>
            <div class="text-sm text-gray-500">
              {{ transcripts.length }} Transkripte gefunden
            </div>
          </div>
        </div>

        <div *ngIf="isLoading" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p class="mt-2 text-gray-500">Lade Transkripte...</p>
        </div>

        <div *ngIf="!isLoading && transcripts.length === 0" class="text-center py-8">
          <div class="text-6xl mb-4">📝</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Keine Transkripte gefunden</h3>
          <p class="text-gray-500">
            {{ searchTerm ? 'Versuchen Sie andere Suchbegriffe.' : 'Es sind noch keine Ticket-Transkripte verfügbar.' }}
          </p>
        </div>

        <div *ngIf="!isLoading && transcripts.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Benutzer
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategorie
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nachrichten
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Erstellt
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let transcript of transcripts" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div class="text-sm font-medium text-gray-900">
                      Ticket {{ transcript.ticketId }}
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ transcript.filename }}
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center mr-3">
                      <span class="text-white text-xs font-medium">
                        {{ transcript.username.charAt(0).toUpperCase() }}
                      </span>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-gray-900">{{ transcript.username }}</div>
                      <div class="text-xs text-gray-500">ID: {{ transcript.userId }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                    {{ transcript.category }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ transcript.messageCount }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ formatDate(transcript.createdAt) }}</div>
                  <div class="text-xs text-gray-500">{{ formatTime(transcript.createdAt) }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <a
                    [routerLink]="['/tools/ticket-transcripts', transcript.filename]"
                    class="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    Anzeigen
                  </a>
                  <button
                    (click)="downloadTranscript(transcript.filename)"
                    class="text-green-600 hover:text-green-900"
                  >
                    Download
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class TicketTranscriptsComponent implements OnInit {
  // transcripts property is handled by getter/setter below
  filteredTranscripts: TicketTranscript[] = [];
  stats: TranscriptStats | null = null;
  searchTerm = '';
  selectedCategory = '';
  sortBy = 'newest';
  categories: string[] = [];
  isLoading = true;
  searchTimeout: any;

  constructor(private ticketTranscriptsService: TicketTranscriptsService) {}

  ngOnInit(): void {
    this.loadTranscripts();
    this.loadStats();
  }

  private loadTranscripts(): void {
    this.isLoading = true;
    this.ticketTranscriptsService.getTranscripts().subscribe({
      next: (transcripts) => {
        this.transcripts = transcripts;
        this.filteredTranscripts = [...transcripts];
        this.extractCategories();
        this.applySorting();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading transcripts:', error);
        this.isLoading = false;
      }
    });
  }

  private loadStats(): void {
    this.ticketTranscriptsService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (error) => {
        console.error('Error loading stats:', error);
      }
    });
  }

  private extractCategories(): void {
    const categorySet = new Set(this.transcripts.map(t => t.category));
    this.categories = Array.from(categorySet).sort();
  }

  onSearch(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.applyFilters();
    }, 300);
  }

  onCategoryChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applySorting();
  }

  private applyFilters(): void {
    let filtered = [...this.transcripts];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(transcript =>
        transcript.ticketId.toLowerCase().includes(search) ||
        transcript.username.toLowerCase().includes(search) ||
        transcript.category.toLowerCase().includes(search) ||
        transcript.filename.toLowerCase().includes(search)
      );
    }

    // Apply category filter
    if (this.selectedCategory) {
      filtered = filtered.filter(transcript => transcript.category === this.selectedCategory);
    }

    this.filteredTranscripts = filtered;
    this.applySorting();
  }

  private applySorting(): void {
    this.filteredTranscripts.sort((a, b) => {
      switch (this.sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'messages':
          return b.messageCount - a.messageCount;
        case 'username':
          return a.username.localeCompare(b.username);
        default:
          return 0;
      }
    });
  }

  downloadTranscript(filename: string): void {
    this.ticketTranscriptsService.downloadTranscript(filename).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading transcript:', error);
      }
    });
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('de-DE');
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('de-DE');
  }

  get transcripts(): TicketTranscript[] {
    return this.filteredTranscripts;
  }

  set transcripts(value: TicketTranscript[]) {
    this.filteredTranscripts = value;
  }

  // Make Math and Object available in template
  Math = Math;
  Object = Object;
}