import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import Login from './Login'

const signIn = vi.fn()
const navigate = vi.fn()

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ signIn }),
}))

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => navigate }
})

describe('Login', () => {
  it('renders the email and password fields', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i, { selector: 'input' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('submits the form with the entered credentials', async () => {
    signIn.mockResolvedValueOnce(undefined)
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i, { selector: 'input' }), 'hunter2')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(signIn).toHaveBeenCalledWith('test@example.com', 'hunter2')
    expect(navigate).toHaveBeenCalledWith('/dashboard')
  })

  it('shows an error message when sign-in fails', async () => {
    signIn.mockRejectedValueOnce(new Error('Incorrect username or password.'))
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i, { selector: 'input' }), 'wrong')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect username or password.')
  })
})
