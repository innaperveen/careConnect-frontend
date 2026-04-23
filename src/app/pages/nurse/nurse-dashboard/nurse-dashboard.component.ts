import { Component } from '@angular/core';

@Component({
  selector: 'app-nurse-dashboard',
  templateUrl: './nurse-dashboard.component.html',
  styleUrls: ['./nurse-dashboard.component.css']
})
export class NurseDashboardComponent {

  // Availability toggle
  isAvailable: boolean = true;

  toggleAvailability() {
    this.isAvailable = !this.isAvailable;
  }

  // Notifications
  notificationsOpen = false;

  notifications = [
    { message: 'New ICU job posted', time: '2 min ago', read: false },
    { message: 'Application accepted', time: '1 hr ago', read: false },
    { message: 'Shift reminder', time: '1 day ago', read: true }
  ];

  toggleNotifications() {
    this.notificationsOpen = !this.notificationsOpen;
  }

  hasUnreadNotifications(): boolean {
  return this.notifications.some(n => !n.read);
}

  // Jobs
  jobs = [
    {
      title: 'ICU Nurse',
      location: 'Delhi',
      shift: 'Night',
      salary: '₹30,000'
    },
    {
      title: 'Emergency Nurse',
      location: 'Bangalore',
      shift: 'Day',
      salary: '₹28,000'
    }
  ];

  // Applications
  applications = [
    { jobTitle: 'ICU Nurse', status: 'Applied' },
    { jobTitle: 'Emergency Nurse', status: 'Accepted' }
  ];

  // Modal
  selectedJob: any = null;

  openDetails(job: any) {
    this.selectedJob = job;
  }

  closeModal() {
    this.selectedJob = null;
  }

  apply(job: any) {
    alert('Applied for ' + job.title);
  }
}