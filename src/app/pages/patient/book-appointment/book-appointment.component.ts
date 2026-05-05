import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { AppointmentService } from '../../../services/appointment.service';

@Component({
  selector: 'app-book-appointment',
  templateUrl: './book-appointment.component.html',
  styleUrls: ['./book-appointment.component.css']
})
export class BookAppointmentComponent implements OnInit {

  bookingForm!: FormGroup;
  isLoading  = false;
  successMsg = '';
  errorMsg   = '';

  today = new Date().toISOString().split('T')[0];

  careTypes       = ['General Care', 'Elderly Care', 'Post-Surgery', 'ICU Support', 'Pediatric Care'];
  specializations = ['General Nurse', 'ICU', 'Cardiology', 'Pediatric', 'Geriatric', 'Orthopedic'];
  skillsList      = ['Injection', 'Wound Dressing', 'Physiotherapy', 'Vitals Monitoring', 'Blood Pressure Check', 'Medication Administration'];
  scheduleTypes   = ['One-time', 'Daily', 'Weekly', 'Monthly'];
  daysOfWeek      = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  hours   = ['12','01','02','03','04','05','06','07','08','09','10','11'];
  minutes = ['00','15','30','45'];

  constructor(
    private auth: AuthService,
    private fb: FormBuilder,
    private apptService: AppointmentService
  ) {}

  ngOnInit(): void {
    this.bookingForm = this.fb.group({
      // Patient details — empty, no pre-fill
      fullName: ['', Validators.required],
      phone:    ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      email:    ['', [Validators.required, Validators.email]],
      address:  ['', Validators.required],

      // Care requirements
      careType:      ['', Validators.required],
      specialization:[''],
      skills:        [[]],
      description:   [''],

      // Schedule
      scheduleType:  ['One-time'],
      startDate:     ['', Validators.required],
      endDate:       [''],
      visitHour:    ['09', Validators.required],
      visitMinute:  ['00'],
      visitAmPm:    ['AM'],
      scheduleDays: [[]],

      // Priority & Preferences
      priority:         ['Normal'],
      genderPreference: ['No Preference'],
      notes:            ['']
    });
  }

  get scheduleType(): string { return this.bookingForm.value.scheduleType || 'One-time'; }

  get timeDisplay(): string {
    const v = this.bookingForm.value;
    return `${v.visitHour || '09'}:${v.visitMinute || '00'} ${v.visitAmPm || 'AM'}`;
  }

  private buildVisitTime24(): string {
    const v = this.bookingForm.value;
    let h = parseInt(v.visitHour || '9', 10);
    if (v.visitAmPm === 'PM' && h !== 12) h += 12;
    if (v.visitAmPm === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${v.visitMinute || '00'}`;
  }

  selectScheduleType(type: string): void {
    this.bookingForm.patchValue({ scheduleType: type, scheduleDays: [] });
  }

  selectSpecialization(spec: string): void {
    this.bookingForm.patchValue({ specialization: spec });
  }

  toggleSkill(skill: string): void {
    const skills: string[] = this.bookingForm.value.skills || [];
    this.bookingForm.patchValue({
      skills: skills.includes(skill) ? skills.filter((s: string) => s !== skill) : [...skills, skill]
    });
  }

  toggleDay(day: string): void {
    const days: string[] = this.bookingForm.value.scheduleDays || [];
    this.bookingForm.patchValue({
      scheduleDays: days.includes(day) ? days.filter((d: string) => d !== day) : [...days, day]
    });
  }

  onSubmit(): void {
    if (this.bookingForm.invalid) { this.bookingForm.markAllAsTouched(); return; }

    const v = this.bookingForm.value;

    if (v.scheduleType === 'Weekly' && !v.scheduleDays?.length) {
      this.errorMsg = 'Please select at least one day for the weekly schedule.';
      return;
    }

    const userId = this.auth.getUserId();
    if (!userId) return;

    // Combine startDate + visitTime into ISO appointmentDate
    const visitTime24 = this.buildVisitTime24();
    const appointmentDate = new Date(`${v.startDate}T${visitTime24}:00`).toISOString();

    // Build a human-readable schedule description
    let scheduleDesc = v.scheduleType;
    if (v.scheduleType === 'Weekly' && v.scheduleDays?.length) {
      scheduleDesc += ` on ${v.scheduleDays.join(', ')}`;
    }
    if (v.scheduleType !== 'One-time' && v.endDate) {
      scheduleDesc += ` until ${v.endDate}`;
    }

    const noteParts = [
      `Schedule: ${scheduleDesc} at ${this.timeDisplay}`,
      `Patient: ${v.fullName} | ${v.phone}`,
      v.description,
      v.notes
    ].filter(Boolean);

    const payload = {
      appointmentDate,
      careNeeds:      v.careType + (v.specialization ? ` (${v.specialization})` : ''),
      requiredSkills: (v.skills || []).join(', ') || undefined,
      notes:          noteParts.join(' | ')
    };

    this.isLoading  = true;
    this.successMsg = '';
    this.errorMsg   = '';

    this.apptService.book(userId, payload).subscribe({
      next: () => {
        this.isLoading  = false;
        this.successMsg = 'Appointment booked successfully! Our team will confirm shortly.';
        this.bookingForm.reset({
          scheduleType: 'One-time', priority: 'Normal',
          genderPreference: 'No Preference', skills: [], scheduleDays: [],
          visitHour: '09', visitMinute: '00', visitAmPm: 'AM'
        });
      },
      error: (err: Error) => {
        this.isLoading = false;
        this.errorMsg  = err.message;
      }
    });
  }

  logout(): void { this.auth.logout(); }
}
