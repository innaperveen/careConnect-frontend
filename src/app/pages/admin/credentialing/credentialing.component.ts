import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-credentialing',
  templateUrl: './credentialing.component.html',
  styleUrls: ['./credentialing.component.css']
})
export class CredentialingComponent implements OnInit {

  activeTab = 'All';
  tabs      = ['All', 'VERIFIED', 'PENDING', 'EXPIRED'];
  tabLabels: Record<string, string> = { All: 'All', VERIFIED: 'Verified', PENDING: 'Pending', EXPIRED: 'Expired' };

  credentials: any[] = [];
  isLoading = true;

  constructor(private adminService: AdminService, private auth: AuthService) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();
    if (!userId) return;

    this.adminService.getOrgCredentials(userId).subscribe({
      next: (data) => { this.credentials = data || []; this.isLoading = false; },
      error: ()     => { this.isLoading = false; }
    });
  }

  get filteredCredentials(): any[] {
    return this.activeTab === 'All'
      ? this.credentials
      : this.credentials.filter(c => c.status === this.activeTab);
  }

  countByStatus(status: string): number {
    return this.credentials.filter(c => c.status === status).length;
  }

  verify(id: number): void {
    this.adminService.verifyCredential(id).subscribe({
      next: (updated) => {
        const c = this.credentials.find(c => c.id === id);
        if (c) c.status = updated?.status ?? 'VERIFIED';
      }
    });
  }

  getStatusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    return s === 'VERIFIED' ? 'badge-verified'
         : s === 'EXPIRED'  ? 'badge-expired'
         : 'badge-pending';
  }
  logout(): void { this.auth.logout(); }
}
