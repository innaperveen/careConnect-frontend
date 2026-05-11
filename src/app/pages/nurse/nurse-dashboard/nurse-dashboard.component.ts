import { AuthService } from '../../../services/auth.service';
import { NurseService } from '../../../services/nurse.service';
import { AppointmentService } from '../../../services/appointment.service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { forkJoin } from 'rxjs';

interface DashJob {
  type:      'org' | 'patient';
  id:        number;
  title:     string;
  subtitle:  string;
  location:  string;
  salaryText:string;
  salaryRaw: number;
  priority?: string;
  raw:       any;
}

interface Notification {
  message: string;
  time:    string;
  read:    boolean;
}

@Component({
  selector: 'app-nurse-dashboard',
  templateUrl: './nurse-dashboard.component.html',
  styleUrls: ['./nurse-dashboard.component.css']
})
export class NurseDashboardComponent implements OnInit, OnDestroy {

  isLoading = true;

  nurseName         = 'Nurse';
  nurseSpecialty    = '—';
  nurseExperience   = '—';
  profileCompletion = 0;
  avatarLetter      = 'N';

  upcomingShifts    = 0;
  monthlyEarnings   = '—';
  applicationsCount = 0;

  quickActions = [
    { icon: 'bi-briefcase-fill',        label: 'Browse Jobs',   route: '/nurse-available-jobs', bgColor: '#e3f6ef', color: '#1aa37a' },
    { icon: 'bi-journal-bookmark-fill', label: 'Applications',  route: '/nurse-applications',   bgColor: '#e8f0fe', color: '#1a73e8' },
    { icon: 'bi-calendar3',             label: 'My Schedule',   route: '/nurse-schedule',        bgColor: '#fef3e2', color: '#d68910' },
    { icon: 'bi-person-badge',          label: 'My Profile',    route: '/nurse-profile',         bgColor: '#fde8e8', color: '#c0392b' },
  ];

  isAvailable       = true;
  notificationsOpen = false;
  notifications: Notification[] = [];

  recentAppointments: any[] = [];
  recentApplications: any[] = [];
  topJobs: DashJob[]   = [];
  selectedDashJob: DashJob | null = null;

  private knownJobIds  = new Set<string>();
  private eventSource?: EventSource;

  private readonly SSE_URL = 'http://localhost:8080/api/notifications/stream';

  constructor(
    private auth:        AuthService,
    private nurseSvc:    NurseService,
    private apptService: AppointmentService
  ) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();
    if (!userId) { this.isLoading = false; return; }

    forkJoin({
      profile:      this.nurseSvc.getProfile(userId),
      appointments: this.apptService.getByNurse(userId),
      applications: this.nurseSvc.getApplications(userId),
      orgJobs:      this.nurseSvc.getJobs(),
      openRequests: this.apptService.getOpen(),
    }).subscribe({
      next: ({ profile, appointments, applications, orgJobs, openRequests }) => {
        this.buildProfile(profile);
        this.buildAppointments(appointments);
        this.buildApplications(applications);
        this.buildTopJobs(orgJobs, openRequests, true);
        this.isLoading = false;
        this.setupSSE();
      },
      error: () => { this.isLoading = false; }
    });
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
  }

  // ── Builders ────────────────────────────────────────────────────────────────

  private buildProfile(profile: any): void {
    this.nurseName        = profile.firstName ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') : (profile.fullName || 'Nurse');
    this.nurseSpecialty   = profile.specialization || '—';
    this.nurseExperience  = profile.experienceYears != null ? profile.experienceYears + ' Yrs Exp' : '—';
    this.avatarLetter     = (this.nurseName || 'N')[0].toUpperCase();
    this.profileCompletion = this.calcCompletion(profile);
  }

  private buildAppointments(appointments: any[]): void {
    const now      = new Date();
    const upcoming = (appointments || []).filter((a: any) => {
      const d = new Date(a.appointmentDate);
      return d > now && (a.status === 'PENDING' || a.status === 'CONFIRMED');
    });
    this.upcomingShifts    = upcoming.length;
    this.recentAppointments = upcoming.slice(0, 3);
  }

  private buildApplications(applications: any[]): void {
    this.applicationsCount  = (applications || []).length;
    this.recentApplications = (applications || []).slice(0, 3).map((a: any) => ({
      jobTitle: a.jobTitle,
      status:   a.status
    }));
  }

  private buildTopJobs(orgJobs: any[], openRequests: any[], initial: boolean): void {
    const dashJobs: DashJob[] = [];

    // Org / hospital jobs
    for (const j of (orgJobs || [])) {
      const key = `org-${j.id}`;
      if (initial) this.knownJobIds.add(key);
      else if (!this.knownJobIds.has(key)) {
        this.knownJobIds.add(key);
        this.pushNotification(`New job posted: ${j.jobTitle} at ${j.organizationName || 'an organisation'}`);
      }
      const salaryMax = j.salaryMax || j.salaryMin || 0;
      dashJobs.push({
        type:       'org',
        id:         j.id,
        title:      j.jobTitle,
        subtitle:   j.organizationName || 'Organisation',
        location:   j.location || '—',
        salaryText: salaryMax ? `₹${Number(salaryMax).toLocaleString('en-IN')}/mo` : 'Negotiable',
        salaryRaw:  salaryMax,
        priority:   j.priority,
        raw:        j,
      });
    }

    // Patient requests
    for (const r of (openRequests || [])) {
      const key = `req-${r.id}`;
      if (initial) this.knownJobIds.add(key);
      else if (!this.knownJobIds.has(key)) {
        this.knownJobIds.add(key);
        this.pushNotification(`New patient request: ${r.careNeeds} in ${r.patientCity || r.patientState || 'your area'}`);
      }
      const loc = [r.patientCity, r.patientState].filter(Boolean).join(', ') || 'India';
      dashJobs.push({
        type:       'patient',
        id:         r.id,
        title:      r.careNeeds || 'Home Care',
        subtitle:   'Patient Request',
        location:   loc,
        salaryText: 'Open Bid',
        salaryRaw:  0,
        priority:   r.priority,
        raw:        r,
      });
    }

    // Sort: newest first (highest id = most recently posted)
    dashJobs.sort((a, b) => b.id - a.id);

    this.topJobs = dashJobs.slice(0, 5);
  }

  // ── SSE ─────────────────────────────────────────────────────────────────────

  private setupSSE(): void {
    this.eventSource = new EventSource(this.SSE_URL);

    this.eventSource.addEventListener('NEW_JOB', (event: MessageEvent) => {
      const [title, org, location] = event.data.split('|');
      const msg = org
        ? `New job posted: ${title} at ${org}${location ? ' · ' + location : ''}`
        : `New job posted: ${title}`;
      this.pushNotification(msg);
      this.refreshJobs();
    });

    this.eventSource.addEventListener('NEW_REQUEST', (event: MessageEvent) => {
      const [care, loc] = event.data.split('|');
      this.pushNotification(`New patient request: ${care} in ${loc || 'your area'}`);
      this.refreshJobs();
    });

    // EventSource reconnects automatically on error — no extra handling needed
  }

  private refreshJobs(): void {
    forkJoin({
      orgJobs:      this.nurseSvc.getJobs(),
      openRequests: this.apptService.getOpen(),
    }).subscribe({
      next: ({ orgJobs, openRequests }) => {
        this.buildTopJobs(orgJobs, openRequests, false);
      },
      error: () => {}
    });
  }

  private pushNotification(message: string): void {
    this.notifications.unshift({ message, time: 'just now', read: false });
    if (this.notifications.length > 20) this.notifications.pop();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private calcCompletion(profile: any): number {
    const fields = ['fullName', 'licenseNumber', 'phone', 'specialization',
                    'education', 'availability', 'expertise', 'addressLine1'];
    const filled = fields.filter(f => profile[f] && String(profile[f]).trim() !== '').length;
    return Math.round((filled / fields.length) * 100);
  }

  openDashJob(job: DashJob): void  { this.selectedDashJob = job; }
  closeDashJob(): void             { this.selectedDashJob = null; }

  formatJobType(jt: string): string {
    const m: Record<string,string> = { PERMANENT:'Permanent', TEMPORARY:'Temporary', CONTRACT:'Contract', EMERGENCY:'Emergency' };
    return m[jt] ?? jt;
  }

  toggleAvailability(): void  { this.isAvailable = !this.isAvailable; }

  toggleNotifications(): void {
    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) {
      this.notifications.forEach(n => n.read = true);
    }
  }

  hasUnread(): boolean { return this.notifications.some(n => !n.read); }

  priorityClass(p?: string): string {
    if (!p) return '';
    const u = p.toUpperCase();
    return u === 'EMERGENCY' ? 'badge-emergency' : u === 'URGENT' ? 'badge-urgent' : 'badge-normal';
  }

  getStatusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    return s === 'APPROVED' ? 's-accepted' : s === 'REJECTED' ? 's-rejected' : s === 'PENDING' ? 's-applied' : 's-default';
  }

  displayStatus(s: string): string {
    const m: Record<string,string> = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' };
    return m[(s||'').toUpperCase()] || s;
  }

  logout(): void { this.auth.logout(); }
}
