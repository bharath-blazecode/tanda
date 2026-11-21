/** /lab/kit — every component in src/ui, rendered once, with nothing else on the page.
 *  This is the "done when" for build-board card 2. If something looks wrong here, it is
 *  wrong everywhere, so fix it in src/ui and never in a screen. */

import { useState } from 'react';
import {
  Housing, Plate, ChartWindow, Legend, Axis, Printed, Sheet, Key, Keys, Label, Rows,
  Ticket, TicketVerdict, Quote, Stub, Stamp, SafetyLine, Ibis, Badge, Logo, InkFilter,
  type Mood,
} from '../ui';

const MOODS: Mood[] = ['steady', 'wired', 'tipsy', 'wobbly'];

export default function Kit() {
  const [print, setPrint] = useState(false);

  return (
    <div
      className="k-body"
      style={{
        minHeight: '100vh',
        padding: 'var(--s5) max(16px, env(safe-area-inset-left, 0px)) var(--s6) max(16px, env(safe-area-inset-right, 0px))',
      }}
    >
      <InkFilter />

      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
          <Label>Lab · UI kit</Label>
          <h1 style={{ margin: 0, font: '900 34px/0.95 var(--display)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
            Every part, once
          </h1>
          <p style={{ margin: 0, color: 'var(--housing-dim)', maxWidth: '70ch' }}>
            Tokens from <code>src/ui/tokens.css</code>. Components from <code>src/ui</code>. Screens import these and
            never restate a colour, a face or a spacing value.
          </p>
        </header>

        <div style={{ display: 'grid', gap: 'var(--s6)', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>

          {/* ---- housing, plate, window, key ---- */}
          <Housing>
            <Plate serial={'Body drift recorder\nModel BC-2'} />
            <ChartWindow minHeight={200} bottom>
              <Legend />
              <Axis left="now" right="18 s ago" />
              <Printed>
                <p style={{ margin: 0, maxWidth: '28ch', background: 'var(--chart)', display: 'inline' }}>
                  Chart paper. The pen draws here; the blue pencil is your normal.
                </p>
              </Printed>
            </ChartWindow>
            <Key>Stand still</Key>
            <Keys>
              <Key quiet>Skip</Key>
              <Key quiet>Back</Key>
            </Keys>
          </Housing>

          {/* ---- small plate, sheet, keys ---- */}
          <Housing>
            <Plate small serial={'Setup\n1 of 2'} />
            <Sheet grow>
              <Label paper>Before we start</Label>
              <h2>This instrument needs to feel you move.</h2>
              <p>One tap lets it read your phone&rsquo;s motion sensors, so it can record how much your body sways when you stand still.</p>
              <p className="k-small">Your readings stay on this phone. No account, nothing to sign.</p>
            </Sheet>
            <Key>Allow motion</Key>
            <Keys cols={3}>
              <Key quiet>Coffee</Key>
              <Key quiet>Beer</Key>
              <Key quiet>Wine</Key>
            </Keys>
          </Housing>

          {/* ---- the ticket ---- */}
          <Housing>
            <Plate small serial={'Printed reading\nNo. 0417'} />
            <Ticket print={print} key={String(print)}>
              <Label paper>Kachka · 21 Nov · 16:04</Label>
              <Rows
                items={[
                  ['Sway', '1.42x'],
                  ['Choice tap', '1.08x'],
                  ['Pulse', '1.00x'],
                  ['Steadiness', '61 / 100'],
                ]}
              />
              <TicketVerdict verdict="Tipsy" mood="tipsy" />
              <Quote>Three coffees and a beer. The chart agrees with the beer.</Quote>
              <SafetyLine />
              <Stub label="Tear off and keep">Get a ride</Stub>
            </Ticket>
            <Key onClick={() => setPrint((p) => !p)}>Print it again</Key>
          </Housing>

          {/* ---- mascot ---- */}
          <Housing>
            <Plate small serial={'Mascot\nFour moods'} />
            <Sheet>
              <Label paper>Dr. Bin Chicken</Label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--s3)', alignItems: 'end' }}>
                {MOODS.map((m) => (
                  <div key={m} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s1)' }}>
                    <Ibis mood={m} />
                    <span className="k-label k-label--paper">{m}</span>
                  </div>
                ))}
              </div>
              <p className="k-small">Wobbly reuses the tipsy mood without the hiccup bubbles.</p>
            </Sheet>
            <Label>On the housing he needs a paper badge</Label>
            <Badge style={{ width: 90 }}><Ibis mood="steady" /></Badge>
          </Housing>

          {/* ---- logo and stamp ---- */}
          <Housing>
            <Plate small serial={'Mark\nand stamp'} />
            <Sheet>
              <Label paper>Logo, down to 24px</Label>
              <div style={{ display: 'flex', gap: 'var(--s4)', alignItems: 'flex-end' }}>
                <Logo size={96} />
                <Logo size={48} />
                <Logo size={24} />
              </div>
            </Sheet>
            <Sheet>
              <Label paper>The only red in the app</Label>
              <div className="k-stamp-wrap"><Stamp verdict="Steady" note="Certified by a bin chicken" /></div>
            </Sheet>
          </Housing>

          {/* ---- tokens ---- */}
          <Housing>
            <Plate small serial={'Tokens\ntokens.css'} />
            <Sheet>
              <Label paper>Colour</Label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 'var(--s2)' }}>
                {['bench', 'housing', 'housing-hi', 'housing-ink', 'housing-dim', 'chart', 'grid', 'grid-strong', 'receipt', 'ink', 'ink-soft', 'pencil', 'stamp'].map((t) => (
                  <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ height: 34, background: `var(--${t})`, border: '1px solid var(--ink-soft)', display: 'block' }} />
                    <span className="k-label k-label--paper" style={{ fontSize: 10 }}>{t}</span>
                  </div>
                ))}
              </div>
              <Label paper>Type</Label>
              <p style={{ margin: 0, font: '900 30px/1 var(--display)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Display 900
              </p>
              <p style={{ margin: 0, font: '400 15px/1.5 var(--mono)' }}>
                Readout 400 &mdash; 0123456789 with tabular numerals
              </p>
            </Sheet>
          </Housing>

        </div>

        <p style={{ margin: 0, color: 'var(--housing-dim)', fontSize: 13 }}>
          Nothing on this page is a screen. Screens live in <code>src/screens</code> and are built from these parts only.
        </p>
      </div>
    </div>
  );
}
