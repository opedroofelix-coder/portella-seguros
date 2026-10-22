/** Data no formato ISO 8601 (AAAA-MM-DD) ou data-hora ISO completa. */
export type DataISO = string;

/** Todo registro de carteira pertence a um responsável (corretor) e guarda datas de auditoria. */
export interface Registro {
  id: string;
  responsavelId: string;
  criadoEm: DataISO;
  atualizadoEm: DataISO;
}

/** Dados que o usuário informa ao criar ou editar um registro. */
export type DadosRegistro<T extends Registro> = Omit<T, 'id' | 'criadoEm' | 'atualizadoEm' | 'responsavelId'> & {
  id?: string;
  responsavelId?: string;
};
