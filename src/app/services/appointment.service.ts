import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AppointmentService {

  private readonly API = 'http://localhost:8080/api/appointments';

  constructor(private http: HttpClient) {}

  getByPatient(patientUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/patient/${patientUserId}`)
      .pipe(map((r: any) => r.data || []), catchError(this.handleError));
  }

  getByNurse(nurseUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/nurse/${nurseUserId}`)
      .pipe(map((r: any) => r.data || []), catchError(this.handleError));
  }

  book(patientUserId: number, payload: any): Observable<any> {
    return this.http.post<any>(`${this.API}/patient/${patientUserId}`, payload)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  cancel(id: number): Observable<any> {
    return this.http.patch<any>(`${this.API}/${id}/status`, null, {
      params: { status: 'CANCELLED' }
    }).pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  reschedule(id: number, newDate: string): Observable<any> {
    return this.http.patch<any>(`${this.API}/${id}/reschedule`, null, {
      params: { newDate }
    }).pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    const msg = err.error?.message ?? 'Something went wrong. Please try again.';
    return throwError(() => new Error(msg));
  }
}
