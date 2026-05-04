import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

@Component({
  selector: 'app-staffing-analytics',
  templateUrl: './staffing-analytics.component.html',
  styleUrls: ['./staffing-analytics.component.css']
})
export class StaffingAnalyticsComponent implements OnInit {

  isLoading = true;

  // Summary stats
  totalNurses         = '0';
  activeJobs          = '0';
  pendingApplications = '0';
  approvedApplications = '0';

  // Derived from real application data
  monthlyHires: { month: string; count: number }[] = [];
  maxHires = 1;

  specializations: { name: string; count: number; pct: number }[] = [];

  topNurses: { name: string; jobs: number; specialty: string }[] = [];

  hasData = false;

  constructor(
    private adminService: AdminService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();
    if (!userId) return;

    forkJoin({
      stats: this.adminService.getDashboardStats(userId),
      apps:  this.adminService.getOrgApplications(userId)
    }).subscribe({
      next: ({ stats, apps }) => {
        // --- Summary stats ---
        if (stats) {
          this.totalNurses          = String(stats.hiredNurses          ?? '0');
          this.activeJobs           = String(stats.activeJobs           ?? '0');
          this.pendingApplications  = String(stats.pendingApplications  ?? '0');
          this.approvedApplications = String(stats.approvedApplications ?? '0');
        }

        const approved = (apps || []).filter(a => a.status === 'APPROVED');
        this.hasData = approved.length > 0;

        if (this.hasData) {
          this.buildMonthlyHires(approved);
          this.buildSpecializations(approved);
          this.buildTopNurses(approved);
        }

        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  private buildMonthlyHires(approved: any[]): void {
    const counts: Record<string, number> = {};

    // Build last 6 months as keys
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      counts[key] = 0;
      months.push(key);
    }

    approved.forEach(a => {
      if (!a.appliedAt) return;
      const d = new Date(a.appliedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (counts[key] !== undefined) counts[key]++;
    });

    this.monthlyHires = months.map(key => {
      const [, month] = key.split('-').map(Number);
      return { month: MONTH_NAMES[month], count: counts[key] };
    });

    this.maxHires = Math.max(...this.monthlyHires.map(m => m.count), 1);
  }

  private buildSpecializations(approved: any[]): void {
    const counts: Record<string, number> = {};
    approved.forEach(a => {
      const s = a.nurseSpecialization || 'Other';
      counts[s] = (counts[s] ?? 0) + 1;
    });

    const total = approved.length;
    this.specializations = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }));
  }

  private buildTopNurses(approved: any[]): void {
    const map: Record<string, { name: string; jobs: number; specialty: string }> = {};
    approved.forEach(a => {
      const name = a.nurseName || 'Unknown';
      if (!map[name]) map[name] = { name, jobs: 0, specialty: a.nurseSpecialization || '—' };
      map[name].jobs++;
    });

    this.topNurses = Object.values(map)
      .sort((a, b) => b.jobs - a.jobs)
      .slice(0, 5);
  }

  getBarHeight(count: number): number {
    return Math.round((count / this.maxHires) * 100);
  }
  logout(): void { this.auth.logout(); }
}
