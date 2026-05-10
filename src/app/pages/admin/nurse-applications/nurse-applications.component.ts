import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-nurse-applications',
  templateUrl: './nurse-applications.component.html',
  styleUrls: ['./nurse-applications.component.css']
})
export class NurseApplicationsComponent implements OnInit {

  activeTab = 'All';
  tabs = ['All', 'PENDING', 'APPROVED', 'REJECTED'];
  tabLabels: Record<string, string> = { All: 'All', PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' };

  applications: any[] = [];
  isLoading = true;

  selectedApp: any = null;

  constructor(private adminService: AdminService, private auth: AuthService) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();
    if (!userId) return;

    this.adminService.getOrgApplications(userId).subscribe({
      next: (data) => { this.applications = data || []; this.isLoading = false; },
      error: ()     => { this.isLoading = false; }
    });
  }

  get filteredApplications(): any[] {
    return this.activeTab === 'All'
      ? this.applications
      : this.applications.filter(a => a.status === this.activeTab);
  }

  countByStatus(status: string): number {
    return this.applications.filter(a => a.status === status).length;
  }

  openDetails(app: any): void { this.selectedApp = app; }
  closeDetails(): void       { this.selectedApp = null; }

  approve(id: number): void {
    this.adminService.updateApplicationStatus(id, 'APPROVED').subscribe({
      next: (updated) => {
        const app = this.applications.find(a => a.id === id);
        if (app) app.status = updated?.status ?? 'APPROVED';
        if (this.selectedApp?.id === id) this.selectedApp.status = 'APPROVED';
      }
    });
  }

  reject(id: number): void {
    this.adminService.updateApplicationStatus(id, 'REJECTED').subscribe({
      next: (updated) => {
        const app = this.applications.find(a => a.id === id);
        if (app) app.status = updated?.status ?? 'REJECTED';
        if (this.selectedApp?.id === id) this.selectedApp.status = 'REJECTED';
      }
    });
  }

  getStatusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    return s === 'APPROVED' ? 'badge-approved'
         : s === 'REJECTED' ? 'badge-rejected'
         : 'badge-pending';
  }
  logout(): void { this.auth.logout(); }
}
