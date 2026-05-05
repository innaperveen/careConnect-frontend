import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class PatientService {

  private readonly API = 'http://localhost:8080/api/patients';

  constructor(private http: HttpClient) {}

  getProfile(userId: number): Observable<any> {
    return this.http.get<any>(`${this.API}/${userId}/profile`)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  updateProfile(userId: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.API}/${userId}/profile`, payload)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    const msg = err.error?.message ?? 'Something went wrong.';
    return throwError(() => new Error(msg));
  }
}
