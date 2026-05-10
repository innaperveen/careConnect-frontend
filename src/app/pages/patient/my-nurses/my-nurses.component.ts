import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { AppointmentService } from '../../../services/appointment.service';

@Component({
  selector: 'app-my-nurses',
  templateUrl: './my-nurses.component.html',
  styleUrls: ['./my-nurses.component.css']
})
export class MyNursesComponent implements OnInit {

  isLoading = true;
  allAppointments: any[] = [];
  selectedNurse: any = null; // nurse object for detail panel

  constructor(private auth: AuthService, private apptService: AppointmentService) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();
    if (!userId) { this.isLoading = false; return; }

    this.apptService.getByPatient(userId).subscribe({
      next: (data) => {
        this.allAppointments = data || [];
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  // Unique nurses — one entry per nurseId, carrying all their profile fields
  get assignedNurses(): any[] {
    const seen = new Map<number, any>();
    this.allAppointments
      .filter(a => a.nurseId != null)
      .forEach(a => {
        if (!seen.has(a.nurseId)) {
          seen.set(a.nurseId, {
            nurseId:           a.nurseId,
            nurseName:         a.nurseName,
            nursePhone:        a.nursePhone,
            nurseEmail:        a.nurseEmail,
            nurseSpecialization: a.nurseSpecialization,
            nurseExperience:   a.nurseExperience,
            nurseEducation:    a.nurseEducation,
            nurseExpertise:    a.nurseExpertise,
            nurseLicenseNumber:a.nurseLicenseNumber,
            nurseAvailability: a.nurseAvailability,
            nurseRating:       a.nurseRating
          });
        }
      });
    return Array.from(seen.values());
  }

  appointmentsFor(nurseId: number): any[] {
    return this.allAppointments
      .filter(a => a.nurseId === nurseId)
      .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
  }

  openDetail(nurse: any): void  { this.selectedNurse = nurse; }
  closeDetail(): void           { this.selectedNurse = null; }

  statusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    if (s === 'CONFIRMED')   return 'badge-confirmed';
    if (s === 'COMPLETED')   return 'badge-completed';
    if (s === 'CANCELLED')   return 'badge-cancelled';
    if (s === 'IN_PROGRESS') return 'badge-inprogress';
    return 'badge-pending';
  }

  logout(): void { this.auth.logout(); }
}
