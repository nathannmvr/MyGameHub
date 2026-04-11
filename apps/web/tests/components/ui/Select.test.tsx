import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Select } from '../../../src/components/ui/Select';

describe('Select', () => {
  it('renders label, helper text and custom options', () => {
    render(
      <Select label="Plataforma" helperText="Escolhe uma plataforma ativa">
        <option value="pc">PC</option>
        <option value="ps5">PS5</option>
      </Select>,
    );

    expect(screen.getByRole('combobox', { name: /Plataforma/i })).toBeInTheDocument();
    expect(screen.getByText('Escolhe uma plataforma ativa')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'PC' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'PS5' })).toBeInTheDocument();
  });

  it('applies error and disabled states', () => {
    render(
      <Select label="Status" error="Campo obrigatório" disabled>
        <option value="backlog">BACKLOG</option>
      </Select>,
    );

    const select = screen.getByRole('combobox', { name: /Status/i });

    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toBeDisabled();
    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument();
  });
});
