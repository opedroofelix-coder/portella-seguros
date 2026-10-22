/** Erros de negócio. A camada de apresentação traduz cada tipo numa mensagem para o usuário. */
export class ErroDominio extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = new.target.name;
  }
}

export class ErroValidacao extends ErroDominio {
  constructor(
    mensagem: string,
    readonly campos: Record<string, string> = {},
  ) {
    super(mensagem);
  }
}

export class ErroPermissao extends ErroDominio {
  constructor(mensagem = 'Você não tem permissão para esta ação.') {
    super(mensagem);
  }
}

export class ErroNaoEncontrado extends ErroDominio {
  constructor(mensagem = 'Registro não encontrado.') {
    super(mensagem);
  }
}

export class ErroAutenticacao extends ErroDominio {
  constructor(mensagem = 'Usuário ou senha incorretos.') {
    super(mensagem);
  }
}
