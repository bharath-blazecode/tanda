// @vitest-environment jsdom
// No JSX here on purpose: the test glob is src/**/*.test.ts, so a .tsx file is never run.
import { render } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { Rows } from './Rows'

describe('Rows', () => {
  it('keeps repeated labels, which a log of two coffees has', () => {
    // Keying by label alone dropped the second row, so Today showed one coffee when two were
    // logged. Found by driving /home in a browser, not by a unit test.
    const { container } = render(
      createElement(Rows, {
        items: [
          ['Coffee', '7:10am'],
          ['Coffee', '11:40am'],
          ['Beer', '6:05pm'],
        ],
      }),
    )
    expect(container.querySelectorAll('.k-rows > div')).toHaveLength(3)
    expect(container.textContent).toContain('7:10am')
    expect(container.textContent).toContain('11:40am')
  })
})
