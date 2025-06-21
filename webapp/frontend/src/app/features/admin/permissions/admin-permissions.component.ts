import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-permissions',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Berechtigungsverwaltung</h1>
        <p class="text-gray-600 mt-1">Verwalten Sie Systemberechtigungen und deren Zuweisungen</p>
      </div>
      
      <div class="bg-white shadow rounded-lg p-6">
        <div class="text-center py-12">
          <div class="text-gray-500">
            <p class="text-lg font-medium">Berechtigungsverwaltung</p>
            <p class="mt-1">Diese Funktionalität wird in einer zukünftigen Version implementiert.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './admin-permissions.component.css'
})
export class AdminPermissionsComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}