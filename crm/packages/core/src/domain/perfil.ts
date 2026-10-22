export const PERFIS = ['admin', 'gestor', 'corretor'] as const;

export type Perfil = (typeof PERFIS)[number];

export const ROTULO_PERFIL: Record<Perfil, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  corretor: 'Corretor',
};
