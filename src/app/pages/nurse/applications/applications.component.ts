import { AuthService } from '../../../services/auth.service';
import { NurseService } from '../../../services/nurse.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-applications',
  templateUrl: './applications.component.html',
  styleUrls: ['./applications.component.css']
})
export class ApplicationsComponent implements OnInit {

  filterStatus = 'All';
  isLoading    = true;

  applications: any[] = [];

  statuses = ['All', 'PENDING', 'APPROVED', 'REJECTED'];

  statusLabels: Record<string, string> = {
    All: 'All', PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected'
  };

  constructor(private auth: AuthService, private nurseSvc: NurseService) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();
    if (!userId) { this.isLoading = false; return; }

    this.nurseSvc.getApplications(userId).subscribe({
      next: (data) => { this.applications = data || []; this.isLoading = false; },
      error: ()     => { this.isLoading = false; }
    });
  }

  get filtered() {
    if (this.filterStatus === 'All') return this.applications;
    return this.applications.filter(a => (a.status ?? '').toUpperCase() === this.filterStatus);
  }

  countByStatus(status: string) {
    return this.applications.filter(a => (a.status ?? '').toUpperCase() === status).length;
  }

  statusClass(s: string) {
    const map: Record<string, string> = {
      'PENDING':  'badge-applied',
      'APPROVED': 'badge-accepted',
      'REJECTED': 'badge-rejected'
    };
    return map[(s ?? '').toUpperCase()] || 'badge-applied';
  }

  displayStatus(s: string): string {
    const m: Record<string, string> = {
      'PENDING': 'Pending', 'APPROVED': 'Approved', 'REJECTED': 'Rejected'
    };
    return m[(s ?? '').toUpperCase()] || s;
  }

  logout(): void { this.auth.logout(); }
}
