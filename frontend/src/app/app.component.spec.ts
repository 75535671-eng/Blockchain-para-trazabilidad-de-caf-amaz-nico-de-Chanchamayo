import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('muestra la marca del proyecto', () => {
    sessionStorage.setItem('cafe_sesion', JSON.stringify({ id: '1', nombre: 'Ana', email: 'ana@chanchamayo.local', rol: 'PRODUCTOR' }));
    sessionStorage.setItem('cafe_token', 'token-demo');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.marca img')?.getAttribute('alt')).toBe('Café Chanchamayo');
    sessionStorage.clear();
  });
});
