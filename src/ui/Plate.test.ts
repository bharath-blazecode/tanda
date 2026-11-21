// @vitest-environment jsdom
import { createElement } from 'react'
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { Plate } from './Plate'

afterEach(cleanup)

it('links the entire brand to the opening page without including the serial label', () => {
  render(createElement(MemoryRouter, { initialEntries: ['/check'] },
    createElement(Routes, null,
      createElement(Route, { path: '/check', element: createElement(Plate, { serial: 'Check', small: true }) }),
      createElement(Route, { path: '/', element: createElement('h1', null, 'Opening page') }),
    ),
  ))
  const home = screen.getByRole('link', { name: 'Kachka homepage' })
  expect(home.getAttribute('href')).toBe('/')
  expect(home.querySelector('svg')).not.toBeNull()
  expect(home.textContent).toBe('Kachka')
  expect(home.contains(screen.getByText('Check'))).toBe(false)
  fireEvent.click(home)
  expect(screen.getByRole('heading', { name: 'Opening page' })).toBeTruthy()
})
