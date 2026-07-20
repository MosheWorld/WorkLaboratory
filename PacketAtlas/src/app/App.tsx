import { useEffect } from 'react';
import { mountPacketAtlas } from './mount-app';

function Header() {
  return (
    <header>
      <a className="brand" href="./">
        <span>◈</span> PACKET ATLAS
      </a>
      <span className="edition">THE NETWORK, LAYER BY LAYER</span>
      <button id="guideButton" type="button">
        Concept explorer ↗
      </button>
    </header>
  );
}

function Laboratory() {
  return (
    <>
      <div className="lab-heading">
        <div>
          <div className="eyebrow">TEL AVIV → US WEST RELAY → NEW YORK</div>
          <h1>
            Follow the packet.<span> Understand every layer.</span>
          </h1>
        </div>
        <fieldset className="protocol">
          <legend className="sr-only">Protocol mode</legend>
          <button id="tcp" type="button" className="active" aria-pressed="true">
            TCP + TLS <small>Encrypted messaging</small>
          </button>
          <button id="udp" type="button" aria-pressed="false">
            UDP + SRTP <small>Encrypted voice</small>
          </button>
        </fieldset>
      </div>
      <div className="scenario-bar">
        <label>
          Send from{' '}
          <select id="sender">
            <option value="0">Your phone · .20</option>
            <option value="1">Work laptop · .21</option>
            <option value="2">Tablet · .22</option>
          </select>
        </label>
        <span id="profileDescription">IPv4 · NAT/PAT · TCP · TLS 1.3 · end-to-end encryption</span>
        <button id="assumptionsButton" type="button" className="text-button">
          Model boundaries ↗
        </button>
      </div>
      <div className="lab">
        <section className="visual-panel">
          <div className="scene">
            <canvas
              id="globe"
              role="img"
              aria-label="Interactive 3D network route. The packet list and inspectors provide the same packet and hop information in text."
            ></canvas>
            <div className="scene-top">
              <div className="view-tabs">
                <button type="button" data-view="globe" className="active" aria-pressed="true">
                  Earth map
                </button>
                <button type="button" data-view="path" aria-pressed="false">
                  Network path
                </button>
                <button type="button" data-view="lan" aria-pressed="false">
                  Inside the building
                </button>
              </div>
              <span id="sceneState">READY</span>
            </div>
            <div className="scene-bottom">
              <div className="legend">
                <span>
                  <i style={{ background: '#73efd7' }}></i>Sender to relay
                </span>
                <span>
                  <i style={{ background: '#ffbc75' }}></i>Relay to recipient
                </span>
                <span>
                  <i style={{ background: '#bda1ff' }}></i>Control / security
                </span>
                <span>
                  <i style={{ background: '#ff7187' }}></i>Loss
                </span>
              </div>
              <div className="camera">
                <button id="zoomOut" type="button" aria-label="Zoom out">
                  −
                </button>
                <label>
                  <span className="sr-only">Zoom</span>
                  <input id="zoom" type="range" min="40" max="500" defaultValue="100" />
                </label>
                <button id="zoomIn" type="button" aria-label="Zoom in">
                  +
                </button>
                <output id="zoomLabel">100%</output>
                <button id="fit" type="button">
                  Fit
                </button>
                <select id="focus" aria-label="Focus camera">
                  <option value="all">Whole route</option>
                  <option value="israel">Tel Aviv</option>
                  <option value="relay">Relay</option>
                  <option value="usa">New York</option>
                </select>
              </div>
            </div>
            <div className="gesture-hint" id="viewHint">
              Geographic city pins · Illustrative network routes · Drag to orbit · Scroll to zoom
            </div>
          </div>
          <div className="playback">
            <button id="send" type="button" className="primary">
              ▶ Start journey
            </button>
            <button id="pause" type="button" disabled>
              Pause
            </button>
            <button
              id="stepBack"
              type="button"
              disabled
              title="Rewind the simulation by 0.5 seconds"
            >
              Step -0.5s
            </button>
            <button id="step" type="button" disabled title="Advance 0.5 simulation seconds">
              Step +0.5s
            </button>
            <button id="reset" type="button">
              ↺ Reset
            </button>
            <label>
              Speed{' '}
              <select id="speed" defaultValue="1">
                <option value="0.25">0.25×</option>
                <option value="0.5">0.5×</option>
                <option value="1">1×</option>
                <option value="2">2×</option>
                <option value="4">4×</option>
              </select>
            </label>
            <span id="clock">0.0 s</span>
          </div>
          <div className="phase-strip" id="phases"></div>
          <div className="stage-summary">
            <div>
              <div className="eyebrow" id="stageLabel">
                READY TO EXPLORE
              </div>
              <h2 id="stageTitle">A secure conversation starts before the message.</h2>
              <p id="stageText">
                Start the journey to see local address resolution, DNS, connection setup, security
                negotiation and encrypted delivery.
              </p>
            </div>
            <div className="stats">
              <span>
                <b id="delivered">0/4</b>Delivered
              </span>
            </div>
          </div>
        </section>
        <aside>
          <div className="inspector-tabs" role="tablist" aria-label="Network inspection">
            <button
              id="listTab"
              type="button"
              className="active"
              role="tab"
              aria-selected="true"
              aria-controls="listPanel"
            >
              Packet list
            </button>
            <button
              id="packetTab"
              type="button"
              role="tab"
              aria-selected="false"
              aria-controls="packetPanel"
            >
              Packet inspector
            </button>
            <button
              id="hopTab"
              type="button"
              role="tab"
              aria-selected="false"
              aria-controls="hopPanel"
            >
              Hop inspector
            </button>
          </div>
          <section
            id="listPanel"
            className="packet-section"
            role="tabpanel"
            aria-labelledby="listTab"
          >
            <div className="section-heading">
              <div>
                <div className="eyebrow">SELECT A PACKET TO INVESTIGATE</div>
                <h2>
                  Packet list <span id="packetCount">0</span>
                </h2>
              </div>
              <label>
                Show{' '}
                <select id="packetFilter">
                  <option value="all">All packets</option>
                  <option value="live">In flight</option>
                  <option value="data">Payloads</option>
                  <option value="security">Security handshake</option>
                </select>
              </label>
              <div className="buffer" id="buffer"></div>
            </div>
            <p id="concurrencyNote" className="muted"></p>
            <p id="bufferText" className="muted">
              Recipient buffer is empty.
            </p>
            <div className="table-scroll">
              <table className="packet-table">
                <thead>
                  <tr>
                    <th>Packet</th>
                    <th>Type</th>
                    <th>Connection / path leg</th>
                    <th>State / location</th>
                    <th>Sequence</th>
                    <th>Modeled IP bytes</th>
                  </tr>
                </thead>
                <tbody id="packetRows">
                  <tr>
                    <td colSpan={6}>Start the journey to populate the trace.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <div id="packetPanel" role="tabpanel" aria-labelledby="packetTab" hidden>
            <div className="empty-inspector" id="packetEmpty">
              <span>⌖</span>
              <h2>Every packet has a story.</h2>
              <p>
                Click a moving packet or any row in the packet list. Playback pauses so you can
                examine it.
              </p>
            </div>
            <div id="packetDetails" hidden>
              <div className="packet-heading">
                <span className="eyebrow" id="packetId"></span>
                <span id="packetState" className="badge"></span>
              </div>
              <h2 id="packetTitle">Packet details</h2>
              <p id="packetSummary"></p>
              <div className="packet-actions">
                <button id="follow" type="button">
                  Follow packet
                </button>
              </div>
              <div className="snapshot-notice" id="snapshotNotice"></div>
              <dl id="packetFields" className="fields"></dl>
              <div className="eyebrow section-label">ENCAPSULATION · OUTSIDE → INSIDE</div>
              <div id="layers"></div>
              <div className="eyebrow section-label">THIS PACKET AT EACH HOP</div>
              <div id="packetHops"></div>
              <div className="eyebrow section-label">EVENT HISTORY</div>
              <div id="packetHistory"></div>
            </div>
          </div>
          <div id="hopPanel" role="tabpanel" aria-labelledby="hopTab" hidden>
            <div id="steps" className="steps"></div>
            <h2 id="nodeTitle">Hop details</h2>
            <p id="nodeText"></p>
            <dl id="nodeInfo" className="fields"></dl>
            <button id="openLan" type="button">
              Explore this local network ↗
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}

function NatLab() {
  return (
    <section id="natLab" className="nat-lab">
      <div className="section-heading">
        <div>
          <div className="eyebrow">ONE PUBLIC IP. MANY PRIVATE DEVICES.</div>
          <h2>How does the reply find your phone?</h2>
        </div>
        <button id="showLan" type="button">
          Open building view ↗
        </button>
      </div>
      <p className="muted">
        The public IP gets the reply to the gateway. The transport protocol, mapped port and
        firewall policy identify an allowed flow. The gateway rewrites the destination; the local
        network delivers to a MAC address; the device’s OS delivers to the socket.
      </p>
      <div className="nat-grid">
        <div>
          <div id="devices" className="devices"></div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Device / protocol</th>
                  <th>Private socket</th>
                  <th>Public socket</th>
                  <th>Allowed remote</th>
                </tr>
              </thead>
              <tbody id="natRows"></tbody>
            </table>
          </div>
          <p className="small muted">
            Seeded established sessions for comparison. Endpoint-dependent filtering is modeled
            here; NAT mapping and firewall policies vary by router. Two devices may use the same
            private port.
          </p>
        </div>
      </div>
    </section>
  );
}

function ConceptExplorer() {
  return (
    <section id="guide" className="guide">
      <div className="section-heading">
        <div>
          <div className="eyebrow">CONCEPT EXPLORER</div>
          <h2>What changes at each layer?</h2>
        </div>
        <span className="muted">Click a concept for its diagram and explanation.</span>
      </div>
      <div className="concept-grid">
        <nav id="conceptNav" aria-label="Network concepts"></nav>
        <article id="conceptContent"></article>
      </div>
    </section>
  );
}

function ModelBoundaries() {
  return (
    <section id="assumptions" className="assumptions">
      <details>
        <summary>Read the model boundaries and protocol references</summary>
        <div id="boundaries"></div>
      </details>
    </section>
  );
}

export default function App() {
  useEffect(() => mountPacketAtlas(), []);
  return (
    <>
      <Header />
      <main>
        <Laboratory />
        <NatLab />
        <ConceptExplorer />
        <ModelBoundaries />
      </main>
    </>
  );
}
