import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

export interface EstadoA11y {
  tamanhoFonte: number; // % do tamanho base (100 = normal)
  altoContraste: boolean;
  sublinharLinks: boolean;
  espacamento: boolean;
}

const CHAVE = 'a11y-config';
const PADRAO: EstadoA11y = {
  tamanhoFonte: 100,
  altoContraste: false,
  sublinharLinks: false,
  espacamento: false,
};

@Injectable({ providedIn: 'root' })
export class AcessibilidadeService {
  private doc = inject(DOCUMENT);
  private ehBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private router = inject(Router);

  readonly estado = signal<EstadoA11y>({ ...PADRAO });
  readonly falando = signal(false);
  readonly vozSuportada = this.ehBrowser && 'speechSynthesis' in window;
  velocidade = 1;

  constructor() {
    if (!this.ehBrowser) return;
    this.estado.set({ ...PADRAO, ...this.carregar() });
    this.aplicar();

    // Ao trocar de página, interrompe a leitura em andamento
    this.router.events
      .pipe(filter((e) => e instanceof NavigationStart))
      .subscribe(() => this.parar());
  }

  // ---------- Barra de acessibilidade ----------

  alterarFonte(delta: number) {
    const novo = Math.min(150, Math.max(80, this.estado().tamanhoFonte + delta));
    this.atualizar({ tamanhoFonte: novo });
  }

  alternar(chave: 'altoContraste' | 'sublinharLinks' | 'espacamento') {
    this.atualizar({ [chave]: !this.estado()[chave] });
  }

  restaurar() {
    this.parar();
    this.estado.set({ ...PADRAO });
    this.aplicar();
    this.salvar();
  }

  private atualizar(parcial: Partial<EstadoA11y>) {
    this.estado.update((s) => ({ ...s, ...parcial }));
    this.aplicar();
    this.salvar();
  }

  private aplicar() {
    const el = this.doc.documentElement;
    const s = this.estado();
    el.style.fontSize = `${s.tamanhoFonte}%`;
    el.classList.toggle('a11y-alto-contraste', s.altoContraste);
    el.classList.toggle('a11y-sublinhar-links', s.sublinharLinks);
    el.classList.toggle('a11y-espacamento', s.espacamento);
  }

  private carregar(): Partial<EstadoA11y> {
    try {
      return JSON.parse(localStorage.getItem(CHAVE) ?? '{}');
    } catch {
      return {};
    }
  }

  private salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(this.estado()));
    } catch {
      /* localStorage indisponível */
    }
  }

  // ---------- Leitura em voz alta (Web Speech API) ----------

  /** Lê o texto selecionado; sem seleção, lê o conteúdo do <main>. */
  lerSelecaoOuPagina() {
    const selecionado = window.getSelection()?.toString().trim();
    const raiz = (this.doc.querySelector('main') ?? this.doc.body) as HTMLElement;
    this.falar(selecionado || raiz.innerText);
  }

  falar(texto: string) {
    if (!this.vozSuportada || !texto.trim()) return;
    this.parar();

    // O Chrome corta falas muito longas, então quebramos em frases
    const trechos =
      texto.match(/[^.!?\n]+[.!?\n]*/g)?.map((t) => t.trim()).filter(Boolean) ?? [texto];
    const idioma = this.doc.documentElement.lang || 'pt-BR';

    trechos.forEach((trecho, i) => {
      const u = new SpeechSynthesisUtterance(trecho);
      u.lang = idioma;
      u.rate = this.velocidade;
      if (i === 0) u.onstart = () => this.falando.set(true);
      if (i === trechos.length - 1) u.onend = () => this.falando.set(false);
      u.onerror = () => this.falando.set(false);
      speechSynthesis.speak(u);
    });
  }

  pausar() {
    if (this.vozSuportada) speechSynthesis.pause();
  }

  continuar() {
    if (this.vozSuportada) speechSynthesis.resume();
  }

  parar() {
    if (!this.vozSuportada) return;
    speechSynthesis.cancel();
    this.falando.set(false);
  }
}
