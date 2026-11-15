import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { AcessibilidadeService } from './acessibilidade.service';

@Component({
  selector: 'app-acessibilidade',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './acessibilidade.html',
  styleUrl: './acessibilidade.css',
})
export class Acessibilidade {
  protected a11y = inject(AcessibilidadeService);
  protected aberto = signal(false);

  @HostListener('document:keydown.escape')
  fechar() {
    this.aberto.set(false);
  }
}
