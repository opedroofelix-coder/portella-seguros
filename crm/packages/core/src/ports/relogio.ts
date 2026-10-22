/** Fontes de tempo e de identificadores, injetáveis para tornar os casos de uso testáveis. */
export interface Ambiente {
  agora(): Date;
  gerarId(): string;
}

export const ambientePadrao: Ambiente = {
  agora: () => new Date(),
  gerarId: () => crypto.randomUUID(),
};
