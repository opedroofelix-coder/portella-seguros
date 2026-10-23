import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { EntradaDinheiro, EntradaMascara } from './Entradas';

describe('EntradaDinheiro', () => {
  it('"1.500" vira "1.500,00" ao sair do campo e chega assim ao formulário', async () => {
    const enviar = vi.fn();
    function Form() {
      const { register, handleSubmit } = useForm({ defaultValues: { premio: '' } });
      return (
        <form onSubmit={handleSubmit(enviar)}>
          <EntradaDinheiro aria-label="Prêmio" {...register('premio')} />
          <button type="submit">Salvar</button>
        </form>
      );
    }
    render(<Form />);
    await userEvent.type(screen.getByLabelText('Prêmio'), '1.500');
    await userEvent.tab();
    expect(screen.getByLabelText('Prêmio')).toHaveValue('1.500,00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(enviar.mock.calls[0]![0]).toEqual({ premio: '1.500,00' });
  });
});

describe('EntradaMascara', () => {
  it('formata o telefone enquanto se digita', async () => {
    render(<EntradaMascara mascara="telefone" aria-label="Telefone" />);
    await userEvent.type(screen.getByLabelText('Telefone'), '11988887777');
    expect(screen.getByLabelText('Telefone')).toHaveValue('(11) 98888-7777');
  });
});
